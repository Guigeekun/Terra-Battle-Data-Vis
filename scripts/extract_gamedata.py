"""Extract all game data from the Terra Battle APK into human-readable JSON.

Usage:
    py -3 extract_gamedata.py [--apk PATH] [--output-dir PATH]

Requires:
    - UnityPy >= 1.25.2
    - TypeTreeGeneratorAPI >= 0.0.10
    - capstone (for IL2CPP disassembly)

If IL2CPP parsing fails (e.g., missing capstone), the script falls back to
extracting TextAssets and raw MonoBehaviour metadata only.
"""

from __future__ import annotations

# Fix native DLL loading on Windows: ensure capstone.dll is findable by
# TypeTreeGeneratorAPI before any import triggers the load.
import os
import sys

def _fix_dll_paths() -> None:
    """Add TypeTreeGeneratorAPI and capstone directories to DLL search path."""
    try:
        import importlib.util
        for pkg in ("TypeTreeGeneratorAPI", "capstone"):
            spec = importlib.util.find_spec(pkg)
            if spec and spec.submodule_search_locations:
                pkg_dir = str(spec.submodule_search_locations[0])
                if hasattr(os, "add_dll_directory"):
                    os.add_dll_directory(pkg_dir)
                if pkg_dir not in os.environ.get("PATH", ""):
                    os.environ["PATH"] = pkg_dir + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass

_fix_dll_paths()

import argparse
import json
import shutil
import struct
import tempfile
import traceback
import zipfile
from pathlib import Path
from typing import Any

import UnityPy

# Known game data MonoBehaviour objects in resources.assets
KNOWN_OBJECTS: dict[int, str] = {
    12682: "AudioController",
    12684: "BattleData",
    12685: "BookData",
    12688: "ChrDatabase",
    12692: "EffectSet",
    12693: "EnemyData",
    12694: "Entity",
    12695: "ItemSet",
    12700: "SkillData",
    12702: "StringSet",
    13311: "ExchangeData",
    13343: "AchivementSet",
    13474: "BuddyDatabase",
    13515: "MultiplayData",
}

APK_DATA_MEMBER = "assets/bin/Data/data.unity3d"
IL2CPP_MEMBER = "lib/armeabi-v7a/libil2cpp.so"
METADATA_MEMBER = "assets/bin/Data/Managed/Metadata/global-metadata.dat"


def sanitize_for_json(obj: Any) -> Any:
    """Recursively convert UnityPy objects to JSON-serializable types."""
    if obj is None:
        return None
    if isinstance(obj, (bool,)):
        return obj
    if isinstance(obj, (int, float, str)):
        return obj
    if isinstance(obj, bytes):
        # Try to decode as UTF-8 text, otherwise hex-encode
        try:
            return obj.decode("utf-8")
        except UnicodeDecodeError:
            return f"<{len(obj)} bytes>"
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(v) for v in obj]
    # Handle UnityPy PPtr and other special types
    if hasattr(obj, "__dict__"):
        result = {}
        for k, v in obj.__dict__.items():
            if k.startswith("_"):
                continue
            result[k] = sanitize_for_json(v)
        return result
    return str(obj)


def resolve_script_name(env: Any) -> dict[int, str]:
    """Build path_id -> class_name map from MonoScript objects."""
    scripts: dict[int, str] = {}
    for obj in env.objects:
        if obj.type.name == "MonoScript":
            try:
                data = obj.read()
                scripts[obj.path_id] = data.m_ClassName
            except Exception:
                pass
    return scripts


def get_monobehaviour_class(obj: Any, scripts: dict[int, str]) -> str:
    """Determine the class name of a MonoBehaviour from its m_Script PPtr."""
    try:
        raw = obj.get_raw_data()
        # m_Script PPtr starts at offset 16 in MonoBehaviour binary
        script_path_id = struct.unpack_from("<q", raw, 20)[0]
        return scripts.get(script_path_id, f"Unknown_{obj.path_id}")
    except Exception:
        return f"Unknown_{obj.path_id}"


def setup_typetree_generator(apk_path: Path) -> Any:
    """Try to create a TypeTreeGenerator from APK's IL2CPP data."""
    try:
        from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
    except ImportError:
        print("  TypeTreeGenerator not available, will extract limited data")
        return None

    try:
        with zipfile.ZipFile(apk_path) as archive:
            il2cpp = archive.read(IL2CPP_MEMBER)
            metadata = archive.read(METADATA_MEMBER)
    except (KeyError, zipfile.BadZipFile) as error:
        print(f"  Could not read IL2CPP data from APK: {error}")
        return None

    try:
        gen = TypeTreeGenerator("2017.4.37f1")
        gen.load_il2cpp(il2cpp, metadata)
        print(f"  IL2CPP type trees loaded successfully")
        return gen
    except Exception as error:
        print(f"  IL2CPP loading failed: {error}")
        print("  Tip: install 'capstone' package: py -3 -m pip install capstone")
        return None


