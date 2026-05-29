/**
 * 分析服务 · Analytics Service
 *
 * 所有统计数据来自真实账户和交易。
 * 不允许 mock 数据、不允许写死金额。
 */
const analyticsService = (() => {
  function _tx() { return window.data?.transactions || []; }
  function _assets() { return window.data?.assets || []; }

  function today() { return new Date().toISOString().slice(0,10); }
  function nowMonth() { return today().slice(0,7); }

  function isExpense(tx) { return tx.type === 'expense'; }
  function isIncome(tx) { return tx.type === 'income'; }

  function monthlySummary(yearMonth) {
    const ym = yearMonth || nowMonth();
    const txns = _tx().filter(t => t.date && t.date.startsWith(ym));
    const income = txns.filter(isIncome).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = txns.filter(isExpense).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { income, expense, txns };
  }

  function monthSeries(count) {
    count = count || 6;
    const result = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const ym = `${d.getFullYear()}-${String(d.getMonth() - i + 1).padStart(2, '0')}`;
      const s = monthlySummary(ym);
      result.push({
        month: ym,
        income: Number(s.income.toFixed(2)),
        expense: Number(s.expense.toFixed(2)),
        balance: Number((s.income - s.expense).toFixed(2)),
        count: s.txns.length,
      });
    }
    return result;
  }

  function categoryBreakdown(month) {
    const ym = month || nowMonth();
    const txns = _tx().filter(t => t.date && t.date.startsWith(ym) && isExpense(t));
    const map = {};
    txns.forEach(t => {
      const cat = t.category || '其他';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount: Number(amount.toFixed(2)),
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }

  function budgetStatus() {
    const month = monthlySummary();
    const budget = Number(window.data?.budget) || 5000;
    const spent = month.expense;
    const remaining = Math.max(0, budget - spent);
    const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    return { budget, spent, remaining, percent };
  }

  function totalAssets() {
    return _assets().reduce((sum, a) => {
      const types = new Set(['credit','debt']);
      return sum + (types.has(a.type) ? -(Number(a.amount)||0) : (Number(a.amount)||0));
    }, 0);
  }

  return {
    monthlySummary,
    monthSeries,
    categoryBreakdown,
    budgetStatus,
    totalAssets,
    today,
    nowMonth,
  };
})();
