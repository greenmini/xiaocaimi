#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const versionPath = path.join(root, 'version.json');
const dockerHubPath = path.join(root, 'DOCKERHUB.md');

function usage() {
  console.log(`Usage:
  node tools/release.js <version> [update item...]

Examples:
  node tools/release.js 6.4 "优化账户资产" "修复提醒筛选"
  node tools/release.js 6.4 --date 2026-05-29 --min 6.0 "新增预算分类"
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }
  const args = [...argv];
  const version = args.shift();
  const options = {
    version,
    date: new Date().toISOString().slice(0, 10),
    minAppVersion: null,
    notes: [],
  };

  while (args.length) {
    const arg = args.shift();
    if (arg === '--date') {
      options.date = args.shift();
      continue;
    }
    if (arg === '--min') {
      options.minAppVersion = args.shift();
      continue;
    }
    options.notes.push(arg);
  }

  if (!options.version) {
    usage();
    process.exit(1);
  }
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(options.version)) {
    throw new Error('Version must look like 6.4 or 6.4.1');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Date must look like 2026-05-29');
  }
  if (!options.notes.length) {
    options.notes = ['例行维护更新。'];
  }
  return options;
}

function updateVersionFile({ version, date, minAppVersion }) {
  const current = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const next = {
    ...current,
    version,
    buildDate: date,
    minAppVersion: minAppVersion || current.minAppVersion || '6.0',
  };
  fs.writeFileSync(versionPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

function updateDockerHubMarkdown({ version, date, notes }) {
  const markdown = fs.readFileSync(dockerHubPath, 'utf8');
  const nextBlock = [
    '## 最新版本 / Latest Release',
    '',
    `**v${version} · ${date}**`,
    '',
    '本版重点更新：',
    '',
    ...notes.map(note => `- ${note.replace(/^\s*-\s*/, '').trim()}`),
    '',
    'Highlights:',
    '',
    ...notes.map(note => `- ${note.replace(/^\s*-\s*/, '').trim()}`),
    '',
  ].join('\n');

  const next = markdown.replace(
    /## 最新版本(?: \/ Latest Release)?[\s\S]*?(?=\n## 功能模块 \/ Modules)/,
    nextBlock,
  );
  if (next === markdown) {
    throw new Error('Could not find the 最新版本 block in DOCKERHUB.md');
  }
  fs.writeFileSync(dockerHubPath, next, 'utf8');
}

const options = parseArgs(process.argv.slice(2));
updateVersionFile(options);
updateDockerHubMarkdown(options);

console.log(`Updated version.json and DOCKERHUB.md to v${options.version} (${options.date}).`);
console.log('Next: run tools/publish-dockerhub.ps1 after Docker Hub text is ready to sync.');
