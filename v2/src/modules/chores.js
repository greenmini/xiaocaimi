import { getState, update } from '../core/store.js';
import { escapeHtml, html, readForm, today } from '../core/dom.js';
import { t } from '../core/i18n.js';

const FILTER_KEY = 'xiaocaimi:v2:choreFilters';
let modal = null;
let selectedChoreId = null;

const areas = ['kitchen', 'bathroom', 'bedroom', 'livingRoom', 'balcony', 'wholeHome', 'other'];
const categories = ['daily', 'cleaning', 'organizing', 'maintenance', 'laundry', 'shopping', 'other'];
const priorities = ['low', 'medium', 'high'];
const statusOrder = { overdue: 1, today: 2, upcoming: 3, notDue: 4, archived: 9 };
const priorityOrder = { high: 1, medium: 2, low: 3 };
const presetChores = [
  '洗餐具', '丢垃圾', '清洁厕所', '换床单', '家具清灰', '拖地',
  '换洗碗布', '清理冰箱', '擦窗户', '晾晒衣物', '吸尘', '打扫房间', '清理家具',
];

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function readFilters() {
  return safeJson(localStorage.getItem(FILTER_KEY), {
    status: 'all',
    assigneeId: 'all',
    area: 'all',
    frequencyUnit: 'all',
    category: 'all',
    keyword: '',
  });
}

function saveFilters(filters) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

function dateOnly(value) {
  if (!value) return today();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return formatLocalDate(date);
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const next = new Date(`${dateOnly(date)}T00:00:00`);
  next.setDate(next.getDate() + Number(days || 1));
  return formatLocalDate(next);
}

function addMonths(date, months) {
  const next = new Date(`${dateOnly(date)}T00:00:00`);
  next.setMonth(next.getMonth() + Number(months || 1));
  return formatLocalDate(next);
}

function canonicalUnit(unit) {
  if (unit === 'days') return 'day';
  if (unit === 'weeks') return 'week';
  if (unit === 'months') return 'month';
  return unit || 'day';
}

function pluralUnit(unit) {
  const canonical = canonicalUnit(unit);
  if (canonical === 'day') return 'days';
  if (canonical === 'week') return 'weeks';
  return 'months';
}

function calculateNextDueDate(fromDate, frequencyInterval, frequencyUnit) {
  const interval = Math.max(1, Number(frequencyInterval || 1));
  const unit = canonicalUnit(frequencyUnit);
  if (unit === 'day') return addDays(fromDate, interval);
  if (unit === 'week') return addDays(fromDate, interval * 7);
  return addMonths(fromDate, interval);
}

function daysUntil(date) {
  const start = new Date(`${today()}T00:00:00`);
  const due = new Date(`${dateOnly(date)}T00:00:00`);
  return Math.round((due - start) / 86400000);
}

function normalizeChore(chore) {
  chore.description = chore.description || chore.note || '';
  chore.notes = chore.notes || chore.note || '';
  chore.area = chore.area || 'kitchen';
  chore.category = chore.category || inferCategory(chore.title);
  chore.frequencyUnit = canonicalUnit(chore.frequencyUnit);
  chore.frequencyInterval = Math.max(1, Number(chore.frequencyInterval || chore.frequencyCount || 1));
  chore.frequencyCount = chore.frequencyInterval;
  chore.priority = chore.priority || 'medium';
  chore.nextDueDate = dateOnly(chore.nextDueDate || today());
  chore.assigneeId = chore.assigneeId || 'unassigned';
  chore.isArchived = Boolean(chore.isArchived);
  chore.updatedAt = chore.updatedAt || new Date().toISOString();
  chore.createdAt = chore.createdAt || chore.updatedAt;
  return chore;
}

