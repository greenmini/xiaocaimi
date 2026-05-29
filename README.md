# 小财迷 · Finance OS

本地优先的个人财务与生活管理仪表盘，适合部署在 NAS、家用服务器或本机 Docker 环境中。

XiaoCaiMi is a local-first personal finance and life-management dashboard for NAS, home servers, and local Docker deployments.

## 架构 / Architecture

纯前端 SPA，零构建工具，原生 ES Modules。

```
src/
├── core/                # 框架层
│   ├── dom.js           # HTML 模板引擎 & 工具函数
│   ├── i18n.js          # 中英双语（zh-CN / en-US）
│   ├── router.js        # Hash 路由
│   └── store.js         # 统一状态管理 & localStorage 持久化
├── modules/             # 业务模块
│   ├── finance.js       # 财务（Dashboard、交易、账户、分析）
│   ├── chores.js        # 家务管理（周期任务、成员、完成历史）
│   ├── reminders.js     # 提醒 & 番茄专注
│   ├── people.js        # 联系人 & 生日
│   ├── generic.js       # 通用模块（日历、任务、购物、便签等）
│   └── settings.js      # 设置（预算、语言、备份导入导出）
└── main.js              # 应用入口（Shell 渲染、事件绑定、路由）
```

无框架依赖，仅运行时引入 Chart.js（CDN）用于可选图表。

## 功能 / Features

### 核心财务 / Core Finance

- 仪表盘：总资产、收支统计、预算状态、今日中心。
- 账户资产：多类型账户（现金、银行卡、支付宝、微信、基金、股票、信用卡、负债），净值摘要 + 占比可视化。
- 交易记录：收入 / 支出记账、多账户转账、余额调整、基金操作。
- 数据分析：近 6 月趋势、收支对比、分类排行。

### 生活管理 / Life Management

- 家务管理：周期家务、成员分配、完成历史（折叠展示）、筛选统计。
- 任务看板：待办 / 进行中 / 已完成三列拖拽。
- 提醒中心：一次性 / 周期提醒、番茄专注联动。
- 日历、购物清单、餐食计划。

### 资料库 / Library

- 便签、联系人、生日提醒。

### 其他 / More

- 本地优先：数据保存在浏览器 localStorage / Docker volume，无后端依赖也可离线使用。
- PWA：一键安装到桌面，Service Worker 离线缓存。
- 中英双语：一键切换界面语言。
- 暗色主题：OLED 深色界面。

---

### Architecture

Pure front-end SPA, zero build tools, native ES Modules. No framework dependencies — only Chart.js (CDN) for optional charts.

```
src/
├── core/                # Framework layer
│   ├── dom.js           # HTML templates & utilities
│   ├── i18n.js          # Chinese / English bilingual
│   ├── router.js        # Hash-based router
│   └── store.js         # Unified state & localStorage persistence
├── modules/             # Business modules
│   ├── finance.js       # Finance (Dashboard, Tx, Accounts, Analytics)
│   ├── chores.js        # Recurring chores & members
│   ├── reminders.js     # Reminders & Pomodoro timer
│   ├── people.js        # Contacts & birthdays
│   ├── generic.js       # Generic (Calendar, Tasks, Shopping, Notes)
│   └── settings.js      # Settings (budget, locale, backup)
└── main.js              # App shell, routing, event binding
```

---

### Core Finance

- Dashboard: total assets, income/expense, budget, and today's agenda.
- Accounts: multi-type support (cash, bank, Alipay, WeChat, fund, stock, credit, debt) with net-worth summary and share visualization.
- Transactions: income/expense, inter-account transfers, balance adjustments, and fund trades.
- Analytics: 6-month trends, income vs expense, and category ranking.

### Life Management

- Chores: recurring household tasks, member assignment, expandable completion history, and filter/stats.
- Tasks: Kanban-style board with drag-and-drop across three columns.
- Reminders: one-time and recurring reminders, Pomodoro timer integration.
- Calendar, Shopping Lists, and Meal Planning.

### Library

- Notes, Contacts, and Birthday Reminders.

### More

- Local-first: data persists in browser localStorage / Docker volume, fully works offline.
- PWA: one-click install with Service Worker caching.
- Bilingual: Chinese/English toggle.
- Dark OLED-inspired interface.

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
http://127.0.0.1:8080/
```

## 版本 / Version

Current Docker release metadata is stored in `version.json`.
