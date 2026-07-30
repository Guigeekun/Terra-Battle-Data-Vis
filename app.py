import os
import sys
import json
import webbrowser
from threading import Timer
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

import io

# Initialize FastAPI App using lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load databases before launching web server
    print("Loading game data databases...")
    load_databases()
    load_inverse_table()
    yield

app = FastAPI(lifespan=lifespan)

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# Paths
DATA_DIR = os.path.join("user-data", "extracted-gamedata", "game_data")
LOCAL_INPUT_DIR = os.path.join("local-input", "resources", "data_u2017", "android")

# Cached Databases
gamedata = {}
INVERSE_TABLE = None

def load_inverse_table():
    global INVERSE_TABLE
    apk_path = os.path.join("local-input", "terra-battle-5.5.7-170.apk")
    if os.path.exists("config.json"):
        try:
            with open("config.json", "r", encoding="utf-8") as f:
                config = json.load(f)
                apk_path = config.get("apk_path", apk_path)
        except Exception:
            pass
            
    if os.path.exists(apk_path):
        try:
            import zipfile
            with zipfile.ZipFile(apk_path) as z:
                metadata = z.read("assets/bin/Data/Managed/Metadata/global-metadata.dat")
                INVERSE_TABLE = metadata[0x601CAD : 0x601CAD + 256]
                print("Loaded ENCA decryption table from APK metadata.")
        except Exception as e:
            print(f"Warning: Could not load decryption table from APK metadata: {e}")

MAGIC = b"ENCA"

def _calc_index(index: int, size: int) -> int:
    low = index & 0xFF
    if (index >> 8) != ((size - 1) >> 8):
        low ^= 0xFF
    return (index & ~0xFF) | low

def _transform_byte(value: int) -> int:
    return ((value >> 4) | ((value & 0x0F) << 4)) ^ 0xFF

def decrypt_enca(source: bytes) -> bytes:
    if not source.startswith(MAGIC) or INVERSE_TABLE is None:
        return source
    size = len(source) - len(MAGIC)
    if size == 0:
        return b""
    plain = bytearray(size)
    for source_index, value in enumerate(source[len(MAGIC):]):
        plain[_calc_index(size - 1 - source_index, size)] = _transform_byte(INVERSE_TABLE[value])
    return bytes(plain)


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
    Search local-input resources for an asset by its ImageID.
    Supports zero-padding for single-digit IDs.
    """
    directory = os.path.join(LOCAL_INPUT_DIR, category)
    if not os.path.exists(directory):
        return None
    
    id_str_padded = f"{image_id:02d}" if image_id < 10 else str(image_id)
    suffix_padded = f"{prefix}_{id_str_padded}.bin"
    suffix_normal = f"{prefix}_{image_id}.bin"
    
    try:
        for f in os.listdir(directory):
            if f.endswith(suffix_padded) or f.endswith(suffix_normal):
                return f"{LOCAL_INPUT_DIR}/{category}/{f}".replace("\\", "/")
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
    """Scan local-input directories and return lists of BGM and SE files."""
    audio_data = {"BGM": [], "SE": []}
    
    for category in ["BGM", "SE"]:
        directory = os.path.join(LOCAL_INPUT_DIR, category)
        if os.path.exists(directory):
            try:
                for f in os.listdir(directory):
                    if f.endswith(".bin"):
                        path = os.path.join(directory, f)
                        size = os.path.getsize(path)
                        # Extract BGM number/name for clean displaying
                        display_name = f
                        if category == "BGM":
                            # e.g., '03169150b52c2106408ff78547884d5cbgm38.bin' -> 'bgm38'
                            display_name = f[32:-4] if len(f) > 36 else f[:-4]
                        else:
                            # e.g., '0153ab1af6c8c377b4133da016f89866homing_ice.bin' -> 'homing_ice'
                            display_name = f[32:-4] if len(f) > 36 else f[:-4]
                        
                        audio_data[category].append({
                            "filename": f,
                            "name": display_name,
                            "path": f"{LOCAL_INPUT_DIR}/{category}/{f}".replace("\\", "/"),
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
    On-the-fly audio extraction endpoint.
    Loads the UnityFS file, extracts the AudioClip WAV data, and streams it.
    """
    category = category.upper()
    if category not in ["BGM", "SE"]:
        return Response(content="Invalid category", status_code=400)
        
    path = os.path.join(LOCAL_INPUT_DIR, category, filename)
    if not os.path.exists(path):
        return Response(content="Audio file not found", status_code=404)
        
    try:
        import UnityPy
        env = UnityPy.load(path)
        clips = [obj.read() for obj in env.objects if obj.type.name == 'AudioClip']
        if not clips:
            return Response(content="No AudioClip found inside asset bundle", status_code=404)
            
        clip = clips[0]
        # clip.samples is a dict of {wav_filename: bytes}
        if not clip.samples:
            return Response(content="Audio data samples empty", status_code=404)
            
        wav_name = next(iter(clip.samples.keys()))
        wav_bytes = clip.samples[wav_name]
        
        return Response(content=wav_bytes, media_type="audio/wav")
    except Exception as e:
        print(f"Error extracting audio: {e}")
        return Response(content=f"Audio extraction error: {e}", status_code=500)

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
    On-the-fly decryption and image extraction endpoint for Illust, Pieces, etc.
    """
    normalized_path = os.path.normpath(path).replace("\\", "/")
    
    # Validation to prevent path traversal outside local-input
    if not (normalized_path.startswith("local-input/resources/data_u2017/android/") or 
            normalized_path.startswith("local-input/resources/data/")):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(normalized_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with open(normalized_path, "rb") as f:
            file_bytes = f.read()
            
        # Decrypt if encrypted with ENCA
        decrypted_bytes = decrypt_enca(file_bytes)
        
        # Load with UnityPy
        import UnityPy
        env = UnityPy.load(decrypted_bytes)
        
        # Find first Texture2D or Sprite
        for obj in env.objects:
            if obj.type.name in ('Texture2D', 'Sprite'):
                data = obj.read()
                img = data.image
                
                # Stream as PNG
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                png_bytes = buf.getvalue()
                
                return Response(content=png_bytes, media_type="image/png")
                
        raise HTTPException(status_code=404, detail="No image asset found in bundle")
    except Exception as e:
        print(f"Error serving image asset {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Web App Page Router
@app.get('/')
def index_page():
    """Serve the visualizer single-page application dashboard."""
    return FileResponse('templates/index.html')

def open_browser():
    """Open user's default browser to local server port."""
    webbrowser.open_new("http://127.0.0.1:5001/")

if __name__ == "__main__":
    # Automatically open browser in 1.5 seconds
    Timer(1.5, open_browser).start()
    
    # Run local web server
    print("Starting FastAPI web server...")
    uvicorn.run(app, host="127.0.0.1", port=5001)