function normalizeModule(state) {
  state.modules.choreCompletions = state.modules.choreCompletions || [];
  state.modules.choreSkips = state.modules.choreSkips || [];
  state.modules.choreSettings = { upcomingDays: 3, myMemberId: 'me', ...(state.modules.choreSettings || {}) };
  state.modules.choreMembers = state.modules.choreMembers || [];
  state.modules.chores = (state.modules.chores || []).map(normalizeChore);
  state.modules.chores.forEach(chore => {
    (chore.history || []).forEach(entry => {
      const target = entry.action === 'skipped' ? state.modules.choreSkips : state.modules.choreCompletions;
      if (!target.some(row => row.id === entry.id)) {
        target.push(historyToRecord(chore, entry));
      }
    });
  });
}

function inferCategory(title = '') {
  if (/洗|床单|衣物|晾晒/.test(title)) return 'laundry';
  if (/清洁|擦|拖|吸尘|打扫/.test(title)) return 'cleaning';
  if (/整理|收纳/.test(title)) return 'organizing';
  if (/滤网|检查|维护|冰箱/.test(title)) return 'maintenance';
  if (/买|耗材/.test(title)) return 'shopping';
  return 'daily';
}

function computedStatus(chore, settings = getState().modules.choreSettings || {}) {
  if (chore.isArchived) return 'archived';
  const diff = daysUntil(chore.nextDueDate);
  const upcomingDays = Number(settings.upcomingDays || 3);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= upcomingDays) return 'upcoming';
  return 'notDue';
}

function members() {
  const list = getState().modules.choreMembers || [];
  return list.length ? list : [
    { id: 'me', name: t('memberMe') },
    { id: 'partner', name: t('memberPartner') },
    { id: 'family', name: t('memberFamily') },
    { id: 'unassigned', name: t('unassigned') },
  ];
}

function memberName(id) {
  return members().find(member => member.id === id)?.name || t('unassigned');
}

function areaLabel(area) {
  const labels = {
    kitchen: t('areaKitchen'),
    bathroom: t('areaBathroom'),
    bedroom: t('areaBedroom'),
    livingRoom: t('areaLivingRoom'),
    balcony: t('areaBalcony'),
    wholeHome: t('areaWholeHome'),
    other: t('other'),
  };
  return labels[area] || area || '-';
}

function categoryLabel(category) {
  const labels = {
    daily: t('choreCategoryDaily'),
    cleaning: t('choreCategoryCleaning'),
    organizing: t('choreCategoryOrganizing'),
    maintenance: t('choreCategoryMaintenance'),
    laundry: t('choreCategoryLaundry'),
    shopping: t('choreCategoryShopping'),
    other: t('other'),
  };
  return labels[category] || category || '-';
}

function priorityLabel(priority) {
  return t(priority === 'high' ? 'highPriority' : priority === 'low' ? 'lowPriority' : 'mediumPriority');
}

function frequencyLabel(chore) {
  const count = Number(chore.frequencyInterval || chore.frequencyCount || 1);
  const unit = canonicalUnit(chore.frequencyUnit);
  if (unit === 'day') return count === 1 ? t('daily') : `${t('every')} ${count} ${t('daysUnit')}`;
  if (unit === 'week') return count === 1 ? t('weekly') : `${t('every')} ${count} ${t('weeksUnit')}`;
  return count === 1 ? t('monthly') : `${t('every')} ${count} ${t('monthsUnit')}`;
}

function statusLabel(status) {
  const labels = {
    today: t('choreToday'),
    upcoming: t('choreUpcoming'),
    overdue: t('choreOverdue'),
    notDue: t('choreNotDue'),
    archived: t('archived'),
  };
  return labels[status] || labels.notDue;
}

