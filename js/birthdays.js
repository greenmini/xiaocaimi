/**
 * 生日追踪模块
 * 小财迷 · Birthdays
 *
 * 数据来源: contactsService（localStorage "finance-os-contacts"）
 * 筛选有 birthday 字段的联系人，按距今天数排序
 */

async function getBirthdays() {
  const contacts = contactsService.getAll();
  return contacts
    .filter(c => c.birthday)
    .map(c => {
      const bday = c.birthday;
      const today = new Date();
      const bd = new Date(today.getFullYear(), parseInt(bday.slice(5, 7)) - 1, parseInt(bday.slice(8, 10)));
      if (bd < today) bd.setFullYear(bd.getFullYear() + 1);
      const daysUntil = Math.ceil((bd - today) / 86400000);
      const age = today.getFullYear() - parseInt(bday.slice(0, 4));
      return { ...c, daysUntil, age, nextDate: bd.toISOString().split('T')[0] };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

async function renderBirthdays() {
  const el = document.getElementById('bdayList');
  if (!el) return;

  const list = await getBirthdays();
  if (!list.length) {
    el.innerHTML = '<div class="task-empty">暂无生日信息。在「联系人」中添加生日即可。</div>';
    return;
  }

  // 按月分组
  const months = {};
  list.forEach(b => {
    const m = parseInt(b.birthday.slice(5, 7));
    if (!months[m]) months[m] = [];
    months[m].push(b);
  });

  let html = '';
  const MONTH_NAMES = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  for (let m = 1; m <= 12; m++) {
    if (!months[m]) continue;
    html += `<div class="shop-cat-label">${MONTH_NAMES[m]}</div>`;
    html += months[m].map(b => `
      <div class="bday-item">
        <div class="contact-avatar" style="width:32px;height:32px;font-size:13px;background:${esc(b.color || '#6366F1')};color:#fff">${esc((b.name || '?')[0])}</div>
        <div class="doc-info">
          <div class="doc-name">${esc(b.name)} ${b.age ? '<span style="font-size:10px;color:var(--text3)">' + b.age + '岁</span>' : ''}</div>
          <div class="doc-meta">${b.birthday.slice(5)} · ${b.daysUntil === 0 ? '🎂 今天！' : b.daysUntil === 1 ? '明天' : b.daysUntil + '天后'}</div>
        </div>
      </div>
    `).join('');
  }
  el.innerHTML = html;

  // 首页 banner
  const banner = document.getElementById('bdayHomeBanner');
  if (banner) {
    const upcoming = list.filter(b => b.daysUntil <= 7);
    if (upcoming.length > 0) {
      banner.style.display = 'block';
      const h3 = banner.querySelector('h3');
      if (h3) h3.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>临近生日 — ${upcoming.map(b => esc(b.name) + (b.daysUntil === 0 ? '🎂' : '(' + b.daysUntil + '天)')).join(', ')}`;
    } else {
      banner.style.display = 'none';
    }
  }
}
