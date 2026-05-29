# 发布流程

以后更新版本时，先用发布脚本同步版本号和 Docker Hub 文案源文件：

```bash
node tools/release.js 6.4 "更新内容 1" "更新内容 2"
```

脚本会自动更新：

- `version.json`
- `DOCKERHUB.md` 里的“最新版本”区块

确认文案无误后，同步 Docker Hub Overview：

```powershell
powershell -ExecutionPolicy Bypass -File tools/publish-dockerhub.ps1
```

Docker 镜像构建和推送仍然单独执行，避免误 build / 误 push：

```bash
docker build -t greenmini/xiaocaimi:latest .
docker push greenmini/xiaocaimi:latest
```
