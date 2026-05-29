#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const FILES = [
  { path: 'version.json',                 type: 'json' },
  { path: 'js/model.js',                  type: 'js',   pattern: /const VERSION = '[^']*'/ },
  { path: 'sw.js',                        type: 'js',   pattern: /CACHE_PREFIX \+ '-v[^']*'/ },
  { path: 'v2/src/main.js',               type: 'js',   pattern: /const APP_VERSION = '[^']*'/ },
  { path: 'index.html',                   type: 'html', pattern: /<div class="sidebar-version"[^>]*>v[^<]*<\/div>/ },
  { path: 'DOCKERHUB.md',                 type: 'notes' },
  { path: 'CHANGELOG.md',                 type: 'changelog' },
];

function usage() {
  console.log(`Usage:
  node tools/release.js <version> [update item...]

Examples:
  node tools/release.js 6.4 "账户资产重构" "家务历史折叠优化"
  node tools/release.js 6.4.1 --date 2026-06-01 "修复小bug"
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) { usage(); process.exit(0); }
  const args = [...argv];
  const version = args.shift();
  const options = { version, date: new Date().toISOString().slice(0, 10), notes: [] };
  while (args.length) {
    const a = args.shift();
    if (a === '--date') { options.date = args.shift(); continue; }
    options.notes.push(a);
  }
  if (!options.version) { usage(); process.exit(1); }
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(options.version)) throw new Error('Version must be like 6.4 or 6.4.1');
  if (!options.notes.length) options.notes = ['例行维护更新。'];
  return options;
}

function updateVersionFile(versionInfo) {
  const file = path.join(root, 'version.json');
  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = { ...current, version: versionInfo.version, buildDate: versionInfo.date, minAppVersion: current.minAppVersion || '6.0' };
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`  ✅ version.json → ${versionInfo.version}`);
}

function updateJsPattern(filePath, pattern, version) {
  const p = path.join(root, filePath);
  const content = fs.readFileSync(p, 'utf8');
  const match = content.match(pattern);
  if (!match) throw new Error(`Pattern not found in ${filePath}: ${pattern}`);
  let replacement = match[0].replace(/v?\d+\.\d+(?:\.\d+)?/g, (m) => {
    if (m.startsWith('v')) return 'v' + version;
    return version;
  });
  if (replacement.includes("'V'")) replacement = replacement.replace(/'\d+\.\d+(?:\.\d+)?'/, `'${version}'`);
  const next = content.replace(pattern, match[0].replace(match[0].match(/\d+\.\d+(?:\.\d+)?/)[0], version));
  fs.writeFileSync(p, next, 'utf8');
  console.log(`  ✅ ${filePath}`);
}

function updateDockerHubMarkdown({ version, date, notes }) {
  const p = path.join(root, 'DOCKERHUB.md');
  const markdown = fs.readFileSync(p, 'utf8');
  const nextBlock = [
    '## 最新版本 / Latest Release', '',
    `**v${version} · ${date}**`, '',
    '本版重点更新：', '',
    ...notes.map(n => `- ${n.replace(/^\s*-\s*/, '').trim()}`), '',
    'Highlights:', '',
    ...notes.map(n => `- ${n.replace(/^\s*-\s*/, '').trim()}`), '',
  ].join('\n');
  const next = markdown.replace(
    /## 最新版本(?: \/ Latest Release)?[\s\S]*?(?=\n## 功能模块 \/ Modules)/,
    nextBlock,
  );
  if (next === markdown) throw new Error('Could not find 最新版本 block in DOCKERHUB.md');
  fs.writeFileSync(p, next, 'utf8');
  console.log(`  ✅ DOCKERHUB.md`);
}

function updateChangelog({ version, date, notes }) {
  const p = path.join(root, 'CHANGELOG.md');
  const content = fs.readFileSync(p, 'utf8');
  const lines = notes.map(n => `- ${n.replace(/^\s*-\s*/, '').trim()}`);
  const block = `## v${version} · ${date}\n\n${lines.join('\n')}\n`;
  const next = content.replace(
    /(# 更新日志 \/ Changelog\n)/,
    `$1\n${block}\n`,
  );
  fs.writeFileSync(p, next, 'utf8');
  console.log(`  ✅ CHANGELOG.md`);
}

function updateHtmlVersion(filePath, version) {
  const p = path.join(root, filePath);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/(<div class="sidebar-version"[^>]*>)v[^<]+(<\/div>)/, `$1v${version}$2`);
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  ✅ ${filePath}`);
}

const options = parseArgs(process.argv.slice(2));
const v = options.version;

console.log(`\n🚀 发布 v${v} (${options.date})`);
console.log(`   更新记录: ${options.notes.join(', ')}`);
console.log('');

console.log('同步版本号...');
updateVersionFile(options);
updateJsPattern('js/model.js', /const VERSION = '[^']*'/, v);
updateJsPattern('sw.js', /CACHE_PREFIX \+ '-v[^']*'/, v);
updateJsPattern('v2/src/main.js', /const APP_VERSION = '[^']*'/, v);
updateHtmlVersion('index.html', v);
updateDockerHubMarkdown(options);
updateChangelog(options);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  版本号已全部同步完毕！');
console.log('');
console.log('  下一步执行：');
console.log('    pwsh tools/publish.ps1');
console.log('  （构建Docker镜像 → 推送Docker Hub → 推送GitHub）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
