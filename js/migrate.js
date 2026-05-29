/**
 * 数据迁移
 * 从旧 storage（financeData in localStorage / IndexedDB）→ 新独立 localStorage keys
 * 仅执行一次，迁移后标记 finance-os-migrated = '1'
 *
 * 加载顺序: 必须在 storage.js 之后、所有模块之前执行
 */
(function migrateData() {
  if (localStorage.getItem('finance-os-migrated') === '1') {
    console.log('[migrate] 已迁移，跳过');
    return;
  }

  console.log('[migrate] 开始数据迁移...');

  // 先备份原始 financeData
  const rawFinance = localStorage.getItem('financeData');
  if (rawFinance) {
    try {
      localStorage.setItem('finance-os-backup', rawFinance);
      console.log('[migrate] 已备份 financeData → finance-os-backup');
    } catch(e) {}
  }

  // 尝试从旧存储读取
  let oldData = null;
  try {
    if (rawFinance) {
      oldData = JSON.parse(rawFinance);
      console.log('[migrate] 从 financeData (localStorage) 读取成功');
    }
  } catch (e) {
    console.warn('[migrate] financeData 读取失败:', e.message);
  }

  if (!oldData || !oldData.assets) {
    console.log('[migrate] 无旧数据，跳过');
    localStorage.setItem('finance-os-migrated', '1');
    return;
  }

  // 映射: oldData key → new localStorage key
  const mappings = {
    contacts:        'finance-os-contacts',
    tasks:           'finance-os-tasks',
    notes:           'finance-os-notes',
    reminders:       'finance-os-reminders',
    calendarEvents:  'finance-os-calendar',
    shoppingLists:   'finance-os-shopping-lists',
    shoppingItems:   'finance-os-shopping-items',
    documents:       'finance-os-documents',
    recipes:         'finance-os-recipes',
    meals:           'finance-os-meals',
  };

  let migrated = 0;
  for (const [oldKey, newKey] of Object.entries(mappings)) {
    const arr = oldData[oldKey];
    if (!Array.isArray(arr) || arr.length === 0) continue;

    // 如果新 key 已有数据，做合并去重
    let existing = [];
    try {
      const raw = localStorage.getItem(newKey);
      if (raw) existing = JSON.parse(raw);
    } catch (e) {}

    const merged = [...existing];
    const existingIds = new Set(existing.map(e => e.id));
    for (const item of arr) {
      if (!existingIds.has(item.id)) {
        merged.push(item);
        existingIds.add(item.id);
      }
    }
    localStorage.setItem(newKey, JSON.stringify(merged));
    migrated++;
    console.log(`[migrate] ${oldKey} → ${newKey}: ${arr.length} 条${existing.length ? ' (合并已有 '+existing.length+' 条)' : ''}`);
  }

  if (migrated > 0) {
    console.log(`[migrate] ✅ 完成，迁移了 ${migrated} 个模块`);
  } else {
    console.log('[migrate] 无可迁移数据');
  }

  localStorage.setItem('finance-os-migrated', '1');
})();
