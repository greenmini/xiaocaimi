#!/usr/bin/env python3
"""小财迷 · 同步服务器（含 API）"""
import http.server, json, os, shutil, sys
from datetime import datetime
from urllib.parse import urlparse

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
SYNC_TOKEN = os.environ.get("SYNC_TOKEN", "").strip()

os.makedirs(BACKUP_DIR, exist_ok=True)

class FinanceHandler(http.server.SimpleHTTPRequestHandler):
    def _check_auth(self):
        if not SYNC_TOKEN:
            return True
        expected = f"Bearer {SYNC_TOKEN}"
        if self.headers.get("Authorization") == expected:
            return True
        self.send_error(401, "Unauthorized")
        return False

    def do_GET(self):
        if urlparse(self.path).path == "/api/data":
            if not self._check_auth():
                return
            try:
                with open(DATA_FILE) as f:
                    data = json.load(f)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
            except Exception as e:
                self.send_error(500, str(e))
            return
        if urlparse(self.path).path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path == "/api/data":
            if not self._check_auth():
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)

                # Backup old data before overwriting
                if os.path.exists(DATA_FILE):
                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    backup_path = os.path.join(BACKUP_DIR, f"data_{ts}.json")
                    shutil.copy2(DATA_FILE, backup_path)
                    # Keep only last 30 backups
                    backups = sorted(os.listdir(BACKUP_DIR))
                    for old in backups[:-30]:
                        os.remove(os.path.join(BACKUP_DIR, old))

                with open(DATA_FILE, "w") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                self.send_error(500, str(e))
            return
        return super().do_POST()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(("0.0.0.0", PORT), FinanceHandler)
    print(f"小财迷服务器: http://0.0.0.0:{PORT}")
    print(f"数据文件: {DATA_FILE}")
    print(f"备份目录: {BACKUP_DIR}")
    print("同步鉴权:", "已启用" if SYNC_TOKEN else "未启用")
    server.serve_forever()
