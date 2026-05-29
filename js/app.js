/**
 * UI 交互逻辑
 * 小财迷 · App (modals, bookkeeping, CRUD, sync, AI)
 */

// ─── 记录上次使用的账户 ────────────────────────────
let lastAccount = '';
let selectedTags = [];

// ─── 预设标签 ──────────────────────────────────────
const PRESET_TAGS = ['必需品','冲动消费','报销','礼物','聚餐','学习','医疗','交通','社交'];

// ─── 记账弹窗 ──────────────────────────────────────

function openAddModal(tp) {
  el('addModal').classList.add('show');
  el('addAmount').value = '';
  el('addNote').value = '';
  el('addType').value = tp || 'expense';
  onTypeChange();
  const acSel = el('addAccount');
  const fr    = el('addFromAccount');
  const to    = el('addToAccount');
  const opts  = accountService.getOptions();
  acSel.innerHTML = opts;
  fr.innerHTML = opts;
  to.innerHTML = opts;
  // 预填上次使用的账户
  if (lastAccount && [...acSel.options].some(o => o.value === lastAccount)) {
    acSel.value = lastAccount;
  }
  // 快捷金额
  el('quickAmounts').innerHTML =
    [10, 20, 50, 100, 200, 500].map(n =>
      `<button class="quick-amount" type="button" onclick="document.getElementById('addAmount').value=${n};document.getElementById('addAmount').focus()">${n}</button>`
    ).join('');
  // 自动聚焦金额输入
  setTimeout(() => el('addAmount')?.focus(), 100);
  // 重置标签
  selectedTags = [];
  renderTagPicker();
}

function renderTagPicker() {
  const tp = el('tagPicker');
  if (!tp) return;
  tp.innerHTML = PRESET_TAGS.map(tag =>
    `<button type="button" class="tag-btn${selectedTags.includes(tag) ? ' active' : ''}" onclick="toggleTag('${esc(tag)}')">${esc(tag)}</button>`
  ).join('');
}

function toggleTag(tag) {
  const i = selectedTags.indexOf(tag);
  if (i > -1) selectedTags.splice(i, 1);
  else selectedTags.push(tag);
  renderTagPicker();
}

function toggleRecurringFields() {
  const checked = document.getElementById('addRecurring').checked;
  document.getElementById('recurringFields').style.display = checked ? 'block' : 'none';
  if (checked && !document.getElementById('recurringStart').value) {
    document.getElementById('recurringStart').value = new Date().toISOString().split('T')[0];
  }
}

function closeAddModal() { el('addModal').classList.remove('show'); editTxId_ = null; el('addModal').querySelector('h3').innerHTML = '//记账<span onclick="closeAddModal()" class="modal-close">×</span>'; }

function onTypeChange() {
  const tp = el('addType').value;
  el('categoryGroup').style.display    = tp === 'transfer' ? 'none' : 'block';
  el('subCatGroup').style.display      = tp === 'transfer' ? 'none' : 'block';
  el('transferFromGroup').style.display = tp === 'transfer' ? 'block' : 'none';
  el('transferToGroup').style.display   = tp === 'transfer' ? 'block' : 'none';
  if (tp !== 'transfer') {
    el('addCategory').innerHTML =
      CATS[tp].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }
  onCategoryChange();
}

function onCategoryChange() {
  const tp = el('addType').value;
  const cat = el('addCategory').value;
  const subs = (SUBCATS[tp] && SUBCATS[tp][cat]) || [];
  const sel = el('addSubCategory');
  sel.innerHTML = '<option value="">—</option>' + subs.map(s =>
    `<option value="${s}">${getSubcatLabel(s)}</option>`
  ).join('');
  sel.value = '';
}

// ─── 编辑交易记录 ──────────────────────────────────

let editTxId_ = null;

function editTx(id) {
  const t = data.transactions.find(tx => tx.id === id);
  if (!t) return;
  editTxId_ = t.id;
  el('addModal').classList.add('show');
  el('addAmount').value = t.amount;
  el('addNote').value = t.note || '';
  el('addType').value = t.type;
  onTypeChange();
  
  const acSel = el('addAccount');
  const fr = el('addFromAccount');
  const to = el('addToAccount');
  const opts = accountService.getOptions();
  acSel.innerHTML = opts;
  fr.innerHTML = opts;
  to.innerHTML = opts;
  
  setTimeout(() => {
    if (t.type !== 'transfer') el('addCategory').value = t.category || '';
    if (t.type !== 'transfer') { el('addCategory').value = t.category || ''; onCategoryChange(); }
    if (t.account) acSel.value = t.account;
    if (t.fromAccount) fr.value = t.fromAccount;
    if (t.toAccount) to.value = t.toAccount;
    if (t.subCategory) setTimeout(() => { el('addSubCategory').value = t.subCategory || ''; }, 10);
  }, 0);
  
  selectedTags = t.tags || [];
  renderTagPicker();
  el('addModal').querySelector('h3').innerHTML = '//编辑<span onclick="closeAddModal()" class="modal-close">×</span>';
  setTimeout(() => el('addAmount')?.focus(), 100);
}

