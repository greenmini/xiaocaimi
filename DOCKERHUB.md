# 小财迷 · Finance OS

本地优先的个人财务与生活管理仪表盘，适合部署在 NAS、家用服务器或本机 Docker 环境中。前端以暗色 OLED 风格为主，数据默认保存在本地，支持 PWA 安装到桌面。

A local-first personal finance and life-management dashboard for NAS, home servers, and local Docker deployments. It ships with an OLED-inspired dark interface, local persistence by default, and PWA install support.

## 最新版本 / Latest Release

**v6.4 · 2026-05-29**

本版重点更新：

- 架构重构：新增统一存储层 storageService，所有 localStorage 读写使用命名空间 xiaocaimi:*，旧数据自动迁移
- 业务 Service 层：accountService / transactionService / analyticsService / contactService / taskService / noteService，页面组件不再直接操作数据
- 账户资金闭环：账户余额联动正确（收入+/支出-/回滚），手动调余额生成调整记录
- Dashboard 统一数据源：KPI、走势、分类均来自 analyticsService 实时计算

Highlights:

- Architecture refactor: unified storage layer with namespace xiaocaimi:*, automatic legacy key migration
- Business service layer: accountService, transactionService, analyticsService, contactService, taskService, noteService
- Closed-loop finance: balance auto-sync on CRUD, adjustment records on manual changes
- Single source of truth: all Dashboard numbers from analyticsService real-time calculation
- Codebase cleanup: removed legacy backups, old server scripts, debug files, and temp descriptors — production-only structure

## 功能模块 / Modules

### 核心财务 / Core Finance

- 仪表盘：总资产、月度收入、月度支出、预算状态、近期流水。
- 交易记录：收入 / 支出记账、分类、日期、备注、账户绑定。
- 账户资产：多账户管理，支持现金、银行卡、支付账户、基金、股票、医保、信用卡和负债。
- 数据分析：收支趋势、分类排行、图表摘要。

- Dashboard: total assets, monthly income, monthly expense, budget status, and recent activity.
- Transactions: income and expense records with categories, dates, notes, and linked accounts.
- Accounts: cash, bank cards, payment wallets, funds, stocks, medical insurance, credit cards, and liabilities.
- Analytics: cash-flow trends, category rankings, and chart summaries.

### 生活管理 / Life Management

- 日历事件
- 任务看板
- 提醒中心
- 番茄专注
- 家务管理
- 购物清单
- 餐食计划

- Calendar events
- Kanban tasks
- Reminder center
- Pomodoro focus
- Household chores
- Shopping lists
- Meal planning

### 资料库 / Library

- 便签
- 联系人
- 生日提醒

- Notes
- Contacts
- Birthday reminders

## 快速部署 / Quick Start

```bash
docker pull greenmini/xiaocaimi:latest

docker run -d \
  --name xiaocaimi \
  -p 8080:8080 \
  -v ./data:/app/data \
  --restart unless-stopped \
  greenmini/xiaocaimi:latest
```

访问 / Open:

```text
http://你的服务器IP:8080
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

启动 / Start:

```bash
docker compose up -d
```

## 数据持久化 / Persistence

建议始终挂载：

```text
./data:/app/data
```

这样容器升级或重建时，数据文件和备份不会丢失。

Always mount:

```text
./data:/app/data
```

This keeps data and backups safe when the container is upgraded or recreated.

## 技术栈 / Tech Stack

- 纯 HTML / CSS / JavaScript
- localStorage + 本地数据文件同步接口
- PWA manifest + Service Worker
- Python 3.13 slim 静态服务与同步接口
- Docker 镜像：`greenmini/xiaocaimi:latest`

- Vanilla HTML / CSS / JavaScript
- localStorage plus a local file sync endpoint
- PWA manifest and Service Worker
- Python 3.13 slim static server and sync API
- Docker image: `greenmini/xiaocaimi:latest`

## 适用场景 / Use Cases

- 个人或家庭财务记录
- NAS 私有部署
- 本地优先的生活管理面板
- 不想依赖云端账号的小型 Finance OS

- Personal or household finance tracking
- Private NAS deployment
- Local-first life management dashboard
- A small Finance OS without cloud-account dependency
