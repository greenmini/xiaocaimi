#!/bin/bash
# 小财迷 Docker entrypoint

DATA_FILE="/app/data/data.json"
BACKUP_DIR="/app/data/backups"

mkdir -p "$BACKUP_DIR"

exec python3 /app/sync_server_v2.py 8080
