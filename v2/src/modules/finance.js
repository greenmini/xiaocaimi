import { addItem, getState, update } from '../core/store.js';
import { currency, escapeHtml, html, readForm, today } from '../core/dom.js';
import { t } from '../core/i18n.js';

const categoryKeys = ['catFood', 'catTransport', 'catShopping', 'catHousing', 'catPhone', 'catTravel', 'catSalary', 'catBonus', 'catInvestment', 'other'];
const accountTypes = [
  { value: 'cash', labelKey: 'accountTypeCash' },
  { value: 'bank', labelKey: 'accountTypeBank' },
  { value: 'alipay', labelKey: 'accountTypeAlipay' },
  { value: 'wechat', labelKey: 'accountTypeWechat' },
  { value: 'fund', labelKey: 'accountTypeFund' },
  { value: 'stock', labelKey: 'accountTypeStock' },
  { value: 'medical', labelKey: 'accountTypeMedical' },
  { value: 'credit', labelKey: 'accountTypeCredit' },
  { value: 'debt', labelKey: 'debt' },
  { value: 'other', labelKey: 'other' },
];
const liabilityTypes = new Set(['credit', 'debt']);
let accountFormsExpanded = false;
let accountFormTab = 'new';

function monthKey(offset = 0) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateValue) {
  const target = dateOnly(dateValue);
  if (!target) return Infinity;
  const start = new Date(`${today()}T00:00:00`);
  const due = new Date(`${target}T00:00:00`);
  return Math.round((due - start) / 86400000);
}

function money(value) {
  const number = Number(value || 0);
  return Math.round((Number.isFinite(number) ? number : 0) * 100) / 100;
}

function transactionId() {
  return `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function fundId() {
  return `fund_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function isLiability(type) {
  return liabilityTypes.has(type);
}

function accountTypeLabel(type) {
  return t(accountTypes.find(item => item.value === type)?.labelKey || 'asset');
}

function accountRef(txOrRef) {
  if (!txOrRef) return '';
  if (typeof txOrRef === 'object') return txOrRef.accountId || txOrRef.account || '';
  return txOrRef;
}

function findAccount(assets, txOrRef) {
  const ref = accountRef(txOrRef);
  if (!ref) return null;
  const matched = assets.find(account => account.id === ref || account.name === ref);
  if (matched) return matched;
  if (['cash', '现金账户', 'Cash Account'].includes(ref)) {
    return assets.find(account => account.id === 'cash') || null;
  }
  return null;
}

function matchesAccount(account, ref) {
  return account.id === ref || account.name === ref;
}

function accountDisplayName(tx) {
  return findAccount(getState().finance.assets, tx)?.name || tx.account || t('unassigned');
}

function accountOptions(assets, selected = '') {
  return assets.map(account => `<option value="${escapeHtml(account.id)}" ${account.id === selected ? 'selected' : ''}>${escapeHtml(account.name)} · ${accountTypeLabel(account.type)}</option>`).join('');
}

function fundOptions(funds, selected = '') {
  return funds.map(fund => `<option value="${escapeHtml(fund.id)}" ${fund.id === selected ? 'selected' : ''}>${escapeHtml(fund.name)}</option>`).join('');
}

function signedFlowImpact(account, tx) {
  const amount = money(tx.amount);
  if (!amount) return 0;
  const multiplier = isLiability(account.type) ? -1 : 1;
  if (tx.type === 'income' && matchesAccount(account, accountRef(tx))) return amount * multiplier;
  if (tx.type === 'expense' && matchesAccount(account, accountRef(tx))) return -amount * multiplier;
  if (tx.type === 'adjustment' && matchesAccount(account, accountRef(tx))) return money(tx.adjustmentDelta);
  if (tx.type === 'transfer') {
    const fromId = tx.fromAccountId || tx.fromAccount;
    const toId = tx.toAccountId || tx.toAccount;
    if (matchesAccount(account, fromId)) return -amount * multiplier;
    if (matchesAccount(account, toId)) return amount * multiplier;
  }
  if (tx.type === 'fundBuy' && matchesAccount(account, tx.sourceAccountId || tx.accountId || tx.account)) return -amount * multiplier;
  if (tx.type === 'fundSell' && matchesAccount(account, tx.targetAccountId || tx.accountId || tx.account)) return amount * multiplier;
  return 0;
}

function fundFlowImpact(fund, tx) {
  if (tx.fundId !== fund.id) return { value: 0, cost: 0 };
  const amount = money(tx.amount);
  if (tx.type === 'fundBuy') return { value: amount, cost: amount };
  if (tx.type === 'fundSell') return { value: -amount, cost: -money(tx.fundCostDelta) };
  return { value: 0, cost: 0 };
}

function normalizeLedgerSeeds(state) {
  const transactions = state.finance.transactions || [];
  (state.finance.assets || []).forEach(account => {
    if (account.openingBalance == null) {
      const current = money(account.amount);
      const delta = transactions.reduce((sum, tx) => sum + signedFlowImpact(account, tx), 0);
      account.openingBalance = money(current - delta);
    }
  });
  (state.finance.funds || []).forEach(fund => {
    if (fund.openingValue == null) {
      const currentValue = money(fund.value);
      const valueDelta = transactions.reduce((sum, tx) => sum + fundFlowImpact(fund, tx).value, 0);
      fund.openingValue = money(currentValue - valueDelta);
    }
    if (fund.openingCost == null) {
      const currentCost = money(fund.cost);
      const costDelta = transactions.reduce((sum, tx) => sum + fundFlowImpact(fund, tx).cost, 0);
      fund.openingCost = money(currentCost - costDelta);
    }
  });
}

function syncLedgerBalances(state) {
  normalizeLedgerSeeds(state);
  const transactions = state.finance.transactions || [];
  (state.finance.assets || []).forEach(account => {
    const delta = transactions.reduce((sum, tx) => sum + signedFlowImpact(account, tx), 0);
    account.amount = money(Number(account.openingBalance || 0) + delta);
  });
  (state.finance.funds || []).forEach(fund => {
    const delta = transactions.reduce((sum, tx) => {
      const impact = fundFlowImpact(fund, tx);
      return { value: sum.value + impact.value, cost: sum.cost + impact.cost };
    }, { value: 0, cost: 0 });
    fund.value = money(Number(fund.openingValue || 0) + delta.value);
    fund.cost = money(Math.max(0, Number(fund.openingCost || 0) + delta.cost));
  });
}

function accountNetValue(account) {
  return money(account.amount) * (isLiability(account.type) ? -1 : 1);
}

function txTitle(tx) {
  if (tx.type === 'transfer') return t('transfer');
  if (tx.type === 'adjustment') return t('balanceAdjustment');
  if (tx.type === 'fundBuy') return `${t('fundBuy')} · ${escapeHtml(tx.fundName || '')}`;
  if (tx.type === 'fundSell') return `${t('fundSell')} · ${escapeHtml(tx.fundName || '')}`;
  return escapeHtml(tx.category || t('uncategorized'));
}

function txAccountLabel(tx) {
  if (tx.type === 'transfer') {
    const state = getState();
    const from = findAccount(state.finance.assets, tx.fromAccountId || tx.fromAccount)?.name || t('unassigned');
    const to = findAccount(state.finance.assets, tx.toAccountId || tx.toAccount)?.name || t('unassigned');
    return `${from} → ${to}`;
  }
  if (tx.type === 'fundBuy') return findAccount(getState().finance.assets, tx.sourceAccountId || tx.accountId || tx.account)?.name || t('unassigned');
  if (tx.type === 'fundSell') return findAccount(getState().finance.assets, tx.targetAccountId || tx.accountId || tx.account)?.name || t('unassigned');
  return accountDisplayName(tx);
}

function txAmountText(tx) {
  if (tx.type === 'income' || tx.type === 'fundSell') return `+${currency(tx.amount)}`;
  if (tx.type === 'expense' || tx.type === 'fundBuy') return `-${currency(tx.amount)}`;
  if (tx.type === 'adjustment') {
    const delta = money(tx.adjustmentDelta);
    return `${delta >= 0 ? '+' : '-'}${currency(Math.abs(delta))}`;
  }
  return currency(tx.amount);
}

function txAmountTone(tx) {
  if (tx.type === 'income' || tx.type === 'fundSell') return 'positive';
  if (tx.type === 'expense' || tx.type === 'fundBuy') return 'negative';
  if (tx.type === 'adjustment') return money(tx.adjustmentDelta) >= 0 ? 'positive' : 'negative';
  return '';
}

function monthSeries(count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const key = monthKey(offset);
    return { key, label: key.slice(5) };
  });
}

