/**
 * 文档模块 · documentService
 * 小财迷 · Documents
 */
const documentService = StorageService.createStore('finance-os-documents', 'doc');

function renderDocuments() {
  const el = document.getElementById('documentList');
  if (!el) return;
  const docs = documentService.getAll().sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));

  if (!docs.length) {
    el.innerHTML = '<div class="task-empty">暂无文档</div>';
    return;
  }

  el.innerHTML = docs.map(d => `
    <div class="doc-card" onclick="openDocumentEdit('${d.id}')">
      ${d.pinned ? '<div class="note-pin">📌</div>' : ''}
      <div class="doc-icon">${d.type==='link'?'🔗':'📄'}</div>
      <div class="doc-info">
        <div class="doc-name">${esc(d.title||d.name)}</div>
        <div class="doc-meta">${d.type==='link'?esc(d.url||''):esc(d.content||'').slice(0,60)}</div>
      </div>
    </div>
  `).join('');
}

let editDocId = null;

function openDocumentEdit(id) {
  editDocId = id || null;
  document.getElementById('docEditModal').classList.add('show');
  if (id) {
    const d = documentService.getById(id);
    if (!d) return;
    document.getElementById('docTitle').value = d.title || d.name || '';
    document.getElementById('docType').value = d.type || 'note';
    document.getElementById('docContent').value = d.content || d.url || '';
    document.getElementById('docPinned').checked = d.pinned || false;
    document.getElementById('delDocBtn').style.display = 'inline-flex';
    toggleDocTypeFields(d.type || 'note');
  } else {
    document.getElementById('docTitle').value = '';
    document.getElementById('docType').value = 'note';
    document.getElementById('docContent').value = '';
    document.getElementById('docPinned').checked = false;
    document.getElementById('delDocBtn').style.display = 'none';
    toggleDocTypeFields('note');
  }
}

function toggleDocTypeFields(type) {
  const content = document.getElementById('docContent');
  content.placeholder = type === 'link' ? '输入链接...' : '输入内容...';
}

function closeDocEdit() { document.getElementById('docEditModal').classList.remove('show'); editDocId = null; }

function submitDocument() {
  const title = document.getElementById('docTitle').value.trim();
  const type = document.getElementById('docType').value;
  const content = document.getElementById('docContent').value.trim();
  if (!title) { showToast('请输入标题', 'error'); return; }

  const payload = {
    title, type,
    [type === 'link' ? 'url' : 'content']: content,
    pinned: document.getElementById('docPinned').checked,
  };

  if (editDocId) documentService.update(editDocId, payload);
  else documentService.add(payload);

  closeDocEdit();
  renderDocuments();
  showToast('已保存', 'success');
}

function deleteDocument() {
  if (!editDocId) return;
  const did = editDocId;
  confirm('确认删除', '删除此文档？', () => {
    documentService.remove(did);
    closeDocEdit();
    renderDocuments();
    showToast('已删除', 'success');
  });
}
