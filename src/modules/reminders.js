import { addItem, getState, update } from '../core/store.js';
import { escapeHtml, html, readForm, today } from '../core/dom.js';
import { t } from '../core/i18n.js';

const LIVE_REFRESH_MS = 1000;
const REMINDER_INTERVAL_MS = 30000;
let runtimeStarted = false;
let notifiedIds = new Set();
let lastNotificationCheck = 0;

function nowIso() {
  return new Date().toISOString();
}

function localDateTimeValue(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDueAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function minutesUntil(value) {
  if (!value) return Infinity;
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function millisecondsUntil(value) {
  if (!value) return Infinity;
  return new Date(value).getTime() - Date.now();
}

function secondsUntil(value) {
  if (!value) return Infinity;
  return Math.round((new Date(value).getTime() - Date.now()) / 1000);
}

function reminderStatus(reminder) {
  if (reminder.status === 'completed') return 'completed';
  const remaining = millisecondsUntil(reminder.dueAt);
  if (remaining < 0) return 'overdue';
  if (remaining <= 24 * 60 * 60000) return 'today';
  return 'upcoming';
}

function liveTone(dueAt, fallbackTone = 'upcoming') {
  if (fallbackTone === 'completed') return 'completed';
  const remaining = millisecondsUntil(dueAt);
  if (remaining < 0) return 'overdue';
  if (remaining <= 24 * 60 * 60000) return 'today';
  return 'upcoming';
}

function formatCountdown(value, tone = 'upcoming') {
  if (!value) return '-';
  const seconds = secondsUntil(value);
  if (!Number.isFinite(seconds)) return '-';
  if (tone === 'completed') return formatDateTime(value);
  const pad = number => String(number).padStart(2, '0');
  if (seconds < 0) {
    const lateSeconds = Math.abs(seconds);
    if (lateSeconds < 3600) {
      const minutes = Math.floor(lateSeconds / 60);
      const rest = lateSeconds % 60;
      return `${pad(minutes)}:${pad(rest)} ${t('late')}`;
    }
    const minutes = Math.floor(lateSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h${rest ? ` ${rest}m` : ''} ${t('late')}`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${pad(minutes)}:${pad(rest)}`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes <= 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h${rest ? ` ${rest}m` : ''}`;
  }
  return formatDateTime(value);
}

function formatFocusElapsed(startedAt) {
  const started = new Date(startedAt).getTime();
  if (!startedAt || Number.isNaN(started)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = value => String(value).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function reminderGroups(reminders) {
  const active = [...reminders]
    .filter(item => item.status !== 'completed')
    .sort((a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0));
  return {
    overdue: active.filter(item => reminderStatus(item) === 'overdue'),
    today: active.filter(item => reminderStatus(item) === 'today'),
    upcoming: active.filter(item => reminderStatus(item) === 'upcoming'),
    completed: reminders.filter(item => item.status === 'completed').slice(-6).reverse(),
  };
}

function activeFocusSession(state = getState()) {
  return state.modules.focusSessions.find(session => !session.endedAt) || null;
}

export function renderReminders() {
  const state = getState();
  const reminders = state.modules.reminders || [];
  const tasks = state.modules.tasks || [];
  const groups = reminderGroups(reminders);
  const activeSession = activeFocusSession(state);
  const todayCount = groups.today.length;
  const overdueCount = groups.overdue.length;
  const focusMinutes = state.modules.focusSessions
    .filter(session => session.endedAt && session.startedAt?.startsWith(today()))
    .reduce((sum, session) => sum + Number(session.durationMinutes || 0), 0);

  return html`
    <div class="grid cols-3 reminder-kpis">
      ${reminderKpi(t('todayReminders'), todayCount)}
      ${reminderKpi(t('overdueReminders'), overdueCount, overdueCount ? 'negative' : '')}
      ${reminderKpi(t('focusToday'), `${Math.round(focusMinutes)}m`, 'positive')}
    </div>

    <div class="grid cols-2 reminder-layout" style="margin-top:14px">
      <section class="card">
        <h3>${t('addReminder')}</h3>
        <form data-action="add-reminder" class="form-grid">
          <div class="field span-2"><label>${t('title')}</label><input name="title" required></div>
          <div class="field"><label>${t('dueAt')}</label><input name="dueAt" type="datetime-local" value="${localDateTimeValue()}"></div>
          <div class="field"><label>${t('priority')}</label><select name="priority"><option value="medium">${t('mediumPriority')}</option><option value="high">${t('highPriority')}</option><option value="low">${t('lowPriority')}</option></select></div>
          <div class="field"><label>${t('remindBefore')}</label><select name="remindBeforeMinutes"><option value="0">${t('atTime')}</option><option value="5">5m</option><option value="15">15m</option><option value="60">1h</option><option value="1440">1d</option></select></div>
          <div class="field"><label>${t('repeatRule')}</label><select name="repeatRule"><option value="none">${t('noRepeat')}</option><option value="daily">${t('daily')}</option><option value="weekly">${t('weekly')}</option><option value="monthly">${t('monthly')}</option></select></div>
          <div class="field"><label>${t('pomodoroPlan')}</label><input name="pomodoroPlan" type="number" min="0" step="1" value="1"></div>
          <div class="field"><label>${t('linkedTask')}</label><select name="linkedTaskId"><option value="">-</option>${tasks.map(task => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.title)}</option>`).join('')}</select></div>
          <div class="field span-4"><label>${t('note')}</label><textarea name="note"></textarea></div>
          <button class="primary span-4">${t('save')}</button>
        </form>
      </section>

      <section class="card focus-card">
        <h3>${t('pomodoroTimer')}</h3>
        ${activeSession ? renderActiveFocus(activeSession) : renderFocusEmpty()}
        <div class="reminder-actions" style="margin-top:12px">
          <button data-action="request-notification">${t('enableNotifications')}</button>
        </div>
      </section>
    </div>

    <div class="reminder-board" style="margin-top:14px">
      ${reminderColumn(t('overdueReminders'), groups.overdue, 'overdue')}
      ${reminderColumn(t('todayReminders'), groups.today, 'today')}
      ${reminderColumn(t('upcomingReminders'), groups.upcoming, 'upcoming')}
    </div>

    <section class="card" style="margin-top:14px">
      <h3>${t('completedReminders')}</h3>
      ${groups.completed.length ? groups.completed.map(item => reminderRow(item, 'completed')).join('') : `<div class="empty">${t('noData')}</div>`}
    </section>
  `;
}

function reminderKpi(label, value, tone = '') {
  return html`<section class="card"><h3>${label}</h3><div class="metric ${tone}">${value}</div></section>`;
}

function reminderColumn(title, items, tone) {
  return html`
    <section class="card reminder-column ${tone}">
      <h3>${title}</h3>
      ${items.length ? items.map(item => reminderRow(item, tone)).join('') : `<div class="empty">${t('noData')}</div>`}
    </section>
  `;
}

function reminderRow(item, tone) {
  const timeLabel = formatCountdown(item.dueAt, tone);
  return html`
    <div class="reminder-item ${tone}">
      <div>
        <div class="list-title">${escapeHtml(item.title)}</div>
        <div class="dim"><span data-live-reminder-time data-due-at="${escapeHtml(item.dueAt || '')}" data-tone="${escapeHtml(tone)}">${timeLabel}</span> · ${priorityLabel(item.priority)} · ${repeatLabel(item.repeatRule)}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ''}
      </div>
      <div class="reminder-actions">
        ${item.status !== 'completed' ? `<button data-action="start-focus" data-id="${escapeHtml(item.id)}">${t('startPomodoro')}</button><button data-action="complete-reminder" data-id="${escapeHtml(item.id)}">${t('complete')}</button><button data-action="snooze-reminder" data-id="${escapeHtml(item.id)}">${t('snooze')}</button>` : ''}
        <button class="danger" data-action="delete-reminder" data-id="${escapeHtml(item.id)}">${t('delete')}</button>
      </div>
    </div>
  `;
}

function renderFocusEmpty() {
  return html`
    <div class="focus-empty">
      <strong>25:00</strong>
      <span>${t('selectReminderToFocus')}</span>
    </div>
  `;
}

function renderActiveFocus(session) {
  return html`
    <div class="focus-active">
      <strong data-live-focus-elapsed data-started-at="${escapeHtml(session.startedAt || '')}">${formatFocusElapsed(session.startedAt)}</strong>
      <span>${escapeHtml(session.title)}</span>
      <button class="primary" data-action="finish-focus" data-id="${escapeHtml(session.id)}">${t('finishPomodoro')}</button>
    </div>
  `;
}

function priorityLabel(priority) {
  const map = { high: t('highPriority'), medium: t('mediumPriority'), low: t('lowPriority') };
  return map[priority] || map.medium;
}

function repeatLabel(rule) {
  const map = { none: t('noRepeat'), daily: t('daily'), weekly: t('weekly'), monthly: t('monthly') };
  return map[rule] || map.none;
}

function nextRepeatDueAt(reminder) {
  if (!reminder.repeatRule || reminder.repeatRule === 'none') return null;
  const date = new Date(reminder.dueAt);
  if (Number.isNaN(date.getTime())) return null;
  if (reminder.repeatRule === 'daily') date.setDate(date.getDate() + 1);
  if (reminder.repeatRule === 'weekly') date.setDate(date.getDate() + 7);
  if (reminder.repeatRule === 'monthly') date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

export function bindReminderActions(event) {
  const form = event.target.closest('form[data-action="add-reminder"]');
  if (event.type === 'submit' && form) {
    event.preventDefault();
    const value = readForm(form);
    addItem('modules.reminders', {
      title: value.title,
      note: value.note || '',
      dueAt: toDueAt(value.dueAt),
      remindBeforeMinutes: Number(value.remindBeforeMinutes || 0),
      repeatRule: value.repeatRule || 'none',
      priority: value.priority || 'medium',
      status: 'scheduled',
      linkedTaskId: value.linkedTaskId || '',
      pomodoroPlan: Number(value.pomodoroPlan || 0),
    }, 'reminder');
    form.reset();
    return true;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return false;
  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;

  if (action === 'request-notification') {
    if ('Notification' in window) Notification.requestPermission();
    return true;
  }

  if (action === 'complete-reminder') {
    update(state => {
      const reminder = state.modules.reminders.find(item => item.id === id);
      if (!reminder) return;
      const nextDueAt = nextRepeatDueAt(reminder);
      if (nextDueAt) {
        reminder.dueAt = nextDueAt;
        reminder.status = 'scheduled';
      } else {
        reminder.status = 'completed';
        reminder.completedAt = nowIso();
      }
      reminder.updatedAt = nowIso();
    });
    return true;
  }

  if (action === 'snooze-reminder') {
    update(state => {
      const reminder = state.modules.reminders.find(item => item.id === id);
      if (!reminder) return;
      reminder.dueAt = new Date(Date.now() + 10 * 60000).toISOString();
      reminder.status = 'scheduled';
      reminder.updatedAt = nowIso();
    });
    return true;
  }

  if (action === 'start-focus') {
    update(state => {
      state.modules.focusSessions.forEach(session => {
        if (!session.endedAt) {
          session.endedAt = nowIso();
          session.durationMinutes = Math.max(1, Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000));
        }
      });
      const reminder = state.modules.reminders.find(item => item.id === id);
      if (!reminder) return;
      state.modules.focusSessions.push({
        id: `focus_${Date.now().toString(36)}`,
        reminderId: reminder.id,
        taskId: reminder.linkedTaskId || '',
        title: reminder.title,
        startedAt: nowIso(),
        endedAt: null,
        durationMinutes: 0,
        mode: 'pomodoro',
      });
    });
    return true;
  }

  if (action === 'finish-focus') {
    update(state => {
      const session = state.modules.focusSessions.find(item => item.id === id);
      if (!session || session.endedAt) return;
      session.endedAt = nowIso();
      session.durationMinutes = Math.max(1, Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000));
    });
    return true;
  }

  if (action === 'delete-reminder') {
    update(state => {
      const index = state.modules.reminders.findIndex(item => item.id === id);
      if (index >= 0) state.modules.reminders.splice(index, 1);
    });
    return true;
  }

  return false;
}

function refreshReminderLiveText() {
  let needsRerender = false;
  document.querySelectorAll('[data-live-reminder-time]').forEach(node => {
    const dueAt = node.dataset.dueAt;
    const previousTone = node.dataset.tone || 'upcoming';
    const nextTone = liveTone(dueAt, previousTone);
    if (nextTone !== previousTone) {
      needsRerender = true;
      return;
    }
    node.textContent = formatCountdown(dueAt, nextTone);
  });
  document.querySelectorAll('[data-live-focus-elapsed]').forEach(node => {
    node.textContent = formatFocusElapsed(node.dataset.startedAt);
  });
  return needsRerender;
}

function notifyDueReminders({ toast }) {
  const due = (getState().modules.reminders || []).filter(reminder => {
    if (reminder.status === 'completed' || !reminder.dueAt || notifiedIds.has(reminder.id)) return false;
    const remindAt = new Date(reminder.dueAt).getTime() - Number(reminder.remindBeforeMinutes || 0) * 60000;
    return Date.now() >= remindAt;
  });
  due.forEach(reminder => {
    notifiedIds.add(reminder.id);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(reminder.title, { body: `${t('dueAt')}: ${formatDateTime(reminder.dueAt)}` });
    } else {
      toast(`${t('reminder')}: ${reminder.title}`);
    }
  });
  return due.length;
}

export function startReminderRuntime({ toast, rerender }) {
  if (runtimeStarted) return;
  runtimeStarted = true;
  const tick = () => {
    const needsRerender = refreshReminderLiveText();
    const shouldCheckNotifications = Date.now() - lastNotificationCheck >= REMINDER_INTERVAL_MS;
    if (shouldCheckNotifications) {
      lastNotificationCheck = Date.now();
      if (notifyDueReminders({ toast }) || needsRerender) rerender();
      return;
    }
    if (needsRerender) rerender();
  };
  tick();
  setInterval(tick, LIVE_REFRESH_MS);
}

export const __reminderTest = {
  formatCountdown,
  formatFocusElapsed,
  millisecondsUntil,
  minutesUntil,
  reminderStatus,
};
