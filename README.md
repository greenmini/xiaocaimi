# 小财迷 · Finance OS

本地优先的个人财务与生活管理仪表盘，适合部署在 NAS、家用服务器或本机 Docker 环境中。

XiaoCaiMi is a local-first personal finance and life-management dashboard for NAS, home servers, and local Docker deployments.

## 功能 / Features

- 核心财务：仪表盘、交易记录、账户资产、数据分析。
- 生活管理：日历、任务、提醒、番茄专注、家务管理、购物、餐食。
- 资料库：便签、联系人、生日提醒。
- 本地优先：数据默认保存在本地，支持 Docker 持久化挂载。
- PWA：支持安装到桌面。

- Core finance: dashboard, transactions, accounts, and analytics.
- Life management: calendar, tasks, reminders, Pomodoro focus, chores, shopping, and meals.
- Library: notes, contacts, and birthday reminders.
- Local-first: data is stored locally by default with Docker volume persistence.
- PWA: installable desktop experience.

## Docker

```bash
docker pull greenmini/xiaocaimi:latest

docker run -d \
  --name xiaocaimi \
  -p 8080:8080 \
  -v ./data:/app/data \
  --restart unless-stopped \
  greenmini/xiaocaimi:latest
```

Open:

```text
http://your-server-ip:8080
```

## Docker Compose

```yaml
services:
  xiaocaimi:
    image: greenmini/xiaocaimi:latest
    container_name: xiaocaimi
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 本地预览 / Local Preview

```bash
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/v2/
```

## 版本 / Version

Current Docker release metadata is stored in `version.json`.
