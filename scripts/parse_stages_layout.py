import os
import re
import json
from pathlib import Path

def parse_decompiled_file(filepath):
    print(f"Parsing {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Step 1: Split into functions based on META lines
    functions = {}
    current_fn = None
    fn_lines = []

    for line in lines:
        line = line.strip()
        if line.startswith("META"):
            if current_fn and fn_lines:
                functions[current_fn] = fn_lines
            # e.g., META       00000833 1 Battle1_1
            parts = re.split(r"\s+", line)
            if len(parts) >= 4:
                current_fn = parts[3]
            else:
                current_fn = None
            fn_lines = []
        elif current_fn:
            fn_lines.append(line)
            
    if current_fn and fn_lines:
        functions[current_fn] = fn_lines

    # Step 2: Extract helper function enemy mappings
    # A helper function typically starts with Init_ and calls CreateEnemy
    helper_enemy_map = {}
    for fn_name, fn_lines in functions.items():
        if fn_name.startswith("Init_"):
            # Look for CreateEnemy call and see what string it loads for enemy ID
            stack = []
            enemy_id = None
            for line in fn_lines:
                parts = re.split(r"\s+", line)
                op = parts[0]
                if op == "LITERAL":
                    val = parts[1] if len(parts) > 1 else None
                    # try to parse numeric literal
                    try:
                        val = int(val)
                    except ValueError:
                        pass
                    stack.append(val)
                elif op in ("INDEX", "INDEXN", "UPVALUE", "LOCAL"):
                    val = parts[1] if len(parts) > 1 else None
                    # Strip quotes if string literal
                    if val and val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    stack.append(val)
                elif op == "CALL":
                    num_args = int(parts[1])
                    args = []
                    for _ in range(num_args):
                        if stack:
                            args.insert(0, stack.pop())
                    fn_called = stack.pop() if stack else None
                    if fn_called == "CreateEnemy":
                        # CreateEnemy(x, y, enemy_id, vid)
                        # Pop order: x (args[0]), y (args[1]), enemy_id (args[2]), vid (args[3])
                        if len(args) >= 3:
                            enemy_id = args[2]
            if enemy_id:
                helper_enemy_map[fn_name] = enemy_id
                print(f"Mapped helper {fn_name} -> {enemy_id}")

    # Step 3: Extract sections and their battle lists
    sections = {}
    for fn_name, fn_lines in functions.items():
        if fn_name.startswith("Section") and not fn_name.startswith("SectionReached"):
            # Look for StartBattle call to get the list of Battle functions
            battles = []
            stack = []
            for line in fn_lines:
                parts = re.split(r"\s+", line)
                op = parts[0]
                if op == "LITERAL":
                    val = parts[1] if len(parts) > 1 else None
                    stack.append(val)
                elif op in ("INDEX", "INDEXN", "UPVALUE", "LOCAL"):
                    val = parts[1] if len(parts) > 1 else None
                    if val and val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    stack.append(val)
                elif op == "CALL":
                    num_args = int(parts[1])
                    args = []
                    for _ in range(num_args):
                        if stack:
                            args.insert(0, stack.pop())
                    fn_called = stack.pop() if stack else None
                    if fn_called == "StartBattle":
                        # The battle functions were pushed and added to a table
                        # Let's just find any Battle* strings pushed before the call
                        pass
                # Keep track of battle function names referenced
                if op in ("INDEX", "UPVALUE") and len(parts) > 1:
                    val = parts[1]
                    if val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    if "Battle" in val:
                        battles.append(val)
            
            # De-duplicate battle function names while preserving order
            seen = set()
            ordered_battles = [b for b in battles if not (b in seen or seen.add(b))]
            # Strip out "StartBattle" if it's there
            ordered_battles = [b for b in ordered_battles if b != "StartBattle"]
            if ordered_battles:
                sections[fn_name] = ordered_battles
                print(f"Section {fn_name} -> {ordered_battles}")

    # Step 4: Extract spawns for each battle
    battles_spawns = {}
    for fn_name, fn_lines in functions.items():
        if "Battle" in fn_name and not fn_name.startswith("StartBattle"):
            spawns = []
            stack = []
            for line in fn_lines:
                parts = re.split(r"\s+", line)
                op = parts[0]
                if op == "LITERAL":
                    val = parts[1] if len(parts) > 1 else None
                    try:
                        val = int(val)
                    except ValueError:
                        pass
                    stack.append(val)
                elif op in ("INDEX", "INDEXN", "UPVALUE", "LOCAL"):
                    val = parts[1] if len(parts) > 1 else None
                    if val and val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    stack.append(val)
                elif op == "CALL":
                    num_args = int(parts[1])
                    args = []
                    for _ in range(num_args):
                        if stack:
                            args.insert(0, stack.pop())
                    fn_called = stack.pop() if stack else None
                    
                    if fn_called == "CreateEnemy":
                        # CreateEnemy(x, y, enemy_id, vid)
                        if len(args) >= 4:
                            x, y, enemy_id, vid = args[0], args[1], args[2], args[3]
                            spawns.append({
                                "enemy_id": enemy_id,
                                "x": x,
                                "y": y,
                                "vid": vid
                            })
                    elif fn_called in helper_enemy_map:
                        # Helper(x, y, vid)
                        # Pop order: x, y, vid
                        if len(args) >= 3:
                            x, y, vid = args[0], args[1], args[2]
                            spawns.append({
                                "enemy_id": helper_enemy_map[fn_called],
                                "x": x,
                                "y": y,
                                "vid": vid
                            })
                    elif isinstance(fn_called, str) and fn_called.startswith("Init_"):
                        # Some other helper not mapped? Try to guess enemy_id from helper name
                        enemy_id = fn_called.replace("Init_", "")
                        if len(args) >= 3:
                            x, y, vid = args[0], args[1], args[2]
                            spawns.append({
                                "enemy_id": enemy_id,
                                "x": x,
                                "y": y,
                                "vid": vid
                            })
            battles_spawns[fn_name] = spawns
            print(f"Battle {fn_name} -> Spawned {len(spawns)} enemies")

    # Step 5: Combine sections and battle spawns
    layout = {}
    for sec_name, battle_list in sections.items():
        waves = []
        for i, b_name in enumerate(battle_list):
            spawns = battles_spawns.get(b_name, [])
            waves.append({
                "wave_index": i + 1,
                "battle_name": b_name,
                "enemies": spawns
            })
        layout[sec_name] = {
            "section_name": sec_name,
            "waves": waves
        }

    return layout

if __name__ == "__main__":
    BASE_DIR = Path(__file__).resolve().parent.parent
    target_path = BASE_DIR / "user-data" / "decompiled_luac" / "Chapter1_decompiled.txt"
    if target_path.exists():
        layout = parse_decompiled_file(target_path)
        print("\nResult:")
        print(json.dumps(layout, indent=2))
    else:
        print(f"File not found: {target_path}")
