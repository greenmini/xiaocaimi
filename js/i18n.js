/**
 * 国际化 · i18n
 * 小财迷 · Finance OS
 */
const LOCALES = {
  'zh-CN': {
    // 导航
    nav_home: '仪表盘',
    nav_records: '交易记录',
    nav_accounts: '账户资产',
    nav_analysis: '数据分析',
    nav_calendar: '日历',
    nav_tasks: '任务',
    nav_reminders: '提醒',
    nav_shopping: '购物',
    nav_notes: '便签',
    nav_contacts: '联系人',
    nav_documents: '文档',
    nav_birthdays: '生日',
    nav_meals: '餐食',
    nav_settings: '设置',
    nav_trash: '回收站',

    // 仪表盘
    total_assets: '总资产',
    month_income: '本月收入',
    month_expense: '本月支出',
    month_balance: '本月结余',
    cumulative_income: '累计收入',
    budget_remaining: '预算剩余',
    daily_avg: '日均',
    today_income: '今日收入',
    today_expense: '今日支出',
    budget_left: '预算剩余',
    account_count: '账户数量',
    no_record: '无记录',
    monthly_trend: '月度趋势',
    income_comparison: '收入对比',
    expense_comparison: '支出对比',
    this_month: '本月',
    last_month: '上月',
    change: '变化',
    asset_distribution: '资产分布',
    recent_flow: '近期流水',
    manage: '管理',
    view_all: '全部',
    quick_booking: '快捷记账',
    budget_warning_over: '预算已超支',
    budget_warning_used: '预算已使用',
    adjust_budget: '调整预算',

    // 记账
    bookkeeping: '记账',
    edit: '编辑',
    expense: '支出',
    income: '收入',
    transfer: '转账',
    amount: '金额',
    category: '分类',
    subcategory: '子类',
    note: '备注',
    account: '账户',
    tag: '标签',
    from_account: '从账户',
    to_account: '到账户',
    confirm_save: '确认记账',
    recurring: '周期性交易',
    frequency: '频率',
    interval: '间隔',
    start_date: '起始',
    save_success: '记账成功',
    input_valid_amount: '请输入有效金额',

    // 按钮
    add: '添加',
    save: '保存',
    delete: '删除',
    cancel: '取消',
    confirm: '确认',
    export: '导出',
    import: '导入',
    search: '搜索',

    // 设置
    basic_settings: '基础设置',
    monthly_budget: '月度预算',
    obsidian_vault: 'Obsidian仓库',
    sync_format: '同步格式',
    data_management: '数据管理',
    export_data: '导出数据',
    import_data: '导入数据',
    export_monthly: '导出月报',
    ai_config: 'AI 分析配置',
    api_endpoint: '接口地址',
    model_name: '模型名称',
    api_key: 'API Key',
    test_connection: '测试连接',
    server_sync: '服务端同步',
    sync_url: '同步地址',
    sync_token: '同步 Token',
    recurring_rules: '周期性交易',
    loan_management: '贷款管理',
    budget_alerts: '预算与提醒',
    alert_threshold: '单笔超限提醒',
    sidebar_modules: '侧边栏模块',
    lang_setting: '语言',

    // 分析页
    analysis_title: '数据分析',
    expenditure_trend: '支出趋势',
    recent_6_months: '近6个月',
    yearly_trend: '年度趋势',
    expenditure_category: '支出分类',
    this_month_short: '本月',
    insight: '洞察',
    ai_analysis: 'AI 智能分析',
    start_analysis: '开始分析',
    monthly_report: '月度报告',
    export_markdown: '导出 Markdown',
    export_csv: '导出 CSV',
    saving_rate: '储蓄率',
    budget_usage: '预算使用',
    month_over_month: '环比支出',

    // 交易记录
    all: '全部',
    all_accounts: '全账户',
    all_tags: '全标签',
    no_match: '无匹配记录',
    export_csv_records: '导出CSV',
    filter: '筛选',
    record_list: '记录列表',

    force_refresh: '强制刷新',
    force_refresh_desc: '清除浏览器缓存和 Service Worker，强制加载最新版本。不影响已保存的数据。',
    force_refresh_btn: '强制刷新',

    // 回收站
    trash_empty: '回收站为空',
    deleted_records: '已删除的记录',
    empty_trash: '清空回收站',
    restore: '恢复',
    permanent_delete: '永久删除',
    permanently_delete: '永久删除',
    restore_success: '已恢复',
    trash_emptied: '回收站已清空',

    // 通用
    loading: '加载中...',
    no_data: '暂无数据',
    save_success_toast: '保存成功',
    delete_confirm_title: '确认删除',
    delete_confirm_msg: '删除后30秒内可撤销，确定要删除这条记录吗？',

    // 主题
    toggle_theme: '切换主题',
    toggle_lang: '切换语言',

    // 侧边栏分区
    section_core: '核心',
    section_life: '生活',
    section_docs: '资料',
    section_biz: '管理',
  },

  en: {
    nav_home: 'Dashboard',
    nav_records: 'Records',
    nav_accounts: 'Accounts',
    nav_analysis: 'Analysis',
    nav_calendar: 'Calendar',
    nav_tasks: 'Tasks',
    nav_reminders: 'Reminders',
    nav_shopping: 'Shopping',
    nav_notes: 'Notes',
    nav_contacts: 'Contacts',
    nav_documents: 'Documents',
    nav_birthdays: 'Birthdays',
    nav_meals: 'Meals',
    nav_settings: 'Settings',
    nav_trash: 'Trash',

    total_assets: 'Total Assets',
    month_income: 'Monthly Income',
    month_expense: 'Monthly Expense',
    month_balance: 'Monthly Balance',
    cumulative_income: 'Cumulative Income',
    budget_remaining: 'Budget Left',
    daily_avg: 'Daily Avg',
    today_income: "Today's Income",
    today_expense: "Today's Expense",
    budget_left: 'Budget Remaining',
    account_count: 'Accounts',
    no_record: 'No Records',
    monthly_trend: 'Monthly Trend',
    income_comparison: 'Income',
    expense_comparison: 'Expense',
    this_month: 'This Month',
    last_month: 'Last Month',
    change: 'Change',
    asset_distribution: 'Assets',
    recent_flow: 'Recent',
    manage: 'Manage',
    view_all: 'All',
    quick_booking: 'Quick Entry',
    budget_warning_over: 'Budget exceeded by',
    budget_warning_used: 'Budget used',
    adjust_budget: 'Adjust',

    bookkeeping: 'Entry',
    edit: 'Edit',
    expense: 'Expense',
    income: 'Income',
    transfer: 'Transfer',
    amount: 'Amount',
    category: 'Category',
    subcategory: 'Subcategory',
    note: 'Note',
    account: 'Account',
    tag: 'Tag',
    from_account: 'From',
    to_account: 'To',
    confirm_save: 'Save Entry',
    recurring: 'Recurring',
    frequency: 'Frequency',
    interval: 'Interval',
    start_date: 'Start',
    save_success: 'Saved!',
    input_valid_amount: 'Enter a valid amount',

    add: 'Add',
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    export: 'Export',
    import: 'Import',
    search: 'Search',

    basic_settings: 'Basic Settings',
    monthly_budget: 'Monthly Budget',
    obsidian_vault: 'Obsidian Vault',
    sync_format: 'Sync Format',
    data_management: 'Data',
    export_data: 'Export Data',
    import_data: 'Import Data',
    export_monthly: 'Export PDF',
    ai_config: 'AI Config',
    api_endpoint: 'API Endpoint',
    model_name: 'Model',
    api_key: 'API Key',
    test_connection: 'Test',
    server_sync: 'Server Sync',
    sync_url: 'Sync URL',
    sync_token: 'Token',
    recurring_rules: 'Recurring',
    loan_management: 'Loans',
    budget_alerts: 'Budget',
    alert_threshold: 'Alert Threshold',
    sidebar_modules: 'Sidebar',
    lang_setting: 'Language',

    analysis_title: 'Analysis',
    expenditure_trend: 'Expense Trend',
    recent_6_months: 'Last 6 Months',
    yearly_trend: 'Yearly Trend',
    expenditure_category: 'Categories',
    this_month_short: 'This Month',
    insight: 'Insights',
    ai_analysis: 'AI Analysis',
    start_analysis: 'Analyze',
    monthly_report: 'Report',
    export_markdown: 'Markdown',
    export_csv: 'CSV',
    saving_rate: 'Savings Rate',
    budget_usage: 'Budget',
    month_over_month: 'MoM Change',

    all: 'All',
    all_accounts: 'All Accounts',
    all_tags: 'All Tags',
    no_match: 'No matches',
    export_csv_records: 'Export CSV',
    filter: 'Filter',
    record_list: 'Records',

    force_refresh: 'Force Refresh',
    force_refresh_desc: 'Clear browser cache and Service Worker to load the latest version. Your data will not be affected.',
    force_refresh_btn: 'Force Refresh',

    trash_empty: 'Trash is empty',
    deleted_records: 'Deleted Items',
    empty_trash: 'Empty Trash',
    restore: 'Restore',
    permanent_delete: 'Delete Forever',
    permanently_delete: 'Delete Forever',
    restore_success: 'Restored!',
    trash_emptied: 'Trash emptied!',

    loading: 'Loading...',
    no_data: 'No data',
    save_success_toast: 'Saved!',
    delete_confirm_title: 'Confirm Delete',
    delete_confirm_msg: 'This can be undone within 30 seconds. Delete?',

    toggle_theme: 'Toggle Theme',
    toggle_lang: 'Switch Language',

    // Sidebar sections
    section_core: 'Core',
    section_life: 'Life',
    section_docs: 'Docs',
    section_biz: 'Manage',
  },
};

