"""Extract and decrypt all game data from the Terra Battle APK into human-readable JSON.

Usage:
    py -3 extract_everything.py [--apk PATH] [--output-dir PATH]

Requires:
    - UnityPy >= 1.25.2
    - TypeTreeGeneratorAPI >= 0.0.10
    - capstone (for IL2CPP disassembly)
"""

from __future__ import annotations

import os
import sys

# Fix native DLL loading on Windows: ensure capstone.dll is findable by
# TypeTreeGeneratorAPI before any import triggers the load.
def _fix_dll_paths() -> None:
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
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

# Monkey-patch TypeTreeGenerator to strip '.dll' from assembly names
# because the C# backend loads assembly names without '.dll' but UnityPy
# passes them with '.dll'.
orig_get_nodes_up = TypeTreeGenerator.get_nodes_up
def patched_get_nodes_up(self, assembly: str, fullname: str) -> Any:
    if assembly.lower().endswith(".dll"):
        assembly = assembly[:-4]
    return orig_get_nodes_up(self, assembly, fullname)
TypeTreeGenerator.get_nodes_up = patched_get_nodes_up

orig_get_nodes = TypeTreeGenerator.get_nodes
def patched_get_nodes(self, assembly: str, fullname: str) -> Any:
    if assembly.lower().endswith(".dll"):
        assembly = assembly[:-4]
    return orig_get_nodes(self, assembly, fullname)
TypeTreeGenerator.get_nodes = patched_get_nodes


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
INVERSE_TABLE_OFFSET = 0x601CAD


def load_inverse_table(apk_path: Path) -> bytes:
    """Load the string decryption inverse table from global-metadata.dat."""
    with zipfile.ZipFile(apk_path) as archive:
        metadata = archive.read(METADATA_MEMBER)
    table = metadata[INVERSE_TABLE_OFFSET : INVERSE_TABLE_OFFSET + 256]
    if len(table) != 256:
        raise ValueError("Could not read full 256-byte decryption table")
    return table


def decrypt_string(data: list[int], inverse_table: bytes) -> str:
    """Decrypt an EncryptedString byte list into a UTF-8 string."""
    if not data:
        return ""
    vals = [inverse_table[b] for b in data]
    plain_bytes = bytes(reversed(vals))
    return plain_bytes.decode("utf-8", errors="replace")


def is_encrypted_string(obj: Any) -> bool:
    """Determine if a Python object represents serialized EncryptedString data."""
    if isinstance(obj, dict) and list(obj.keys()) == ["data"]:
        val = obj["data"]
        if isinstance(val, list) and all(isinstance(x, int) and 0 <= x <= 255 for x in val):
            return True
    return False


def sanitize_and_decrypt(obj: Any, inverse_table: bytes) -> Any:
    """Recursively convert UnityPy objects and decrypt EncryptedStrings."""
    if obj is None:
        return None
    if isinstance(obj, (bool,)):
        return obj
    if isinstance(obj, (int, float, str)):
        return obj
    if isinstance(obj, bytes):
        try:
            return obj.decode("utf-8")
        except UnicodeDecodeError:
            return f"<{len(obj)} bytes>"
    if is_encrypted_string(obj):
        return decrypt_string(obj["data"], inverse_table)
    if isinstance(obj, dict):
        return {str(k): sanitize_and_decrypt(v, inverse_table) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_and_decrypt(v, inverse_table) for v in obj]
    if hasattr(obj, "__dict__"):
        result = {}
        for k, v in obj.__dict__.items():
            if k.startswith("_"):
                continue
            result[k] = sanitize_and_decrypt(v, inverse_table)
        return result
    return str(obj)


def get_text_asset_script_bytes(obj: Any) -> bytes:
    """Read the raw script bytes of a TextAsset from its serialized data."""
    raw = obj.get_raw_data()
    # Layout of TextAsset serialized data:
    #   m_Name (string): int32 length, followed by bytes, aligned to 4 bytes
    #   m_Script (string): int32 length, followed by bytes, aligned to 4 bytes
    offset = 0
    name_len = struct.unpack_from("<i", raw, offset)[0]
    offset += 4 + name_len
    offset = (offset + 3) & ~3
    script_len = struct.unpack_from("<i", raw, offset)[0]
    offset += 4
    return raw[offset : offset + script_len]


def extract_text_assets(env: Any, output_dir: Path) -> None:
    """Extract all TextAsset objects (Lua chapter scripts, config files)."""
    text_dir = output_dir / "text_assets"
    text_dir.mkdir(parents=True, exist_ok=True)

    for obj in env.objects:
        if obj.assets_file.name == "resources.assets" and obj.type.name == "TextAsset":
            try:
                data = obj.read()
                name = data.m_Name
                content = get_text_asset_script_bytes(obj)

                # Check if it's binary (Lua bytecode) or text
                is_lua = content[:5] == b"\x1dMOON"
                if is_lua:
                    (text_dir / f"{name}.luac").write_bytes(content)
                    info = {"type": "lua_bytecode", "size": len(content)}
                else:
                    try:
                        text = content.decode("utf-8")
                        (text_dir / f"{name}.txt").write_text(text, encoding="utf-8")
                        info = {"type": "text", "size": len(text)}
                    except UnicodeDecodeError:
                        (text_dir / f"{name}.bin").write_bytes(content)
                        info = {"type": "binary", "size": len(content)}

                print(f"  Extracted TextAsset: {name} ({info['type']}, {info['size']:,} bytes/chars)")
            except Exception as error:
                print(f"  TextAsset {obj.path_id}: ERROR - {error}")


