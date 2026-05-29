# 更新日志 / Changelog

## v6.4 · 2026-05-29

架构重构版本，建立统一数据层。

- 新建 `js/storage-service.js` 统一存储底层，命名空间 `xiaocaimi:*`，旧 key 自动迁移
- 新建 6 个业务 Service：`accountService` / `transactionService` / `analyticsService` / `contactsService` / `tasksService` / `notesService`
- 账户余额成为资金核心数据源，手动调余额自动生成调整记录
- 交易 CRUD 与账户余额联动：收入+ / 支出- / 删除回滚 / 编辑差额修正
- Dashboard 四连 KPI、月度走势、分类排行统一来自 `analyticsService` 实时计算
- 联系人 / 任务 / 便签改用统一 Service，移除各处裸 `localStorage` 调用
- `js/model.js` VERSION 6.2 → 6.4
- `sw.js` Service Worker 缓存版本 6.2 → 6.4
- 新建 `tools/release.js` 版本号同步脚本
- 新建 `tools/publish.ps1` 一键构建推送脚本
- `DOCKERHUB.md` 最新版本区块内容更新

---

## v6.3.2 · 2026-05-29

功能优化与清理版本。

- 侧边栏底部显示版本号 `v6.3.2`
- 设置页新增「强制刷新」按钮，清除 Service Worker 缓存并硬重载
- 账户资产页面重构：顶部净值 / 总资产 / 总负债摘要，彩色类型卡片 + 占比条，表单折叠到「快捷操作」
- 家务完成历史折叠：默认 5 条，可展开剩余
- 项目清理：删除旧版本备份、遗留文档和临时文件
- 修复 `bindFinanceActions` 中 `action`/`actionTarget` 未定义导致折叠表单和 Tab 切换失效
- 修复基金卡片小圆点无颜色

---

## v6.2 · 2026-05

业务功能完善版本。

- Docker Hub 发布上线
- 家务管理模块（周期任务、成员分配、完成历史）
- 中英双语界面切换
- PWA 安装支持
- 周期性记账规则
- 数据导出 / 导入 / PDF 月报

---

## v6.0–v6.1 · 2026-04

项目初版上线。

- 核心财务：Dashboard、账户管理、交易记录、数据分析
- 生活管理：日历、任务看板、提醒、番茄专注
- 资料库：便签、联系人、生日提醒
- Docker 容器化部署
- 暗色 OLED 主题