function submitAdd() {
  const tp = el('addType').value;
  const amt = Math.round(parseFloat(el('addAmount').value) * 100) / 100;
  if (!amt || amt <= 0) { showToast('请输入有效金额', 'error'); return; }

  let editOriginalDate = null;
  if (editTxId_) {
    const old = transactionService.getById(editTxId_);
    if (old) {
      editOriginalDate = old.date;
      transactionService.remove(editTxId_);
    }
    editTxId_ = null;
  }

  const raw = {
    type: tp,
    amount: amt,
    date: editOriginalDate || new Date().toISOString().split('T')[0],
    note: el('addNote').value.trim(),
    account: el('addAccount').value,
    category: tp === 'transfer' ? '转账' : el('addCategory').value,
    subCategory: el('addSubCategory')?.value || '',
    tags: [...selectedTags],
  };

  if (tp === 'transfer') {
    raw.fromAccount = el('addFromAccount').value;
    raw.toAccount = el('addToAccount').value;
    const fa = accountService.getById(raw.fromAccount);
    const ta = accountService.getById(raw.toAccount);
    raw.accountName = (fa ? fa.name : raw.fromAccount) + ' → ' + (ta ? ta.name : raw.toAccount);
  } else {
    const a = accountService.getById(raw.account);
    raw.accountName = a ? a.name : raw.account;
  }

  transactionService.add(raw);
  lastAccount = raw.account;

  if (document.getElementById('addRecurring').checked) {
    const rule = {
      id: 'rec_' + Date.now(), type: tp, amount: amt, category: raw.category,
      subCategory: raw.subCategory || '', note: raw.note, account: raw.account,
      tags: [...selectedTags], freq: document.getElementById('recurringFreq').value,
      interval: parseInt(document.getElementById('recurringInterval').value) || 1,
      nextDate: document.getElementById('recurringStart').value, active: true,
    };
    if (!data.recurringRules) data.recurringRules = [];
    data.recurringRules.push(rule);
  }

  const threshold = data.settings?.alertThreshold || 0;
  if (threshold > 0 && tp === 'expense' && amt > threshold) {
    showToast(`[超限] 单笔支出 ¥${amt.toFixed(2)} 超限 ¥${threshold}`, 'warn');
  }

  saveData();
  closeAddModal();
  render();
  showToast('记账成功', 'success');
}

// ─── 删除交易 ──────────────────────────────────────

function delTx(id) {
  confirm('确认删除', '删除后30秒内可撤销，确定要删除这条记录吗？', () => {
    const t = transactionService.getById(id);
    if (!t) return;
    commitDelete();
    undoStack = { type: 'transaction', id, backup: t, snapshot: JSON.parse(JSON.stringify(data)) };

    transactionService.remove(id);

    if (!data.trash) data.trash = [];
    data.trash.push({ type: 'transaction', id, item: t, deletedAt: new Date().toISOString() });
    if (data.trash.length > 100) data.trash = data.trash.slice(-100);

    showUndoToast('已删除', '撤销', () => doUndo());
    undoTimeout = setTimeout(commitDelete, 30000);
    saveData();
    render();
  });
}

// ─── 资产账户弹窗 ──────────────────────────────────

function openAssetModal(a) {
  el('assetModal').classList.add('show');
  editAsset_ = a || null;
  el('assetName').value  = a ? a.name : '';
  el('assetAmount').value = a ? (a.amount || 0).toFixed(2) : '';
  if (el('assetType')) el('assetType').value = a ? (a.type || 'cash') : 'cash';
  if (el('assetArchived')) el('assetArchived').checked = a ? (a.isArchived || false) : false;
  el('deleteAssetBtn').style.display = a ? 'block' : 'none';
  el('assetIconPicker').innerHTML = ICONS.map((ico, i) =>
    `<button type="button" onclick="selIcon(${i})" style="width:34px;height:34px;font-size:18px;border:1px solid ${i === (a ? ICONS.indexOf(a.icon || ICONS[0]) : 0) ? 'var(--cyan)' : 'var(--border)'};border-radius:var(--r);background:${i === (a ? ICONS.indexOf(a.icon || ICONS[0]) : 0) ? 'var(--cyan-dim)' : 'transparent'};cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;">${ico}</button>`
  ).join('');
  selIcon(a ? ICONS.indexOf(a.icon || ICONS[0]) : 0);
}

