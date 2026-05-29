const transactionService = (() => {
  const LIABILITY_TYPES = new Set(['credit','debt']);

  function _tx() { return window.data?.transactions || []; }
  function _assets() { return window.data?.assets || []; }
  function _funds() { return window.data?.funds || []; }
  function _save() { if (typeof saveData === 'function') saveData(); }
  function _genId() { return Date.now(); }

  function makeTransaction(raw) {
    return {
      id: raw.id || _genId(),
      type: raw.type || 'expense',
      amount: Number(raw.amount) || 0,
      category: raw.category || '',
      subCategory: raw.subCategory || '',
      account: raw.account || raw.accountId || '',
      accountName: raw.accountName || '',
      fromAccount: raw.fromAccount || raw.fromAccountId || '',
      toAccount: raw.toAccount || raw.toAccountId || '',
      date: raw.date || new Date().toISOString().slice(0,10),
      note: raw.note || '',
      tags: raw.tags || [],
      recurring: raw.recurring || '',
      isAdjustment: raw.isAdjustment || false,
      crud: raw.crud || new Date().toISOString(),
    };
  }

  function _debtMultiplier(accountId) {
    const a = _assets().find(aa => aa.id === accountId);
    return a && LIABILITY_TYPES.has(a.type) ? -1 : 1;
  }

  function _applyToLedger(tx, multiplier) {
    const assets = _assets();
    if (tx.type === 'transfer') {
      const from = assets.find(a => a.id === (tx.fromAccount || tx.account));
      const to = assets.find(a => a.id === tx.toAccount);
      if (from) from.amount = Math.round((Number(from.amount) - Number(tx.amount) * multiplier) * 100) / 100;
      if (to) to.amount = Math.round((Number(to.amount) + Number(tx.amount) * multiplier) * 100) / 100;
    } else {
      const account = assets.find(a => a.id === tx.account);
      if (!account) return;
      const sign = tx.type === 'expense' ? -1 : 1;
      account.amount = Math.round((Number(account.amount) + Number(tx.amount) * sign * multiplier) * 100) / 100;
    }
  }

  function add(raw) {
    const tx = makeTransaction(raw);
    _tx().push(tx);
    _applyToLedger(tx, 1);
    _save();
    return tx;
  }

  function update(id, raw) {
    const txs = _tx();
    const idx = txs.findIndex(t => t.id === id);
    if (idx < 0) return null;
    const old = txs[idx];
    const updated = makeTransaction({ ...raw, id });

    _applyToLedger(old, -1);
    _applyToLedger(updated, 1);

    txs[idx] = updated;
    _save();
    return updated;
  }

  function remove(id) {
    const txs = _tx();
    const idx = txs.findIndex(t => t.id === id);
    if (idx < 0) return false;
    _applyToLedger(txs[idx], -1);
    txs.splice(idx, 1);
    _save();
    return true;
  }

  function addFundOperation(raw) {
    const tx = makeTransaction(raw);
    const assets = _assets();
    const funds = _funds();
    const account = assets.find(a => a.id === tx.account);
    if (!account) throw new Error('未选择资金账户');

    if (tx.type === 'fundBuy') {
      account.amount = Math.round((Number(account.amount) - Number(tx.amount)) * 100) / 100;
      const fundId = tx.fromAccount || 'fund_' + Date.now().toString(36);
      let fund = funds.find(f => f.id === fundId);
      if (!fund) {
        fund = { id: fundId, name: tx.note || '基金', cost: 0, value: 0 };
        funds.push(fund);
      }
      fund.cost = Math.round((Number(fund.cost) + Number(tx.amount)) * 100) / 100;
      fund.value = Math.round((Number(fund.value) + Number(tx.amount)) * 100) / 100;
    } else if (tx.type === 'fundSell') {
      account.amount = Math.round((Number(account.amount) + Number(tx.amount)) * 100) / 100;
      const fund = funds.find(f => f.id === tx.fromAccount);
      if (fund) {
        fund.cost = Math.max(0, Math.round((Number(fund.cost) - Number(tx.amount)) * 100) / 100);
        fund.value = Math.max(0, Math.round((Number(fund.value) - Number(tx.amount)) * 100) / 100);
      }
    }
    _tx().push(tx);
    _save();
    return tx;
  }

  function getAll() { return _tx(); }
  function getById(id) { return _tx().find(t => t.id === id) || null; }
  function getByMonth(year, month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    return _tx().filter(t => typeof t.date === 'string' && t.date.startsWith(ym));
  }
  function getRecent(limit) {
    const all = [..._tx()];
    all.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.crud || '').localeCompare(a.crud || ''));
    return all.slice(0, limit || 10);
  }

  return { getAll, getById, getByMonth, getRecent, add, update, remove, addFundOperation, makeTransaction };
})();
