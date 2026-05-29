# 小财迷 · Finance OS

本地优先的个人财务与生活管理仪表盘，适合部署在 NAS、家用服务器或本机 Docker 环境中。前端以暗色 OLED 风格为主，数据默认保存在本地，支持 PWA 安装到桌面。

A local-first personal finance and life-management dashboard for NAS, home servers, and local Docker deployments. It ships with an OLED-inspired dark interface, local persistence by default, and PWA install support.

## 最新版本 / Latest Release

**v7.1 · 2026-05-29**

本版重点更新：

- 修复 normalizeLedgerSeeds 公式 double-count bug（v3 数据迁移自愈）
- Currency 千分位格式化（Intl.NumberFormat ¥1,234.56）
- 柱状图：最小高度 8px + 对数轴自动/手动切换
- 记账防呆风控：大额确认弹窗（¥5000+）
- 前后端双写同步：saveState Push + loadState Pull
- i18n 新增：logScale / linearScale / logScaleHint / largeAmountWarning
- 修复账户表单按钮事件委托

Highlights:

- 修复 normalizeLedgerSeeds 公式 double-count bug（v3 数据迁移自愈）
- Currency 千分位格式化（Intl.NumberFormat ¥1,234.56）
- 柱状图：最小高度 8px + 对数轴自动/手动切换
- 记账防呆风控：大额确认弹窗（¥5000+）
- 前后端双写同步：saveState Push + loadState Pull
- i18n 新增：logScale / linearScale / logScaleHint / largeAmountWarning
- 修复账户表单按钮事件委托

## 功能模块 / Modules

### 核心财务 / Core Finance

- 仪表盘：总资产、本月收入、本月支出、预算剩余、今日统计，四连 KPI + 近期流水 + 资产分布
- 交易记录：收入 / 支出 / 转账记账，分类、标签、备注、周期性规则，支持编辑和撤销删除
- 账户资产：多类型（现金、银行卡、支付宝、微信、基金、股票、医保、信用卡、负债），净值摘要 + 占比条可视化，手动调余额自动生成调整记录
- 数据分析：近 6 月收支趋势、分类排行、预算使用率
- 账户余额联动：新增 / 编辑 / 删除交易时自动同步账户余额（收入+ / 支出- / 删除回滚 / 编辑差额修正）
- 基金投资：买入从资金账户扣款，卖出回到账户，自动核算成本和市值

### 生活管理 / Life Management

- 家务管理：周期性家庭任务，支持每几天 / 每周 / 每几周 / 每月 / 每几个月重复，成员分配，完成历史（折叠展示），筛选与统计
- 任务看板：三列拖拽（待办 / 进行中 / 已完成）
- 提醒中心：一次性 / 周期提醒，番茄专注联动
- 日历、购物清单、餐食计划

### 资料库 / Library

- 便签、联系人（含生日提醒）

### 通用 / General

- 本地优先：默认浏览器 localStorage + Docker volume 绑定的 data/ 目录，无后端依赖可离线使用
- PWA：一键安装到桌面，Service Worker 离线缓存
- 中英双语：界面一键切换
- 暗色主题：OLED 深色界面，统一设计令牌（Linear / Raycast 风格）
- 版本号显示 + 强制刷新（清除 SW 缓存并硬重载）

---

### Core Finance

- Dashboard: total assets, monthly income/expense, budget remaining, today's stats — 4-KPI layout with recent transactions and asset distribution
- Transactions: income/expense/transfer with categories, tags, notes, recurring rules, edit support and undo-delete
- Accounts: multi-type support (cash, bank, Alipay, WeChat, fund, stock, medical, credit, debt) with net-worth summary, share bars, and adjustment records on manual balance changes
- Analytics: 6-month trends, category breakdown, budget usage
- Auto-sync ledger: account balance updates on every CRUD (income adds, expense subtracts, delete rolls back, edit applies delta)
- Fund investment: buy deducts from account, sell returns to account, cost and market value auto-tracked

### Life Management

- Chores: recurring household tasks (every N days / weekly / bi-weekly / monthly / every N months), member assignment, collapseable completion history, filters and stats
- Tasks: three-column Kanban (todo / in-progress / done)
- Reminders: one-time and recurring, Pomodoro timer integration
- Calendar, Shopping Lists, and Meal Planning

### Library

- Notes, Contacts with birthday reminders

### General

- Local-first: browser localStorage + Docker volume bind-mounted data/ directory, works fully offline
- PWA: install to desktop, Service Worker offline caching
- Bilingual: Chinese/English toggle
- Dark theme: OLED-inspired interface with unified design tokens (Linear / Raycast style)
- Version badge + Force Refresh (clear SW cache and hard reload)

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

- 纯 HTML / CSS / JavaScript，零构建工具，原生 ES Modules
- 模块化架构：`src/core/` 框架层（dom / i18n / router / store）+ `src/modules/` 业务模块
- 统一状态管理 + localStorage 持久化（`xiaocaimi:v2:snapshot`），旧数据自动迁移
- PWA manifest + Service Worker（版本化缓存管理）
- Python 3.13 slim 静态服务与同步接口
- Docker 镜像：`greenmini/xiaocaimi:latest`

- Vanilla HTML / CSS / JavaScript, zero build tools, native ES Modules
- Modular architecture: `src/core/` framework layer (dom / i18n / router / store) + `src/modules/` business modules
- Unified state management + localStorage persistence (`xiaocaimi:v2:snapshot`), automatic legacy migration
- PWA manifest and Service Worker (versioned cache management)
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
