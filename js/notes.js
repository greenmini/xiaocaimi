/**
 * 便签模块 · Notes
 * 小财迷 · Notes
 *
 * 数据流:
 *   所有 CRUD → notesService → StorageService → localStorage
 */

const NOTE_COLORS = ['#00f5d4','#ff2d78','#f0e140','#4d9fff','#a855f7','#ff9500','#34c759'];

function renderNotes() {
  const el = document.getElementById('notesGrid');
  if (!el) return;
  const notes = notesService.getAll().sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (!notes.length) {
    el.innerHTML = '<div class="task-empty" style="grid-column:1/-1">暂无便签，点击 + 创建</div>';
    return;
  }

  el.innerHTML = notes.map(n => `
    <div class="note-card" style="border-top:3px solid ${n.color||NOTE_COLORS[0]}" onclick="openNoteEdit('${n.id}')">
      ${n.pinned ? '<div class="note-pin">📌</div>' : ''}
      <div class="note-title">${n.title ? esc(n.title) : '<span style="color:var(--text3)">无标题</span>'}</div>
      <div class="note-content">${esc((n.content||'').slice(0, 80))}</div>
    </div>
  `).join('');
}

let editNoteId = null;

function openNoteEdit(id) {
  editNoteId = id || null;
  const modal = document.getElementById('noteEditModal');
  modal.classList.add('show');

  document.getElementById('noteColors').innerHTML = NOTE_COLORS.map(c =>
    `<button type="button" class="note-color-btn" style="background:${c}" onclick="document.getElementById('noteColor').value='${c}';document.querySelectorAll('.note-color-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active')"></button>`
  ).join('');

  if (id) {
    const n = notesService.getById(id);
    if (!n) return;
    document.getElementById('noteTitle').value = n.title || '';
    document.getElementById('noteContent').value = n.content || '';
    document.getElementById('noteColor').value = n.color || NOTE_COLORS[0];
    document.getElementById('notePinned').checked = n.pinned || false;
    document.getElementById('delNoteBtn').style.display = 'inline-flex';
    setTimeout(() => {
      document.querySelectorAll('.note-color-btn').forEach(b => {
        b.classList.toggle('active', b.style.background === (n.color||NOTE_COLORS[0]));
      });
    }, 10);
  } else {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteColor').value = NOTE_COLORS[0];
    document.getElementById('notePinned').checked = false;
    document.getElementById('delNoteBtn').style.display = 'none';
  }
}

function closeNoteEdit() { document.getElementById('noteEditModal').classList.remove('show'); editNoteId = null; }

function submitNote() {
  const content = document.getElementById('noteContent').value.trim();
  if (!content) { showToast('请输入内容', 'error'); return; }

  const payload = {
    title: document.getElementById('noteTitle').value.trim(),
    content,
    color: document.getElementById('noteColor').value || NOTE_COLORS[0],
    pinned: document.getElementById('notePinned').checked,
  };

  if (editNoteId) {
    notesService.update(editNoteId, payload);
  } else {
    notesService.add(payload);
  }

  closeNoteEdit();
  renderNotes();
  showToast('已保存', 'success');
}

function deleteNote() {
  if (!editNoteId) return;
  const nid = editNoteId;
  confirm('确认删除', '删除此便签？', () => {
    notesService.remove(nid);
    closeNoteEdit();
    renderNotes();
    showToast('已删除', 'success');
  });
}
