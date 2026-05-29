/**
 * 工具函数
 * 小财迷 · Utilities
 */

function esc(s) {
  const d = document.createElement('div');
  d.textContent = (s ?? '').toString();
  return d.innerHTML;
}

function fmt(v) { return '¥' + (v || 0).toFixed(2); }

let syncTimer = null;
let toastT = null;
let chart = null;
let trendChart = null;
let categoryChart = null;
let selectedIconIdx = 0;

// ─── 统计 ──────────────────────────────────────────

function total() {
  return data.assets.reduce((s, a) => s + (a.type === 'debt' ? -(a.amount || 0) : (a.amount || 0)), 0)
       + data.funds.reduce((s, f) => s + (f.value || 0), 0);
}

function mStats(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const tx = data.transactions.filter(t => t.date && t.date.startsWith(ym));
  return {
    inc: tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    exp: tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  };
}

function todayStats() {
  const t = new Date().toISOString().split('T')[0];
  const tx = data.transactions.filter(tr => tr.date === t);
  return {
    inc:  tx.filter(tr => tr.type === 'income').reduce((s, tr) => s + tr.amount, 0),
    exp:  tx.filter(tr => tr.type === 'expense').reduce((s, tr) => s + tr.amount, 0),
    ic:   tx.filter(tr => tr.type === 'income').length,
    ec:   tx.filter(tr => tr.type === 'expense').length,
  };
}

function budgetLeft()  { return data.budget - mStats(0).exp; }
function budgetPct()  { return data.budget <= 0 ? 0 : Math.min(100, mStats(0).exp / data.budget * 100); }

// ─── Toast ─────────────────────────────────────────

function showToast(m, tp) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.textContent = m;
  e.className = 'toast show ' + (tp || '');
  clearTimeout(toastT);
  toastT = setTimeout(() => { e.className = 'toast'; }, 2200);
}

// ─── 撤销删除系统 ─────────────────────────────────

let undoStack = null;
let undoTimeout = null;

/** 显示带撤销按钮的 toast */
function showUndoToast(msg, actionLabel, actionFn) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.innerHTML = `<span>${esc(msg)}</span><button class="toast-undo" onclick="(${actionFn.toString()})();this.parentElement.className='toast'">${esc(actionLabel)}</button>`;
  e.className = 'toast show undo';
  clearTimeout(toastT);
  toastT = setTimeout(() => { e.className = 'toast'; }, 30000);
}

/** 执行软删除：保存快照 + 界面移除 + 存入回收站 */
function softDelete(type, id, backup) {
  commitDelete();
  undoStack = { type, id, backup, snapshot: JSON.parse(JSON.stringify(data)) };
  showUndoToast('已删除', '撤销', () => doUndo());
  undoTimeout = setTimeout(commitDelete, 30000);
  if (!data.trash) data.trash = [];
  data.trash.push({ type, id, item: backup, deletedAt: new Date().toISOString() });
  if (data.trash.length > 100) data.trash = data.trash.slice(-100);
  applyDelete(type, id);
  saveData();
  render();
}

function applyDelete(type, id) {
  if (type === 'transaction') {
    const i = data.transactions.findIndex(t => t.id === id);
    if (i > -1) data.transactions.splice(i, 1);
  } else if (type === 'asset') {
    const i = data.assets.findIndex(a => a.id === id);
    if (i > -1) data.assets.splice(i, 1);
  } else if (type === 'fund') {
    const i = data.funds.findIndex(f => f.id === id);
    if (i > -1) data.funds.splice(i, 1);
  }
}

function doUndo() {
  if (!undoStack) return;
  clearTimeout(undoTimeout);
  undoTimeout = null;
  // 恢复数据快照
  data = JSON.parse(JSON.stringify(undoStack.snapshot));
  undoStack = null;
  saveData();
  render();
  showToast('已撤销', 'success');
}

function commitDelete() {
  if (!undoStack) return;
  clearTimeout(undoTimeout);
  undoTimeout = null;
  undoStack = null;
  // 永久删除已在 applyDelete 中完成，只需清除引用
}

// ─── Confirm 弹窗 ─────────────────────────────────

function confirm(title, msg, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = msg;
  confirmCb = cb;
  document.getElementById('confirmModal').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('show');
  confirmCb = null;
}

function confirmAction() {
  try {
    if (confirmCb) confirmCb();
  } catch (e) {
    console.error('confirm callback error:', e);
  }
  closeConfirm();
}

// ─── 周期性交易自动生成 ─────────────────────────

function processRecurring() {
  const today = new Date().toISOString().split('T')[0];
  if (!data.recurringRules) data.recurringRules = [];
  let changed = false;
  data.recurringRules.forEach(rule => {
    if (!rule.active) return;
    while (rule.nextDate && rule.nextDate <= today) {
      data.transactions.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        subCategory: rule.subCategory || '',
        note: (rule.note || '') + ' 🔄',
        date: rule.nextDate,
        account: rule.account,
        tags: rule.tags || [],
        recurring: true,
      });
      const next = new Date(rule.nextDate + 'T00:00:00');
      if (rule.freq === 'daily') next.setDate(next.getDate() + (rule.interval || 1));
      else if (rule.freq === 'weekly') next.setDate(next.getDate() + 7 * (rule.interval || 1));
      else if (rule.freq === 'monthly') next.setMonth(next.getMonth() + (rule.interval || 1));
      else if (rule.freq === 'yearly') next.setFullYear(next.getFullYear() + (rule.interval || 1));
      rule.nextDate = next.toISOString().split('T')[0];
      changed = true;
    }
  });
  if (changed) saveData();
}