function selIcon(idx) {
  selectedIconIdx = idx;
  document.querySelectorAll('#assetIconPicker button').forEach((b, i) => {
    b.style.borderColor = i === idx ? 'var(--cyan)' : 'var(--border)';
    b.style.background  = i === idx ? 'var(--cyan-dim)' : 'transparent';
  });
}

function editAsset(id) {
  const a = data.assets.find(aa => aa.id === id);
  if (a) openAssetModal(a);
}

function closeAssetModal() {
  el('assetModal').classList.remove('show');
  editAsset_ = null;
  confirmCb = null;
}

function submitAsset() {
  const n   = el('assetName').value.trim();
  const amt = parseFloat(el('assetAmount').value) || 0;
  const ico = ICONS[selectedIconIdx] || ICONS[0];
  if (!n) { showToast('请输入账户名称', 'error'); return; }
  if (editAsset_) {
    accountService.update(editAsset_.id, { name: n, amount: amt, type: el('assetType')?.value || 'cash', icon: ico, isArchived: el('assetArchived')?.checked || false });
  } else {
    accountService.add({ name: n, amount: amt, icon: ico, color: '#4d9fff', type: el('assetType')?.value || 'cash', isArchived: el('assetArchived')?.checked || false });
  }
  saveData();
  closeAssetModal();
  render();
  showToast('保存成功', 'success');
}

function submitDeleteAsset() {
  if (!editAsset_) return;
  confirm('确认删除', `删除「${editAsset_.name}」？余额 ${editAsset_.amount?.toFixed(2) || '0.00'} 将从总资产移除。30秒内可撤销。`, () => {
    commitDelete();
    undoStack = { type: 'asset', id: editAsset_.id, backup: editAsset_, snapshot: JSON.parse(JSON.stringify(data)) };
    accountService.remove(editAsset_.id);
    showUndoToast('已删除', '撤销', () => doUndo());
    undoTimeout = setTimeout(commitDelete, 30000);
    saveData();
    closeAssetModal();
    render();
  });
}

// ─── 基金弹窗 ──────────────────────────────────────

function openFundModal(f) {
  el('fundModal').classList.add('show');
  editFund_ = f || null;
  el('fundName').value  = f ? f.name : '';
  el('fundCost').value = f ? (f.cost || 0).toFixed(2) : '';
  el('fundValue').value = f ? (f.value || 0).toFixed(2) : '';
  el('fundNote').value = f ? (f.note || '') : '';
  el('deleteFundBtn').style.display = f ? 'block' : 'none';
}

function editFund(id) {
  const f = data.funds.find(ff => ff.id === id);
  if (f) openFundModal(f);
}

function closeFundModal() {
  el('fundModal').classList.remove('show');
  editFund_ = null;
  confirmCb = null;
}

function submitFund() {
  const n  = el('fundName').value.trim();
  const c  = parseFloat(el('fundCost').value) || 0;
  const v  = parseFloat(el('fundValue').value) || 0;
  const no = el('fundNote').value.trim();
  if (!n) { showToast('请输入基金名称', 'error'); return; }
  if (editFund_) {
    editFund_.name = n;
    editFund_.cost = c;
    editFund_.value = v;
    editFund_.note = no;
    recordFundHistory(editFund_);
  } else {
    const newFund = { id: 'fund_' + Date.now(), name: n, cost: c, value: v, note: no, createdAt: new Date().toISOString().split('T')[0] };
    data.funds.push(newFund);
    recordFundHistory(newFund);
  }
  saveData();
  closeFundModal();
  render();
  showToast('保存成功', 'success');
}

function submitDeleteFund() {
  if (!editFund_) return;
  confirm('确认删除', `删除「${editFund_.name}」？30秒内可撤销。`, () => {
    commitDelete();
    undoStack = { type: 'fund', id: editFund_.id, backup: editFund_, snapshot: JSON.parse(JSON.stringify(data)) };
    data.funds = data.funds.filter(f => f.id !== editFund_.id);
    showUndoToast('已删除', '撤销', () => doUndo());
    undoTimeout = setTimeout(commitDelete, 30000);
    saveData();
    closeFundModal();
    render();
  });
}

// ─── 预算弹窗 ──────────────────────────────────────

function openBudgetModal() {
  el('budgetModal').classList.add('show');
  el('budgetAmount').value = data.budget;
  el('categoryBudgetInputs').innerHTML = BCATS.map(c =>
    `<div class="form-group" style="margin-bottom:8px;">
      <label style="font-size:9px;">${esc(c)}预算</label>
      <input type="number" id="cat_${esc(c)}" value="${data.categoryBudgets[c] || 1000}" style="width:100%;">
    </div>`
  ).join('');
}

function closeBudgetModal() { el('budgetModal').classList.remove('show'); }

