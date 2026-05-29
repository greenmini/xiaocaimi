/**
 * 数据迁移 - 一次性执行
 * 在 storage-service.js 自动迁移之后，处理 IndexedDB → localStorage 的合并。
 */
(function migrateData() {
  if (storageService.get('v1:migrated')) { console.log('[migrate] 已迁移，跳过'); return; }

  console.log('[migrate] 开始合并 IndexedDB 数据...');

  const rawFinance = storageService.get('v1:finance');
  if (!rawFinance || !rawFinance.assets) {
    console.log('[migrate] 无旧财务数据，跳过');
    storageService.set('v1:migrated', true);
    return;
  }

  const mappings = {
    contacts:        'v1:contacts',
    tasks:           'v1:tasks',
    notes:           'v1:notes',
    reminders:       'v1:reminders',
    calendarEvents:  'v1:calendar',
    shoppingLists:   'v1:shopping-lists',
    shoppingItems:   'v1:shopping-items',
    documents:       'v1:documents',
    recipes:         'v1:recipes',
    meals:           'v1:meals',
  };

  for (const [oldKey, newKey] of Object.entries(mappings)) {
    const arr = Array.isArray(rawFinance[oldKey]) ? rawFinance[oldKey] : [];
    const existing = storageService.get(newKey);
    const existingList = Array.isArray(existing) ? existing : [];
    if (arr.length === 0 && existingList.length > 0) continue;

    const merged = [...existingList];
    const existingIds = new Set(existingList.map(e => e.id));
    for (const item of arr) {
      if (!existingIds.has(item.id)) { merged.push(item); existingIds.add(item.id); }
    }
    storageService.set(newKey, merged);
  }

  storageService.set('v1:migrated', true);
  console.log('[migrate] ✅ 完成');
})();
