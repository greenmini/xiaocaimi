/**
 * 适配层 · 小财迷数据持久化
 *
 * 策略：
 *   加载：IndexedDB（主）→ localStorage（备）→ 默认数据
 *   保存：IndexedDB + localStorage 双写
 *   内存：全局 `data` 对象，所有模块直接读写
 */

// ─── 全局状态 ──────────────────────────────────────
let data = null;
let confirmCb = null;
let page = 1;
const PP = 50;
let serverSyncTimer = null;
let moduleSyncTimer = null;

function createFullBackup() {
  return {
    schema: 'xiaocaimi-full-backup',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    appData: data,
    modules: typeof StorageService !== 'undefined' ? StorageService.snapshotModules() : {},
  };
}

function applyFullBackup(snapshot) {
  const appData = snapshot?.appData || snapshot;
  if (!appData || !appData.assets) throw new Error('无效的备份文件');
  data = migrate(deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), appData));
  ensureDefaults();
  if (snapshot?.modules && typeof StorageService !== 'undefined') {
    StorageService.restoreModules(snapshot.modules);
  }
}

function scheduleModuleSync() {
  clearTimeout(moduleSyncTimer);
  moduleSyncTimer = setTimeout(() => {
    if (typeof syncToServer === 'function' && data) syncToServer();
  }, 800);
}

// ─── 加载 ──────────────────────────────────────────

async function loadData() {
  // 1. 尝试 IndexedDB
  try {
    const idb = await financeDB.load();
    if (idb && idb.assets && idb.assets.length > 0) {
      data = idb;
      ensureDefaults();
      restoreModulesFromData();
      return;
    }
  } catch (e) {
    console.warn('IndexedDB 读取失败:', e.message);
  }

  // 2. 尝试 localStorage
  try {
    const s = storageService.get('v1:finance');
    if (s) {
      data = typeof s === 'string' ? JSON.parse(s) : s;
      if (data && data.assets && data.assets.length > 0) {
        ensureDefaults();
        restoreModulesFromData();
        // 异步回写到 IndexedDB
        saveData();
        return;
      }
    }
  } catch (e) {
    console.warn('localStorage 读取失败:', e.message);
  }

  // 3. 默认数据
  data = JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function restoreModulesFromData() {
  if (data._modules && typeof StorageService !== 'undefined') {
    StorageService.restoreModules(data._modules);
    delete data._modules;
  }
}

function ensureDefaults() {
  const defaults = {
    contacts: [], tasks: [], reminders: [], shoppingLists: [], shoppingItems: [],
    notes: [], documents: [], recipes: [], recipeIngredients: [], meals: [],
    loans: [], calendarEvents: [], recurringRules: [], fundHistory: [], funds: [],
    budget: 5000, categoryBudgets: {}, settings: {},
    version: VERSION,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (data[k] === undefined) data[k] = (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v;
  }
}

// ─── 保存 ──────────────────────────────────────────

async function saveData() {
  const debug = document.getElementById('storageDebug');
  if (debug) debug.textContent = '保存中...';

  try {
    let saved = false;

    // 同步模块数据（联系人、任务等）到主 data 对象
    if (typeof StorageService !== 'undefined') {
      data._modules = StorageService.snapshotModules();
    }

    // localStorage 先写，保证常规输入立即持久化。
    try {
      storageService.set('v1:finance', data);
      saved = true;
    } catch (e) {
      console.warn('localStorage 保存失败:', e.message);
    }

    // IndexedDB 作为增强存储，失败不阻断 localStorage 保存。
    try {
      await financeDB.save(data);
      saved = true;
    } catch (e) {
      console.warn('IndexedDB 保存失败:', e.message);
    }

    if (!saved) throw new Error('浏览器存储不可用');

    if (debug) debug.textContent = '已保存 ✓ ' + new Date().toLocaleTimeString();

    // 异步服务端同步
    clearTimeout(serverSyncTimer);
    serverSyncTimer = setTimeout(() => { if (typeof syncToServer === 'function') syncToServer(); }, 800);

  } catch (e) {
    console.error('保存失败:', e);
    if (debug) debug.textContent = '保存失败: ' + e.message;
    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
  }
}

// ─── 导出/导入（保留） ─────────────────────────────

function exportData() {
  const blob = new Blob([JSON.stringify(createFullBackup(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'xiaocaimi-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const imported = JSON.parse(text);
      applyFullBackup(imported);
      await saveData();
      if (typeof render === 'function') render();
      if (typeof showToast === 'function') showToast('数据已导入', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('导入失败: ' + err.message, 'error');
    }
  };
  input.click();
}
