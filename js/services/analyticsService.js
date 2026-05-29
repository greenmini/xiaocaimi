const analyticsService = (() => {
  function _tx() { return window.data?.transactions || []; }
  function _assets() { return window.data?.assets || []; }
  function today() { return new Date().toISOString().slice(0,10); }
  function nowMonth() { return today().slice(0,7); }

  function totalAssets() {
    return _assets().reduce((sum, a) => {
      const types = new Set(['credit','debt']);
      return sum + (types.has(a.type) ? -(Number(a.amount)||0) : (Number(a.amount)||0));
    }, 0);
  }

  function monthlySummary(offset) {
    const d = new Date();
    d.setMonth(d.getMonth() + (offset || 0));
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const txns = _tx().filter(t => t.date && t.date.startsWith(ym));
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount)||0), 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount)||0), 0);
    return { inc, exp, txns };
  }

  function mStats(offset) { return monthlySummary(offset); }

  function budgetLeft() {
    const m = monthlySummary(0);
    const budget = Number(window.data?.budget) || 5000;
    return Math.max(0, budget - m.exp);
  }

  function budgetStatus() {
    const m = monthlySummary(0);
    const budget = Number(window.data?.budget) || 5000;
    const pct = budget > 0 ? Math.min(100, Math.round((m.exp / budget) * 100)) : 0;
    return { budget, spent: m.exp, remaining: Math.max(0, budget - m.exp), percent: pct };
  }

  function todayStats() {
    const td = today();
    const txns = _tx().filter(t => t.date === td);
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount)||0), 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount)||0), 0);
    return { inc, exp, ic: txns.filter(t => t.type === 'income').length, ec: txns.filter(t => t.type === 'expense').length };
  }

  function monthSeries(count) {
    count = count || 6;
    const result = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const m = monthlySummary(-i);
      result.push({ month: `${d.getFullYear()}-${String(d.getMonth()-i+1).padStart(2,'0')}`, income: +m.inc.toFixed(2), expense: +m.exp.toFixed(2), balance: +(m.inc - m.exp).toFixed(2), count: m.txns.length });
    }
    return result;
  }

  function categoryBreakdown(month) {
    const ym = month || nowMonth();
    const txns = _tx().filter(t => t.date && t.date.startsWith(ym) && t.type === 'expense');
    const map = {};
    txns.forEach(t => { const cat = t.category || '其他'; map[cat] = (map[cat] || 0) + (Number(t.amount)||0); });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount: +amount.toFixed(2), percent: total > 0 ? Math.round((amount / total) * 100) : 0 }));
  }

  return { total: totalAssets, mStats, budgetLeft, budgetStatus, monthlySummary, monthSeries, categoryBreakdown, todayStats, totalAssets, today, nowMonth };
})();
