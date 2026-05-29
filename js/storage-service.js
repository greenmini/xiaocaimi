/**
 * 统一存储服务 · 小财迷 Storage Service
 *
 * 所有 localStorage 读写必须经过此服务，禁止裸调。
 *
 * 设计原则:
 *   1. 统一命名空间 xiaocaimi:{scope}:{name}
 *   2. JSON 序列化/反序列化 + 异常兜底
 *   3. 旧 key 自动迁移 → 先读新 key，不存在时读旧 key 并写入新 key
 *   4. 提供 get / set / remove / snapshot 四大原语
 */

const storageService = (() => {
  const NS = 'xiaocaimi';

  // ─── 旧 key → 新 key 迁移映射 ──────────────────

  const LEGACY_MAP = {
    'financeData':         'v1:finance',
    'financeLocale':       'v1:locale',
    'financeTheme':        'v1:theme',
    'financeAiKey':        'v1:aiKey',
    'financeSyncToken':    'v1:syncToken',
    'finance-os-migrated': 'v1:migrated',
    'finance-os-backup':   'v1:backup',
    'finance-os-contacts':         'v1:contacts',
    'finance-os-tasks':            'v1:tasks',
    'finance-os-notes':            'v1:notes',
    'finance-os-reminders':        'v1:reminders',
    'finance-os-calendar':         'v1:calendar',
    'finance-os-shopping-lists':   'v1:shopping-lists',
    'finance-os-shopping-items':   'v1:shopping-items',
    'finance-os-documents':        'v1:documents',
    'finance-os-recipes':          'v1:recipes',
    'finance-os-meals':            'v1:meals',
  };

  const KNOWN_V1_MODULE_KEYS = [
    'v1:contacts','v1:tasks','v1:notes','v1:reminders','v1:calendar',
    'v1:shopping-lists','v1:shopping-items','v1:documents','v1:recipes','v1:meals',
  ];

  // ─── 内核 ──────────────────────────────────────

  function _decorate(key) {
    return `${NS}:${key}`;
  }

  function get(key, defaultValue) {
    const fullKey = _decorate(key);
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {
      console.warn(`[storage] 读取 ${fullKey} 失败:`, e.message);
    }

    // 尝试旧 key 迁移
    if (!LEGACY_MAP[key]) return defaultValue !== undefined ? defaultValue : null;

    try {
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw !== null) {
        const parsed = JSON.parse(legacyRaw);
        // 迁移到新 key
        set(key, parsed);
        console.log(`[storage] 已迁移 ${key} → ${fullKey}`);
        return parsed;
      }
    } catch (e) {
      // 旧 key 也不存在或损坏
    }

    return defaultValue !== undefined ? defaultValue : null;
  }

  function set(key, value) {
    const fullKey = _decorate(key);
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[storage] 写入 ${fullKey} 失败:`, e.message);
      return false;
    }
  }

  function remove(key) {
    const fullKey = _decorate(key);
    try {
      localStorage.removeItem(fullKey);
      return true;
    } catch (e) {
      console.error(`[storage] 删除 ${fullKey} 失败:`, e.message);
      return false;
    }
  }

  function exists(key) {
    return localStorage.getItem(_decorate(key)) !== null;
  }

  // ─── 模块级 snapshot（v1 兼容层） ──────────────

  function snapshotModules() {
    const modules = {};
    KNOWN_V1_MODULE_KEYS.forEach(key => {
      const value = get(key);
      if (value !== null) {
        modules[key.replace('v1:', 'finance-os-')] = value;
      }
    });
    return modules;
  }

  function restoreModules(modules) {
    Object.entries(modules || {}).forEach(([oldKey, value]) => {
      const newKey = LEGACY_MAP[oldKey];
      if (newKey) {
        set(newKey, value);
      }
    });
  }

  // ─── 初始化时迁移所有旧 key ─────────────────────

  function migrateAll() {
    let count = 0;
    for (const [oldKey, newKey] of Object.entries(LEGACY_MAP)) {
      try {
        const raw = localStorage.getItem(oldKey);
        if (raw === null) continue;
        const newFull = _decorate(newKey);
        if (localStorage.getItem(newFull) !== null) continue; // 新 key 已有，不覆盖
        localStorage.setItem(newFull, raw);
        console.log(`[storage] migrate ${oldKey} → ${newFull}`);
        count++;
      } catch (e) {
        // 跳过损坏的 key
      }
    }
    if (count) console.log(`[storage] 迁移完成: ${count} 个 key`);
  }

  // 运行时执行
  migrateAll();

  return {
    get,
    set,
    remove,
    exists,
    snapshotModules,
    restoreModules,
    MODULE_KEYS: KNOWN_V1_MODULE_KEYS,
    NS,
  };
})();
