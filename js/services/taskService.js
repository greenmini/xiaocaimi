/**
 * 任务服务 · Task Service
 */
const tasksService = (() => {
  const store = StorageService.createStore('v1:tasks', 'tk');

  return {
    getAll: () => store.getAll(),
    getById: (id) => store.getById(id),
    add: (task) => store.add(task),
    update: (id, updates) => store.update(id, updates),
    remove: (id) => store.remove(id),
    reload: () => store.reload(),
    save: (list) => store.save(list),
  };
})();
