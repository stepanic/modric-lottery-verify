#!/bin/bash

# verify_media.sh
# Analyzes images in the media directory using exiftool
# and saves their metadata as JSON files alongside them to verify origin.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MEDIA_DIR="$PROJECT_ROOT/media"

if ! command -v exiftool &> /dev/null; then
    echo "Error: exiftool is not installed. Please install it (e.g., brew install exiftool) and run this script again."
    exit 1
fi

if [ ! -d "$MEDIA_DIR" ]; then
    echo "Error: media directory not found at $MEDIA_DIR"
    exit 1
fi

echo "Verifying media files in $MEDIA_DIR..."

find "$MEDIA_DIR" -maxdepth 1 -type f \( -iname \*.jpg -o -iname \*.jpeg -o -iname \*.png -o -iname \*.heic \) | while read -r IMAGE_FILE; do
    echo "Processing $IMAGE_FILE..."
    JSON_FILE="${IMAGE_FILE}.json"
    
    # Extract metadata using exiftool in JSON format (-j flag)
    # The output is an array of objects, we use jq or just redirect the array
    exiftool -j "$IMAGE_FILE" > "$JSON_FILE"
    
    # Verify the JSON was created successfully
    if [ -s "$JSON_FILE" ]; then
        echo "Successfully created $JSON_FILE"
    else
        echo "Failed to extract metadata for $IMAGE_FILE"
    fi
done

echo "Media verification complete."
