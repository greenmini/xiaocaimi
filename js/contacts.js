/**
 * 联系人模块 · contactsService
 * 小财迷 · Contacts
 *
 * 数据流:
 *   所有 CRUD → contactsService → localStorage("finance-os-contacts")
 *   页面加载 → contactsService.getAll() → 渲染
 *   永不使用 data.contacts / API / 空数组兜底
 */

const contactsService = StorageService.createStore('finance-os-contacts', 'ct');

// ─── 渲染 ──────────────────────────────────────────

const CONTACT_CATS = ['全部','朋友','家人','同事','医生','学校','紧急','其他'];
let contactFilter = '全部';
let contactSearch = '';

async function renderContacts() {
  const el = document.getElementById('contactList');
  if (!el) return;

  // 每次渲染都从 localStorage 重读，确保刷新后拿到最新数据
  let list = contactsService.getAll();

  if (contactFilter !== '全部') list = list.filter(c => c.category === contactFilter);
  if (contactSearch) {
    const q = contactSearch.toLowerCase();
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }

  // 分类 chips
  const chips = document.getElementById('contactFilters');
  if (chips) {
    chips.innerHTML = CONTACT_CATS.map(c =>
      `<button class="filter-chip${c === contactFilter ? ' active' : ''}" onclick="contactFilter='${c}';renderContacts()">${c}</button>`
    ).join('');
  }

  if (!list.length) {
    el.innerHTML = '<div class="task-empty">暂无联系人</div>';
    return;
  }

  el.innerHTML = list.map(c => `
    <div class="contact-card" onclick="openContactEdit('${esc(c.id)}')">
      <div class="contact-avatar" style="background:${esc(c.color || '#6366F1')};color:#fff">${esc((c.name || '?')[0])}</div>
      <div class="contact-info">
        <div class="contact-name">${esc(c.name)}</div>
        ${c.phone ? `<div class="contact-field" onclick="event.stopPropagation();window.open('tel:${esc(c.phone)}')">📞 ${esc(c.phone)}</div>` : ''}
        ${c.email ? `<div class="contact-field" onclick="event.stopPropagation();window.open('mailto:${esc(c.email)}')">✉️ ${esc(c.email)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── 编辑弹窗 ──────────────────────────────────────

let editContactId = null;

function openContactEdit(id) {
  editContactId = id || null;
  document.getElementById('contactEditModal').classList.add('show');

  if (id) {
    const c = contactsService.getById(id);
    if (c) {
      document.getElementById('ctName').value = c.name || '';
      document.getElementById('ctPhone').value = c.phone || '';
      document.getElementById('ctEmail').value = c.email || '';
      document.getElementById('ctAddr').value = c.address || '';
      document.getElementById('ctNote').value = c.notes || '';
      document.getElementById('ctCat').value = c.category || '其他';
      document.getElementById('ctBday').value = c.birthday || '';
      document.getElementById('delContactBtn').style.display = 'inline-flex';
    }
  } else {
    ['ctName','ctPhone','ctEmail','ctAddr','ctNote','ctBday'].forEach(fid => {
      document.getElementById(fid).value = '';
    });
    document.getElementById('ctCat').value = '其他';
    document.getElementById('delContactBtn').style.display = 'none';
  }
}

function closeContactEdit() {
  document.getElementById('contactEditModal').classList.remove('show');
  editContactId = null;
}

function submitContact() {
  const name = document.getElementById('ctName').value.trim();
  if (!name) { showToast('请输入姓名', 'error'); return; }

  const colors = ['#00f5d4','#ff2d78','#f0e140','#4d9fff','#a855f7','#ff9500','#34c759'];
  const payload = {
    name,
    phone:  document.getElementById('ctPhone').value.trim(),
    email:  document.getElementById('ctEmail').value.trim(),
    address:document.getElementById('ctAddr').value.trim(),
    notes:  document.getElementById('ctNote').value.trim(),
    category:document.getElementById('ctCat').value,
    birthday:document.getElementById('ctBday').value,
    color:  colors[Math.floor(Math.random() * colors.length)],
  };

  if (editContactId) {
    contactsService.update(editContactId, payload);
  } else {
    contactsService.add(payload);
  }

  // 强制重读验证
  contactsService.reload();

  closeContactEdit();
  renderContacts();
  showToast('已保存', 'success');
}

function deleteContact() {
  if (!editContactId) return;
  const cid = editContactId;
  confirm('确认删除', '删除此联系人？', () => {
    contactsService.remove(cid);
    contactsService.reload();
    closeContactEdit();
    renderContacts();
    showToast('已删除', 'success');
  });
}