function submitBudget() {
  data.budget = parseFloat(el('budgetAmount').value) || 5000;
  BCATS.forEach(c => {
    const el2 = document.getElementById('cat_' + c);
    if (el2) data.categoryBudgets[c] = parseFloat(el2.value) || 1000;
  });
  saveData();
  closeBudgetModal();
  render();
  showToast('预算已更新', 'success');
}

// ─── 提醒弹窗 ──────────────────────────────────────

function openReminderModal() {
  el('reminderModal').classList.add('show');
  el('reminderInput').value = data.reminder ? data.reminder.text : '';
}

function closeReminderModal() { el('reminderModal').classList.remove('show'); }

function submitLegacyReminder() {
  const t = el('reminderInput').value.trim();
  data.reminder = t ? { title: '提醒', text: t } : null;
  saveData();
  closeReminderModal();
  render();
  showToast('提醒已设置', 'success');
}

function dismissReminder() { el('reminderBanner').classList.remove('show'); }

function openTransferModal() { openAddModal('transfer'); }

// ─── 快捷记账 ──────────────────────────────────────

function qAdd(c) {
  const tp = CATS.expense.includes(c) ? 'expense' : 'income';
  openAddModal(tp);
  setTimeout(() => {
    el('addType').value = tp;
    onTypeChange();
    el('addCategory').value = c;
  }, 0);
}

// ─── 设置 ──────────────────────────────────────────

function saveSetting(k, v) {
  if (!data.settings) data.settings = {};
  data.settings[k] = v;
  if (k === 'budget') data.budget = parseFloat(v) || 5000;
  saveData();
}

const NAV_MODULES = [
  { page: 'home', label: '仪表盘', section: '核心' },
  { page: 'records', label: '交易记录', section: '核心' },
  { page: 'accounts', label: '账户资产', section: '核心' },
  { page: 'analysis', label: '数据分析', section: '核心' },
  { page: 'calendar', label: '日历', section: '生活' },
  { page: 'tasks', label: '任务', section: '生活' },
  { page: 'reminders', label: '提醒', section: '生活' },
  { page: 'shopping', label: '购物', section: '生活' },
  { page: 'meals', label: '餐食', section: '生活' },
  { page: 'notes', label: '便签', section: '资料' },
  { page: 'contacts', label: '联系人', section: '资料' },
  { page: 'documents', label: '文档', section: '资料' },
  { page: 'birthdays', label: '生日', section: '资料' },
];

function getHiddenNavModules() {
  return data.settings?.hiddenNavModules || [];
}

function isNavModuleHidden(page) {
  return getHiddenNavModules().includes(page);
}

function toggleNavModule(page) {
  if (!data.settings) data.settings = {};
  if (!data.settings.hiddenNavModules) data.settings.hiddenNavModules = [];
  const idx = data.settings.hiddenNavModules.indexOf(page);
  if (idx > -1) data.settings.hiddenNavModules.splice(idx, 1);
  else data.settings.hiddenNavModules.push(page);
  saveData();
  renderNavModuleSettings();
  applyNavModuleVisibility();
  showToast(isNavModuleHidden(page) ? '已隐藏' : '已显示', 'success');
}

function applyNavModuleVisibility() {
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    const pg = el.dataset.page;
    el.style.display = isNavModuleHidden(pg) ? 'none' : '';
  });
  document.querySelectorAll('.sidebar-section-label').forEach(el => {
    let sibling = el.nextElementSibling;
    let hasVisible = false;
    while (sibling && sibling.classList.contains('sidebar-item')) {
      if (!isNavModuleHidden(sibling.dataset.page)) { hasVisible = true; break; }
      sibling = sibling.nextElementSibling;
    }
    el.style.display = hasVisible ? '' : 'none';
  });
}

function renderNavModuleSettings() {
  const el = document.getElementById('navModuleSettings');
  if (!el) return;
  el.innerHTML = NAV_MODULES.map(m => {
    const hidden = isNavModuleHidden(m.page);
    return `<button class="filter-chip${!hidden ? ' active' : ''}" onclick="toggleNavModule('${m.page}')" title="${m.section}">${esc(m.label)}</button>`;
  }).join('');
}

// ─── 周期性规则管理 ──────────────────────────────

function addRecurringRule() {
  const note = document.getElementById('recRuleNote').value.trim();
  const amt = parseFloat(document.getElementById('recRuleAmt').value);
  if (!note || !amt) { showToast('请填写名称和金额', 'error'); return; }
  if (!data.recurringRules) data.recurringRules = [];
  data.recurringRules.push({
    id: 'rec_' + Date.now(),
    type: 'expense',
    amount: amt,
    category: document.getElementById('recRuleCat').value || '其他',
    note: note,
    account: document.getElementById('recRuleAccount').value || (data.assets[0] || {}).id || 'cash',
    freq: document.getElementById('recRuleFreq').value,
    interval: 1,
    nextDate: new Date().toISOString().split('T')[0],
    active: true,
  });
  saveData();
  renderRecurringList();
  showToast('已添加周期性交易', 'success');
}

