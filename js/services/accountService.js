/**
 * 账户服务 · Account Service
 *
 * 账户余额是财务系统的核心数据源。
 * 所有对 assets 的读写必须经过此服务。
 */
const accountService = (() => {
  const ASSET_TYPES = ['cash','bank','alipay','wechat','fund','stock','medical','credit','debt','other'];
  const LIABILITY_TYPES = new Set(['credit','debt']);

  function _assets() {
    return window.data?.assets || [];
  }

  function _save() {
    if (typeof saveData === 'function') saveData();
  }

  function getAll() {
    return _assets();
  }

  function getById(id) {
    return _assets().find(a => a.id === id) || null;
  }

  function isLiability(type) {
    return LIABILITY_TYPES.has(type);
  }

  function accountTypeLabel(type) {
    return (typeof t === 'function') ? t(`accountType_${type}`) || type : type;
  }

  function netValue(account) {
    if (!account) return 0;
    const amount = Number(account.amount) || 0;
    return isLiability(account.type) ? -amount : amount;
  }

  function total() {
    return _assets().reduce((sum, a) => sum + netValue(a), 0);
  }

  function totalAssetsOnly() {
    return _assets().reduce((sum, a) => sum + (isLiability(a.type) ? 0 : (Number(a.amount) || 0)), 0);
  }

  function totalLiabilities() {
    return _assets().reduce((sum, a) => sum + (isLiability(a.type) ? (Number(a.amount) || 0) : 0), 0);
  }

  function add(account) {
    const assets = _assets();
    const id = 'acct_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const newAccount = {
      id,
      name: account.name || '',
      type: account.type || 'bank',
      amount: Number(account.amount) || 0,
      openingBalance: Number(account.openingBalance || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assets.push(newAccount);
    _save();
    return newAccount;
  }

  function update(id, updates) {
    const assets = _assets();
    const idx = assets.findIndex(a => a.id === id);
    if (idx < 0) return null;
    assets[idx] = { ...assets[idx], ...updates, id, updatedAt: new Date().toISOString() };
    _save();
    return assets[idx];
  }

  function remove(id) {
    const assets = _assets();
    const idx = assets.findIndex(a => a.id === id);
    if (idx < 0) return false;
    assets.splice(idx, 1);
    _save();
    return true;
  }

  function adjustBalance(id, newBalance, note, date) {
    const account = getById(id);
    if (!account) return null;
    const oldBalance = Number(account.amount) || 0;
    const diff = Number(newBalance) - oldBalance;
    if (diff === 0) return null;

    update(id, { amount: Number(newBalance) });
    return {
      accountId: id,
      accountName: account.name,
      oldBalance,
      newBalance: Number(newBalance),
      diff,
      date: date || new Date().toISOString().slice(0,10),
      note: note || '',
      timestamp: new Date().toISOString(),
    };
  }

  function getOptions() {
    return _assets().map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  }

  return {
    ASSET_TYPES,
    LIABILITY_TYPES,
    getAll,
    getById,
    isLiability,
    total,
    totalAssetsOnly,
    totalLiabilities,
    netValue,
    add,
    update,
    remove,
    adjustBalance,
    getOptions,
    accountTypeLabel,
  };
})();