function filteredChores(chores, filters, settings) {
  const keyword = (filters.keyword || '').trim().toLowerCase();
  return chores.filter(chore => {
    const status = computedStatus(chore, settings);
    if (filters.status !== 'all' && status !== filters.status) return false;
    if (filters.status === 'all' && chore.isArchived) return false;
    if (filters.assigneeId !== 'all' && chore.assigneeId !== filters.assigneeId) return false;
    if (filters.area !== 'all' && chore.area !== filters.area) return false;
    if (filters.category !== 'all' && chore.category !== filters.category) return false;
    if (filters.frequencyUnit !== 'all' && pluralUnit(chore.frequencyUnit) !== filters.frequencyUnit) return false;
    if (keyword) {
      const text = [chore.title, chore.description, chore.notes, areaLabel(chore.area), categoryLabel(chore.category), memberName(chore.assigneeId)].join(' ').toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });
}

function sortChores(chores, settings) {
  return [...chores].sort((a, b) => {
    const statusDiff = (statusOrder[computedStatus(a, settings)] || 8) - (statusOrder[computedStatus(b, settings)] || 8);
    if (statusDiff) return statusDiff;
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    if (priorityDiff) return priorityDiff;
    return dateOnly(a.nextDueDate).localeCompare(dateOnly(b.nextDueDate));
  });
}

function recordDate(record) {
  return dateOnly(record.completedAt || record.skippedAt || record.date);
}

function allHistory(state) {
  const chores = state.modules.chores || [];
  return [
    ...(state.modules.choreCompletions || []).map(entry => ({ ...entry, action: 'completed' })),
    ...(state.modules.choreSkips || []).map(entry => ({ ...entry, action: 'skipped' })),
  ]
    .map(entry => {
      const chore = chores.find(item => item.id === entry.taskId);
      return { ...entry, title: chore?.title || entry.title || t('noData'), area: chore?.area || entry.area, assigneeId: entry.completedBy || entry.skippedBy || entry.assigneeId };
    })
    .sort((a, b) => recordDate(b).localeCompare(recordDate(a)))
    .slice(0, 20);
}

function startOfWeek(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function isThisWeek(value) {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const date = new Date(`${dateOnly(value)}T00:00:00`);
  return date >= start && date < end;
}

function statsFor(state, settings) {
  const active = (state.modules.chores || []).filter(chore => !chore.isArchived);
  const counts = active.reduce((acc, chore) => {
    const status = computedStatus(chore, settings);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const completions = state.modules.choreCompletions || [];
  const weekDone = completions.filter(entry => isThisWeek(entry.completedAt)).length;
  const myTasks = active.filter(chore => chore.assigneeId === settings.myMemberId).length;
  const rateBase = weekDone + (counts.overdue || 0);
  return {
    counts,
    weekDone,
    myTasks,
    completionRate: rateBase ? Math.round((weekDone / rateBase) * 100) : 100,
  };
}

export function renderChores() {
  const state = getState();
  normalizeModule(state);
  const chores = state.modules.chores || [];
  const settings = state.modules.choreSettings || {};
  const filters = readFilters();
  const visible = sortChores(filteredChores(chores, filters, settings), settings);
  const stats = statsFor(state, settings);
  const selected = chores.find(chore => chore.id === selectedChoreId) || visible[0] || chores.find(chore => !chore.isArchived) || null;
  const history = allHistory(state);

  return html`
    <div class="grid cols-3 chore-kpis">
      ${kpi(t('choreToday'), stats.counts.today || 0)}
      ${kpi(t('choreUpcoming'), stats.counts.upcoming || 0)}
      ${kpi(t('choreOverdue'), stats.counts.overdue || 0, stats.counts.overdue ? 'negative' : '')}
    </div>
    <div class="grid cols-3 chore-kpis" style="margin-top:14px">
      ${kpi(t('weekCompleted'), stats.weekDone, 'positive')}
      ${kpi(t('myChores'), stats.myTasks)}
      ${kpi(t('completionRate'), `${stats.completionRate}%`, stats.completionRate >= 80 ? 'positive' : '')}
    </div>

    <section class="card chore-dashboard" style="margin-top:14px">
      <div class="chore-head">
        <div>
          <h3>${t('choresDashboard')}</h3>
          <p>${t('choresSubtitle')}</p>
        </div>
        <div class="actions">
          <button data-action="open-chore-modal">${t('newChore')}</button>
        </div>
      </div>
      <div class="chore-presets">
        ${presetChores.map(name => `<button data-action="quick-chore" data-title="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <form data-action="filter-chores" class="form-grid">
        <div class="field"><label>${t('status')}</label><select name="status">${option('all', t('all'), filters.status)}${['overdue', 'today', 'upcoming', 'notDue', 'archived'].map(value => option(value, statusLabel(value), filters.status)).join('')}</select></div>
        <div class="field"><label>${t('assignee')}</label><select name="assigneeId">${option('all', t('all'), filters.assigneeId)}${members().map(member => option(member.id, member.name, filters.assigneeId)).join('')}</select></div>
        <div class="field"><label>${t('area')}</label><select name="area">${option('all', t('all'), filters.area)}${areas.map(area => option(area, areaLabel(area), filters.area)).join('')}</select></div>
        <div class="field"><label>${t('category')}</label><select name="category">${option('all', t('all'), filters.category)}${categories.map(category => option(category, categoryLabel(category), filters.category)).join('')}</select></div>
        <div class="field"><label>${t('cycle')}</label><select name="frequencyUnit">${option('all', t('all'), filters.frequencyUnit)}${option('days', t('daysUnit'), filters.frequencyUnit)}${option('weeks', t('weeksUnit'), filters.frequencyUnit)}${option('months', t('monthsUnit'), filters.frequencyUnit)}</select></div>
        <div class="field span-2"><label>${t('search')}</label><input name="keyword" value="${escapeHtml(filters.keyword || '')}" placeholder="${t('choreSearchPlaceholder')}"></div>
        <button class="primary">${t('applyFilters')}</button>
      </form>
    </section>

    <div class="grid cols-2 chore-layout" style="margin-top:14px">
      <section class="card">
        <h3>${t('choresList')}</h3>
        ${visible.length ? visible.map(choreRow).join('') : `<div class="empty">${t('emptyChores')}</div>`}
      </section>
      <section class="card chore-detail">
        <h3>${t('choreDetail')}</h3>
        ${selected ? detailPanel(selected) : `<div class="empty">${t('emptyChores')}</div>`}
      </section>
    </div>

    <div class="grid cols-2 chore-layout" style="margin-top:14px">
      <section class="card">
        <h3>${t('completionHistory')}</h3>
        ${history.length ? history.map(historyRow).join('') : `<div class="empty">${t('noData')}</div>`}
      </section>
      <section class="card">
        <h3>${t('localMembers')}</h3>
        ${members().map(memberRow).join('')}
        <form data-action="add-chore-member" class="member-form">
          <input name="name" placeholder="${t('memberName')}" required>
          <button>${t('add')}</button>
        </form>
      </section>
    </div>

    ${modal ? choreModal(chores.find(chore => chore.id === modal.id) || null) : ''}
  `;
}

function kpi(label, value, tone = '') {
  return html`<section class="card"><h3>${label}</h3><div class="metric ${tone}">${value}</div></section>`;
}

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function dueLabel(chore) {
  const diff = daysUntil(chore.nextDueDate);
  if (diff < 0) return `${Math.abs(diff)} ${t('daysLate')}`;
  if (diff === 0) return t('today');
  return `${diff} ${t('daysLater')}`;
}

function choreRow(chore) {
  const status = computedStatus(chore);
  return html`
    <div class="chore-row ${status}">
      <button class="chore-main" data-action="select-chore" data-id="${escapeHtml(chore.id)}">
        <span class="chore-status-dot"></span>
        <span>
          <strong>${escapeHtml(chore.title)}</strong>
          <small>${areaLabel(chore.area)} · ${categoryLabel(chore.category)} · ${memberName(chore.assigneeId)} · ${frequencyLabel(chore)}</small>
        </span>
      </button>
      <div class="chore-due">
        <span>${dateOnly(chore.nextDueDate)}</span>
        <small>${statusLabel(status)} · ${dueLabel(chore)}</small>
      </div>
      <div class="reminder-actions">
        <button data-action="complete-chore" data-id="${escapeHtml(chore.id)}">${t('complete')}</button>
        <button data-action="skip-chore" data-id="${escapeHtml(chore.id)}">${t('skip')}</button>
        <button data-action="edit-chore" data-id="${escapeHtml(chore.id)}">${t('edit')}</button>
      </div>
    </div>
  `;
}

function detailPanel(chore) {
  const status = computedStatus(chore);
  return html`
    <div class="detail-stack">
      <div class="detail-title">
        <strong>${escapeHtml(chore.title)}</strong>
        <span class="status-pill ${status}">${statusLabel(status)}</span>
      </div>
      <div class="detail-grid">
        <div><span>${t('nextDue')}</span><strong>${dateOnly(chore.nextDueDate)}</strong></div>
        <div><span>${t('cycle')}</span><strong>${frequencyLabel(chore)}</strong></div>
        <div><span>${t('assignee')}</span><strong>${memberName(chore.assigneeId)}</strong></div>
        <div><span>${t('area')}</span><strong>${areaLabel(chore.area)}</strong></div>
        <div><span>${t('category')}</span><strong>${categoryLabel(chore.category)}</strong></div>
        <div><span>${t('priority')}</span><strong>${priorityLabel(chore.priority)}</strong></div>
      </div>
      ${chore.estimatedMinutes ? `<p class="muted">${t('estimatedMinutes')}: ${escapeHtml(chore.estimatedMinutes)} min</p>` : ''}
      ${chore.description ? `<p class="muted">${escapeHtml(chore.description)}</p>` : ''}
      ${chore.notes ? `<p class="muted">${escapeHtml(chore.notes)}</p>` : ''}
      <div class="reminder-actions">
        <button class="primary" data-action="complete-chore" data-id="${escapeHtml(chore.id)}">${t('complete')}</button>
        <button data-action="skip-chore" data-id="${escapeHtml(chore.id)}">${t('skip')}</button>
        <button data-action="edit-chore" data-id="${escapeHtml(chore.id)}">${t('edit')}</button>
        ${chore.isArchived ? `<button data-action="restore-chore" data-id="${escapeHtml(chore.id)}">${t('restore')}</button>` : `<button data-action="archive-chore" data-id="${escapeHtml(chore.id)}">${t('archive')}</button>`}
        <button class="danger" data-action="delete-chore" data-id="${escapeHtml(chore.id)}">${t('delete')}</button>
      </div>
    </div>
  `;
}

function historyRow(entry) {
  return html`
    <div class="row">
      <div>
        <div class="list-title">${escapeHtml(entry.title)}</div>
        <div class="dim">${recordDate(entry)} · ${areaLabel(entry.area)} · ${entry.action === 'skipped' ? t('choreSkipped') : t('choreCompleted')} ${entry.wasOverdue ? `· ${t('choreOverdue')}` : ''}</div>
      </div>
      <div class="amount">${memberName(entry.assigneeId)}</div>
    </div>
  `;
}

function memberRow(member) {
  return html`
    <div class="row">
      <div class="list-title">${escapeHtml(member.name)}</div>
      ${member.id === 'unassigned' ? '' : `<button class="danger" data-action="delete-chore-member" data-id="${escapeHtml(member.id)}">${t('delete')}</button>`}
    </div>
  `;
}

function choreModal(chore) {
  const editMode = Boolean(chore);
  const interval = chore?.frequencyInterval || chore?.frequencyCount || 1;
  const unit = canonicalUnit(chore?.frequencyUnit || 'day');
  return html`
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="chore-head">
          <div>
            <h3>${editMode ? t('editChore') : t('newChore')}</h3>
            <p>${t('choreModalHint')}</p>
          </div>
          <button data-action="close-chore-modal">×</button>
        </div>
        <form data-action="${editMode ? 'update-chore' : 'create-chore'}" data-id="${escapeHtml(chore?.id || '')}" class="form-grid">
          <div class="field span-2"><label>${t('title')}</label><input name="title" value="${escapeHtml(chore?.title || modal?.title || '')}" required></div>
          <div class="field"><label>${t('area')}</label><select name="area">${areas.map(area => option(area, areaLabel(area), chore?.area || 'kitchen')).join('')}</select></div>
          <div class="field"><label>${t('category')}</label><select name="category">${categories.map(category => option(category, categoryLabel(category), chore?.category || inferCategory(chore?.title || modal?.title || ''))).join('')}</select></div>
          <div class="field"><label>${t('assignee')}</label><select name="assigneeId">${members().map(member => option(member.id, member.name, chore?.assigneeId || 'unassigned')).join('')}</select></div>
          <div class="field"><label>${t('priority')}</label><select name="priority">${priorities.map(priority => option(priority, priorityLabel(priority), chore?.priority || 'medium')).join('')}</select></div>
          <div class="field"><label>${t('cycleCount')}</label><input name="frequencyInterval" type="number" min="1" value="${escapeHtml(interval)}"></div>
          <div class="field"><label>${t('cycleUnit')}</label><select name="frequencyUnit">${option('day', t('daysUnit'), unit)}${option('week', t('weeksUnit'), unit)}${option('month', t('monthsUnit'), unit)}</select></div>
          <div class="field"><label>${t('nextDue')}</label><input name="nextDueDate" type="date" value="${escapeHtml(dateOnly(chore?.nextDueDate || today()))}"></div>
          <div class="field"><label>${t('estimatedMinutes')}</label><input name="estimatedMinutes" type="number" min="0" value="${escapeHtml(chore?.estimatedMinutes || '')}"></div>
          <div class="field span-4"><label>${t('description')}</label><textarea name="description">${escapeHtml(chore?.description || '')}</textarea></div>
          <div class="field span-4"><label>${t('note')}</label><textarea name="notes">${escapeHtml(chore?.notes || '')}</textarea></div>
          <button class="primary span-4">${t('save')}</button>
        </form>
      </div>
    </div>
  `;
}

function createChoreFromValue(value, id, previous = {}) {
  const now = new Date().toISOString();
  const interval = Math.max(1, Number(value.frequencyInterval || value.frequencyCount || 1));
  const unit = canonicalUnit(value.frequencyUnit || 'day');
  const nextDueDate = previous.id && (previous.frequencyInterval !== interval || canonicalUnit(previous.frequencyUnit) !== unit)
    ? calculateNextDueDate(today(), interval, unit)
    : value.nextDueDate || today();
  return normalizeChore({
    id: id || uid('chore'),
    title: value.title,
    description: value.description || '',
    notes: value.notes || '',
    area: value.area || 'kitchen',
    category: value.category || inferCategory(value.title),
    assigneeId: value.assigneeId || 'unassigned',
    priority: value.priority || 'medium',
    estimatedMinutes: Number(value.estimatedMinutes || 0) || undefined,
    frequencyInterval: interval,
    frequencyUnit: unit,
    nextDueDate,
    lastCompletedAt: previous.lastCompletedAt,
    isArchived: Boolean(previous.isArchived),
    createdAt: previous.createdAt || now,
    updatedAt: now,
  });
}

function historyToRecord(chore, entry) {
  const skipped = entry.action === 'skipped';
  return {
    id: entry.id || uid(skipped ? 'skip' : 'completion'),
    taskId: chore.id,
    title: chore.title,
    [skipped ? 'skippedBy' : 'completedBy']: entry.assigneeId || chore.assigneeId || 'unassigned',
    [skipped ? 'skippedAt' : 'completedAt']: entry.date || today(),
    note: entry.note || '',
    wasOverdue: entry.wasOverdue ?? daysUntil(entry.previousDueDate || chore.nextDueDate) < 0,
    previousDueDate: entry.previousDueDate || chore.nextDueDate,
    [skipped ? 'nextDueDateAfterSkip' : 'nextDueDateAfterCompletion']: entry.nextDueDateAfterAction || chore.nextDueDate,
  };
}

function addHistoryAndAdvance(state, chore, action) {
  const actionDate = today();
  const previousDueDate = chore.nextDueDate;
  const nextDueDate = calculateNextDueDate(actionDate, chore.frequencyInterval, chore.frequencyUnit);
  const skipped = action === 'skipped';
  const record = {
    id: uid(skipped ? 'skip' : 'completion'),
    taskId: chore.id,
    title: chore.title,
    [skipped ? 'skippedBy' : 'completedBy']: chore.assigneeId || 'unassigned',
    [skipped ? 'skippedAt' : 'completedAt']: actionDate,
    note: '',
    wasOverdue: daysUntil(previousDueDate) < 0,
    previousDueDate,
    [skipped ? 'nextDueDateAfterSkip' : 'nextDueDateAfterCompletion']: nextDueDate,
  };
  if (skipped) state.modules.choreSkips.push(record);
  else state.modules.choreCompletions.push(record);

  chore.history = chore.history || [];
  chore.history.push({
    id: record.id,
    action,
    date: actionDate,
    assigneeId: chore.assigneeId || 'unassigned',
    previousDueDate,
    nextDueDateAfterAction: nextDueDate,
    wasOverdue: record.wasOverdue,
  });
  if (skipped) chore.lastSkippedAt = actionDate;
  else chore.lastCompletedAt = actionDate;
  chore.nextDueDate = nextDueDate;
  chore.updatedAt = new Date().toISOString();
}

export function bindChoreActions(event) {
  const actionTarget = event.target.closest('[data-action]');
  const form = event.target.closest('form[data-action]');

  if (event.type === 'submit' && form?.dataset.action === 'filter-chores') {
    event.preventDefault();
    saveFilters(readForm(form));
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'add-chore-member') {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      normalizeModule(state);
      state.modules.choreMembers.push({ id: uid('member'), name: value.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    });
    form.reset();
    return true;
  }

  if (event.type === 'submit' && ['create-chore', 'update-chore'].includes(form?.dataset.action)) {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      normalizeModule(state);
      if (form.dataset.action === 'create-chore') {
        state.modules.chores.push(createChoreFromValue(value));
      } else {
        const chore = state.modules.chores.find(item => item.id === form.dataset.id);
        if (chore) Object.assign(chore, createChoreFromValue(value, chore.id, chore), { history: chore.history || [] });
      }
    });
    modal = null;
    return true;
  }

  if (!actionTarget) return false;
  const action = actionTarget.dataset.action;
  const id = actionTarget.dataset.id;

  if (action === 'open-chore-modal') {
    modal = { mode: 'create' };
    return true;
  }
  if (action === 'quick-chore') {
    modal = { mode: 'create', title: actionTarget.dataset.title };
    return true;
  }
  if (action === 'close-chore-modal') {
    modal = null;
    return true;
  }
  if (action === 'edit-chore') {
    modal = { mode: 'edit', id };
    return true;
  }
  if (action === 'select-chore') {
    selectedChoreId = id;
    return true;
  }
  if (action === 'complete-chore' || action === 'skip-chore') {
    update(state => {
      normalizeModule(state);
      const chore = state.modules.chores.find(item => item.id === id);
      if (chore) addHistoryAndAdvance(state, chore, action === 'skip-chore' ? 'skipped' : 'completed');
    });
    selectedChoreId = id;
    return true;
  }
  if (action === 'archive-chore' || action === 'restore-chore') {
    update(state => {
      normalizeModule(state);
      const chore = state.modules.chores.find(item => item.id === id);
      if (chore) {
        chore.isArchived = action === 'archive-chore';
        chore.updatedAt = new Date().toISOString();
      }
    });
    return true;
  }
  if (action === 'delete-chore') {
    update(state => {
      normalizeModule(state);
      const chore = state.modules.chores.find(item => item.id === id);
      if (chore) {
        chore.isArchived = true;
        chore.updatedAt = new Date().toISOString();
      }
    });
    selectedChoreId = null;
    return true;
  }
  if (action === 'delete-chore-member') {
    update(state => {
      normalizeModule(state);
      state.modules.choreMembers = state.modules.choreMembers.filter(member => member.id !== id);
      state.modules.chores.forEach(chore => {
        if (chore.assigneeId === id) chore.assigneeId = 'unassigned';
      });
    });
    return true;
  }

  return false;
}

export const __choreTest = {
  calculateNextDueDate,
  computedStatus,
  normalizeModule,
  sortChores,
  statsFor,
};