function toggleRecurringRule(id) {
  const rule = data.recurringRules.find(r => r.id === id);
  if (rule) { rule.active = !rule.active; saveData(); renderRecurringList(); }
}

function deleteRecurringRule(id) {
  data.recurringRules = data.recurringRules.filter(r => r.id !== id);
  saveData();
  renderRecurringList();
  showToast('已删除', 'success');
}

function renderRecurringList() {
  const el2 = document.getElementById('recurringList');
  if (!el2) return;
  const rules = data.recurringRules || [];
  if (!rules.length) { el2.innerHTML = '<div style="color:var(--text3);padding:8px 0">暂无周期性交易</div>'; return; }
  el2.innerHTML = rules.map(r => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <span style="color:var(--text1)">${esc(r.note)}</span>
        <span style="color:var(--cyan);margin-left:6px">¥${r.amount.toFixed(2)}</span>
        <span style="color:var(--text3);font-size:9px;margin-left:4px">${r.freq} · 下次:${r.nextDate}</span>
      </div>
      <div style="display:flex;gap:4px;align-items:center">
        <button onclick="toggleRecurringRule('${r.id}')" style="font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:${r.active?'var(--cyan-dim)':'var(--bg2)'};color:var(--text1);cursor:pointer">${r.active?'启用':'暂停'}</button>
        <button onclick="deleteRecurringRule('${r.id}')" style="font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg2);color:var(--red);cursor:pointer">×</button>
      </div>
    </div>
  `).join('');
}

// ─── 贷款管理 ────────────────────────────────────

function addLoan() {
  const n = document.getElementById('loanName').value.trim();
  const p = parseFloat(document.getElementById('loanPrincipal').value);
  const r = parseFloat(document.getElementById('loanRate').value);
  const t = parseInt(document.getElementById('loanTerm').value);
  if (!n || !p || !t) { showToast('请填写名称、本金和期数', 'error'); return; }
  const mr = (r || 0) / 100 / 12;
  const monthly = mr > 0 ? p * mr * Math.pow(1+mr, t) / (Math.pow(1+mr, t)-1) : p / t;
  if (!data.loans) data.loans = [];
  data.loans.push({
    id: 'loan_' + Date.now(), name: n, principal: p, rate: r || 0,
    term: t, monthlyPayment: Math.round(monthly*100)/100,
    startDate: new Date().toISOString().split('T')[0], payments: []
  });
  saveData(); renderLoansList(); showToast('贷款已添加', 'success');
}

function addLoanPayment(loanId) {
  const loan = data.loans.find(l => l.id === loanId);
  if (!loan) return;
  const mr = loan.rate / 100 / 12;
  const paidPrincipal = loan.payments.reduce((s, p) => s + p.principal, 0);
  const interest = Math.round((loan.principal - paidPrincipal) * mr * 100) / 100;
  const defaultAmt = loan.monthlyPayment.toFixed(2);

  const info = document.getElementById('loanPaymentInfo');
  if (info) info.innerHTML = `<span style="color:var(--ink)">${esc(loan.name)}</span> · 月供 ¥${defaultAmt} · 剩余本金 ¥${(loan.principal - paidPrincipal).toLocaleString()}`;

  const qa = document.getElementById('loanQuickAmounts');
  if (qa) {
    const suggestions = [loan.monthlyPayment, loan.monthlyPayment * 0.5, loan.monthlyPayment * 2, loan.principal - paidPrincipal];
    qa.innerHTML = [...new Set(suggestions.filter(v => v > 0).map(v => Math.round(v * 100) / 100))].map(v =>
      `<button class="quick-amount" type="button" onclick="document.getElementById('loanPaymentAmount').value=${v};document.getElementById('loanPaymentAmount').focus()">¥${v.toFixed(0)}</button>`
    ).join('');
  }

  document.getElementById('loanPaymentAmount').value = defaultAmt;
  document.getElementById('loanPaymentAmount').dataset.loanId = loanId;
  document.getElementById('loanPaymentModal').classList.add('show');
  setTimeout(() => document.getElementById('loanPaymentAmount')?.focus(), 100);
}

function closeLoanPayment() {
  document.getElementById('loanPaymentModal').classList.remove('show');
}

function submitLoanPayment() {
  const loanId = document.getElementById('loanPaymentAmount').dataset.loanId;
  const loan = data.loans.find(l => l.id === loanId);
  if (!loan) return;
  const amt = parseFloat(document.getElementById('loanPaymentAmount').value);
  if (!amt || amt <= 0) { showToast('请输入有效金额', 'error'); return; }
  const mr = loan.rate / 100 / 12;
  const paidPrincipal = loan.payments.reduce((s, p) => s + p.principal, 0);
  const interest = Math.round((loan.principal - paidPrincipal) * mr * 100) / 100;
  const principal = Math.round((amt - interest) * 100) / 100;
  const remaining = Math.round((loan.principal - paidPrincipal - principal) * 100) / 100;
  if (remaining < -0.01) { showToast('还款金额超过剩余本金', 'error'); return; }
  loan.payments.push({
    date: new Date().toISOString().split('T')[0],
    amount: amt, principal: Math.max(0, principal), interest: Math.max(0, interest),
    remaining: Math.max(0, remaining),
  });
  saveData();
  closeLoanPayment();
  renderLoansList();
  showToast('还款已记录', 'success');
}

function deleteLoan(id) { data.loans = data.loans.filter(l=>l.id!==id); saveData(); renderLoansList(); showToast('已删除','success'); }

function renderLoansList() {
  const el2 = document.getElementById('loansList');
  if (!el2) return;
  const loans = data.loans || [];
  if (!loans.length) { el2.innerHTML = '<div style="color:var(--text3);padding:8px 0">暂无贷款</div>'; return; }
  el2.innerHTML = loans.map(l => {
    const paid = l.payments.length;
    const rem = l.payments.length>0 ? l.payments[l.payments.length-1].remaining : l.principal;
    const pct = Math.min(100, (1-rem/l.principal)*100);
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text1);font-weight:500">${esc(l.name)}</span>
        <span style="color:var(--cyan)">¥${l.monthlyPayment.toFixed(2)}/月</span>
      </div>
      <div style="font-size:9px;color:var(--text2);margin:3px 0">本金 ¥${l.principal.toLocaleString()} · ${l.rate}% · ${paid}/${l.term}期 · 剩余 ¥${(rem||0).toLocaleString()}</div>
      <div style="height:4px;border-radius:2px;background:var(--border);margin:4px 0"><div style="height:100%;width:${pct}%;border-radius:2px;background:var(--cyan);transition:width .3s"></div></div>
      <div style="display:flex;gap:4px;justify-content:flex-end">
        <button onclick="addLoanPayment('${l.id}')" style="font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:var(--cyan-dim);color:var(--cyan);cursor:pointer">还款</button>
        <button onclick="deleteLoan('${l.id}')" style="font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg2);color:var(--red);cursor:pointer">×</button>
      </div></div>`;
  }).join('');
}

