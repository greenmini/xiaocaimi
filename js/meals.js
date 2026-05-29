/**
 * 菜谱 + 餐食计划模块
 * 小财迷 · Meals
 */
const recipeService = StorageService.createStore('finance-os-recipes', 'rec');
const mealService = StorageService.createStore('finance-os-meals', 'meal');

const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];
const MEAL_LABELS = { breakfast:'🥐 早餐', lunch:'🍱 午餐', dinner:'🍲 晚餐', snack:'🍰 加餐' };
const DAY_NAMES = ['周一','周二','周三','周四','周五','周六','周日'];

// ─── 菜谱页 ──────────────────────────────────────

function renderRecipes() {
  const el = document.getElementById('recipeList');
  if (!el) return;
  const recipes = recipeService.getAll();
  if (!recipes.length) {
    el.innerHTML = '<div class="task-empty">暂无菜谱，创建第一个吧</div>';
    return;
  }
  el.innerHTML = recipes.map(r => {
    const ings = r.ingredients || [];
    return `<div class="recipe-card" onclick="openRecipeEdit('${r.id}')">
      <div class="recipe-header">
        <span class="recipe-name">🍽️ ${esc(r.title)}</span>
        <span style="display:flex;gap:4px">
          <button class="task-next" onclick="event.stopPropagation();duplicateRecipe('${r.id}')" title="复制">📋</button>
          <button class="task-next" onclick="event.stopPropagation();scaleRecipe('${r.id}')" title="缩放份数">🔢</button>
        </span>
      </div>
      ${ings.length ? '<div class="recipe-ingredients">'+ings.map(i=>`<span class="recipe-ing">${esc(i.name)} ${i.quantity||''}</span>`).join('')+'</div>' : ''}
      ${r.notes ? `<div class="doc-meta" style="margin-top:4px">${esc(r.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

let editRecipeId = null;

function openRecipeEdit(id) {
  editRecipeId = id || null;
  document.getElementById('recipeEditModal').classList.add('show');

  if (id) {
    const r = recipeService.getById(id);
    if (!r) return;
    document.getElementById('recTitle').value = r.title || '';
    document.getElementById('recNotes').value = r.notes || '';
    document.getElementById('recUrl').value = r.recipe_url || '';
    renderRecipeIngredients(id);
    document.getElementById('delRecipeBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('recTitle').value = '';
    document.getElementById('recNotes').value = '';
    document.getElementById('recUrl').value = '';
    document.getElementById('recIngList').innerHTML = '';
    document.getElementById('delRecipeBtn').style.display = 'none';
  }
}

function renderRecipeIngredients(recipeId) {
  const el = document.getElementById('recIngList');
  const r = recipeService.getById(recipeId);
  const ings = r ? (r.ingredients || []) : [];
  el.innerHTML = ings.map(i => `
    <div class="shop-item" style="cursor:default">
      <span class="shop-name">${esc(i.name)}</span>
      <span class="shop-qty">${esc(i.quantity||'')}</span>
      <button class="shop-del" onclick="deleteRecipeIngredient('${i._id}')">×</button>
    </div>
  `).join('');
}

function addRecipeIngredient() {
  if (!editRecipeId) {
    const title = document.getElementById('recTitle').value.trim();
    if (!title) { showToast('请先填写菜谱名称', 'error'); return; }
    const created = recipeService.add({ title, notes: '', recipe_url: '', ingredients: [] });
    editRecipeId = created.id;
  }
  const name = prompt('食材名称：');
  if (!name) return;
  const qty = prompt('用量（如 200g）：') || '';
  const r = recipeService.getById(editRecipeId);
  const ings = [...(r.ingredients||[]), { _id: 'ri_'+Date.now(), name, quantity: qty }];
  recipeService.update(editRecipeId, { ingredients: ings });
  renderRecipeIngredients(editRecipeId);
}

function deleteRecipeIngredient(id) {
  if (!editRecipeId) return;
  const r = recipeService.getById(editRecipeId);
  if (!r) return;
  recipeService.update(editRecipeId, { ingredients: (r.ingredients||[]).filter(i => i._id !== id) });
  renderRecipeIngredients(editRecipeId);
}

function closeRecipeEdit() { document.getElementById('recipeEditModal').classList.remove('show'); editRecipeId = null; }

function submitRecipe() {
  const title = document.getElementById('recTitle').value.trim();
  if (!title) { showToast('请填写菜谱名称', 'error'); return; }
  const payload = {
    title,
    notes: document.getElementById('recNotes').value.trim(),
    recipe_url: document.getElementById('recUrl').value.trim(),
  };
  if (editRecipeId) recipeService.update(editRecipeId, payload);
  else recipeService.add({ ...payload, ingredients: [] });
  closeRecipeEdit();
  renderRecipes();
  showToast('已保存', 'success');
}

function deleteRecipe() {
  if (!editRecipeId) return;
  const rid = editRecipeId;
  confirm('确认删除', '删除此菜谱？', () => {
    recipeService.remove(rid);
    closeRecipeEdit();
    renderRecipes();
    showToast('已删除', 'success');
  });
}

function duplicateRecipe(id) {
  const r = recipeService.getById(id);
  if (!r) return;
  recipeService.add({ ...r, title: r.title+' (副本)', id: undefined });
  renderRecipes();
  showToast('已复制', 'success');
}

function scaleRecipe(id) {
  const scale = parseFloat(prompt('缩放倍数（如 2 = 双倍）：', '1'));
  if (!scale || scale <= 0) return;
  const r = recipeService.getById(id);
  if (!r) return;
  const ings = (r.ingredients||[]).map(i => {
    const match = (i.quantity||'').match(/^([\d.]+)/);
    return match ? { ...i, quantity: i.quantity.replace(/^[\d.]+/, (parseFloat(match[1])*scale).toFixed(1)) } : i;
  });
  recipeService.update(id, { ingredients: ings });
  renderRecipes();
  if (editRecipeId === id) renderRecipeIngredients(id);
  showToast(`已缩放 ${scale}x`, 'success');
}

// ─── 餐食计划 ────────────────────────────────────

function getMealWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const d = new Date(now);
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split('T')[0];
}

function renderMealPlan() {
  const el = document.getElementById('mealPlanGrid');
  if (!el) return;
  const weekStart = getMealWeekStart();
  const meals = mealService.getAll();

  let html = '<div class="meal-cell meal-hdr"></div>';
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    html += `<div class="meal-cell meal-hdr">${DAY_NAMES[d]}<br><span style="font-size:9px;color:var(--text3)">${date.getMonth()+1}/${date.getDate()}</span></div>`;
  }

  for (const type of MEAL_TYPES) {
    html += `<div class="meal-cell meal-type">${MEAL_LABELS[type]}</div>`;
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const ds = date.toISOString().split('T')[0];
      const meal = meals.find(m => m.date === ds && m.meal_type === type);
      html += `<div class="meal-cell meal-slot" onclick="openMealEdit('${ds}','${type}')">
        ${meal ? '<div class="meal-title">'+esc(meal.title)+'</div>' : '<div class="meal-empty">+</div>'}
      </div>`;
    }
  }

  el.innerHTML = html;
}

function openMealEdit(date, type) {
  const meals = mealService.getAll();
  const meal = meals.find(m => m.date === date && m.meal_type === type);
  document.getElementById('mealDate').value = date;
  document.getElementById('mealType').value = type;
  document.getElementById('mealTitle').value = meal ? meal.title : '';
  document.getElementById('mealNotes').value = meal ? (meal.notes||'') : '';

  const sel = document.getElementById('mealRecipe');
  sel.innerHTML = '<option value="">— 从菜谱选择 —</option>' + recipeService.getAll().map(r =>
    `<option value="${r.id}">${esc(r.title)}</option>`
  ).join('');
  if (meal && meal.recipe_id) sel.value = meal.recipe_id;

  document.getElementById('mealEditModal').classList.add('show');
}

function closeMealEdit() { document.getElementById('mealEditModal').classList.remove('show'); }

function submitMeal() {
  const date = document.getElementById('mealDate').value;
  const type = document.getElementById('mealType').value;
  const title = document.getElementById('mealTitle').value.trim();
  if (!title) { showToast('请输入餐食名称', 'error'); return; }

  const recipeId = document.getElementById('mealRecipe').value;
  const payload = {
    date, meal_type: type,
    title: document.getElementById('mealTitle').value.trim(),
    notes: document.getElementById('mealNotes').value.trim(),
    recipe_id: recipeId || null,
  };

  const meals = mealService.getAll();
  const idx = meals.findIndex(m => m.date === date && m.meal_type === type);
  if (idx >= 0) mealService.update(meals[idx].id, payload);
  else mealService.add(payload);

  closeMealEdit();
  renderMealPlan();
  showToast('已保存', 'success');
}

function deleteMealFromPlan() {
  const date = document.getElementById('mealDate').value;
  const type = document.getElementById('mealType').value;
  const meals = mealService.getAll();
  const idx = meals.findIndex(m => m.date === date && m.meal_type === type);
  if (idx >= 0) mealService.remove(meals[idx].id);
  closeMealEdit();
  renderMealPlan();
  showToast('已清除', 'success');
}

function importMealToShopping() {
  const recipeId = document.getElementById('mealRecipe').value;
  if (!recipeId) { showToast('请先选择菜谱', 'warn'); return; }
  const r = recipeService.getById(recipeId);
  if (!r || !(r.ingredients||[]).length) { showToast('该菜谱没有食材', 'warn'); return; }
  r.ingredients.forEach(i => {
    shoppingItemService.add({
      list_id: activeShoppingList || shoppingListService.getAll()[0]?.id || '',
      name: i.name, quantity: i.quantity,
      category: i.category || '其他', checked: false,
      added_from_meal: recipeId,
    });
  });
  showToast(`已导入 ${r.ingredients.length} 项到购物清单`, 'success');
}