def parse_string_set_manually(raw: bytes, inverse_table: bytes) -> dict[str, Any]:
    """Manually parse the StringSet object to bypass TypeTree generator bugs."""
    offset = 32 # Skip MonoBehaviour header

    def parse_encrypted_string(raw, offset):
        size = struct.unpack_from("<i", raw, offset)[0]
        offset += 4
        data = list(raw[offset : offset + size])
        offset += size
        offset = (offset + 3) & ~3
        return {"data": data}, offset

    def parse_string_data(raw, offset):
        en, offset = parse_encrypted_string(raw, offset)
        ja, offset = parse_encrypted_string(raw, offset)
        fr, offset = parse_encrypted_string(raw, offset)
        de, offset = parse_encrypted_string(raw, offset)
        es, offset = parse_encrypted_string(raw, offset)
        zh_tw, offset = parse_encrypted_string(raw, offset)
        bgID = struct.unpack_from("<i", raw, offset)[0]
        bgmID = struct.unpack_from("<i", raw, offset + 4)[0]
        flag = struct.unpack_from("<i", raw, offset + 8)[0]
        offset += 12
        return {
            "en": en, "ja": ja, "fr": fr, "de": de, "es": es, "zh_tw": zh_tw,
            "bgID": bgID, "bgmID": bgmID, "flag": flag
        }, offset

    def parse_string_data_array(raw, offset):
        size = struct.unpack_from("<i", raw, offset)[0]
        offset += 4
        arr = []
        for _ in range(size):
            item, offset = parse_string_data(raw, offset)
            arr.append(item)
        return arr, offset

    def parse_string(raw, offset):
        size = struct.unpack_from("<i", raw, offset)[0]
        offset += 4
        val = raw[offset : offset + size].decode("utf-8", errors="replace")
        offset += size
        offset = (offset + 3) & ~3
        return val, offset

    def parse_string_array(raw, offset):
        size = struct.unpack_from("<i", raw, offset)[0]
        offset += 4
        arr = []
        for _ in range(size):
            val, offset = parse_string(raw, offset)
            arr.append(val)
        return arr, offset

    chapterSet, offset = parse_string_data_array(raw, offset)
    uiSet, offset = parse_string_data_array(raw, offset)
    scenarioSet, offset = parse_string_data_array(raw, offset)
    ngwords, offset = parse_string_array(raw, offset)
    lang, offset = parse_string(raw, offset)

    return {
        "chapterSet": chapterSet,
        "uiSet": uiSet,
        "scenarioSet": scenarioSet,
        "ngwords": ngwords,
        "lang": lang
    }


def extract_monobehaviours(
    env: Any, output_dir: Path, inverse_table: bytes
) -> None:
    """Extract and decrypt MonoBehaviour game data objects."""
    data_dir = output_dir / "game_data"
    data_dir.mkdir(parents=True, exist_ok=True)

    for obj in env.objects:
        if obj.assets_file.name != "resources.assets" or obj.type.name != "MonoBehaviour":
            continue
        if obj.path_id not in KNOWN_OBJECTS:
            continue

        class_name = KNOWN_OBJECTS[obj.path_id]
        print(f"  Parsing and decrypting {class_name} (path_id={obj.path_id}, {obj.byte_size:,} bytes)...")

        try:
            if class_name == "StringSet":
                # Manual parsing bypasses bugs in UnityPy type tree generator for array of strings
                tree = parse_string_set_manually(obj.get_raw_data(), inverse_table)
            else:
                tree = obj.parse_as_dict(check_read=True)

            clean_data = sanitize_and_decrypt(tree, inverse_table)
            output_file = data_dir / f"{class_name}.json"
            output_file.write_text(
                json.dumps(clean_data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print(f"    -> Saved to: {output_file.name}")
        except Exception as error:
            print(f"    -> FAILED to parse: {error}")


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

    # Step 1: Load inverse table
    print("[1/5] Loading string decryption table...")
    try:
        inverse_table = load_inverse_table(apk_path)
        print("  Decryption table loaded successfully")
    except Exception as error:
        print(f"  Failed to load decryption table: {error}")
        return 1
    print()

    # Step 2: Setup type tree generator
    print("[2/5] Setting up IL2CPP type tree generator...")
    try:
        with zipfile.ZipFile(apk_path) as archive:
            il2cpp = archive.read(IL2CPP_MEMBER)
            metadata = archive.read(METADATA_MEMBER)
        gen = TypeTreeGenerator("2017.4.37f1")
        gen.load_il2cpp(il2cpp, metadata)
        print("  IL2CPP loaded and type trees registered successfully")
    except Exception as error:
        print(f"  Failed to setup type tree generator: {error}")
        print("  Please make sure 'capstone' is installed: py -3 -m pip install capstone")
        return 1
    print()

    # Step 3: Load Unity environment
    print("[3/5] Loading Unity resources.assets...")
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
        env.typetree_generator = gen
        print(f"  Loaded {sum(1 for _ in env.objects)} objects from data.unity3d")
        print()

        # Step 4: TextAssets
        print("[4/5] Extracting Lua scripts and TextAssets...")
        extract_text_assets(env, output_dir)
        print()

        # Step 5: MonoBehaviours (game data)
        print("[5/5] Extracting and decrypting database objects...")
        extract_monobehaviours(env, output_dir, inverse_table)
        print()

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    print("=" * 60)
    print(f"Extraction complete! Output in: {output_dir}")
    print(f"Decrypted game databases: {output_dir / 'game_data'}")
    print(f"Lua/TextAssets scripts:   {output_dir / 'text_assets'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
