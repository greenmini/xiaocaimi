/**
 * 日历模块 · calendarService
 * 小财迷 · Calendar
 */
const calendarService = StorageService.createStore('finance-os-calendar', 'evt');

function renderCalendar(year, month) {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarTitle');
  if (!grid || !title) return;

  const events = calendarService.getAll();
  title.textContent = `${year}年 ${month + 1}月`;

  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  let html = '<div class="cal-weekday">日</div><div class="cal-weekday">一</div><div class="cal-weekday">二</div><div class="cal-weekday">三</div><div class="cal-weekday">四</div><div class="cal-weekday">五</div><div class="cal-weekday">六</div>';
  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= days; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvents = events.filter(e => e.date === ds);
    const isToday = ds === today;
    html += `<div class="cal-day${isToday?' today':''}" onclick="openCalendarDay('${ds}')">
      <span class="cal-num">${d}</span>
      ${dayEvents.map(e => `<div class="cal-event" style="background:${e.color||'#4d9fff'}">${esc(e.title)}</div>`).join('')}
    </div>`;
  }
  grid.innerHTML = html;
}

// ─── 事件列表 ──────────────────────────────────────

let calendarViewDate = null;

function openCalendarDay(date) {
  calendarViewDate = date;
  const panel = document.getElementById('calendarDayPanel');
  const list = document.getElementById('calendarDayList');
  const title = document.getElementById('calendarDayTitle');
  if (!panel || !list || !title) return;

  const events = calendarService.getAll().filter(e => e.date === date);
  title.textContent = date;
  list.innerHTML = events.length
    ? events.map(e => `<div class="cal-list-item" onclick="openEventEdit('${e.id}')">
        <span class="cal-dot" style="background:${e.color||'#4d9fff'}"></span>
        <span>${esc(e.title)}</span>
        <span style="margin-left:auto;color:var(--text3);font-size:10px">${e.time||''}</span>
      </div>`).join('')
    : '<div style="color:var(--text3);padding:12px;text-align:center">无事件</div>';
  panel.classList.add('show');
}

function closeCalendarDay() {
  document.getElementById('calendarDayPanel').classList.remove('show');
}

// ─── 编辑弹窗 ──────────────────────────────────────

let editEventId = null;

function openEventEdit(id) {
  editEventId = id || null;
  document.getElementById('eventEditModal').classList.add('show');
  if (id) {
    const e = calendarService.getById(id);
    if (!e) return;
    document.getElementById('evTitle').value = e.title || '';
    document.getElementById('evDate').value = e.date || '';
    document.getElementById('evTime').value = e.time || '';
    document.getElementById('evNote').value = e.note || '';
    document.getElementById('deleteEventBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('evTitle').value = '';
    document.getElementById('evDate').value = calendarViewDate || new Date().toISOString().split('T')[0];
    document.getElementById('evTime').value = '';
    document.getElementById('evNote').value = '';
    document.getElementById('deleteEventBtn').style.display = 'none';
  }
}

function closeEventEdit() { document.getElementById('eventEditModal').classList.remove('show'); editEventId = null; }

function submitEvent() {
  const title = document.getElementById('evTitle').value.trim();
  const date = document.getElementById('evDate').value;
  if (!title || !date) { showToast('请填写标题和日期', 'error'); return; }
  const colors = ['#00f5d4','#ff2d78','#f0e140','#4d9fff','#a855f7','#ff9500'];
  const payload = {
    title, date,
    time: document.getElementById('evTime').value,
    note: document.getElementById('evNote').value.trim(),
    color: colors[Math.floor(Math.random()*colors.length)],
  };
  if (editEventId) calendarService.update(editEventId, payload);
  else calendarService.add(payload);
  closeEventEdit();
  closeCalendarDay();
  const now = new Date(date + 'T00:00:00');
  renderCalendar(now.getFullYear(), now.getMonth());
  showToast('已保存', 'success');
}

function deleteEvent(id) {
  const eid = id || editEventId;
  if (!eid) return;
  confirm('确认删除', '删除此事件？', () => {
    calendarService.remove(eid);
    closeEventEdit();
    closeCalendarDay();
    const now = new Date();
    renderCalendar(now.getFullYear(), now.getMonth());
    showToast('已删除', 'success');
  });
}
