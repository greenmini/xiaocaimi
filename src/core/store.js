const STORAGE_KEY = 'xiaocaimi:v2:snapshot';
const LEGACY_MODULE_KEYS = [
  'finance-os-contacts',
  'finance-os-tasks',
  'finance-os-notes',
  'finance-os-reminders',
  'finance-os-calendar',
  'finance-os-shopping-lists',
  'finance-os-shopping-items',
  'finance-os-documents',
  'finance-os-recipes',
  'finance-os-meals',
];

const DEFAULT_STATE = {
  schema: 'xiaocaimi-v2',
  version: 3,
  updatedAt: null,
  finance: {
    assets: [
      { id: 'cash', name: '现金账户', type: 'cash', amount: 0, color: '#22c55e' },
    ],
    funds: [],
    transactions: [],
    recurringRules: [],
    loans: [],
    budget: 5000,
    categoryBudgets: {},
    settings: {},
  },
  modules: {
    calendar: [],
    tasks: [],
    reminders: [],
    chores: [],
    choreCompletions: [],
    choreSkips: [],
    choreSettings: { upcomingDays: 3, myMemberId: 'me' },
    choreMembers: [
      { id: 'me', name: '我' },
      { id: 'partner', name: '爱人' },
      { id: 'family', name: '家人' },
      { id: 'unassigned', name: '未分配' },
    ],
    shoppingLists: [],
    shoppingItems: [],
    notes: [],
    contacts: [],
    documents: [],
    birthdays: [],
    recipes: [],
    meals: [],
    focusSessions: [],
  },
};

let state = null;
const subscribers = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

function migrateFinanceSeeds(state) {
  (state.finance.assets || []).forEach(a => {
    delete a.openingBalance;
  });
  (state.finance.funds || []).forEach(f => {
    delete f.openingValue;
    delete f.openingCost;
  });
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalize(snapshot) {
  const next = clone(DEFAULT_STATE);
  if (!snapshot) return next;

  if (snapshot.schema === 'xiaocaimi-v2') {
    Object.assign(next.finance, snapshot.finance || {});
    Object.assign(next.modules, snapshot.modules || {});
    next.updatedAt = snapshot.updatedAt || null;
    if ((snapshot.version || 0) < 3) migrateFinanceSeeds(next);
    return next;
  }

  const legacy = snapshot.appData || snapshot;
  Object.assign(next.finance, {
    assets: legacy.assets || next.finance.assets,
    funds: legacy.funds || [],
    transactions: legacy.transactions || [],
    recurringRules: legacy.recurringRules || [],
    loans: legacy.loans || [],
    budget: legacy.budget || 5000,
    categoryBudgets: legacy.categoryBudgets || {},
    settings: legacy.settings || {},
  });
  migrateFinanceSeeds(next);

  if (snapshot.modules) {
    next.modules.contacts = snapshot.modules['finance-os-contacts'] || [];
    next.modules.tasks = snapshot.modules['finance-os-tasks'] || [];
    next.modules.notes = snapshot.modules['finance-os-notes'] || [];
    next.modules.reminders = snapshot.modules['finance-os-reminders'] || [];
    next.modules.calendar = snapshot.modules['finance-os-calendar'] || [];
    next.modules.shoppingLists = snapshot.modules['finance-os-shopping-lists'] || [];
    next.modules.shoppingItems = snapshot.modules['finance-os-shopping-items'] || [];
    next.modules.documents = snapshot.modules['finance-os-documents'] || [];
    next.modules.recipes = snapshot.modules['finance-os-recipes'] || [];
    next.modules.meals = snapshot.modules['finance-os-meals'] || [];
  }

  return next;
}

function loadLegacySnapshot() {
  const legacyFinance = safeJson(localStorage.getItem('financeData'));
  const modules = {};
  LEGACY_MODULE_KEYS.forEach(key => {
    const value = safeJson(localStorage.getItem(key));
    if (Array.isArray(value)) modules[key] = value;
  });
  if (!legacyFinance && Object.keys(modules).length === 0) return null;
  return { appData: legacyFinance || {}, modules };
}

export function loadState() {
  const local = safeJson(localStorage.getItem(STORAGE_KEY)) || loadLegacySnapshot();
  state = normalize(local);
  saveState({ silent: true });
  if (!local) tryPull();
  return state;
}

export function getState() {
  if (!state) loadState();
  return state;
}

let syncTimer = null;
const SYNC_DEBOUNCE = 2000;

function syncConfig() {
  const s = state?.finance?.settings || {};
  return { url: s.syncServerUrl || '', token: s.syncToken || '' };
}

async function pushToServer() {
  if (!state) return;
  const { url, token } = syncConfig();
  const base = url || window.location.origin;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const resp = await fetch(base + '/api/data', { method: 'POST', headers, body: JSON.stringify(state) });
    if (resp.ok) state._lastSync = Date.now();
  } catch { /* network unavailable */ }
}

function schedulePush() {
  if (!state) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushToServer, SYNC_DEBOUNCE);
}

async function tryPull() {
  const { url, token } = syncConfig();
  const base = url || window.location.origin;
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const resp = await fetch(base + '/api/data', { headers });
    if (!resp.ok) return;
    const serverData = await resp.json();
    if (!serverData?.finance?.transactions?.length) return;
    state = normalize(serverData);
    saveState({ silent: true });
    subscribers.forEach(fn => fn(state));
  } catch { /* network unavailable */ }
}

export function saveState(options = {}) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.silent) subscribers.forEach(fn => fn(state));
  schedulePush();
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function update(mutator) {
  mutator(getState());
  saveState();
}

export function addItem(path, item, prefix = 'item') {
  let created;
  update(draft => {
    const list = getPath(draft, path);
    created = { ...item, id: item.id || uid(prefix), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    list.push(created);
  });
  return created;
}

export function updateItem(path, id, patch) {
  update(draft => {
    const list = getPath(draft, path);
    const item = list.find(row => row.id === id);
    if (item) Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  });
}

export function removeItem(path, id) {
  update(draft => {
    const list = getPath(draft, path);
    const index = list.findIndex(row => row.id === id);
    if (index >= 0) list.splice(index, 1);
  });
}

export function getPath(obj, path) {
  return path.split('.').reduce((target, key) => target[key], obj);
}

export function exportSnapshot() {
  return JSON.stringify(getState(), null, 2);
}

export function importSnapshot(text) {
  state = normalize(JSON.parse(text));
  saveState();
}
