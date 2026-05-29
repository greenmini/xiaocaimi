/**
 * 最小导航兜底。
 * 只操作 DOM，不依赖数据层，确保其他模块报错时页面仍可切换。
 */
const PAGE_TITLES = {
  home: '仪表盘',
  accounts: '账户资产',
  analysis: '数据分析',
  records: '交易记录',
  calendar: '日历',
  tasks: '任务管理',
  reminders: '提醒',
  shopping: '购物清单',
  notes: '便签',
  contacts: '联系人',
  documents: '文档',
  birthdays: '生日',
  meals: '餐食计划',
  settings: '设置',
  trash: '回收站',
};

function navigatePage(pg) {
  const target = document.getElementById('page-' + pg);
  if (!target) return false;

  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach(item => item.classList.remove('active'));

  target.classList.add('active');
  document.querySelectorAll('[data-page="' + pg + '"]').forEach(item => item.classList.add('active'));

  const title = document.getElementById('pageTitle');
  if (title) title.textContent = PAGE_TITLES[pg] || pg;
  return true;
}

document.addEventListener('click', event => {
  const item = event.target.closest('[data-page]');
  if (!item) return;
  const pg = item.dataset.page;
  if (!pg) return;
  event.preventDefault();
  navigatePage(pg);
  if (typeof renderPageSideEffects === 'function') renderPageSideEffects(pg);
}, true);
