/**
 * 任务管理模块 · Tasks
 * 小财迷 · Tasks
 *
 * 数据流:
 *   所有 CRUD → tasksService → StorageService → localStorage
 */

const TASK_STATUS = ['open','in_progress','done'];
const TASK_LABELS = { open:'待办', in_progress:'进行中', done:'已完成' };
const TASK_PRIORITY = ['none','low','medium','high','urgent'];
const TASK_PRI_LABELS = { none:'', low:'低', medium:'中', high:'高', urgent:'紧急' };
const TASK_PRI_COLORS = { none:'var(--text3)', low:'var(--green)', medium:'var(--cyan)', high:'var(--yellow)', urgent:'var(--pink)' };

function tasksByStatus(status) {
  return tasksService.getAll()
    .filter(t => t.status === status)
    .sort((a,b) => {
      const po = {none:0,low:1,medium:2,high:3,urgent:4};
      return (po[b.priority]||0) - (po[a.priority]||0) || (a.due_date||'').localeCompare(b.due_date||'');
    });
}

// ─── 渲染看板 ──────────────────────────────────────

function renderTaskBoard() {
  ['open','in_progress','done'].forEach(status => {
    const el = document.getElementById('taskCol_' + status);
    if (!el) return;
    const tasks = tasksByStatus(status);
    if (!tasks.length) {
      el.innerHTML = '<div class="task-empty">拖入任务或点击 + 创建</div>';
      return;
    }
    el.innerHTML = tasks.map(t => {
      const priColor = TASK_PRI_COLORS[t.priority] || TASK_PRI_COLORS.none;
      const priLabel = TASK_PRI_LABELS[t.priority] || '';
      return `<div class="task-card" onclick="openTaskEdit('${t.id}')" draggable="true"
        ondragstart="taskDragStart(event,'${t.id}')" ondragend="taskDragEnd(event)">
        <div class="task-pri" style="background:${priColor}" title="${priLabel}"></div>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          ${t.due_date ? `<div class="task-due">📅 ${t.due_date}</div>` : ''}
          ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        </div>
        <div class="task-actions">
          ${status !== 'done' ? `<button class="task-next" onclick="event.stopPropagation();moveTask('${t.id}','${status==='open'?'in_progress':'done'}')" title="下一状态">→</button>` : ''}
        </div>
      </div>`;
    }).join('');
  });
}

// ─── 拖拽 ──────────────────────────────────────────

function taskDragStart(e, id) { e.dataTransfer.setData('text/plain', id); e.target.classList.add('dragging'); }
function taskDragEnd(e) { e.target.classList.remove('dragging'); }

['open','in_progress','done'].forEach(s => {
  window['allowTaskDrop_' + s] = function(e) { e.preventDefault(); };
  window['taskDrop_' + s] = function(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    moveTask(id, s);
  };
});

function moveTask(id, newStatus) {
  const t = tasksService.getById(id);
  if (!t || t.status === newStatus) return;
  const updates = { status: newStatus };
  if (newStatus === 'done') updates.completed_at = new Date().toISOString();
  tasksService.update(id, updates);
  renderTaskBoard();
  showToast('已移至「' + TASK_LABELS[newStatus] + '」', 'success');
}

// ─── 编辑弹窗 ──────────────────────────────────────

let editTaskId = null;

function openTaskEdit(id) {
  editTaskId = id || null;
  const modal = document.getElementById('taskEditModal');
  modal.classList.add('show');

  const sel = document.getElementById('taskEditStatus');
  sel.innerHTML = TASK_STATUS.map(s => `<option value="${s}">${TASK_LABELS[s]}</option>`).join('');

  document.getElementById('taskEditPri').innerHTML = TASK_PRIORITY.map(p =>
    `<option value="${p}">${TASK_PRI_LABELS[p]||'--'}</option>`
  ).join('');

  if (id) {
    const t = tasksService.getById(id);
    if (!t) return;
    document.getElementById('taskEditTitle').value = t.title || '';
    document.getElementById('taskEditDesc').value = t.description || '';
    document.getElementById('taskEditDate').value = t.due_date || '';
    document.getElementById('taskEditStatus').value = t.status || 'open';
    document.getElementById('taskEditPri').value = t.priority || 'none';
    document.getElementById('delTaskBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('taskEditTitle').value = '';
    document.getElementById('taskEditDesc').value = '';
    document.getElementById('taskEditDate').value = '';
    document.getElementById('taskEditStatus').value = 'open';
    document.getElementById('taskEditPri').value = 'none';
    document.getElementById('delTaskBtn').style.display = 'none';
  }
}

function closeTaskEdit() {
  document.getElementById('taskEditModal').classList.remove('show');
  editTaskId = null;
}

function submitTask() {
  const title = document.getElementById('taskEditTitle').value.trim();
  if (!title) { showToast('请填写任务标题', 'error'); return; }

  const payload = {
    title,
    description: document.getElementById('taskEditDesc').value.trim(),
    due_date: document.getElementById('taskEditDate').value,
    status: document.getElementById('taskEditStatus').value || 'open',
    priority: document.getElementById('taskEditPri').value || 'none',
  };

  if (editTaskId) {
    tasksService.update(editTaskId, payload);
  } else {
    tasksService.add(payload);
  }

  closeTaskEdit();
  renderTaskBoard();
  showToast('已保存', 'success');
}

function deleteTask() {
  if (!editTaskId) return;
  const tid = editTaskId;
  confirm('确认删除', '删除此任务？', () => {
    tasksService.remove(tid);
    closeTaskEdit();
    renderTaskBoard();
    showToast('已删除', 'success');
  });
}
