# 发布流程

每次更新只需两步：一个命令同步版本号，一个命令构建推送全部平台。

## 第 1 步 — 同步版本号

```bash
node tools/release.js <版本号> "更新内容1" "更新内容2"
```

示例：

```bash
node tools/release.js 6.4 "账户资产重构" "家务历史折叠优化"
node tools/release.js 6.4.1 --date 2026-06-01 "修复侧边栏闪烁"
```

脚本自动更新以下 **6 个文件** 中的版本号：

| 文件 | 更新内容 |
|------|---------|
| `version.json` | `version` + `buildDate` |
| `js/model.js` | `const VERSION = '6.4'` |
| `sw.js` | `CACHE_PREFIX + '-v6.4'` |
| `v2/src/main.js` | `const APP_VERSION = '6.4'` |
| `index.html` | 侧边栏底部版本号文本 |
| `DOCKERHUB.md` | 「最新版本」区块的版本号和更新记录 |

## 第 2 步 — 构建 + 推送

```powershell
pwsh tools/publish.ps1
```

一条命令完成：

1. `docker build` → 构建 latest + vX.Y.Z 两个 tag
2. `docker push` → 推送 Docker Hub
3. `git add -A && git commit` → 提交所有变更
4. `git push origin main` → 推送 GitHub

支持自定义 commit message（默认用上次 commit 信息）：

```powershell
pwsh tools/publish.ps1 -GitMessage "v6.4: 重大更新 - 账户重构和家务优化"
```

## 完整操作流程

```bash
# 1. 开发完成后，运行版本释放脚本
node tools/release.js 6.4 "新增功能A" "修复B" "优化C"

# 2. 确认 version.json、DOCKERHUB.md 内容正确

# 3. 一键发布
pwsh tools/publish.ps1
```

3 分钟完成，不再需要手动查找替换版本号。
