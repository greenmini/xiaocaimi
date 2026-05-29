#!/bin/bash
# 小财迷 Docker entrypoint
# 如果 data.json 不存在（首次运行），从默认复制一份

DATA_FILE="/app/data/data.json"
BACKUP_DIR="/app/data/backups"
DEFAULT_DATA="/app/data.json.default"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DATA_FILE" ]; then
    echo "[小财迷] 首次启动，初始化数据文件..."
    cp "$DEFAULT_DATA" "$DATA_FILE"
fi

# 软链接 data.json 和 backups 到 /app/（服务器在那里找）
ln -sf "$DATA_FILE" /app/data.json
ln -sf "$BACKUP_DIR" /app/backups

exec python3 /app/sync_server_v2.py 8080