function recordFundHistory(fund) {
  const profit = fund.value - fund.cost;
  data.fundHistory = data.fundHistory || [];
  data.fundHistory.push({
    date:   new Date().toISOString().split('T')[0],
    value:  fund.value,
    cost:   fund.cost,
    profit,
  });
  if (data.fundHistory.length > 100) {
    data.fundHistory = data.fundHistory.slice(-100);
  }
}

// ─── 主题 ──────────────────────────────────────────

function updateThemeBtn() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isLight = document.documentElement.classList.contains('light');
  btn.innerHTML = isLight
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
}

function initTheme() {
  if (localStorage.getItem('financeTheme') === 'light') {
    document.documentElement.classList.add('light');
  }
  updateThemeBtn();
}

function toggleTheme() {
  document.documentElement.classList.toggle('light');
  localStorage.setItem('financeTheme',
    document.documentElement.classList.contains('light') ? 'light' : 'dark');
  updateThemeBtn();
}

// ─── 导出/导入 ─────────────────────────────────────

function exportLegacyData() {
  const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u;
  a.download = `finance_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(u);
  showToast('已导出', 'success');
}

function exportRecords() {
  const rows = [['日期','类型','大类','子类','金额','账户','备注','周期性']];
  [...data.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .forEach(t => { rows.push([
      t.date,
      t.type === 'income' ? '收入' : t.type === 'transfer' ? '转账' : '支出',
      t.category || '',
      t.subCategory ? getSubcatLabel(t.subCategory) || t.subCategory : '',
      t.amount.toFixed(2),
      t.accountName || t.account || '',
      t.note || '',
      t.recurring ? '是' : ''
    ]); });
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const b = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u;
  a.download = `records_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(u);
}

function exportMonthReport() { window.print(); }
function importLegacyData() {
  confirm('确认导入', '导入将覆盖当前所有数据，不可恢复，确定继续？', () => {
    document.getElementById('fileInput').click();
  });
}

function handleFileImport(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const im = JSON.parse(ev.target.result);
      if (typeof applyFullBackup === 'function') applyFullBackup(im);
      else data = migrate(deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), im.appData || im));
      saveData();
      render();
      showToast('导入成功', 'success');
    } catch (er) {
      showToast('格式错误', 'error');
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

// ─── 回收站 ──────────────────────────────────────

function renderTrash() {
  const el = document.getElementById('trashList');
  if (!el) return;
  const trash = data.trash || [];
  if (!trash.length) {
    el.innerHTML = '<div style="color:var(--ink-muted);padding:24px;text-align:center;font-size:var(--text-sm)">回收站为空</div>';
    return;
  }
  const reversed = [...trash].reverse();
  el.innerHTML = reversed.map(t => {
    const item = t.item || {};
    const sign = item.type === 'expense' ? '-' : item.type === 'income' ? '+' : '';
    const cl = item.type === 'income' ? 'income' : item.type === 'expense' ? 'expense' : '';
    const date = item.date || '';
    const cat = item.category || item.name || '—';
    const amt = item.amount || 0;
    const acct = item.accountName || (data.assets.find(a => a.id === item.account)?.name || item.account || '');
    return `<div class="record-row" style="opacity:0.7">
      <div class="record-col record-col-cat">
        <span class="record-cat-name">${esc(cat)}</span>
      </div>
      <div class="record-col record-col-date">${esc(date)}</div>
      <div class="record-col record-col-account">${esc(acct)}</div>
      <div class="record-col record-col-amount ${cl}">${sign}${fmt(amt)}</div>
      <div class="record-col record-col-actions">
        <button class="record-action-btn" onclick="restoreFromTrash('${t.id}')" title="恢复" style="color:var(--success)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 14V4"/></svg>
        </button>
        <button class="record-action-btn danger" onclick="permanentDelete('${t.id}')" title="永久删除">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function restoreFromTrash(id) {
  const idx = (data.trash || []).findIndex(t => t.id === id);
  if (idx === -1) return;
  const entry = data.trash[idx];
  if (entry.type === 'transaction' && entry.item) {
    data.transactions.push(entry.item);
    const a = data.assets.find(aa => aa.id === entry.item.account);
    if (a) {
      const mult = a.type === 'debt' ? -1 : 1;
      if (entry.item.type === 'income') a.amount = Math.round((a.amount + entry.item.amount * mult) * 100) / 100;
      else a.amount = Math.round((a.amount - entry.item.amount * mult) * 100) / 100;
    }
  } else if (entry.type === 'asset' && entry.item) {
    data.assets.push(entry.item);
  } else if (entry.type === 'fund' && entry.item) {
    data.funds.push(entry.item);
  }
  data.trash.splice(idx, 1);
  saveData();
  render();
  showToast('已恢复', 'success');
}

function permanentDelete(id) {
  confirm('永久删除', '此操作不可撤销，确定永久删除？', () => {
    const idx = (data.trash || []).findIndex(t => t.id === id);
    if (idx > -1) data.trash.splice(idx, 1);
    saveData();
    renderTrash();
    showToast('已永久删除', 'success');
  });
}

function emptyTrash() {
  confirm('清空回收站', '回收站中的所有记录将被永久删除，确定？', () => {
    data.trash = [];
    saveData();
    render();
    showToast('回收站已清空', 'success');
  });
}