function choreStatus(chore, settings = {}) {
  if (chore.isArchived) return 'archived';
  const diff = daysUntil(chore.nextDueDate);
  const upcomingDays = Number(settings.upcomingDays || 3);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= upcomingDays) return 'upcoming';
  return 'notDue';
}

function birthdayInfo(dateValue) {
  const value = dateOnly(dateValue);
  if (!value) return { daysUntil: Infinity, nextDate: '' };
  const [year, month, day] = value.split('-').map(Number);
  if (!month || !day) return { daysUntil: Infinity, nextDate: '' };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < start) next = new Date(now.getFullYear() + 1, month - 1, day);
  return {
    daysUntil: Math.round((next - start) / 86400000),
    nextDate: dateOnly(next),
    age: year > 1900 ? next.getFullYear() - year : null,
  };
}

function dashboardContext(state) {
  const settings = state.modules.choreSettings || {};
  const chores = (state.modules.chores || []).filter(chore => !chore.isArchived);
  const dueChores = chores
    .map(chore => ({ ...chore, status: choreStatus(chore, settings) }))
    .filter(chore => ['overdue', 'today'].includes(chore.status))
    .sort((a, b) => (a.status === b.status ? dateOnly(a.nextDueDate).localeCompare(dateOnly(b.nextDueDate)) : a.status === 'overdue' ? -1 : 1));

  const reminders = (state.modules.reminders || [])
    .filter(reminder => reminder.status !== 'completed')
    .map(reminder => ({ ...reminder, minutes: reminder.dueAt ? Math.round((new Date(reminder.dueAt).getTime() - Date.now()) / 60000) : Infinity }))
    .filter(reminder => reminder.minutes <= 24 * 60)
    .sort((a, b) => a.minutes - b.minutes);

  const tasks = (state.modules.tasks || [])
    .filter(task => task.status !== t('done') && dateOnly(task.date) === today())
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const calendar = (state.modules.calendar || [])
    .filter(event => dateOnly(event.date) === today())
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const contactBirthdays = (state.modules.contacts || [])
    .filter(contact => contact.birthday)
    .map(contact => ({ id: `contact:${contact.id}`, title: contact.title, ...birthdayInfo(contact.birthday) }));
  const standaloneBirthdays = (state.modules.birthdays || [])
    .map(item => ({ id: item.id, title: item.title, ...birthdayInfo(item.date) }));
  const birthdays = [...contactBirthdays, ...standaloneBirthdays]
    .filter(item => item.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const focusMinutes = (state.modules.focusSessions || [])
    .filter(session => session.endedAt && dateOnly(session.startedAt) === today())
    .reduce((sum, session) => sum + Number(session.durationMinutes || 0), 0);

  const overdueCount = dueChores.filter(chore => chore.status === 'overdue').length + reminders.filter(reminder => reminder.minutes < 0).length;
  const todayCount = dueChores.filter(chore => chore.status === 'today').length + reminders.filter(reminder => reminder.minutes >= 0).length + tasks.length + calendar.length + birthdays.filter(item => item.daysUntil === 0).length;

  return { dueChores, reminders, tasks, calendar, birthdays, focusMinutes, overdueCount, todayCount };
}

export function financeStats(state = getState()) {
  syncLedgerBalances(state);
  const { assets, funds, transactions, budget } = state.finance;
  const currentMonth = monthKey();
  const monthTx = transactions.filter(tx => tx.date?.startsWith(currentMonth));
  const income = money(monthTx.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + money(tx.amount), 0));
  const expense = money(monthTx.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + money(tx.amount), 0));
  const assetTotal = money(assets.reduce((sum, item) => sum + accountNetValue(item), 0));
  const fundTotal = money(funds.reduce((sum, item) => sum + money(item.value), 0));
  return { income, expense, balance: money(income - expense), total: money(assetTotal + fundTotal), budgetLeft: money(Number(budget || 0) - expense) };
}

