import os
import sys
import json
import webbrowser
from threading import Timer
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import io

# Initialize FastAPI App using lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load databases before launching web server
    print("Loading game data databases...")
    load_databases()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folders

os.makedirs("frontend/dist/assets", exist_ok=True)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# Paths
DATA_DIR = os.path.join("user-data", "extracted-gamedata", "game_data")
EXTRACTED_DIR = os.path.join("user-data", "extracted-gamedata")
LOCAL_INPUT_DIR = os.path.join("local-input", "resources", "data_u2017", "android")

# Cached Databases
gamedata = {}


def load_databases():
    """Load all game databases from JSON files."""
    db_files = {
        "characters": "ChrDatabase.json",
        "buddies": "BuddyDatabase.json",
        "items": "ItemSet.json",
        "skills": "SkillData.json",
        "stages": "BattleData.json",
        "strings": "StringSet.json",
        "enemies": "EnemyData.json",
        "stages_layout": "StagesLayout.json"
    }
    
    for key, filename in db_files.items():
        path = os.path.join(DATA_DIR, filename)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    gamedata[key] = json.load(f)
                print(f"Loaded database: {filename}")
            except Exception as e:
                print(f"Error loading {filename}: {e}")
                gamedata[key] = {}
        else:
            print(f"Warning: database file not found: {path}")
            gamedata[key] = {}


def find_local_asset(category, image_id, prefix="img"):
    """
    Search pre-extracted assets for an asset by its ImageID.
    Supports zero-padding for single-digit IDs.
    """
    directory = os.path.join(EXTRACTED_DIR, category)
    if not os.path.exists(directory):
        return None
    
    id_str_padded = f"{image_id:02d}" if image_id < 10 else str(image_id)
    suffix_padded = f"{prefix}_{id_str_padded}.png"
    suffix_normal = f"{prefix}_{image_id}.png"
    
    try:
        for f in os.listdir(directory):
            if f.endswith(suffix_padded) or f.endswith(suffix_normal):
                return f"{EXTRACTED_DIR}/{category}/{f}".replace("\\", "/")
    except Exception:
        pass
    return None

# API Endpoints
@app.get('/api/characters')
def get_characters():
    """Retrieve characters, linking their jobs to local Pieces and Illust asset paths."""
    char_db = gamedata.get("characters", {})
    infos = char_db.get("infos", [])
    jobs_data = char_db.get("data", [])
    
    # Index jobs by ID
    jobs_by_id = {job["ID"]: job for job in jobs_data}
    
    item_db = gamedata.get("items", {})
    item_set = item_db.get("itemSet", [])
    
    result = []
    for info in infos:
        char_jobs = []
        for job_id in info.get("Jobs", []):
            job = jobs_by_id.get(job_id)
            if job:
                image_id = job.get("ImageID", 0)
                # Resolve paths in local-input
                piece_path = find_local_asset("Pieces", image_id, "img")
                illust_path = find_local_asset("Illust", image_id, "illust")
                
                job_copy = dict(job)
                job_copy["piece_file"] = piece_path
                job_copy["illust_file"] = illust_path
                
                # Extract and parse unlock materials
                unlock_materials = []
                for item_entry in job.get("items", []):
                    code = item_entry.get("code", 0)
                    if code > 0:
                        item_id = code // 256
                        count = code % 256
                        idx = item_id - 1
                        if 0 <= idx < len(item_set):
                            item = item_set[idx]
                            unlock_materials.append({
                                "item_id": item_id,
                                "count": count,
                                "name": item.get("NameString", {}),
                                "icon_url": f"/api/assets/item/item_{item_id:02d}.png"
                            })
                        else:
                            unlock_materials.append({
                                "item_id": item_id,
                                "count": count,
                                "name": {"en": f"Unknown Item (ID {item_id})"},
                                "icon_url": None
                            })
                job_copy["unlock_materials"] = unlock_materials
                job_copy["unlock_coin"] = job.get("COIN", 0)
                char_jobs.append(job_copy)
        
        char_copy = dict(info)
        char_copy["JobsInfo"] = char_jobs
        result.append(char_copy)
        
    return result

@app.get('/api/buddies')
def get_buddies():
    """Retrieve buddies/companions, linking them to local BuddyThumbs and BuddyImages."""
    buddy_db = gamedata.get("buddies", {})
    data = buddy_db.get("data", [])
    
    result = []
    for buddy in data:
        image_id = buddy.get("ImageID", 0)
        thumb_path = find_local_asset("BuddyThumbs", image_id, "img")
        image_path = find_local_asset("BuddyImages", image_id, "img")
        
        buddy_copy = dict(buddy)
        buddy_copy["thumb_file"] = thumb_path
        buddy_copy["image_file"] = image_path
        result.append(buddy_copy)
        
    return result