// ─── Obsidian ──────────────────────────────────────

function syncToObsidian() { showToast('Obsidian 同步需要 NAS WebDAV 地址，暂未配置', 'warn'); }

function showObsidianPreview() {
  const el2 = el('obsidianPreviewContainer');
  const sh = el2.style.display === 'none';
  el2.style.display = sh ? 'block' : 'none';
  if (sh) {
    const now = new Date();
    const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mt  = data.transactions.filter(t => t.date && t.date.startsWith(ym));
    const inc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const lines = mt.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(t => `- ${t.date} | ${t.type === 'expense' ? '-' : '+'}${fmt(t.amount)} | ${t.category} ${t.note ? '| ' + t.note : ''}`)
      .join('\n');
    el('obsidianPreviewContent').textContent =
      `# ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} 财务流水\n\n## 摘要\n- 收入: ${fmt(inc)}\n- 支出: ${fmt(exp)}\n- 结余: ${fmt(inc - exp)}\n\n## 记录\n${lines || '（无记录）'}\n`;
  }
}

// ─── 服务端同步 ────────────────────────────────────

function getSyncBaseUrl() {
  const configured = (data.settings?.syncServerUrl || '').trim();
  return (configured || window.location.origin).replace(/\/+$/, '');
}

async function syncToServer() {
  try {
    const hdrs = { 'Content-Type': 'application/json' };
    const token = data.settings?.syncToken || storageService.get('v1:syncToken');
    if (token) hdrs['Authorization'] = 'Bearer ' + token;
    const baseUrl = getSyncBaseUrl();
    const r = await fetch(baseUrl + '/api/data', {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(typeof createFullBackup === 'function' ? createFullBackup() : data),
    });
    if (!r.ok) console.warn('sync push failed', r.status);
  } catch (e) {
    console.warn('sync push error', e.message);
  }
}

async function syncFromServer() {
  try {
    const hdrs = {};
    const token = data.settings?.syncToken || storageService.get('v1:syncToken');
    if (token) hdrs['Authorization'] = 'Bearer ' + token;
    const baseUrl = getSyncBaseUrl();
    const r = await fetch(baseUrl + '/api/data', { headers: hdrs });
    if (r.ok) {
      const sd = await r.json();
      if (typeof applyFullBackup === 'function') {
        applyFullBackup(sd);
      } else {
        data = migrate(deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), sd.appData || sd));
      }
      saveData();
      render();
    }
  } catch (e) {
    console.warn('sync pull error', e.message);
  }
}

