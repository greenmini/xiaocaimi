/**
 * IndexedDB 数据层 · 精简版
 * 小财迷 · FinanceDB
 *
 * 策略：整个 data 对象作为一个 JSON blob 存储
 * 双写：IndexedDB（主） + localStorage（备份）
 */
class FinanceDB {
  static DB_NAME = 'finance-db';
  static DB_VER = 3;
  static STORE = 'state';

  constructor() {
    this._db = null;
  }

  async open() {
    if (this._db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(FinanceDB.DB_NAME, FinanceDB.DB_VER);

      req.onupgradeneeded = ev => {
        const db = ev.target.result;
        // 只在缺失时创建，避免版本升级时清空已有数据。
        if (!db.objectStoreNames.contains(FinanceDB.STORE)) {
          db.createObjectStore(FinanceDB.STORE, { keyPath: 'key' });
        }
      };

      req.onsuccess = ev => {
        this._db = ev.target.result;
        resolve();
      };

      req.onerror = ev => {
        console.error('IndexedDB open error:', ev.target.error);
        reject(ev.target.error);
      };
    });
  }

  /** 保存整个 data 对象 */
  async save(dataObj) {
    await this._ensureOpen();
    const json = JSON.stringify(dataObj);
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(FinanceDB.STORE, 'readwrite');
      tx.objectStore(FinanceDB.STORE).put({ key: 'main', json, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = ev => reject(ev.target.error);
    });
  }

  /** 读取整个 data 对象 */
  async load() {
    await this._ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(FinanceDB.STORE, 'readonly');
      const req = tx.objectStore(FinanceDB.STORE).get('main');
      req.onsuccess = () => {
        const record = req.result;
        if (record && record.json) {
          try {
            resolve(JSON.parse(record.json));
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      req.onerror = ev => reject(ev.target.error);
    });
  }

  /** 清空 */
  async clear() {
    await this._ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(FinanceDB.STORE, 'readwrite');
      tx.objectStore(FinanceDB.STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = ev => reject(ev.target.error);
    });
  }

  async close() {
    if (this._db) { this._db.close(); this._db = null; }
  }

  async _ensureOpen() {
    if (!this._db) await this.open();
  }
}

const financeDB = new FinanceDB();
