import json
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
data = json.load(open(BASE_DIR / 'user-data' / 'extracted-gamedata' / 'game_data' / 'EnemyData.json', 'r', encoding='utf-8'))
enemies = data.get('data', [])
for e in enemies[20:50]:
    name_en = e.get('NameString', {}).get('en', '')
    name_ja = e.get('NameString', {}).get('ja', '')
    print(f"ID: {e['ID']}, EN: {name_en}, JA: {name_ja.encode('ascii', 'replace').decode('ascii')}")
