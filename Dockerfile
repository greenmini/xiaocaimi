# 小财迷 Dockerfile
FROM python:3.13-slim

WORKDIR /app

# 复制静态文件和服务端
COPY sync_server_v2.py .
COPY index.html .
COPY manifest.json .
COPY styles.css .
COPY src/ ./src/
COPY icons/ ./icons/

# 版本信息（OTA 更新检查用）
COPY version.json ./version.json

# 入口脚本
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
