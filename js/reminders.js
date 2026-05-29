/**
 * 提醒模块 · reminderService
 * 小财迷 · Reminders
 */
const reminderService = StorageService.createStore('finance-os-reminders', 'rem');

// ─── 首页提醒卡片 ──────────────────────────────────

function renderReminders() {
  const el = document.getElementById('reminderCards');
  if (!el) return;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

  const active = reminderService.getAll().filter(r => !r.completed);
  const upcoming = active.filter(r => r.date === today || r.date === tomorrow)
    .sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));

  if (!upcoming.length) {
    el.innerHTML = '<div style="color:var(--text3);padding:8px 0;text-align:center;font-size:10px">暂无提醒</div>';
    return;
  }

  el.innerHTML = upcoming.map(r => {
    const isToday = r.date === today;
    return `<div class="reminder-item ${isToday?'rem-today':''}" onclick="openReminderEdit('${r.id}')">
      <div class="rem-icon">${isToday ? '🔔' : '📅'}</div>
      <div class="rem-info">
        <div class="rem-title">${esc(r.title)}</div>
        <div class="rem-meta">${isToday?'今天':'明天'}${r.time ? ' '+r.time : ''}${r.repeat_type && r.repeat_type !== 'none' ? ' · 重复' : ''}</div>
      </div>
      <button class="rem-done" onclick="event.stopPropagation();toggleReminder('${r.id}')" title="完成">✓</button>
    </div>`;
  }).join('');
}

// ─── 提醒列表页 ────────────────────────────────────

function renderReminderPage() {
  const el = document.getElementById('reminderList');
  if (!el) return;
  const all = reminderService.getAll();
  const active = all.filter(r => !r.completed).sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const done = all.filter(r => r.completed).slice(0, 10);

  let html = active.length ? active.map(r => `
    <div class="reminder-item" onclick="openReminderEdit('${r.id}')">
      <div class="rem-icon">⏰</div>
      <div class="rem-info">
        <div class="rem-title">${esc(r.title)}</div>
        <div class="rem-meta">${r.date||''}${r.time?' '+r.time:''}${r.repeat_type&&r.repeat_type!=='none'?' · 重复:'+r.repeat_type:''}</div>
      </div>
      <button class="rem-done" onclick="event.stopPropagation();toggleReminder('${r.id}')">✓</button>
    </div>
  `).join('') : '<div style="color:var(--text3);padding:12px 0;text-align:center">暂无提醒</div>';

  if (done.length) {
    html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><h4 style="font-size:10px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">已完成</h4>';
    html += done.map(r => `<div class="reminder-item done"><div class="rem-icon">✅</div><div class="rem-info"><div class="rem-title" style="text-decoration:line-through;color:var(--text3)">${esc(r.title)}</div></div></div>`).join('');
    html += '</div>';
  }
  el.innerHTML = html;
}

// ─── 操作 ──────────────────────────────────────────

function toggleReminder(id) {
  const r = reminderService.getById(id);
  if (!r) return;
  const updates = { completed: !r.completed };
  if (!r.completed) updates.completed_at = new Date().toISOString();
  else delete updates.completed_at;
  reminderService.update(id, updates);
  renderReminders();
  renderReminderPage();
  showToast(r.completed ? '已恢复' : '已完成', 'success');
}

let editRemId = null;

function openReminderEdit(id) {
  editRemId = id || null;
  document.getElementById('reminderEditModal').classList.add('show');
  if (id) {
    const r = reminderService.getById(id);
    if (!r) return;
    document.getElementById('remEditTitle').value = r.title || '';
    document.getElementById('remEditDate').value = r.date || '';
    document.getElementById('remEditTime').value = r.time || '';
    document.getElementById('remEditRepeat').value = r.repeat_type || 'none';
    document.getElementById('remEditNote').value = r.note || '';
    document.getElementById('delReminderBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('remEditTitle').value = '';
    document.getElementById('remEditDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('remEditTime').value = '';
    document.getElementById('remEditRepeat').value = 'none';
    document.getElementById('remEditNote').value = '';
    document.getElementById('delReminderBtn').style.display = 'none';
  }
}

function closeReminderEdit() { document.getElementById('reminderEditModal').classList.remove('show'); editRemId = null; }

function submitReminder() {
  const title = document.getElementById('remEditTitle').value.trim();
  const date = document.getElementById('remEditDate').value;
  if (!title || !date) { showToast('请填写标题和日期', 'error'); return; }
  const payload = {
    title, date,
    time: document.getElementById('remEditTime').value || '',
    repeat_type: document.getElementById('remEditRepeat').value || 'none',
    note: document.getElementById('remEditNote').value.trim(),
    completed: false,
  };
  if (editRemId) reminderService.update(editRemId, payload);
  else reminderService.add(payload);
  closeReminderEdit();
  renderReminders();
  renderReminderPage();
  showToast('已保存', 'success');
}

function deleteReminder() {
  if (!editRemId) return;
  const rid = editRemId;
  confirm('确认删除', '删除此提醒？', () => {
    reminderService.remove(rid);
    closeReminderEdit();
    renderReminders();
    renderReminderPage();
    showToast('已删除', 'success');
  });
}

// ─── 浏览器通知 ────────────────────────────────────

function requestNotification(payload) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') scheduleNotification(payload);
  else if (Notification.permission !== 'denied')
    Notification.requestPermission().then(p => { if (p === 'granted') scheduleNotification(payload); });
}

function scheduleNotification(rem) {
  const target = new Date(rem.date + (rem.time ? 'T' + rem.time : 'T09:00'));
  const delay = target - new Date();
  if (delay > 0 && delay < 86400000 * 7) {
    setTimeout(() => {
      const r = reminderService.getById(rem.id);
      if (!r || r.completed) return;
      new Notification('小财迷提醒', { body: r.title, icon: '/favicon.ico' });
    }, delay);
  }
}
