param(
  [string]$Repository = "greenmini/xiaocaimi",
  [string]$MarkdownPath = "DOCKERHUB.md"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$markdownFile = Join-Path $root $MarkdownPath

if (-not (Test-Path $markdownFile)) {
  throw "Docker Hub markdown file not found: $markdownFile"
}

$tmp = Join-Path $env:TEMP "xiaocaimi-dockerhub-publish"
New-Item -ItemType Directory -Force $tmp | Out-Null

$loginPath = Join-Path $tmp "login.json"
$payloadPath = Join-Path $tmp "payload.json"
$verifyPath = Join-Path $tmp "verify.json"

node -e @'
const fs = require('fs');
const cp = require('child_process');
const repo = process.argv[1];
const markdownFile = process.argv[2];
const tmp = process.argv[3];
const full = fs.readFileSync(markdownFile, 'utf8');
const title = full.split(/\r?\n/)[0].replace(/^#\s*/, '').trim();
const description = `${title} · Docker/PWA · Local-first finance dashboard`;
const cred = JSON.parse(cp.execFileSync('docker-credential-desktop.exe', ['get'], {
  input: 'https://index.docker.io/v1/\n',
  encoding: 'utf8',
}));
fs.writeFileSync(`${tmp}/login.json`, JSON.stringify({ username: cred.Username, password: cred.Secret }), 'utf8');
fs.writeFileSync(`${tmp}/payload.json`, JSON.stringify({ description, full_description: full }), 'utf8');
console.log(`Prepared Docker Hub payload for ${repo}: ${description}`);
'@ $Repository $markdownFile $tmp

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "https://hub.docker.com/v2/users/login/" `
  -ContentType "application/json; charset=utf-8" `
  -InFile $loginPath `
  -TimeoutSec 60

$owner, $name = $Repository.Split("/", 2)
Invoke-RestMethod `
  -Method Patch `
  -Uri "https://hub.docker.com/v2/repositories/$owner/$name/" `
  -Headers @{ Authorization = "JWT $($login.token)" } `
  -ContentType "application/json; charset=utf-8" `
  -InFile $payloadPath `
  -TimeoutSec 60 | Out-Null

$verify = Invoke-WebRequest `
  -UseBasicParsing `
  -Uri "https://hub.docker.com/v2/repositories/$owner/$name/" `
  -TimeoutSec 60

[System.IO.File]::WriteAllBytes($verifyPath, $verify.RawContentStream.ToArray())

node -e @'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
console.log(JSON.stringify({
  description: data.description,
  title: data.full_description.split('\n')[0],
  last_modified: data.last_modified,
}, null, 2));
'@ $verifyPath

Remove-Item $loginPath, $payloadPath, $verifyPath -ErrorAction SilentlyContinue