@app.get('/api/items')
def get_items():
    """Retrieve items database, augmented with local item icon URL and sortOrder image info."""
    item_db = gamedata.get("items", {})
    items = item_db.get("itemSet", [])

    result = []
    for idx, item in enumerate(items):
        sort_order = item.get("sortOrder", 0)
        piece_path = find_local_asset("Pieces", sort_order, "img") if sort_order else None

        item_copy = dict(item)
        item_copy["image_id"] = sort_order
        item_copy["piece_file"] = piece_path
        item_copy["icon_url"] = f"/api/assets/item/item_{idx + 1:02d}.png"
        result.append(item_copy)

    return result

@app.get('/api/assets/item/{filename}')
def serve_item_icon(filename: str):
    """Serve cropped item icon from user-data/extracted-gamedata/item_icons/"""
    path = os.path.join("user-data", "extracted-gamedata", "item_icons", filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Item icon not found")

@app.get('/api/skills')
def get_skills():
    """Retrieve skills database."""
    skill_db = gamedata.get("skills", {})
    return skill_db.get("types", [])

@app.get('/api/stages')
def get_stages():
    """Retrieve chapters and stages with their wave and enemy layout details."""
    chapters = gamedata.get("stages", {}).get("chapters", [])
    layout_db = gamedata.get("stages_layout", {})
    enemy_db = gamedata.get("enemies", {}).get("data", [])
    
    enemies_by_id = {e["ID"]: e for e in enemy_db}
    
    result_chapters = []
    for ch in chapters:
        chapter_no = str(ch.get("chapterNo", ""))
        ch_layout = layout_db.get(chapter_no, {})
        
        result_sections = []
        for idx, sec in enumerate(ch.get("sections", [])):
            sec_copy = dict(sec)
            
            # Map index (0-based) to Lua section index (1-based, i.e., str(idx + 1))
            sec_id = str(idx + 1)
            sec_layout = ch_layout.get(sec_id)
            
            if sec_layout:
                waves_details = []
                for wave in sec_layout:
                    enemies_list = []
                    for enemy in wave.get("enemies", []):
                        enemy_id = enemy.get("enemy_id")
                        enemy_info = enemies_by_id.get(enemy_id) if enemy_id else None
                        
                        enemy_detail = {
                            "enemy_var": enemy.get("enemy_var"),
                            "enemy_id": enemy_id,
                            "x": enemy.get("x"),
                            "y": enemy.get("y"),
                            "vid": enemy.get("vid")
                        }
                        if enemy_info:
                            enemy_detail["NameString"] = enemy_info.get("NameString")
                            enemy_detail["HP"] = enemy_info.get("HP")
                            enemy_detail["ATK"] = enemy_info.get("ATK")
                            enemy_detail["DEF"] = enemy_info.get("DEF")
                            enemy_detail["LV"] = enemy_info.get("LV")
                            enemy_detail["ImageID"] = enemy_info.get("ImageID")
                            
                        enemies_list.append(enemy_detail)
                        
                    waves_details.append({
                        "wave_index": wave.get("wave_index"),
                        "battle_name": wave.get("battle_name"),
                        "enemies": enemies_list
                    })
                sec_copy["waves_details"] = waves_details
            else:
                sec_copy["waves_details"] = []
                
            result_sections.append(sec_copy)
            
        ch_copy = dict(ch)
        ch_copy["sections"] = result_sections
        result_chapters.append(ch_copy)
        
    return result_chapters

@app.get('/api/strings')
def get_strings():
    """Retrieve string sets for UI and narrative text."""
    string_db = gamedata.get("strings", {})
    return string_db

@app.get('/api/audio')
def get_audio_list():
    """Scan extracted-gamedata directories and return lists of pre-extracted BGM and SE files."""
    audio_data = {"BGM": [], "SE": []}
    
    for category in ["BGM", "SE"]:
        directory = os.path.join(EXTRACTED_DIR, category)
        if os.path.exists(directory):
            try:
                for f in os.listdir(directory):
                    if f.endswith(".wav"):
                        path = os.path.join(directory, f)
                        size = os.path.getsize(path)
                        # Extract BGM number/name for clean displaying
                        display_name = f
                        if category == "BGM":
                            # e.g., '03169150b52c2106408ff78547884d5cbgm38.wav' -> 'bgm38'
                            display_name = f[32:-4] if len(f) > 36 else f[:-4]
                        else:
                            # e.g., '0153ab1af6c8c377b4133da016f89866homing_ice.wav' -> 'homing_ice'
                            display_name = f[32:-4] if len(f) > 36 else f[:-4]
                        
                        audio_data[category].append({
                            "filename": f,
                            "name": display_name,
                            "path": f"{EXTRACTED_DIR}/{category}/{f}".replace("\\", "/"),
                            "size_bytes": size
                        })
                # Sort alphabetically by name
                audio_data[category].sort(key=lambda x: x["name"])
            except Exception as e:
                print(f"Error scanning {category}: {e}")
                
    return audio_data


@app.get('/api/play/{category}/{filename}')
def play_audio(category: str, filename: str):
    """
    Serve the pre-extracted WAV audio file directly.
    """
    category = category.upper()
    if category not in ["BGM", "SE"]:
        return Response(content="Invalid category", status_code=400)
        
    safe_filename = os.path.basename(filename)
    path = os.path.join(EXTRACTED_DIR, category, safe_filename)
    if not os.path.exists(path):
        return Response(content="Audio file not found", status_code=404)
        
    return FileResponse(path, media_type="audio/wav")

@app.get('/api/assets')
def get_assets_inventory():
    """List all assets present in local-input for debugging/inspection in UI."""
    inventory = []
    
    categories = ["BG", "BGM", "Banner", "BuddyImages", "BuddyThumbs", "Illust", "Pieces", "SE", "Scenario"]
    for cat in categories:
        directory = os.path.join(LOCAL_INPUT_DIR, cat)
        if os.path.exists(directory):
            try:
                for f in os.listdir(directory):
                    if f.endswith(".bin"):
                        path = os.path.join(directory, f)
                        size = os.path.getsize(path)
                        # Determine if encrypted (starts with ENCA) or standard (starts with UnityFS)
                        signature = "Unknown"
                        try:
                            with open(path, "rb") as test_f:
                                head = test_f.read(7)
                                if head.startswith(b"ENCA"):
                                    signature = "ENCA (Encrypted)"
                                elif head.startswith(b"UnityFS"):
                                    signature = "UnityFS (AssetBundle)"
                        except Exception:
                            pass
                            
                        inventory.append({
                            "category": cat,
                            "filename": f,
                            "path": f"{LOCAL_INPUT_DIR}/{cat}/{f}".replace("\\", "/"),
                            "size_bytes": size,
                            "signature": signature
                        })
            except Exception:
                pass
                
    return inventory

@app.get('/api/assets/image')
def serve_image(path: str):
    """
    Serve pre-extracted images from user-data/extracted-gamedata.
    """
    normalized_path = os.path.normpath(path).replace("\\", "/")
    
    # Validation to prevent path traversal outside user-data/extracted-gamedata
    if not normalized_path.startswith("user-data/extracted-gamedata/"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(normalized_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(normalized_path, media_type="image/png")

@app.get('/api/item/{item_id}')
def get_item_details(item_id: int):
    """Retrieve details for a specific item, including obtain sources (loot) and usage requirements."""
    item_db = gamedata.get("items", {})
    item_set = item_db.get("itemSet", [])
    
    idx = item_id - 1
    if idx < 0 or idx >= len(item_set):
        raise HTTPException(status_code=404, detail="Item not found")
        
    item = item_set[idx]
    
    # 1. Used For: Character Job Unlocks
    used_in_jobs = []
    char_db = gamedata.get("characters", {})
    char_infos = char_db.get("infos", [])
    jobs_data = char_db.get("data", [])
    jobs_by_id = {job["ID"]: job for job in jobs_data}
    
    for char in char_infos:
        for job_id in char.get("Jobs", []):
            job = jobs_by_id.get(job_id)
            if job:
                for item_entry in job.get("items", []):
                    code = item_entry.get("code", 0)
                    if code > 0 and (code // 256) == item_id:
                        count = code % 256
                        used_in_jobs.append({
                            "character_id": char["ID"],
                            "character_name": char["NameString"],
                            "job_name": job["NameString"],
                            "count": count
                        })
                        
    # 2. Used For: Rebirth/Reconstruction
    used_in_rebirth = []
    rebirth_infos = char_db.get("rebirthInfo", [])
    char_infos_by_id = {c["ID"]: c for c in char_infos}
    
    for rb in rebirth_infos:
        for item_entry in rb.get("items", []):
            code = item_entry.get("code", 0)
            if code > 0 and (code // 256) == item_id:
                count = code % 256
                src_char = char_infos_by_id.get(rb.get("srcChrID", 0))
                dst_char = char_infos_by_id.get(rb.get("dstChrID", 0))
                used_in_rebirth.append({
                    "src_character_id": rb.get("srcChrID"),
                    "src_character_name": src_char["NameString"] if src_char else None,
                    "dst_character_id": rb.get("dstChrID"),
                    "dst_character_name": dst_char["NameString"] if dst_char else None,
                    "count": count
                })
                
    # 3. Used For: Buddy Evolution
    used_in_buddies = []
    buddy_db = gamedata.get("buddies", {})
    buddy_data = buddy_db.get("data", [])
    
    for buddy in buddy_data:
        for item_entry in buddy.get("items", []):
            code = item_entry.get("code", 0)
            if code > 0 and (code // 256) == item_id:
                count = code % 256
                used_in_buddies.append({
                    "buddy_id": buddy.get("ID"),
                    "buddy_name": buddy.get("NameString"),
                    "count": count
                })
                
    # 4. Where to Obtain: Enemy Drops
    dropped_by_enemies = []
    enemy_db = gamedata.get("enemies", {})
    enemy_data = enemy_db.get("data", [])
    
    enemy_id_to_drops = {}
    for enemy in enemy_data:
        for item_entry in enemy.get("items", []):
            code = item_entry.get("code", 0)
            if code > 0 and (code // 256) == item_id:
                rate = code % 256
                enemy_id_to_drops[enemy["ID"]] = rate
                dropped_by_enemies.append({
                    "enemy_id": enemy["ID"],
                    "enemy_name": enemy.get("NameString"),
                    "rate": rate
                })
                
    # 5. Where to Obtain: Stages/Chapters
    dropped_in_stages = []
    stages_db = gamedata.get("stages", {})
    chapters = stages_db.get("chapters", [])
    layout_db = gamedata.get("stages_layout", {})
    enemies_by_id = {e["ID"]: e for e in enemy_data}
    
    for ch in chapters:
        chapter_no = str(ch.get("chapterNo", ""))
        ch_layout = layout_db.get(chapter_no, {})
        
        for s_idx, sec in enumerate(ch.get("sections", [])):
            sec_id = str(s_idx + 1)
            sec_layout = ch_layout.get(sec_id)
            
            is_section_drop = (sec.get("itemID") == item_id)
            section_drop_count = sec.get("itemCount", 0) if is_section_drop else 0
            
            spawning_enemies = {}
            if sec_layout:
                for wave in sec_layout:
                    for enemy in wave.get("enemies", []):
                        eid = enemy.get("enemy_id")
                        if eid in enemy_id_to_drops:
                            spawning_enemies[eid] = enemy_id_to_drops[eid]
            
            if is_section_drop or spawning_enemies:
                dropped_in_stages.append({
                    "chapter_no": ch.get("chapterNo"),
                    "section_index": s_idx + 1,
                    "section_title": sec.get("title"),
                    "is_section_drop": is_section_drop,
                    "section_drop_count": section_drop_count,
                    "spawning_enemies": [
                        {
                            "enemy_id": eid,
                            "enemy_name": enemies_by_id[eid].get("NameString") if eid in enemies_by_id else None,
                            "rate": rate
                        } for eid, rate in spawning_enemies.items()
                    ]
                })
                
    dropped_in_stages.sort(key=lambda x: (x["chapter_no"], x["section_index"]))
    
    return {
        "item_id": item_id,
        "name": item.get("NameString"),
        "desc": item.get("DescString"),
        "sort_order": item.get("sortOrder"),
        "icon_url": f"/api/assets/item/item_{item_id:02d}.png",
        "dropped_by_enemies": dropped_by_enemies,
        "dropped_in_stages": dropped_in_stages,
        "used_in_jobs": used_in_jobs,
        "used_in_rebirth": used_in_rebirth,
        "used_in_buddies": used_in_buddies
    }

# Web App Page Router
@app.get('/')
def index_page():
    """Serve the React single-page application."""
    if os.path.exists('frontend/dist/index.html'):
        return FileResponse('frontend/dist/index.html')
    return HTMLResponse("React frontend not found. Please run 'npm run build' in the 'frontend' directory.", status_code=404)

def open_browser():
    """Open user's default browser to local server port."""
    webbrowser.open_new("http://127.0.0.1:5001/")

if __name__ == "__main__":
    # Automatically open browser in 1.5 seconds
    Timer(1.5, open_browser).start()
    
    # Run local web server
    print("Starting FastAPI web server...")
    uvicorn.run(app, host="127.0.0.1", port=5001)