export function renderDashboard() {
  const state = getState();
  const stats = financeStats(state);
  const todayCenter = dashboardContext(state);
  const recent = [...state.finance.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
  return html`
    <div class="grid cols-3">
      ${metricCard(t('todayCenter'), todayCenter.todayCount)}
      ${metricCard(t('needsAttention'), todayCenter.overdueCount, todayCenter.overdueCount ? 'negative' : '')}
      ${metricCard(t('focusToday'), `${Math.round(todayCenter.focusMinutes)}m`, 'positive')}
    </div>
    <div class="grid cols-2 today-center-grid" style="margin-top:14px">
      <section class="card">
        <h3>${t('todayAgenda')}</h3>
        ${renderTodayAgenda(todayCenter)}
      </section>
      <section class="card">
        <h3>${t('todayFinanceBrief')}</h3>
        <div class="detail-grid">
          <div><span>${t('budgetStatus')}</span><strong class="${stats.budgetLeft >= 0 ? 'positive' : 'negative'}">${currency(stats.budgetLeft)}</strong></div>
          <div><span>${t('monthBalance')}</span><strong class="${stats.balance >= 0 ? 'positive' : 'negative'}">${currency(stats.balance)}</strong></div>
          <div><span>${t('monthIncome')}</span><strong class="positive">${currency(stats.income)}</strong></div>
          <div><span>${t('monthExpense')}</span><strong class="negative">${currency(stats.expense)}</strong></div>
        </div>
      </section>
    </div>
    <div class="grid cols-3" style="margin-top:14px">
      ${metricCard(t('totalAssets'), currency(stats.total))}
      ${metricCard(t('monthIncome'), currency(stats.income), 'positive')}
      ${metricCard(t('monthExpense'), currency(stats.expense), 'negative')}
    </div>
    <div class="grid cols-2" style="margin-top:14px">
      <section class="card">
        <h3>${t('budgetStatus')}</h3>
        <div class="metric ${stats.budgetLeft >= 0 ? 'positive' : 'negative'}">${currency(stats.budgetLeft)}</div>
        <p class="muted">${t('monthlyBudget')} ${currency(state.finance.budget)}</p>
      </section>
      <section class="card">
        <h3>${t('recentTransactions')}</h3>
        ${recent.length ? recent.map(txRow).join('') : `<div class="empty">${t('noTransactions')}</div>`}
      </section>
    </div>
  `;
}

function metricCard(title, value, tone = '') {
  return html`<section class="card"><h3>${title}</h3><div class="metric ${tone}">${value}</div></section>`;
}

function renderTodayAgenda(context) {
  const rows = [
    ...context.dueChores.slice(0, 4).map(chore => ({
      title: chore.title,
      meta: `${t('chores')} · ${chore.status === 'overdue' ? t('choreOverdue') : t('choreToday')}`,
      tone: chore.status === 'overdue' ? 'negative' : '',
    })),
    ...context.reminders.slice(0, 4).map(reminder => ({
      title: reminder.title,
      meta: `${t('reminder')} · ${reminder.minutes < 0 ? `${Math.abs(reminder.minutes)}m ${t('late')}` : dateOnly(reminder.dueAt)}`,
      tone: reminder.minutes < 0 ? 'negative' : '',
    })),
    ...context.tasks.slice(0, 3).map(task => ({ title: task.title, meta: t('tasks'), tone: '' })),
    ...context.calendar.slice(0, 3).map(event => ({ title: event.title, meta: t('calendar'), tone: '' })),
    ...context.birthdays.slice(0, 3).map(item => ({ title: item.title, meta: `${t('birthday')} · ${item.daysUntil === 0 ? t('today') : `${item.daysUntil} ${t('daysLater')}`}`, tone: item.daysUntil === 0 ? 'positive' : '' })),
  ].slice(0, 8);

  if (!rows.length) return `<div class="empty">${t('noTodayAgenda')}</div>`;
  return rows.map(row => html`
    <div class="row compact-row">
      <div>
        <div class="list-title">${escapeHtml(row.title || t('noData'))}</div>
        <div class="dim">${escapeHtml(row.meta)}</div>
      </div>
      <div class="amount ${row.tone}">${row.tone === 'negative' ? '!' : ''}</div>
    </div>
  `).join('');
}

function txRow(tx) {
  return html`
    <div class="row">
      <div>
        <div class="list-title">${txTitle(tx)} <span class="muted">${escapeHtml(tx.note || '')}</span></div>
        <div class="dim">${escapeHtml(tx.date || '')} · ${escapeHtml(txAccountLabel(tx))}</div>
      </div>
      <div class="amount ${txAmountTone(tx)}">${txAmountText(tx)}</div>
    </div>
  `;
}

export function renderRecords() {
  const state = getState();
  syncLedgerBalances(state);
  const txs = [...state.finance.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const assets = state.finance.assets || [];
  return html`
    <section class="card">
      <h3>${t('newTransaction')}</h3>
      <form data-action="add-transaction" class="form-grid">
        <div class="field"><label>${t('type')}</label><select name="type"><option value="expense">${t('expense')}</option><option value="income">${t('income')}</option></select></div>
        <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" required></div>
        <div class="field"><label>${t('category')}</label><select name="category">${categoryKeys.map(key => `<option>${t(key)}</option>`).join('')}</select></div>
        <div class="field"><label>${t('date')}</label><input name="date" type="date" value="${today()}"></div>
        <div class="field span-2"><label>${t('account')}</label><select name="accountId">${accountOptions(assets)}</select></div>
        <div class="field span-2"><label>${t('note')}</label><input name="note" placeholder="${t('optional')}"></div>
        <button class="primary span-4">${t('saveTransaction')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <h3>${t('newTransfer')}</h3>
      <form data-action="add-transfer" class="form-grid">
        <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" required></div>
        <div class="field"><label>${t('date')}</label><input name="date" type="date" value="${today()}"></div>
        <div class="field"><label>${t('fromAccount')}</label><select name="fromAccountId">${accountOptions(assets)}</select></div>
        <div class="field"><label>${t('toAccount')}</label><select name="toAccountId">${accountOptions(assets)}</select></div>
        <div class="field span-4"><label>${t('note')}</label><input name="note" placeholder="${t('optional')}"></div>
        <button class="primary span-4">${t('saveTransfer')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <h3>${t('transactionRecords')}</h3>
      ${txs.length ? txs.map(tx => txRowWithDelete(tx)).join('') : `<div class="empty">${t('noTransactions')}</div>`}
    </section>
  `;
}

function txRowWithDelete(tx) {
  return html`
    <div class="row">
      <div>${txRow(tx)}</div>
      <button class="danger" data-action="delete-transaction" data-id="${escapeHtml(tx.id)}">${t('delete')}</button>
    </div>
  `;
}

export function renderAccounts() {
  const state = getState();
  syncLedgerBalances(state);
  const { assets, funds } = state.finance;
  const totalAssets = money(assets.reduce((sum, item) => sum + (isLiability(item.type) ? 0 : money(item.amount)), 0));
  const totalLiabilities = money(assets.reduce((sum, item) => sum + (isLiability(item.type) ? money(item.amount) : 0), 0));
  const netWorth = money(totalAssets - totalLiabilities);
  const absTotal = assets.reduce((s, a) => s + Math.abs(accountNetValue(a)), 0);

  const recentTxs = [...state.finance.transactions].sort((a, b) => (b.crud || '').localeCompare(a.crud || '')).slice(0, 6);

  return html`
    <div class="accounts-page-header">
      <div class="accounts-page-title-row">
        <h2 class="page-title">${t('accounts')}</h2>
        <div class="accounts-page-actions">
          <button class="btn btn-secondary" onclick="event.target.closest('.app-shell').__openAccountForm=!event.target.closest('.app-shell').__openAccountForm;var evt=new Event('toggle-accounts-form',{bubbles:true});document.querySelector('.app-shell').dispatchEvent(evt)">+ ${t('newAccount')}</button>
        </div>
      </div>
      <div class="accounts-kpi-strip">
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">${t('netWorth')}</div>
          <div class="acct-kpi-value ${netWorth >= 0 ? 'positive' : 'negative'}">${currency(netWorth)}</div>
          <div class="acct-kpi-sub">${assets.filter(a => !a.isArchived).length} ${t('accountsUnit')}</div>
        </div>
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">${t('totalAssets')}</div>
          <div class="acct-kpi-value positive">${currency(totalAssets)}</div>
          <div class="acct-kpi-sub">${t('excludingLiabilities')}</div>
        </div>
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">${t('totalLiabilities')}</div>
          <div class="acct-kpi-value ${totalLiabilities > 0 ? 'negative' : ''}">${currency(totalLiabilities)}</div>
          <div class="acct-kpi-sub">${totalLiabilities > 0 ? t('creditCardAndLoans') : t('noDebt')}</div>
        </div>
      </div>
    </div>

    <div class="accounts-main-grid">
      <div class="accounts-left-col">
        <section class="card account-list-card">
          <div class="card-header"><h3>${t('accountAssets')}</h3><span class="card-header-sub">${assets.filter(a => !a.isArchived).length} ${t('accountsUnit')}</span></div>
          <div class="account-list-wrap">
            ${assets.length ? assets.map(a => accountCard(a, absTotal)).join('') : `<div class="empty">${t('noAccounts')}</div>`}
          </div>
        </section>
      </div>
      <div class="accounts-right-col">
        <section class="card fund-card-panel">
          <div class="card-header"><h3>${t('fundAssets')}</h3><span class="card-header-sub">${funds.length} ${t('fundsUnit')}</span></div>
          <div class="fund-kpis-bar">
            <div class="fund-kpi-mini"><span class="fund-kpi-label">${t('marketValue')}</span><span class="fund-kpi-value">${currency(funds.reduce((s, f) => s + money(f.value), 0))}</span></div>
            <div class="fund-kpi-mini"><span class="fund-kpi-label">${t('fundCost')}</span><span class="fund-kpi-value">${currency(funds.reduce((s, f) => s + money(f.cost), 0))}</span></div>
            <div class="fund-kpi-mini"><span class="fund-kpi-label">${t('profitLossShort')}</span><span class="fund-kpi-value ${funds.reduce((s,f)=>s+money(f.value)-money(f.cost),0) >= 0 ? 'up' : 'down'}">${profitSign(funds.reduce((s,f)=>s+money(f.value)-money(f.cost),0))}${currency(Math.abs(funds.reduce((s,f)=>s+money(f.value)-money(f.cost),0)))}</span></div>
          </div>
          <div class="fund-list-wrap">
            ${funds.length ? funds.map(fund => {
              const profit = money(fund.value) - money(fund.cost);
              const profitPct = fund.cost > 0 ? (profit / money(fund.cost) * 100) : 0;
              return `<div class="fund-item-row">
                <div class="fund-item-icon" style="background:${profit >= 0 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)'};color:${profit >= 0 ? '#6fbf73' : '#d49595'}"></div>
                <div class="fund-item-info"><div class="fund-item-name">${escapeHtml(fund.name)}</div><div class="fund-item-cost">${t('fundCost')} ${currency(fund.cost)}</div></div>
                <div class="fund-item-right"><div class="fund-item-value">${currency(fund.value)}</div><div class="fund-item-profit ${profit >= 0 ? 'positive' : 'negative'}">${profit >= 0 ? '+' : ''}${currency(profit)} (${profit >= 0 ? '+' : ''}${profitPct.toFixed(1)}%)</div></div>
              </div>`;
            }).join('') : `<div class="empty">${t('noFunds')}</div>`}
          </div>
        </section>
        <section class="card" style="margin-top:12px">
          <div class="card-header"><h3>${t('recentChanges')}</h3></div>
          <div class="recent-changes-wrap">
            ${recentTxs.length ? recentTxs.map(tx => {
              const a = assets.find(aa => aa.id === tx.account || aa.id === tx.accountId);
              const isInc = tx.type === 'income';
              const sign = isInc ? '+' : '-';
              const cls = isInc ? 'positive' : 'negative';
              return `<div class="recent-change-row"><span class="recent-change-icon ${cls}">${isInc ? '↑' : '↓'}</span><span class="recent-change-account">${escapeHtml(a?.name || tx.accountName || tx.account || '')}</span><span class="recent-change-cat">${escapeHtml(tx.category||'')}</span><span class="recent-change-amount ${cls}">${sign}${currency(tx.amount)}</span><span class="recent-change-date">${(tx.date||'').slice(5)}</span></div>`;
            }).join('') : `<div class="empty">${t('noChanges')}</div>`}
          </div>
        </section>
      </div>
    </div>

    <section class="card account-actions-panel" style="margin-top:12px">
      <div class="actions-head" data-action="toggle-account-forms" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
        <h3 style="font-size:var(--text-sm);font-weight:600">${t('quickActions')}</h3>
        <button class="actions-toggle" data-action="toggle-account-forms" style="font-size:11px;padding:2px 8px;border:1px solid var(--border);background:var(--surface);color:var(--ink-dim);border-radius:var(--r-xs);cursor:pointer">${accountFormsExpanded ? t('collapse') : t('expand')}</button>
      </div>
      ${accountFormsExpanded ? html`
        <div class="form-tabs" style="display:flex;gap:4px;padding:8px var(--s-5);border-bottom:1px solid var(--border-faint)">
          <button class="form-tab ${accountFormTab === 'new' ? 'active' : ''}" data-action="set-account-tab" data-tab="new">${t('newAccount')}</button>
          <button class="form-tab ${accountFormTab === 'adjust' ? 'active' : ''}" data-action="set-account-tab" data-tab="adjust">${t('adjustBalance')}</button>
          <button class="form-tab ${accountFormTab === 'fund' ? 'active' : ''}" data-action="set-account-tab" data-tab="fund">${t('fundOperation')}</button>
        </div>
        ${accountFormTab === 'new' ? html`
          <form data-action="add-asset" class="form-grid" style="margin-top:12px">
            <div class="field span-2"><label>${t('name')}</label><input name="name" required></div>
            <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" required></div>
            <div class="field"><label>${t('type')}</label><select name="type">${accountTypes.map(type => `<option value="${type.value}">${t(type.labelKey)}</option>`).join('')}</select></div>
            <button class="primary span-4">${t('saveAccount')}</button>
          </form>
        ` : ''}
        ${accountFormTab === 'adjust' ? html`
          <form data-action="adjust-account" class="form-grid" style="margin-top:12px">
            <div class="field"><label>${t('account')}</label><select name="accountId">${accountOptions(assets)}</select></div>
            <div class="field"><label>${t('newBalance')}</label><input name="balance" type="number" step="0.01" required></div>
            <div class="field"><label>${t('date')}</label><input name="date" type="date" value="${today()}"></div>
            <div class="field"><label>${t('note')}</label><input name="note" placeholder="${t('optional')}"></div>
            <button class="primary span-4">${t('saveAdjustment')}</button>
          </form>
        ` : ''}
        ${accountFormTab === 'fund' ? html`
          <form data-action="fund-operation" class="form-grid" style="margin-top:12px">
            <div class="field"><label>${t('type')}</label><select name="operation"><option value="fundBuy">${t('fundBuy')}</option><option value="fundSell">${t('fundSell')}</option></select></div>
            <div class="field"><label>${t('fundAssets')}</label><select name="fundId"><option value="">${t('newFund')}</option>${fundOptions(funds)}</select></div>
            <div class="field span-2"><label>${t('fundName')}</label><input name="fundName" placeholder="${t('optional')}"></div>
            <div class="field"><label>${t('amount')}</label><input name="amount" type="number" step="0.01" required></div>
            <div class="field"><label>${t('account')}</label><select name="accountId">${accountOptions(assets)}</select></div>
            <div class="field"><label>${t('date')}</label><input name="date" type="date" value="${today()}"></div>
            <div class="field"><label>${t('note')}</label><input name="note" placeholder="${t('optional')}"></div>
            <button class="primary span-4">${t('saveFundOperation')}</button>
          </form>
        ` : ''}
      ` : ''}
    </section>
  `;
}

const ACCOUNT_COLORS = {
  cash: '#85b8a3',
  bank: '#8e95d8',
  alipay: '#5b9bd5',
  wechat: '#6fbf73',
  fund: '#c49b8f',
  stock: '#e8a87c',
  medical: '#7ec8c8',
  credit: '#d49595',
  debt: '#c9a87c',
  other: '#94a3b8',
};

function profitSign(p) { return p >= 0 ? '+' : ''; }

function accountCard(account, absTotal) {
  const signedAmount = accountNetValue(account);
  const absAmount = Math.abs(signedAmount);
  const amountTone = isLiability(account.type) ? 'negative' : (signedAmount > 0 ? 'positive' : 'muted');
  const prefix = isLiability(account.type) ? '-' : '';
  const accent = ACCOUNT_COLORS[account.type] || ACCOUNT_COLORS.other;
  const barRatio = absTotal > 0 ? Math.max(2, (absAmount / absTotal) * 100) : 0;

  return html`
    <div class="account-card" style="--accent:${accent}">
      <div class="account-card-bar" style="width:${barRatio}%"></div>
      <div class="account-card-main">
        <span class="account-card-type" style="background:${accent}18;color:${accent}">${accountTypeLabel(account.type)}</span>
        <div class="account-card-info">
          <span class="account-card-name">${escapeHtml(account.name)}</span>
          <span class="account-card-meta">${absTotal > 0 ? Math.round((absAmount / absTotal) * 100) : 0}%</span>
        </div>
        <div class="account-card-right">
          <div class="account-card-amount ${amountTone}">${prefix}${currency(absAmount)}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderAnalysis() {
  const state = getState();
  const stats = financeStats(state);
  const months = monthSeries(6).map(month => {
    const txs = state.finance.transactions.filter(tx => tx.date?.startsWith(month.key));
    const income = money(txs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + money(tx.amount), 0));
    const expense = money(txs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + money(tx.amount), 0));
    return { ...month, income, expense, balance: money(income - expense) };
  });
  const grouped = state.finance.transactions
    .filter(tx => tx.type === 'expense' && tx.date?.startsWith(monthKey()))
    .reduce((map, tx) => {
      map[tx.category || t('other')] = money((map[tx.category || t('other')] || 0) + money(tx.amount));
      return map;
    }, {});
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const topCategory = rows[0];
  const peakMonth = months.reduce((peak, month) => month.expense > peak.expense ? month : peak, months[0] || { label: '-', expense: 0 });
  return html`
    <div class="grid cols-3 analysis-summary">
      ${metricCard(t('monthIncome'), currency(stats.income), 'positive')}
      ${metricCard(t('monthExpense'), currency(stats.expense), 'negative')}
      ${metricCard(t('monthBalance'), currency(stats.balance), stats.balance >= 0 ? 'positive' : 'negative')}
    </div>
    <div class="grid cols-3 analysis-summary" style="margin-top:14px">
      ${metricCard(t('netFlow'), currency(money(months.reduce((sum, month) => sum + month.balance, 0))), months.reduce((sum, month) => sum + month.balance, 0) >= 0 ? 'positive' : 'negative')}
      ${metricCard(t('highestExpenseMonth'), `${peakMonth.label} · ${currency(peakMonth.expense)}`)}
      ${metricCard(t('topCategory'), topCategory ? `${escapeHtml(topCategory[0])} · ${currency(topCategory[1])}` : '-')}
    </div>
    <div class="grid cols-2 analysis-grid" style="margin-top:14px">
      ${renderTrendPanel(months)}
      ${renderBarPanel(months)}
    </div>
    <section class="card chart-card" style="margin-top:14px">
      <div class="chart-head">
        <div>
          <h3>${t('categoryRanking')}</h3>
          <p>${t('expenseCategories')}</p>
        </div>
        <strong>${currency(stats.expense)}</strong>
      </div>
      ${rows.length ? renderCategoryRanking(rows, stats.expense) : `<div class="empty">${t('noCategoryData')}</div>`}
    </section>
  `;
}

function renderTrendPanel(months) {
  const hasData = months.some(month => month.income || month.expense);
  return html`
    <section class="card chart-card">
      <div class="chart-head">
        <div>
          <h3>${t('sixMonthTrend')}</h3>
          <p>${t('netFlow')}</p>
        </div>
        <strong>${currency(money(months.reduce((sum, month) => sum + month.balance, 0)))}</strong>
      </div>
      ${hasData ? renderLineChart(months) : `<div class="empty chart-empty">${t('noTrendData')}</div>`}
    </section>
  `;
}

function renderBarPanel(months) {
  const max = Math.max(...months.flatMap(month => [month.income, month.expense]), 1);
  const hasData = months.some(month => month.income || month.expense);
  return html`
    <section class="card chart-card">
      <div class="chart-head">
        <div>
          <h3>${t('incomeVsExpense')}</h3>
          <p>${t('sixMonthTrend')}</p>
        </div>
      </div>
      ${hasData ? html`
        <div class="bar-chart" role="img" aria-label="${t('incomeVsExpense')}">
          ${months.map(month => html`
            <div class="bar-group">
              <div class="bar-pair">
                ${chartBar(t('income'), month.income, max, 'income')}
                ${chartBar(t('expense'), month.expense, max, 'expense')}
              </div>
              <span>${month.label}</span>
            </div>
          `).join('')}
        </div>
        <div class="chart-legend"><span class="legend-income">${t('income')}</span><span class="legend-expense">${t('expense')}</span></div>
      ` : `<div class="empty chart-empty">${t('noTrendData')}</div>`}
    </section>
  `;
}

function chartBar(label, value, max, tone) {
  const height = Math.max(4, Math.round((money(value) / max) * 118));
  return `<span class="chart-tip bar ${tone}" style="height:${height}px" data-tooltip="${label}: ${currency(value)}"></span>`;
}

function renderLineChart(months) {
  const width = 560;
  const height = 220;
  const padX = 24;
  const padY = 24;
  const values = months.map(month => month.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const step = (width - padX * 2) / Math.max(months.length - 1, 1);
  const points = months.map((month, index) => {
    const x = padX + index * step;
    const y = height - padY - ((month.balance - min) / range) * (height - padY * 2);
    return { ...month, x, y };
  });
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;
  const zeroY = height - padY - ((0 - min) / range) * (height - padY * 2);
  return html`
    <div class="line-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t('sixMonthTrend')}">
        <defs>
          <linearGradient id="flowArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(125, 131, 255, .28)"/>
            <stop offset="100%" stop-color="rgba(125, 131, 255, 0)"/>
          </linearGradient>
        </defs>
        <path class="chart-axis" d="M ${padX} ${zeroY.toFixed(1)} H ${width - padX}"/>
        <path class="line-area" d="${areaPath}"/>
        <path class="line-stroke" d="${linePath}"/>
        ${points.map(point => `<g class="line-point"><circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"/></g>`).join('')}
      </svg>
      <div class="line-hotspots">
        ${points.map(point => {
          const left = (point.x / width) * 100;
          const top = (point.y / height) * 100;
          return `<span class="line-hotspot chart-tip" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" data-tooltip="${point.key} · ${t('netFlow')}: ${currency(point.balance)}"></span>`;
        }).join('')}
      </div>
      <div class="line-labels">${months.map(month => `<span>${month.label}</span>`).join('')}</div>
    </div>
  `;
}

function renderCategoryRanking(rows, total) {
  const max = Math.max(...rows.map(([, amount]) => amount), 1);
  return html`
    <div class="ranking-list">
      ${rows.map(([name, amount]) => {
        const width = Math.max(3, Math.round((amount / max) * 100));
        const share = total ? Math.round((amount / total) * 100) : 0;
        return html`
          <div class="rank-row chart-tip" data-tooltip="${escapeHtml(name)} · ${currency(amount)} · ${t('categoryShare')} ${share}%">
            <div class="rank-meta">
              <span>${escapeHtml(name)}</span>
              <strong>${currency(amount)}</strong>
            </div>
            <div class="rank-track"><span style="width:${width}%"></span></div>
            <small>${t('categoryShare')} ${share}%</small>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function bindFinanceActions(event) {
  const form = event.target.closest('form[data-action]');
  if (event.type === 'submit' && form?.dataset.action === 'add-transaction') {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      syncLedgerBalances(state);
      const selectedAccount = findAccount(state.finance.assets, value.accountId) || state.finance.assets[0] || null;
      const tx = {
        id: transactionId(),
        type: value.type,
        amount: Math.abs(money(value.amount)),
        category: value.category,
        date: value.date || today(),
        accountId: selectedAccount?.id || value.accountId || '',
        account: selectedAccount?.name || value.account || t('cashAccount'),
        note: value.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.finance.transactions.push(tx);
      syncLedgerBalances(state);
    });
    form.reset();
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'add-transfer') {
    event.preventDefault();
    const value = readForm(form);
    if (value.fromAccountId === value.toAccountId) return true;
    update(state => {
      syncLedgerBalances(state);
      const from = findAccount(state.finance.assets, value.fromAccountId);
      const to = findAccount(state.finance.assets, value.toAccountId);
      const tx = {
        id: transactionId(),
        type: 'transfer',
        amount: Math.abs(money(value.amount)),
        category: t('transfer'),
        date: value.date || today(),
        fromAccountId: from?.id || value.fromAccountId,
        toAccountId: to?.id || value.toAccountId,
        note: value.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.finance.transactions.push(tx);
      syncLedgerBalances(state);
    });
    form.reset();
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'add-asset') {
    event.preventDefault();
    const value = readForm(form);
    addItem('finance.assets', {
      name: value.name,
      amount: money(value.amount),
      openingBalance: money(value.amount),
      type: value.type || 'cash',
      color: '#6366f1',
    }, 'asset');
    form.reset();
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'adjust-account') {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      syncLedgerBalances(state);
      const account = findAccount(state.finance.assets, value.accountId);
      if (!account) return;
      const nextBalance = money(value.balance);
      const delta = money(nextBalance - money(account.amount));
      if (!delta) return;
      state.finance.transactions.push({
        id: transactionId(),
        type: 'adjustment',
        amount: Math.abs(delta),
        adjustmentDelta: delta,
        category: t('balanceAdjustment'),
        date: value.date || today(),
        accountId: account.id,
        account: account.name,
        balanceBefore: money(account.amount),
        balanceAfter: nextBalance,
        note: value.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      syncLedgerBalances(state);
    });
    form.reset();
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'fund-operation') {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      syncLedgerBalances(state);
      const amount = Math.abs(money(value.amount));
      if (!amount) return;
      let fund = state.finance.funds.find(item => item.id === value.fundId);
      if (!fund && value.operation === 'fundBuy') {
        fund = {
          id: fundId(),
          name: value.fundName || t('newFund'),
          openingValue: 0,
          openingCost: 0,
          value: 0,
          cost: 0,
          note: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.finance.funds.push(fund);
      }
      if (!fund) return;
      if (value.fundName) fund.name = value.fundName;
      const account = findAccount(state.finance.assets, value.accountId) || state.finance.assets[0] || null;
      const costDelta = value.operation === 'fundSell'
        ? money(Math.min(money(fund.cost), money(fund.value) ? money(fund.cost) * (amount / money(fund.value)) : amount))
        : amount;
      state.finance.transactions.push({
        id: transactionId(),
        type: value.operation,
        amount,
        fundId: fund.id,
        fundName: fund.name,
        fundCostDelta: costDelta,
        category: value.operation === 'fundBuy' ? t('fundBuy') : t('fundSell'),
        date: value.date || today(),
        accountId: account?.id || value.accountId || '',
        sourceAccountId: value.operation === 'fundBuy' ? account?.id || value.accountId || '' : '',
        targetAccountId: value.operation === 'fundSell' ? account?.id || value.accountId || '' : '',
        note: value.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      syncLedgerBalances(state);
    });
    form.reset();
    return true;
  }

  const button = event.target.closest('[data-action="delete-transaction"]');
  if (button) {
    update(state => {
      syncLedgerBalances(state);
      const index = state.finance.transactions.findIndex(tx => tx.id === button.dataset.id);
      if (index < 0) return;
      state.finance.transactions.splice(index, 1);
      syncLedgerBalances(state);
    });
    return true;
  }

  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return false;
  const action = actionTarget.dataset.action;

  if (action === 'toggle-account-forms') {
    accountFormsExpanded = !accountFormsExpanded;
    return true;
  }
  if (action === 'set-account-tab') {
    accountFormTab = actionTarget.dataset.tab || 'new';
    return true;
  }

  return false;
}

export const __financeTest = {
  syncLedgerBalances,
  financeStats,
  signedFlowImpact,
  fundFlowImpact,
};