def try_setup_with_dummydll(apk_path: Path, dll_dir: Path | None) -> Any:
    """Try to create TypeTreeGenerator from DummyDll files."""
    if dll_dir is None:
        return None
    try:
        from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
        gen = TypeTreeGenerator("2017.4.37f1")
        dlls = sorted(dll_dir.glob("*.dll"))
        if not dlls:
            print(f"  No .dll files in {dll_dir}")
            return None
        for dll in dlls:
            gen.load_dll(dll.read_bytes())
        print(f"  DummyDll type trees loaded from {len(dlls)} assemblies")
        return gen
    except Exception as error:
        print(f"  DummyDll loading failed: {error}")
        return None


def extract_text_assets(env: Any, output_dir: Path) -> None:
    """Extract all TextAsset objects (Lua chapter scripts, config files)."""
    text_dir = output_dir / "text_assets"
    text_dir.mkdir(parents=True, exist_ok=True)

    for obj in env.objects:
        if obj.assets_file.name == "resources.assets" and obj.type.name == "TextAsset":
            try:
                data = obj.read()
                name = data.m_Name
                content = data.m_Script

                # Check if it's binary (Lua bytecode) or text
                if isinstance(content, bytes):
                    is_lua = content[:5] == b"\x1dMOON"
                    if is_lua:
                        # Save as binary .lua file
                        (text_dir / f"{name}.luac").write_bytes(content)
                        info = {"name": name, "type": "lua_bytecode", "size": len(content)}
                    else:
                        try:
                            text = content.decode("utf-8")
                            (text_dir / f"{name}.txt").write_text(text, encoding="utf-8")
                            info = {"name": name, "type": "text", "size": len(text)}
                        except UnicodeDecodeError:
                            (text_dir / f"{name}.bin").write_bytes(content)
                            info = {"name": name, "type": "binary", "size": len(content)}
                else:
                    (text_dir / f"{name}.txt").write_text(content, encoding="utf-8")
                    info = {"name": name, "type": "text", "size": len(content)}

                print(f"  TextAsset: {name} ({info['type']}, {info['size']:,} bytes)")
            except Exception as error:
                print(f"  TextAsset {obj.path_id}: ERROR - {error}")


