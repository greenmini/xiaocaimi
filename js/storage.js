/**
 * 统一持久化服务
 * 小财迷 · Storage Service
 *
 * 设计原则:
 *   1. 纯 localStorage，不依赖 IndexedDB
 *   2. 每个模块独立 key，互不污染
 *   3. 写后立即 console.log 验证
 *   4. 永不以空数组/mock 覆盖已有数据
 */

const StorageService = (() => {
  const storeRegistry = new Map();
  const MODULE_KEYS = [
    'finance-os-contacts',
    'finance-os-tasks',
    'finance-os-notes',
    'finance-os-reminders',
    'finance-os-calendar',
    'finance-os-shopping-lists',
    'finance-os-shopping-items',
    'finance-os-documents',
    'finance-os-recipes',
    'finance-os-meals',
  ];

  // ─── 底层读写 ────────────────────────────────

  function _read(key) {
    return storageService.get(key);
  }

  function _write(key, data) {
    const ok = storageService.set(key, data);
    if (ok && MODULE_KEYS.includes(key) && typeof scheduleModuleSync === 'function') {
      scheduleModuleSync();
    }
    return ok;
  }

  function snapshotModules() {
    const modules = {};
    MODULE_KEYS.forEach(key => {
      const value = _read(key);
      if (value !== null) modules[key] = value;
    });
    return modules;
  }

  function restoreModules(modules = {}) {
    Object.entries(modules).forEach(([key, value]) => {
      if (MODULE_KEYS.includes(key)) {
        _write(key, value);
        storeRegistry.get(key)?.reload();
      }
    });
  }

  // ─── 工厂：创建模块级 store ──────────────────

  /**
   * @param {string} localStorageKey - 比如 "finance-os-contacts"
   * @param {string} idPrefix       - 生成 ID 的前缀，如 "ct"
   * @returns {{ getAll, getById, add, update, remove, save, reload }}
   */
  function createStore(localStorageKey, idPrefix = 'item') {
    let _cache = null;

    function _genId() {
      return idPrefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    const store = {
      /** 获取全部（带缓存） */
      getAll() {
        if (_cache !== null) return _cache;
        const saved = _read(localStorageKey);
        if (Array.isArray(saved)) {
          _cache = saved;
        } else {
          // 首次：创建空数组，写入 localStorage
          _cache = [];
          _write(localStorageKey, _cache);
        }
        return _cache;
      },

      /** 按 ID 获取 */
      getById(id) {
        return this.getAll().find(item => item.id === id) || null;
      },

      /** 新增一条（自动生成 id + createdAt） */
      add(item) {
        const list = this.getAll();
        const newItem = {
          ...item,
          id: item.id || _genId(),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        // 如果是按 id 追加且已有同 id，去重
        const dup = list.findIndex(i => i.id === newItem.id);
        if (dup >= 0) list[dup] = newItem;
        else list.push(newItem);
        this.save(list);
        return newItem;
      },

      /** 更新一条 */
      update(id, updates) {
        const list = this.getAll();
        const idx = list.findIndex(item => item.id === id);
        if (idx < 0) {
          console.warn(`[storage] update: 未找到 ${id}`);
          return null;
        }
        list[idx] = { ...list[idx], ...updates, id, updatedAt: new Date().toISOString() };
        this.save(list);
        return list[idx];
      },

      /** 删除一条 */
      remove(id) {
        const list = this.getAll();
        const newList = list.filter(item => item.id !== id);
        if (newList.length === list.length) {
          console.warn(`[storage] remove: 未找到 ${id}`);
          return false;
        }
        this.save(newList);
        return true;
      },

      /** 全量保存 */
      save(list) {
        _cache = [...list];
        if (!_write(localStorageKey, _cache)) {
          throw new Error(`写入 ${localStorageKey} 失败`);
        }
        return _cache;
      },

      /** 强制从 localStorage 重新加载（绕过缓存） */
      reload() {
        _cache = null;
        return this.getAll();
      },
    };
    storeRegistry.set(localStorageKey, store);
    return store;
  }

  return { createStore, _read, _write, snapshotModules, restoreModules, MODULE_KEYS };
})();
