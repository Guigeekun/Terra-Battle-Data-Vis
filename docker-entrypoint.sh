#!/bin/bash
set -e

# Check if the extracted data already exists
if [ ! -d "/app/user-data/extracted-gamedata/game_data" ] || [ -z "$(ls -A /app/user-data/extracted-gamedata/game_data 2>/dev/null)" ]; then
    echo "Extracted game data not found in user-data."
    
    # Only run extraction if the script is mounted
    if [ -f "/app/scripts/extract_everything.py" ]; then
        echo "Running extract_everything.py to generate assets..."
        python /app/scripts/extract_everything.py
    else
        echo "Warning: extract_everything.py not found! Cannot generate assets."
    fi
else
    echo "Extracted game data found, skipping extraction."
fi

# Execute the CMD from the Dockerfile
exec "$@"