def extract_monobehaviours_full(
    env: Any, output_dir: Path, scripts: dict[int, str]
) -> None:
    """Extract MonoBehaviour objects using full type tree parsing."""
    data_dir = output_dir / "game_data"
    data_dir.mkdir(parents=True, exist_ok=True)

    for obj in env.objects:
        if obj.assets_file.name != "resources.assets" or obj.type.name != "MonoBehaviour":
            continue

        class_name = get_monobehaviour_class(obj, scripts)
        if obj.path_id not in KNOWN_OBJECTS:
            continue

        class_name = KNOWN_OBJECTS[obj.path_id]
        print(f"  Parsing {class_name} (path_id={obj.path_id}, {obj.byte_size:,} bytes)...")

        try:
            tree = obj.parse_as_dict(check_read=True)
            clean_data = sanitize_for_json(tree)
            output_file = data_dir / f"{class_name}.json"
            output_file.write_text(
                json.dumps(clean_data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            summary = _summarize_data(class_name, tree)
            print(f"    -> {output_file.name} ({summary})")
        except Exception as error:
            print(f"    -> FAILED: {error}")
            traceback.print_exc()


def extract_monobehaviours_raw(
    env: Any, output_dir: Path, scripts: dict[int, str]
) -> None:
    """Extract MonoBehaviour objects as raw binary (fallback without type trees)."""
    data_dir = output_dir / "game_data_raw"
    data_dir.mkdir(parents=True, exist_ok=True)

    for obj in env.objects:
        if obj.assets_file.name != "resources.assets" or obj.type.name != "MonoBehaviour":
            continue
        if obj.path_id not in KNOWN_OBJECTS:
            continue

        class_name = KNOWN_OBJECTS[obj.path_id]
        raw = obj.get_raw_data()

        # Save raw binary
        (data_dir / f"{class_name}.bin").write_bytes(raw)
        print(f"  Raw: {class_name} (path_id={obj.path_id}, {len(raw):,} bytes)")


def _summarize_data(class_name: str, tree: dict[str, Any]) -> str:
    """Generate a short human-readable summary of extracted data."""
    if class_name == "BattleData":
        chapters = tree.get("chapters", [])
        total_sections = sum(
            len(ch.get("sections", [])) for ch in chapters if isinstance(ch, dict)
        )
        return f"{len(chapters)} chapters, {total_sections} sections total"
    if class_name == "ChrDatabase":
        infos = tree.get("infos", [])
        return f"{len(infos)} characters"
    if class_name == "EnemyData":
        enemies = tree.get("enemies", tree.get("infos", []))
        if isinstance(enemies, list):
            return f"{len(enemies)} entries"
        return f"keys: {list(tree.keys())[:5]}"
    if class_name == "SkillData":
        skills = tree.get("skills", tree.get("infos", []))
        if isinstance(skills, list):
            return f"{len(skills)} entries"
        return f"keys: {list(tree.keys())[:5]}"
    if class_name == "ItemSet":
        items = tree.get("items", tree.get("infos", []))
        if isinstance(items, list):
            return f"{len(items)} entries"
        return f"keys: {list(tree.keys())[:5]}"
    if class_name == "BuddyDatabase":
        buddies = tree.get("infos", tree.get("buddies", []))
        if isinstance(buddies, list):
            return f"{len(buddies)} entries"
        return f"keys: {list(tree.keys())[:5]}"
    return f"keys: {list(tree.keys())[:5]}"


def extract_asset_inventory(env: Any, output_dir: Path) -> None:
    """Write a full inventory of all Unity objects for reference."""
    inventory = []
    for obj in env.objects:
        entry = {
            "file": obj.assets_file.name,
            "type": obj.type.name,
            "path_id": obj.path_id,
            "byte_size": obj.byte_size,
        }
        if obj.type.name == "MonoBehaviour" and obj.path_id in KNOWN_OBJECTS:
            entry["class_name"] = KNOWN_OBJECTS[obj.path_id]
        inventory.append(entry)

    inventory.sort(key=lambda e: (e["file"], e["type"], e["path_id"]))
    output_file = output_dir / "asset_inventory.json"
    output_file.write_text(
        json.dumps(inventory, indent=2) + "\n", encoding="utf-8"
    )
    print(f"  Asset inventory: {len(inventory)} objects -> {output_file.name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    BASE_DIR = Path(__file__).resolve().parent.parent
    parser.add_argument(
        "--apk",
        type=Path,
        default=BASE_DIR / "local-input" / "terra-battle-5.5.7-170.apk",
        help="Path to the Terra Battle APK",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=BASE_DIR / "user-data" / "extracted-gamedata",
        help="Output directory for extracted data",
    )
    parser.add_argument(
        "--dummy-dll-dir",
        type=Path,
        default=None,
        help="Path to Il2CppDumper DummyDll directory (optional, alternative to IL2CPP)",
    )
    args = parser.parse_args()

    apk_path = args.apk.resolve()
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    if not apk_path.exists():
        print(f"APK not found: {apk_path}")
        return 1

    print(f"APK: {apk_path}")
    print(f"Output: {output_dir}")
    print()

    # Step 1: Setup type tree generator
    print("[1/5] Setting up type tree generator...")
    generator = try_setup_with_dummydll(apk_path, args.dummy_dll_dir)
    if generator is None:
        generator = setup_typetree_generator(apk_path)
    has_typetrees = generator is not None
    if not has_typetrees:
        print("  WARNING: No type tree generator available.")
        print("  Only TextAssets and raw MonoBehaviour binaries will be extracted.")
        print("  To get full extraction, install capstone: py -3 -m pip install capstone")
        print()

    # Step 2: Load Unity environment
    print("[2/5] Loading Unity data from APK...")
    try:
        with zipfile.ZipFile(apk_path) as archive:
            data_payload = archive.read(APK_DATA_MEMBER)
    except (KeyError, zipfile.BadZipFile) as error:
        print(f"  Could not read data.unity3d from APK: {error}")
        return 1

    tmpdir = Path(tempfile.mkdtemp())
    try:
        data_file = tmpdir / "data.unity3d"
        data_file.write_bytes(data_payload)
        env = UnityPy.load(str(data_file))
        if has_typetrees:
            env.typetree_generator = generator
        print(f"  Loaded {sum(1 for _ in env.objects)} objects from data.unity3d")
        print()

        # Build script name map
        scripts = resolve_script_name(env)

        # Step 3: Asset inventory
        print("[3/5] Writing asset inventory...")
        extract_asset_inventory(env, output_dir)
        print()

        # Step 4: TextAssets
        print("[4/5] Extracting TextAssets...")
        extract_text_assets(env, output_dir)
        print()

        # Step 5: MonoBehaviours (game data)
        print("[5/5] Extracting game data objects...")
        if has_typetrees:
            extract_monobehaviours_full(env, output_dir, scripts)
        else:
            extract_monobehaviours_raw(env, output_dir, scripts)
        print()

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    print("=" * 60)
    print(f"Extraction complete! Output in: {output_dir}")
    if has_typetrees:
        print("Full JSON extraction with type trees succeeded.")
        print(f"Game data files are in: {output_dir / 'game_data'}")
    else:
        print("Raw binary extraction only (no type trees).")
        print(f"Raw files are in: {output_dir / 'game_data_raw'}")
    print(f"TextAssets are in: {output_dir / 'text_assets'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
