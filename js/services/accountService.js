const accountService = (() => {
  const LIABILITY_TYPES = new Set(['credit','debt']);

  function _assets() { return window.data?.assets || []; }
  function _save() { if (typeof saveData === 'function') saveData(); }
  function _genId() { return 'asset_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function _genTxId() { return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  function getAll() { return _assets(); }
  function getById(id) { return _assets().find(a => a.id === id) || null; }
  function isLiability(type) { return LIABILITY_TYPES.has(type); }

  function netValue(account) {
    if (!account) return 0;
    const amount = Number(account.amount) || 0;
    return isLiability(account.type) ? -amount : amount;
  }

  function total() { return _assets().reduce((sum, a) => sum + netValue(a), 0); }

  function totalAssetsOnly() {
    return _assets().reduce((sum, a) => sum + (isLiability(a.type) ? 0 : (Number(a.amount) || 0)), 0);
  }

  function totalLiabilities() {
    return _assets().reduce((sum, a) => sum + (isLiability(a.type) ? (Number(a.amount) || 0) : 0), 0);
  }

  function add(raw) {
    const assets = _assets();
    const newAccount = {
      id: raw.id || _genId(),
      name: raw.name || '',
      type: raw.type || 'cash',
      amount: Number(raw.amount) || 0,
      icon: raw.icon || null,
      color: raw.color || '#4d9fff',
      isArchived: raw.isArchived || false,
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
    const diff = Math.round((Number(newBalance) - oldBalance) * 100) / 100;
    if (diff === 0) return null;

    update(id, { amount: Math.round(Number(newBalance) * 100) / 100 });

    const txs = window.data?.transactions;
    const adjustTx = {
      id: _genTxId(),
      type: diff > 0 ? 'income' : 'expense',
      amount: Math.abs(diff),
      category: '余额调整',
      subCategory: '',
      account: id,
      accountName: account.name,
      date: date || new Date().toISOString().slice(0,10),
      note: note || `手动调整余额 (${oldBalance.toFixed(2)} → ${newBalance})`,
      tags: [],
      isAdjustment: true,
      crud: new Date().toISOString(),
    };
    if (txs) txs.push(adjustTx);

    _save();
    return { accountId: id, accountName: account.name, oldBalance, newBalance: Number(newBalance), diff };
  }

  function getOptions() {
    return _assets().map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('');
  }

  return { LIABILITY_TYPES, getAll, getById, isLiability, total, totalAssetsOnly, totalLiabilities, netValue, add, update, remove, adjustBalance, getOptions };
})();
