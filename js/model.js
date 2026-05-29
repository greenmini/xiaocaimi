/**
 * 数据模型 + 常量
 * 小财迷 · Model
 */

const VERSION = '6.4';
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAYS   = ['日','一','二','三','四','五','六'];

const ICONS = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
];

const CAT_ICONS = {
  '餐饮':'🍽️','交通':'🚗','购物':'🛍️','住房':'🏠','通讯':'📱','旅行':'✈️',
  '工资':'💼','奖金':'🎁','投资':'📊','理财':'💰','兑换':'🔄','退款':'↩️','其他':'📌','转账':'↔️',
};

const CATS = {
  expense: ['餐饮','交通','购物','住房','通讯','旅行','其他'],
  income: ['工资','奖金','投资','理财','兑换','退款','其他'],
};

const BCATS = ['餐饮','交通','购物','住房','通讯','旅行','其他'];

const DEFAULT_DATA = {
  version: VERSION,
  assets: [
    { id: 'cash', name: '农业银行现金', icon: ICONS[0], amount: 609.15, color: '#22c55e' },
    { id: 'yuebao', name: '余额宝', icon: ICONS[1], amount: 6.81, color: '#f59e0b' },
    { id: 'alipay_fund', name: '支付宝基金', icon: ICONS[2], amount: 116.94, color: '#3b82f6' },
    { id: 'gold', name: '黄金', icon: ICONS[3], amount: 30.71, color: '#eab308' },
  ],
  funds: [{ id: 'fund_1', name: '雪球基金', cost: 369.981, value: 411.09, note: '自同步', createdAt: '2026-05-01' }],
  fundHistory: [],
  transactions: [{ id: 1777623496169, type: 'expense', amount: 31.3, category: '餐饮', note: '', date: '2026-05-01', account: 'cash' }],
  recurringRules: [],
  loans: [],
  calendarEvents: [],
  reminders: [],
  tasks: [],
  shoppingLists: [],
  shoppingItems: [],
  notes: [],
  contacts: [],
  documents: [],
  recipes: [],
  recipeIngredients: [],
  meals: [],
  budget: 5000,
  categoryBudgets: {},
  reminder: null,
  settings: { obsidianVault: 'finance-vault', obsidianTags: 'yaml' },
};

// ─── 工具函数 ──────────────────────────────────────

function deepMerge(a, b) {
  const r = { ...a };
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      r[k] = deepMerge(a[k] || {}, b[k]);
    } else {
      r[k] = b[k];
    }
  }
  return r;
}

function migrate(d) {
  if (!d.version) d.version = '1.0';
  if (parseFloat(d.version) < 4.0) {
    (d.assets || []).forEach(a => { if (!a.color) a.color = '#4d9fff'; });
    d.funds = d.funds || [];
    d.fundHistory = d.fundHistory || [];
    d.categoryBudgets = d.categoryBudgets || {};
    d.settings = d.settings || { obsidianVault: 'finance-vault', obsidianTags: 'yaml' };
    d.version = '4.0';
  }
  d.version = VERSION;
  return d;
}
