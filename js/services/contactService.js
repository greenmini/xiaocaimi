/**
 * 联系人服务 · Contact Service
 */
const contactsService = (() => {
  const store = StorageService.createStore('v1:contacts', 'ct');

  return {
    getAll: () => store.getAll(),
    getById: (id) => store.getById(id),
    add: (contact) => store.add(contact),
    update: (id, updates) => store.update(id, updates),
    remove: (id) => store.remove(id),
    reload: () => store.reload(),
    save: (list) => store.save(list),
  };
})();
