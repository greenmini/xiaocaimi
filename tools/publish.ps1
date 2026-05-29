param(
  [string]$GitMessage = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$versionJson = Get-Content "version.json" -Raw | ConvertFrom-Json
$ver = $versionJson.version

if (-not $ver) {
  Write-Host "❌ version.json 中未找到 version 字段，请先运行 node tools/release.js" -ForegroundColor Red
  exit 1
}

if (-not $GitMessage) {
  $gitLog = git log -1 --pretty=format:"%s" 2>$null
  $GitMessage = "v$ver : $gitLog"
}

$img = "greenmini/xiaocaimi"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  发布 v$ver" -ForegroundColor Cyan
Write-Host "  Docker: ${img}:latest / ${img}:v$ver" -ForegroundColor Cyan
Write-Host "  GitHub: $GitMessage" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] 构建 Docker 镜像..." -ForegroundColor Yellow
docker build -t "${img}:latest" -t "${img}:v$ver" .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

Write-Host "[2/4] 推送 Docker Hub..." -ForegroundColor Yellow
docker push "${img}:latest"
if ($LASTEXITCODE -ne 0) { throw "Docker push latest failed" }
docker push "${img}:v$ver"
if ($LASTEXITCODE -ne 0) { throw "Docker push version tag failed" }

Write-Host "[3/4] Git 提交..." -ForegroundColor Yellow
git add -A
git commit -m $GitMessage
if ($LASTEXITCODE -ne 0) { Write-Host "  (无变更需要提交)" -ForegroundColor DarkGray }

Write-Host "[4/4] Git 推送..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Git push failed" }

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅ v$ver 发布完成！" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "  Docker: docker pull ${img}:v$ver" -ForegroundColor Gray
Write-Host "  GitHub: https://github.com/greenmini/xiaocaimi" -ForegroundColor Gray
Write-Host ""
