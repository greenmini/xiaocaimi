/**
 * 交易服务 · Transaction Service
 *
 * 交易流水与账户余额联动：
 *   - 新增收入 → 账户余额增加
 *   - 新增支出 → 账户余额减少
 *   - 转账 → 一方减少，另一方增加
 *   - 编辑交易 → 按差额修正
 *   - 删除交易 → 回滚账户余额
 */
const transactionService = (() => {
  function _tx() {
    return window.data?.transactions || [];
  }

  function _assets() {
    return window.data?.assets || [];
  }

  function _funds() {
    return window.data?.funds || [];
  }

  function _save() {
    if (typeof saveData === 'function') saveData();
  }

  function _genId() {
    return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }

  function makeTransaction(raw) {
    return {
      id: raw.id || _genId(),
      type: raw.type || 'expense',
      amount: Number(raw.amount) || 0,
      category: raw.category || '',
      accountId: raw.accountId || '',
      fromAccountId: raw.fromAccountId || '',
      toAccountId: raw.toAccountId || '',
      date: raw.date || new Date().toISOString().slice(0,10),
      note: raw.note || '',
      recurring: raw.recurring || '',
      crud: raw.crud || new Date().toISOString(),
    };
  }

  function getAll() {
    return _tx();
  }

  function getById(id) {
    return _tx().find(t => t.id === id) || null;
  }

  function getByAccount(accountId, limit) {
    const all = _tx().filter(t => t.accountId === accountId || t.fromAccountId === accountId || t.toAccountId === accountId);
    all.sort((a, b) => b.date.localeCompare(a.date) || b.crud?.localeCompare?.(a.crud) || 0);
    return limit ? all.slice(0, limit) : all;
  }

  function getByMonth(year, month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    return _tx().filter(t => typeof t.date === 'string' && t.date.startsWith(ym));
  }

  function _applyToLedger(tx, multiplier) {
    const assets = _assets();
    if (tx.type === 'transfer') {
      const from = assets.find(a => a.id === tx.fromAccountId);
      const to = assets.find(a => a.id === tx.toAccountId);
      if (from) from.amount = Number(from.amount) - (Number(tx.amount) * multiplier);
      if (to) to.amount = Number(to.amount) + (Number(tx.amount) * multiplier);
    } else {
      const account = assets.find(a => a.id === tx.accountId);
      if (!account) return;
      const sign = tx.type === 'expense' ? -1 : 1;
      account.amount = Number(account.amount) + (Number(tx.amount) * sign * multiplier);
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

    if (old.accountId === updated.accountId && old.type === updated.type && old.fromAccountId === updated.fromAccountId && old.toAccountId === updated.toAccountId) {
      const diff = Number(updated.amount) - Number(old.amount);
      const tempTx = { ...old, amount: diff };
      _applyToLedger(tempTx, 1);
    } else {
      _applyToLedger(old, -1);
      _applyToLedger(updated, 1);
    }

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
    const funds = _funds();
    const assets = _assets();
    const account = assets.find(a => a.id === tx.accountId);
    if (!account) throw new Error('未选择资金账户');

    if (tx.type === 'fundBuy') {
      account.amount = Number(account.amount) - Number(tx.amount);
      const fundId = tx.fromAccountId || 'fund_' + Date.now().toString(36);
      let fund = funds.find(f => f.id === fundId);
      if (!fund) {
        fund = { id: fundId, name: tx.note || '基金', cost: 0, value: 0 };
        funds.push(fund);
      }
      fund.cost = Number(fund.cost) + Number(tx.amount);
      fund.value = Number(fund.value) + Number(tx.amount);
    } else if (tx.type === 'fundSell') {
      account.amount = Number(account.amount) + Number(tx.amount);
      const fund = funds.find(f => f.id === tx.fromAccountId);
      if (fund) {
        fund.cost = Math.max(0, Number(fund.cost) - Number(tx.amount));
        fund.value = Math.max(0, Number(fund.value) - Number(tx.amount));
      }
    }

    _tx().push(tx);
    _save();
    return tx;
  }

  function getRecent(limit) {
    const all = [..._tx()];
    all.sort((a, b) => b.date.localeCompare(a.date) || (b.crud || '').localeCompare(a.crud || ''));
    return all.slice(0, limit || 10);
  }

  return {
    getAll, getById, getByAccount, getByMonth, getRecent,
    add, update, remove,
    addFundOperation, makeTransaction,
    _applyToLedger,
  };
})();
