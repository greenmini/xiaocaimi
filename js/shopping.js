/**
 * 购物清单模块 · shoppingService
 * 小财迷 · Shopping
 */
const shoppingListService = StorageService.createStore('finance-os-shopping-lists', 'shop');
const shoppingItemService = StorageService.createStore('finance-os-shopping-items', 'si');

// ─── 渲染 ──────────────────────────────────────────

let activeShoppingList = null;

function renderShopping() {
  let lists = shoppingListService.getAll();
  if (!lists.length) {
    shoppingListService.add({ name: '默认清单' });
    lists = shoppingListService.getAll();
  }
  activeShoppingList = activeShoppingList || lists[0].id;

  // tab bar
  const tabs = document.getElementById('shopTabs');
  tabs.innerHTML = lists.map(l =>
    `<button class="filter-chip${l.id===activeShoppingList?' active':''}" onclick="activeShoppingList='${l.id}';renderShopping()">${esc(l.name)}</button>`
  ).join('') + `<button class="filter-chip" onclick="addShoppingList()" title="新建清单">+</button>`;

  // items
  const items = shoppingItemService.getAll().filter(i => i.list_id === activeShoppingList);
  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  const el = document.getElementById('shopItems');
  let html = '';

  const cats = {};
  unchecked.forEach(i => {
    const c = i.category || '其他';
    if (!cats[c]) cats[c] = [];
    cats[c].push(i);
  });

  for (const [cat, its] of Object.entries(cats)) {
    html += `<div class="shop-cat-label">${esc(cat)}</div>`;
    html += its.map(i => shopItemHTML(i)).join('');
  }

  if (checked.length) {
    html += '<div class="shop-cat-label" style="margin-top:12px;opacity:0.5">✅ 已购</div>';
    html += checked.map(i => shopItemHTML(i)).join('');
  }

  if (!items.length) html = '<div class="task-empty">清单空空，添加物品吧</div>';
  el.innerHTML = html;
}

function shopItemHTML(i) {
  return `<div class="shop-item${i.checked?' checked':''}" onclick="toggleShopItem('${i.id}')">
    <div class="shop-check">${i.checked ? '✅' : '⬜'}</div>
    <div class="shop-name">${esc(i.name)}</div>
    <div class="shop-qty">${esc(i.quantity||'')}</div>
    <button class="shop-del" onclick="event.stopPropagation();deleteShopItem('${i.id}')">×</button>
  </div>`;
}

// ─── 操作 ──────────────────────────────────────────

function addShoppingList() {
  const name = prompt('清单名称：', '新清单');
  if (!name) return;
  const created = shoppingListService.add({ name: name.trim() });
  activeShoppingList = created.id;
  renderShopping();
}

function openShopAdd() {
  document.getElementById('shopAddModal').classList.add('show');
  document.getElementById('shopItemName').value = '';
  document.getElementById('shopItemQty').value = '';
  document.getElementById('shopItemCat').value = '食';
}

function closeShopAdd() { document.getElementById('shopAddModal').classList.remove('show'); }

function submitShopItem() {
  const name = document.getElementById('shopItemName').value.trim();
  if (!name) { showToast('请输入物品名称', 'error'); return; }
  shoppingItemService.add({
    list_id: activeShoppingList,
    name,
    quantity: document.getElementById('shopItemQty').value.trim(),
    category: document.getElementById('shopItemCat').value,
    checked: false,
  });
  closeShopAdd();
  renderShopping();
  showToast('已添加', 'success');
}

function toggleShopItem(id) {
  const item = shoppingItemService.getById(id);
  if (!item) return;
  shoppingItemService.update(id, { checked: !item.checked });
  renderShopping();
}

function deleteShopItem(id) {
  shoppingItemService.remove(id);
  renderShopping();
}

function clearShopChecked() {
  const all = shoppingItemService.getAll();
  const remaining = all.filter(i => !i.checked);
  shoppingItemService.save(remaining);
  renderShopping();
  showToast('已清除已完成', 'success');
}
