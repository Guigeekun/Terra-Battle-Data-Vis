# Terra Battle Level Editor

An interactive web-based database viewer and level editor for *Terra Battle*, designed to work alongside project **Liminal Gate**. 

This editor provides comprehensive access to game assets, character stats, companion drop rates, skills, audio players (BGM/SE), and stage wave board layouts.

---

## Key Features

### 1. Stage Wave Configurations & Interactive Grid Board
* **Visual Grid Board**: Renders an interactive 6x8 board visualizer corresponding to the precise battle grid coordinates of Terra Battle.
* **Wave selection tabs**: Switch between battle waves (`Wave 1`, `Wave 2`, `Wave 3`...) to view changes in enemy layout positions.
* **Interactive Enemy Tokens**: Displays custom tokens for spawned enemies (red glowing pulses for Bosses, orange for normal enemies).
* **Hover tooltips**: Inspect name, level, HP, ATK, and DEF stats instantly.
* **Side-by-side List**: Detailed list of all enemies spawning in the currently active wave.
![wave_layout](/res/wave_layout.png)

### 2. Character & Companion DB
* Inspect character and buddy database metadata (HP, ATK, DEF, stats, classes, skills, and rarities).
* Built-in search and filtering.

### 3. Audio Controller Player
* Play case-insensitive BGM soundtracks and Sound Effects (SE) directly through the browser.

### 4. Items & Skills Viewer
* Browse all game items and skills databases with dynamic translation support (English, Japanese, French, German, Spanish, Traditional Chinese).

---

## Project Structure

```text
Terra-Battle-Level-Editor/
├── app.py                      # FastAPI Web Server (main entry point)
├── requirements.txt            # Python dependencies (FastAPI, Uvicorn, UnityPy, capstone)
├── scripts/                    # Code extraction & decompilation utilities
│   ├── Decompiler.cs           # C# MoonSharp bytecode parser source
│   ├── Decompiler.exe          # Compiled MoonSharp bytecode dumper
│   ├── MoonSharp.Interpreter.dll # Official MoonSharp interpreter library
│   ├── decompile_and_parse_all.py # Automates decompilation and generates StagesLayout.json
│   ├── parse_stages_layout.py  # VM instruction stack-based parser (test script)
│   ├── extract_everything.py   # Extracts and decrypts game database from APK
│   ├── extract_gamedata.py     # Fallback extractor for raw asset files
│   ├── search_enemy.py         # Utility to search EnemyData.json NameStrings
│   ├── verify_mapping.py       # Utility to verify metadata enum-to-ID alignment
│   └── test_hash.py            # .NET String.GetHashCode tester
├── static/                     # Frontend static assets
│   ├── css/style.css           # Styling system & responsive layout designs
│   └── js/main.js              # State manager, event loop, and DOM rendering logic
├── templates/
│   └── index.html              # Main glassmorphic editor interface
└── user-data/                  # Runtime files and database storage (gitignored)
    └── extracted-gamedata/
        └── game_data/
            └── StagesLayout.json # Wave configurations database mapping
```

---

## Extraction & Decompilation Pipeline

The layout coordinates and battle configuration files are scripted inside compiled MoonSharp Lua chunks (`Chapter*.luac`). We parse these compiled instruction streams to reconstruct the stage coordinates:

1. **Extracting Enum Metadata**:
   We search `global-metadata.dat` inside the game APK to read the C# `Enemies` enum. We resolved that the indices align exactly with the database `ID`s inside `EnemyData.json` (`ID = enum_index + 1`).
2. **Lua Bytecode Decompilation**:
   `Decompiler.exe` loads compiled `.luac` bytecode chunks and hooks into MoonSharp's virtual machine debugger interface, capturing the disassembled instructions stream.
3. **Instruction Stack Parsing**:
   `decompile_and_parse_all.py` performs stack analysis on the bytecode to resolve calls to `CreateEnemy(x, y, enemy_id, vid)`. It replaces string variable references with numeric database IDs and saves coordinates to `StagesLayout.json`.

To run the full extraction and parsing pipeline, place your game APK under `local-input/terra-battle-5.5.7-170.apk` and run:

```bash
# Extract asset databases
python scripts/extract_everything.py

# Decompile chapter scripts and generate wave coordinates database
python scripts/decompile_and_parse_all.py
```

---

## Running the Web Server

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the server**:
   ```bash
   python app.py
   ```
3. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.