// ─── AI 分析 ────────────────────────────────────────

/** 测试 AI 连接 */
async function testAiConnection() {
  const btn = document.getElementById('aiTestBtn');
  const res = document.getElementById('aiTestResult');
  if (!btn || !res) return;
  btn.disabled = true;
  btn.textContent = '测试中...';
  res.style.display = 'block';
  res.className = '';
  res.innerHTML = '<div style="color:var(--text3)">正在连接...</div>';

  try {
    const endpoint = data.settings?.financeAiEndpoint || 'https://token-plan-cn.xiaomimimo.com/v1';
    const model = data.settings?.financeAiModel || 'mimo-v2.5';
    const apiKey = data.settings?.financeAiKey || storageService.get('v1:aiKey') || '';

    if (!apiKey) {
      res.innerHTML = '<div style="color:var(--yellow)">[错误] 请先填写 API Key</div>';
      btn.disabled = false;
      btn.textContent = '测试连接';
      return;
    }

    const r = await fetch(endpoint + '/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });

    if (r.ok) {
      const d = await r.json();
      const models = d.data?.map(m => m.id).slice(0, 5).join(', ') || model;
      res.innerHTML = `<div style="color:var(--green)">[成功] 连接成功！可用模型: ${esc(models)}</div>`;
    } else {
      // 部分API端点不支持 /models，fallback 到 chat completion 测试
      const r2 = await fetch(endpoint + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
      });
      if (r2.ok) {
        res.innerHTML = `<div style="color:var(--green)">[成功] 连接成功！模型 ${esc(model)} 可用</div>`;
      } else {
        const err = await r2.text().catch(() => '未知错误');
        res.innerHTML = `<div style="color:var(--red)">[失败] 连接失败 (${r2.status}): ${esc(err.slice(0, 200))}</div>`;
      }
    }
  } catch (e) {
    res.innerHTML = `<div style="color:var(--red)">[异常] 连接异常: ${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '测试连接';
  }
}

async function aiAnalyze() {
  const r = el('aiResult');
  const ph = document.getElementById('aiPlaceholder');
  if (ph) ph.style.display = 'none';
  r.style.display = 'block';
  r.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:var(--s-4);color:var(--ink-muted);font-size:var(--text-xs)"><div class="spinner"></div><span>正在分析...</span></div>';
  const btn = el('aiBtn');
  btn.disabled = true;
  try {
    const now = new Date();
    const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const tx  = data.transactions.filter(t => t.date && t.date.startsWith(ym));
    const inc = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const ce  = {};
    tx.filter(t => t.type === 'expense').forEach(t => { ce[t.category] = (ce[t.category] || 0) + t.amount; });
    let s = `本月账单摘要：\n`;
    s += `总收入: ¥${inc.toFixed(2)}\n总支出: ¥${exp.toFixed(2)}\n结余: ¥${(inc - exp).toFixed(2)}\n`;
    s += `预算: ¥${data.budget.toFixed(2)} (已使用${(exp / data.budget * 100).toFixed(1)}%)\n\n支出分类:\n`;
    for (const [c, v] of Object.entries(ce)) s += `- ${c}: ¥${v.toFixed(2)} (${(v / exp * 100).toFixed(1)}%)\n`;
    s += '\n最近交易:\n';
    tx.slice(-10).reverse().forEach(t => {
      s += `- ${t.date} ${t.type === 'expense' ? '支出' : '收入'} ${t.category || ''} ¥${t.amount.toFixed(2)} ${t.note || ''}\n`;
    });

    const apiKey = data.settings?.financeAiKey || storageService.get('v1:aiKey') || '';
    if (!apiKey) {
      r.innerHTML = '<div style="color:var(--yellow);padding:12px;">请先在设置页配置 AI API Key</div>';
      btn.disabled = false;
      return;
    }
    const endpoint = data.settings?.financeAiEndpoint || 'https://token-plan-cn.xiaomimimo.com/v1';
    const model = data.settings?.financeAiModel || 'mimo-v2.5';

    const res = await fetch(endpoint + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的财务分析助手。请根据用户的账单数据，用中文分析其消费模式和习惯，指出潜在问题并提供实用的建议。分析要简洁有力，使用数据支撑观点。' },
          { role: 'user', content: s }
        ],
        temperature: 0.7, max_tokens: 2000
      })
    });
    if (!res.ok) throw new Error(`API错误: ${res.status}`);
    const d   = await res.json();
    const reply = d.choices?.[0]?.message?.content || '未收到回复';
    r.textContent = reply;
  } catch (e) {
    r.innerHTML = `<div style="color:var(--red);padding:12px;">分析失败: ${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

// ─── 账户流水详情 ──────────────────────────────────

function openAccountDetail(id) {
  const a = data.assets.find(aa => aa.id === id);
  if (!a) return;
  el('accountDetailTitle').textContent = a.name;
  el('accountDetailModal').classList.add('show');
  renderAccountDetail(id);
}

function closeAccountDetail() {
  el('accountDetailModal').classList.remove('show');
}

function renderAccountDetail(id) {
  const el2 = document.getElementById('accountDetailContent');
  if (!el2) return;
  const a = data.assets.find(aa => aa.id === id);
  if (!a) { el2.innerHTML = ''; return; }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const accountTx = data.transactions.filter(t => t.account === id || t.fromAccount === id || t.toAccount === id);
  const thisMonthTx = accountTx.filter(t => t.date && t.date.startsWith(ym));
  const monthInc = thisMonthTx.filter(t => t.type === 'income' && t.account === id).reduce((s, t) => s + t.amount, 0);
  const monthExp = thisMonthTx.filter(t => t.type === 'expense' && t.account === id).reduce((s, t) => s + t.amount, 0);
  const monthTxCount = thisMonthTx.length;
  const lastTx = accountTx.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  const isDebt = a.type === 'debt';
  const debtSign = isDebt ? '-' : '';
  const totalAssets = data.assets.reduce((s, aa) => s + (aa.type === 'debt' ? -(aa.amount || 0) : (aa.amount || 0)), 0);
  const assetPct = totalAssets > 0 ? (Math.abs(a.amount || 0) / Math.abs(totalAssets) * 100) : 0;

  let html = `<div style="display:flex;gap:var(--s-4);flex-wrap:wrap;margin-bottom:var(--s-4)">`;
  html += `<div style="flex:1;min-width:150px;padding:var(--s-3);background:var(--canvas-subtle);border-radius:var(--r-sm);text-align:center">
    <div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px">当前余额</div>
    <div style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;color:${isDebt ? 'var(--danger)' : 'var(--ink)'};margin:4px 0">${debtSign}${fmt(Math.abs(a.amount || 0))}</div>
    <div style="font-size:10px;color:var(--ink-muted)">占总资产 ${assetPct.toFixed(1)}%</div>
  </div>`;
  html += `<div style="flex:1;min-width:120px;padding:var(--s-3);background:var(--canvas-subtle);border-radius:var(--r-sm);text-align:center">
    <div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px">本月收入</div>
    <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:600;color:var(--success);margin:4px 0">${fmt(monthInc)}</div>
  </div>`;
  html += `<div style="flex:1;min-width:120px;padding:var(--s-3);background:var(--canvas-subtle);border-radius:var(--r-sm);text-align:center">
    <div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px">本月支出</div>
    <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:600;color:var(--danger);margin:4px 0">${fmt(monthExp)}</div>
  </div>`;
  html += `<div style="flex:1;min-width:120px;padding:var(--s-3);background:var(--canvas-subtle);border-radius:var(--r-sm);text-align:center">
    <div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px">交易笔数</div>
    <div style="font-family:var(--font-mono);font-size:var(--text-lg);font-weight:600;margin:4px 0">${monthTxCount}</div>
    <div style="font-size:10px;color:var(--ink-muted)">${lastTx ? '最近 ' + lastTx.date : '无记录'}</div>
  </div>`;
  html += '</div>';

  const recentTx = [...accountTx].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20);
  html += `<div style="font-size:10px;font-weight:600;color:var(--ink-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--s-2)">近期流水（最近20笔）</div>`;

  if (recentTx.length === 0) {
    html += '<div style="color:var(--ink-muted);font-size:var(--text-xs);padding:var(--s-3) 0;text-align:center">暂无交易记录</div>';
  } else {
    html += recentTx.map(t => {
      const sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '↔';
      const cl = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : '';
      const catIcon = CAT_ICONS[t.category] || '';
      return `<div class="record-row" style="cursor:pointer" onclick="closeAccountDetail();editTx(${t.id})">
        <div class="record-col record-col-cat">
          <span class="record-cat-icon">${catIcon}</span>
          <span class="record-cat-name">${esc(t.category || '转账')}</span>
        </div>
        <div class="record-col record-col-date">${esc(t.date || '')}</div>
        <div class="record-col record-col-account">${esc(t.accountName || (data.assets.find(aa => aa.id === t.account)?.name || '—'))}</div>
        <div class="record-col record-col-note">${esc(t.note || '—')}</div>
        <div class="record-col record-col-amount ${cl}">${sign}${fmt(t.amount)}</div>
      </div>`;
    }).join('');
  }

  el2.innerHTML = html;
}

async function forceRefresh() {
  if ('caches' in window) {
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) await reg.unregister();
  }
  window.location.reload(true);
}
