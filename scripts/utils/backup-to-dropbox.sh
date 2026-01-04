#!/bin/bash
#
# Walla Walla Travel - Dropbox Backup Script
#
# Creates a timestamped backup of the project to Dropbox.
# Excludes node_modules, .next, .git, and log files.
#
# Usage: ./scripts/backup-to-dropbox.sh [optional: change summary]
#

set -e

# Configuration
SOURCE_DIR="/Users/temp/walla-walla-final"
DROPBOX_BASE="/Users/temp/Dropbox/My Documents DB/Claude Project Backup Files/Walla Walla Travel App Backup"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BACKUP_DIR="$DROPBOX_BASE/walla-walla-travel_$TIMESTAMP"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Walla Walla Travel - Dropbox Backup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Create backup directory
echo -e "${GREEN}Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"

# Copy files
echo -e "${GREEN}Copying project files (excluding node_modules, .next, .git)...${NC}"
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.turbo' \
  --exclude='dist' \
  --exclude='coverage' \
  --exclude='.cache' \
  "$SOURCE_DIR/" "$BACKUP_DIR/"

# Get statistics
FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')
SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# Get optional change summary from argument
CHANGE_SUMMARY="${1:-No summary provided}"

# Create BACKUP_INFO.txt
echo -e "${GREEN}Creating BACKUP_INFO.txt...${NC}"
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
================================================================================
WALLA WALLA TRAVEL - PROJECT BACKUP
================================================================================

Backup Date:     $(date '+%Y-%m-%d %H:%M:%S')
Source:          $SOURCE_DIR
Destination:     walla-walla-travel_$TIMESTAMP

--------------------------------------------------------------------------------
STATISTICS
--------------------------------------------------------------------------------
Files:           $FILE_COUNT
Size:            $SIZE

--------------------------------------------------------------------------------
CHANGE SUMMARY
--------------------------------------------------------------------------------
$CHANGE_SUMMARY

--------------------------------------------------------------------------------
EXCLUDED FROM BACKUP
--------------------------------------------------------------------------------
- node_modules/     (npm dependencies - reinstall with 'npm install')
- .next/            (Next.js build cache - rebuild with 'npm run build')
- .git/             (Git history - available from repository)
- *.log             (Log files)
- .turbo/           (Turborepo cache)
- dist/             (Build output)
- coverage/         (Test coverage reports)
- .cache/           (Various caches)

--------------------------------------------------------------------------------
RESTORE INSTRUCTIONS
--------------------------------------------------------------------------------
1. Copy backup to desired location
2. Run: npm install
3. Copy .env.local from secure location
4. Run: npm run build
5. Run: npm run dev

================================================================================
EOF

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Backup complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Location: $BACKUP_DIR"
echo "Files:    $FILE_COUNT"
echo "Size:     $SIZE"
echo ""
echo "To restore, copy the backup and run 'npm install'."
