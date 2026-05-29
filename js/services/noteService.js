/**
 * 便签服务 · Note Service
 */
const notesService = (() => {
  const store = StorageService.createStore('v1:notes', 'nt');

  return {
    getAll: () => store.getAll(),
    getById: (id) => store.getById(id),
    add: (note) => store.add(note),
    update: (id, updates) => store.update(id, updates),
    remove: (id) => store.remove(id),
    reload: () => store.reload(),
    save: (list) => store.save(list),
  };
})();