let _locale = 'zh-CN';

function getLocale() {
  const saved = storageService.get('v1:locale');
  if (saved && LOCALES[saved]) return saved;
  return _locale;
}

function setLocale(lang) {
  if (!LOCALES[lang]) return;
  _locale = lang;
  storageService.set('v1:locale', lang);
  applyLocale(lang);
  updateLangBtn();
}

function t(key) {
  const lang = getLocale();
  return LOCALES[lang]?.[key] || LOCALES['zh-CN']?.[key] || key;
}

function applyLocale(lang) {
  const strings = LOCALES[lang] || LOCALES['zh-CN'];

  // 侧边栏分区
  document.querySelectorAll('.sidebar-section-label').forEach(el => {
    const text = el.textContent.trim();
    const map = { '核心': 'section_core', '生活': 'section_life', '资料': 'section_docs', '管理': 'section_biz', 'Core': 'section_core', 'Life': 'section_life', 'Docs': 'section_docs', 'Manage': 'section_biz' };
    const key = map[text];
    if (key && strings[key]) el.textContent = strings[key];
  });

  // 侧边栏项目文本
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    const page = el.dataset.page;
    const key = 'nav_' + page;
    const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (textNode && strings[key]) textNode.textContent = strings[key];
  });

  // 回收站按钮文本（它没有 data-page 属性）
  const trashBtn = document.querySelector('.sidebar-footer .sidebar-item[data-page="trash"]');
  if (trashBtn && strings.nav_trash) {
    const textNode = Array.from(trashBtn.childNodes).find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (textNode) textNode.textContent = strings.nav_trash;
  }

  // 当前页标题
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    const active = document.querySelector('.page.active');
    const pageId = active?.id?.replace('page-', '');
    const key = 'nav_' + pageId;
    if (strings[key]) titleEl.textContent = strings[key];
  }
}

function updateLangBtn() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  const lang = getLocale();
  btn.innerHTML = lang === 'zh-CN'
    ? '<span style="font-size:11px;font-weight:600">EN</span>'
    : '<span style="font-size:11px;font-weight:600">中</span>';
  btn.title = lang === 'zh-CN' ? 'Switch to English' : '切换到中文';
}

function toggleLang() {
  const current = getLocale();
  const next = current === 'zh-CN' ? 'en' : 'zh-CN';
  setLocale(next);
  // 重新渲染当前页
  if (typeof render === 'function') render();
  if (typeof renderPageSideEffects === 'function') {
    const active = document.querySelector('.page.active');
    if (active) {
      const pageId = active.id?.replace('page-', '');
      renderPageSideEffects(pageId);
    }
  }
  updateLangBtn();
}
