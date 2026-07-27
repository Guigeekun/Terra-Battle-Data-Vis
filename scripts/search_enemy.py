import json
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
data = json.load(open(BASE_DIR / 'user-data' / 'extracted-gamedata' / 'game_data' / 'EnemyData.json', 'r', encoding='utf-8'))
found = []
for e in data.get('data', []):
    name_ja = e.get('NameString', {}).get('ja', '')
    if name_ja and 'バク' in name_ja:
        found.append((e['ID'], name_ja, e.get('NameString', {})))

print(f"Found {len(found)} matching enemies:")
for fid, name, ns in found[:30]:
    # Encode as ascii with replace to avoid print errors
    safe_ns = {k: str(v).encode('ascii', 'replace').decode('ascii') for k, v in ns.items()}
    print(f"ID: {fid}, Name (ja): {name.encode('ascii', 'replace').decode('ascii')}, NameString: {safe_ns}")
