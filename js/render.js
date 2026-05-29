/**
 * 渲染函数
 * 小财迷 · Render
 */

function render() {
  const t = analyticsService.total(), m = analyticsService.mStats(0), l = analyticsService.budgetLeft(), td = analyticsService.todayStats();

  el('totalAssets').textContent = fmt(t);
  el('monthIncome').textContent  = fmt(m.inc);
  el('monthExpense').textContent = fmt(m.exp);
  const bal = el('monthBalance');
  bal.textContent = fmt(Math.abs(m.inc - m.exp));
  bal.className = 'value ' + (m.inc >= m.exp ? 'positive' : 'negative');
  el('budgetLeft').textContent = `预算剩余 ${fmt(l)}`;

  el('todayIncome').textContent  = fmt(td.inc);
  el('todayExpense').textContent = fmt(td.exp);
  el('todayIncomeCount').textContent  = td.ic + '笔';
  el('todayExpenseCount').textContent = td.ec + '笔';
  el('budgetRemaining').textContent = fmt(l);
  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  el('budgetDayAvg').textContent = '日均' + fmt(l / Math.max(1, days - new Date().getDate()));

  el('accountCount').textContent = data.assets.length;
  const last = data.transactions.length
    ? data.transactions[data.transactions.length - 1] : null;
  el('lastRecord').textContent = last ? last.date : '无记录';

  const pct = budgetPct(), warn = el('budgetWarning');
  if (pct > 100) {
    warn.className = 'budget-warning danger budget-blink show';
    el('budgetWarningText').textContent =
      `预算已超支 ${(pct - 100).toFixed(0)}%！本月支出 ${fmt(m.exp)} / ${fmt(data.budget)}`;
  } else if (pct > 80) {
    warn.className = 'budget-warning show';
    el('budgetWarningText').textContent =
      `预算已使用 ${pct.toFixed(0)}%，剩余 ${fmt(l)}`;
  } else {
    warn.className = 'budget-warning';
  }

  const f = el('budgetBarFill');
  f.style.width = pct + '%';
  f.style.background = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : 'var(--cyan)';
  el('budgetBarAmount').textContent = fmt(m.exp) + '/' + fmt(data.budget);

  const pv = mStats(-1);
  el('incomeComparison').innerHTML =
    `<div class="comp-item"><span class="lbl">本月</span><span class="val">${fmt(m.inc)}</span></div>` +
    `<div class="comp-item"><span class="lbl">上月</span><span class="val">${fmt(pv.inc)}</span></div>` +
    `<div class="comp-item"><span class="lbl">变化</span><span class="val">${m.inc >= pv.inc ? '+' : ''}${fmt(m.inc - pv.inc)}</span>` +
    `<span class="delta${m.inc >= pv.inc ? ' up' : ' down'}">${pv.inc ? ((m.inc - pv.inc) / pv.inc * 100).toFixed(1) + '%' : '—'}</span></div>`;

  el('expenseComparison').innerHTML =
    `<div class="comp-item"><span class="lbl">本月</span><span class="val">${fmt(m.exp)}</span></div>` +
    `<div class="comp-item"><span class="lbl">上月</span><span class="val">${fmt(pv.exp)}</span></div>` +
    `<div class="comp-item"><span class="lbl">变化</span><span class="val">${m.exp >= pv.exp ? '+' : ''}${fmt(m.exp - pv.exp)}</span>` +
    `<span class="delta${m.exp >= pv.exp ? ' up' : ' down'}">${pv.exp ? ((m.exp - pv.exp) / pv.exp * 100).toFixed(1) + '%' : '—'}</span></div>`;

  const fv = data.funds.reduce((s, f) => s + (f.value || 0), 0);
  const fc = data.funds.reduce((s, f) => s + (f.cost || 0), 0);
  const fp = fv - fc;
  el('fundTotalValue').textContent  = fmt(fv);
  el('fundTotalCost').textContent   = fmt(fc);
  const fpEl = el('fundTotalProfit');
  fpEl.textContent = fmt(Math.abs(fp));
  fpEl.className = 'value ' + (fp >= 0 ? 'positive' : 'negative');
  const frEl = el('fundTotalReturn');
  frEl.textContent = (fp >= 0 ? '+' : '') + (fc ? (fp / fc * 100).toFixed(2) : '0.00') + '%';
  frEl.className = 'value ' + (fp >= 0 ? 'positive' : 'negative');

  renderReminders();
  renderBirthdays();
  if (data.reminder) {
    el('reminderBanner').classList.add('show');
    el('reminderTitle').textContent = data.reminder.title || '提醒';
    el('reminderText').textContent  = data.reminder.text || '';
  } else {
    el('reminderBanner').classList.remove('show');
  }

  renderAssetBars();
  renderHeatmap();
  renderMonthlyTrend();
  setTimeout(() => {
    renderRecentTx();
    renderCats();
    renderFundList();
    populateFilters();
  }, 0);
}

function renderAssetBars() {
  const el = document.getElementById('assetBars');
  if (!el) return;
  const activeAssets = accountService.getAll().filter(a => !a.isArchived);
  const total = activeAssets.reduce((s, a) => s + (a.type === 'debt' ? -(a.amount || 0) : (a.amount || 0)), 0);
  const sorted = [...activeAssets].sort((a, b) => {
    const va = a.type === 'debt' ? -(a.amount || 0) : (a.amount || 0);
    const vb = b.type === 'debt' ? -(b.amount || 0) : (b.amount || 0);
    return vb - va;
  });
  const maxPct = sorted.length ? Math.max(...sorted.map(a => Math.abs(a.amount || 0) / Math.max(1, Math.abs(total)) * 100)) : 0;

  const colors = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#14B8A6'];
  el.innerHTML = sorted.map((a, i) => {
    const val = a.type === 'debt' ? -(a.amount || 0) : (a.amount || 0);
    const pct = total > 0 ? (Math.abs(val) / Math.abs(total) * 100) : 0;
    const color = a.color || colors[i % colors.length];
    const isDebt = a.type === 'debt';
    const isMax = Math.abs(pct - maxPct) < 0.01 && pct > 30;
    return `<div class="asset-bar-row${isMax ? ' primary' : ''}" onclick="openAccountDetail('${esc(a.id)}')">
      <div class="asset-bar-icon" style="background:${color}20;color:${color}">${a.icon || '●'}</div>
      <div class="asset-bar-info">
        <div class="asset-bar-top">
          <span class="asset-bar-name">${esc(a.name)}${isDebt ? '<span class="asset-badge debt">负债</span>' : a.type === 'virtual' ? '<span class="asset-badge virtual">虚拟</span>' : ''}</span>
          <span class="asset-bar-amount" style="color:${isDebt ? 'var(--danger)' : 'var(--ink)'}">${isDebt ? '-' : ''}${fmt(Math.abs(val))}</span>
        </div>
        <div class="asset-bar-track">
          <div class="asset-bar-fill" style="width:${Math.max(pct, 3)}%;background:${color}"></div>
        </div>
        <div class="asset-bar-pct">${pct.toFixed(1)}%</div>
      </div>
    </div>`;
  }).join('');
}

function renderAssetList() {
  const html = a => {
    const typeBadge = a.type === 'debt' ? '<span class="asset-badge debt">负债</span>' : a.type === 'virtual' ? '<span class="asset-badge virtual">虚拟</span>' : '';
    return `<li class="asset-item" onclick="editAsset('${esc(a.id)}')"><span class="icon">${a.icon || ''}</span><span class="name">${esc(a.name)}${typeBadge}</span><span class="amount" style="color:${a.type==='debt'?'var(--red)':'inherit'}">${a.type==='debt'?'-':''}${fmt(a.amount)}</span><span class="edit-hint">edit</span></li>`;
  };
  const el1 = document.getElementById('assetList');
  if (el1) el1.innerHTML = data.assets.map(html).join('');
  const el2 = document.getElementById('assetListPage');
  if (el2) el2.innerHTML = data.assets.map(html).join('');
}

function renderHeatmap() {
  const el = document.getElementById('calendarHeatmap');
  if (!el) return;
  const now  = new Date(),
        y   = now.getFullYear(),
        m   = now.getMonth(),
        daysInM = new Date(y, m + 1, 0).getDate(),
        firstDay = new Date(y, m, 1).getDay();

  const dm = {};
  data.transactions
    .filter(t => t.type === 'expense' && t.date && t.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`))
    .forEach(t => { dm[t.date] = (dm[t.date] || 0) + t.amount; });

  const max = Math.max(1, ...Object.values(dm));

  let h = DAYS.map(d => `<div class="day-label">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) h += '<div class="day-cell empty"></div>';
  for (let d = 1; d <= daysInM; d++) {
    const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const val = dm[date] || 0;
    const intensity = val > 0 ? Math.max(0.05, val / max * 0.7) : 0;
    const cls = d === now.getDate() ? ' today' : '';
    h += `<div class="day-cell${cls}" style="background:rgba(255,58,92,${intensity});${val ? 'color:var(--text)' : ''}" title="${date}: ${fmt(val)}">${d}</div>`;
  }
  el.innerHTML = h;
}

function renderFundList() {
  const el = document.getElementById('fundListPage');
  if (el) {
    el.innerHTML = data.funds.map(f => {
      const p = f.value - f.cost;
      const r = f.cost ? p / f.cost * 100 : 0;
      return `<li class="asset-item" onclick="editFund('${esc(f.id)}')">
        <span class="icon">${ICONS[2]}</span>
        <span class="name">${esc(f.name)}</span>
        <span class="amount" style="color:${r >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(f.value)}</span>
        <span class="edit-hint">edit</span>
      </li>`;
    }).join('');
  }

  // KPI bar
  const fv = data.funds.reduce((s, f) => s + (f.value || 0), 0);
  const fc = data.funds.reduce((s, f) => s + (f.cost || 0), 0);
  const fp = fv - fc;
  const fr = fc ? fp / fc * 100 : 0;
  const setKpi = (id, v, cls) => { const e = document.getElementById(id); if (e) { e.textContent = v; e.className = 'fund-kpi-value ' + cls; } };
  setKpi('fkMarket', fmt(fv), '');
  setKpi('fkCost', fmt(fc), '');
  setKpi('fkProfit', (fp >= 0 ? '+' : '') + fmt(fp), fp >= 0 ? 'up' : 'down');
  setKpi('fkReturn', (fr >= 0 ? '+' : '') + fr.toFixed(2) + '%', fr >= 0 ? 'up' : 'down');

  // History list
  const hist = document.getElementById('fundHistoryList');
  if (hist) {
    const hh = (data.fundHistory || []).slice(-20).reverse();
    hist.innerHTML = hh.length
      ? hh.map(h => `<div class="fund-history-row">
        <span class="fund-history-date">${esc(h.date)}</span>
        <div class="fund-history-values">
          <span class="fund-history-val">${fmt(h.value)}</span>
          <span class="fund-history-profit ${h.profit >= 0 ? 'up' : 'down'}">${h.profit >= 0 ? '+' : ''}${fmt(h.profit)}</span>
        </div>
      </div>`).join('')
      : '<div style="padding:12px 0;color:var(--ink-muted);font-size:var(--text-xs);text-align:center">暂无历史记录 — 保存基金时会自动记录</div>';
  }

  renderFundChart();
}

let fundChart = null;

function renderFundChart() {
  const canvas = document.getElementById('fundChart');
  if (!canvas) return;
  const parent = canvas.parentElement;
  const hh = (data.fundHistory || []).slice(-60);
  if (hh.length < 2) { parent.style.display = 'none'; return; }
  parent.style.display = 'block';

  const labels = hh.map(h => h.date);
  const values = hh.map(h => h.value);
  const costs  = hh.map(h => h.cost || values[0]);

  // Find peaks & valleys for annotation
  let maxIdx = 0, minIdx = 0;
  values.forEach((v, i) => { if (v > values[maxIdx]) maxIdx = i; if (v < values[minIdx]) minIdx = i; });

  const gridColor = 'rgba(255,255,255,0.04)';
  const textColor = 'rgba(255,255,255,0.25)';
  const accentRgba = 'rgba(99,102,241,0.35)';
  const greenRgba = 'rgba(34,197,94,0.15)';
  const redRgba = 'rgba(239,68,68,0.12)';

  // Gradient fill
  const profit = values[values.length - 1] - values[0];
  const fillColor = profit >= 0
    ? { top: 'rgba(34,197,94,0.18)', bottom: 'rgba(34,197,94,0.0)' }
    : { top: 'rgba(239,68,68,0.15)', bottom: 'rgba(239,68,68,0.0)' };

  if (fundChart) {
    fundChart.destroy();
    fundChart = null;
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, fillColor.top);
  gradient.addColorStop(1, fillColor.bottom);

  fundChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '市值',
          data: values,
          borderColor: profit >= 0 ? '#22C55E' : '#EF4444',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: profit >= 0 ? '#22C55E' : '#EF4444',
          pointHoverBorderColor: '#09090B',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
          order: 1,
        },
        {
          label: '成本线',
          data: costs,
          borderColor: 'rgba(255,255,255,0.18)',
          borderDash: [5, 4],
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0.4,
          order: 2,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(19,19,22,0.95)',
          titleColor: '#8A8A94',
          bodyColor: '#FAFAFA',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "'Fira Code', monospace", size: 11 },
          bodyFont: { family: "'Fira Code', monospace", size: 13, weight: '600' },
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => {
              if (item.datasetIndex === 0) return '市值  ' + fmt(item.raw);
              return '成本  ' + fmt(item.raw);
            },
          }
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 9, family: "'Fira Code', monospace" },
            maxTicksLimit: 6,
            maxRotation: 0,
            padding: 4,
          },
          border: { display: false },
        },
        y: {
          display: true,
          position: 'right',
          grid: {
            color: gridColor,
            drawBorder: false,
            lineWidth: 1,
          },
          ticks: {
            color: textColor,
            font: { size: 9, family: "'Fira Code', monospace" },
            maxTicksLimit: 4,
            padding: 8,
            callback: (v) => fmt(v),
          },
          border: { display: false },
          beginAtZero: false,
        },
      },
      layout: {
        padding: { top: 8, right: 8, bottom: 0, left: 0 },
      },
    },
    plugins: [{
      id: 'crosshairLine',
      afterDraw(chart) {
        if (!chart.tooltip?._active?.length) return;
        const { ctx, scales: { x, y }, chartArea: { top, bottom } } = chart;
        const xPos = x.getPixelForValue(chart.tooltip.dataPoints[0].dataIndex);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();
        ctx.restore();
      }
    }]
  });
}

function renderRecentTx() {
  const el = document.getElementById('recentTransactions');
  if (!el) return;
  const rx = [...data.transactions].reverse().slice(0, 8);
  if (!rx.length) {
    el.innerHTML = '<div style="color:var(--ink-muted);font-size:var(--text-xs);padding:16px 0;text-align:center">暂无记录</div>';
    return;
  }
  el.innerHTML = rx.map(t => {
    const cl = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : 'transfer';
    const sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '↔';
    const catIcon = CAT_ICONS[t.category] || '';
    const catName = t.category || (t.type === 'transfer' ? '转账' : '其他');
    const acctName = t.accountName || (data.assets.find(a => a.id === t.account)?.name || '');
    return `<div class="recent-tx-row" onclick="editTx(${t.id})">
      <span class="recent-tx-icon">${catIcon}</span>
      <div class="recent-tx-info">
        <div class="recent-tx-top">
          <span class="recent-tx-cat">${esc(catName)}</span>
          <span class="recent-tx-meta">${esc(t.date || '')}</span>
        </div>
        <div class="recent-tx-sub">${esc(acctName)}${t.note ? ' · ' + esc(t.note) : ''}</div>
      </div>
      <span class="recent-tx-amount ${cl}">${sign}${fmt(t.amount)}</span>
      <div class="recent-tx-actions">
        <button class="record-action-btn" onclick="event.stopPropagation();editTx(${t.id})" title="编辑">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="record-action-btn danger" onclick="event.stopPropagation();delTx(${t.id})" title="删除">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderCats() {
  const el = document.getElementById('categoryButtons');
  if (!el) return;
  const allCats = [...CATS.expense, ...CATS.income];
  el.innerHTML = allCats.map(cc =>
    `<button class="category-btn" onclick="qAdd('${esc(cc)}')">
      <span class="icon">${CAT_ICONS[cc] || ICONS[9]}</span>${esc(cc)}
    </button>`
  ).join('');

  const container = document.getElementById('categoryBudgetBars');
  if (!container) return;
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const me = {};
  data.transactions
    .filter(t => t.type === 'expense' && t.date && t.date.startsWith(ym))
    .forEach(t => { me[t.category] = (me[t.category] || 0) + t.amount; });
  container.innerHTML = BCATS.map(cat => {
    const b = data.categoryBudgets[cat] || 1000;
    const s = me[cat] || 0;
    const p = Math.min(100, s / b * 100);
    return `<div class="budget-bar">
      <div class="budget-bar-label">${esc(cat)}</div>
      <div class="budget-bar-track">
        <div class="budget-bar-fill" style="width:${p}%;background:${p > 90 ? 'var(--red)' : p > 70 ? 'var(--yellow)' : 'var(--cyan)'}"></div>
      </div>
      <div class="budget-bar-amount">${fmt(s)}/${fmt(b)}</div>
    </div>`;
  }).join('');
}

function renderAnalysis() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = analyticsService.monthlySummary(0);
  const exp = month.exp;
  const inc = month.inc;
  const bal = inc - exp;
  const budPct = data.budget ? (exp / data.budget * 100) : 0;

  const setAk = (id, v, cls) => { const e = document.getElementById(id); if (e) { e.textContent = v; e.className = 'ak-value ' + cls; } };
  setAk('akExpense', fmt(exp), '');
  setAk('akIncome', fmt(inc), 'income');
  setAk('akBalance', (bal >= 0 ? '+' : '') + fmt(bal), bal >= 0 ? 'positive' : 'negative');
  setAk('akBudget', budPct.toFixed(1) + '%', budPct > 90 ? 'warning' : budPct > 70 ? 'warning' : '');

  renderTrendChart();
  renderCategoryRanking();
  renderAutoInsight();
  renderMonthlyReport();
  populateYearSelector();
  renderYearlyAnalysis();
}

let yearlyChart = null;

function populateYearSelector() {
  const sel = document.getElementById('yearSelector');
  if (!sel) return;
  const years = new Set();
  data.transactions.forEach(t => { if (t.date && t.date.length >= 4) years.add(t.date.slice(0, 4)); });
  const now = new Date().getFullYear();
  years.add(String(now));
  years.add(String(now - 1));
  const sorted = [...years].sort((a, b) => b - a);
  const current = sel.value || String(now);
  sel.innerHTML = sorted.map(y => `<option value="${y}"${y === current ? ' selected' : ''}>${y}年</option>`).join('');
}

function renderYearlyAnalysis() {
  const canvas = document.getElementById('yearlyChart');
  const wrap = document.getElementById('yearlyChartWrap');
  const subtitle = document.getElementById('yearlyChartSubtitle');
  if (!canvas || !wrap) return;

  const year = parseInt(document.getElementById('yearSelector')?.value || new Date().getFullYear());
  if (subtitle) subtitle.textContent = year + '年';

  if (yearlyChart) { yearlyChart.destroy(); yearlyChart = null; }

  const months = [];
  const incData = [];
  const expData = [];
  let hasData = false;
  for (let m = 0; m < 12; m++) {
    const ym2 = `${year}-${String(m + 1).padStart(2, '0')}`;
    months.push(MONTHS[m]);
    const inc = data.transactions.filter(t => t.type === 'income' && t.date && t.date.startsWith(ym2)).reduce((s, t) => s + t.amount, 0);
    const exp = data.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(ym2)).reduce((s, t) => s + t.amount, 0);
    incData.push(inc);
    expData.push(exp);
    if (inc > 0 || exp > 0) hasData = true;
  }

  if (!hasData) {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-muted);font-size:var(--text-xs)">该年度暂无数据</div>';
    return;
  }
  if (!wrap.querySelector('canvas')) {
    wrap.innerHTML = '<canvas id="yearlyChart"></canvas>';
  }

  yearlyChart = new Chart(document.getElementById('yearlyChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: '收入', data: incData, backgroundColor: incData.map(v => v > 0 ? 'rgba(0,245,212,0.5)' : 'transparent'), hoverBackgroundColor: 'rgba(0,245,212,0.7)', borderRadius: 4, borderSkipped: false },
        { label: '支出', data: expData, backgroundColor: expData.map(v => v > 0 ? 'rgba(255,107,107,0.5)' : 'transparent'), hoverBackgroundColor: 'rgba(255,107,107,0.7)', borderRadius: 4, borderSkipped: false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#888', font: { size: 9 }, usePointStyle: true, padding: 10 } },
        tooltip: {
          backgroundColor: 'rgba(19,19,22,0.95)', titleColor: '#8A8A94', bodyColor: '#FAFAFA',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, cornerRadius: 8, padding: 10,
          titleFont: { family: "'Fira Code', monospace", size: 11 },
          bodyFont: { family: "'Fira Code', monospace", size: 12 },
          displayColors: true, boxPadding: 4,
        }
      },
      scales: {
        x: { ticks: { color: '#888', font: { size: 8 } }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: '#888', callback: v => '¥' + v, font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false }, beginAtZero: true }
      }
    }
  });
}

function renderMonthlyReport() {
  const el = document.getElementById('monthlyReportContent');
  const title = document.getElementById('monthlyReportTitle');
  if (!el) return;
  const now = new Date();
  const ym = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  if (title) title.textContent = ym + ' 月度报告';
  const exp = mStats(0).exp;
  const inc = mStats(0).inc;
  const bal = inc - exp;
  const saveRate = inc > 0 ? (bal / inc * 100) : 0;
  const budPct = data.budget > 0 ? (exp / data.budget * 100) : 0;
  const ce = {};
  data.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`))
    .forEach(t => { ce[t.category] = (ce[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(ce).sort((a, b) => b[1] - a[1]);

  const pv = mStats(-1);
  const expChange = pv.exp > 0 ? ((exp - pv.exp) / pv.exp * 100) : 0;

  let html = '<div class="mr-summary-bar">';
  html += `<div class="mr-kpi"><span class="mr-kpi-label">收入</span><span class="mr-kpi-value income">${fmt(inc)}</span></div>`;
  html += `<div class="mr-kpi"><span class="mr-kpi-label">支出</span><span class="mr-kpi-value expense">${fmt(exp)}</span></div>`;
  html += `<div class="mr-kpi"><span class="mr-kpi-label">结余</span><span class="mr-kpi-value ${bal >= 0 ? 'income' : 'expense'}">${fmt(bal)}</span></div>`;
  html += `<div class="mr-kpi"><span class="mr-kpi-label">储蓄率</span><span class="mr-kpi-value ${saveRate >= 10 ? 'income' : 'expense'}">${saveRate.toFixed(1)}%</span></div>`;
  html += `<div class="mr-kpi"><span class="mr-kpi-label">预算</span><span class="mr-kpi-value ${budPct > 100 ? 'expense' : budPct > 80 ? 'warn' : 'income'}">${budPct.toFixed(0)}%</span></div>`;
  html += `<div class="mr-kpi"><span class="mr-kpi-label">环比支出</span><span class="mr-kpi-value ${expChange <= 0 ? 'income' : 'expense'}">${expChange > 0 ? '+' : ''}${expChange.toFixed(1)}%</span></div>`;
  html += '</div>';

  if (sortedCats.length > 0) {
    html += '<div class="mr-section"><div class="mr-section-title">支出分类 Top5</div>';
    html += sortedCats.slice(0, 5).map(([cat, amt], i) => {
      const pct = exp > 0 ? (amt / exp * 100) : 0;
      const barColor = ['var(--accent)', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][i];
      const icon = CAT_ICONS[cat] || '';
      return `<div class="mr-cat-row">
        <span class="mr-cat-rank">${i + 1}</span>
        <span class="mr-cat-icon">${icon}</span>
        <span class="mr-cat-name">${esc(cat)}</span>
        <div class="mr-cat-bar-track"><div class="mr-cat-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
        <span class="mr-cat-amount">${fmt(amt)}</span>
        <span class="mr-cat-pct">${pct.toFixed(1)}%</span>
      </div>`;
    }).join('');
    html += '</div>';
  }

  html += '<div class="mr-section"><div class="mr-section-title">财务摘要</div>';
  html += '<div class="mr-summary-text">';
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  html += `<div>📅 本月共 ${daysInMonth} 天，记录 ${data.transactions.filter(t => t.date && t.date.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)).length} 笔交易</div>`;
  html += `<div>🏷️ 日均支出 ${fmt(daysInMonth > 0 ? exp / daysInMonth : 0)}</div>`;
  const numCats = sortedCats.length;
  html += `<div>📊 涉及 ${numCats} 个支出类别，${sortedCats.length > 0 ? sortedCats[0][0] + '占比最高（' + (exp > 0 ? (sortedCats[0][1] / exp * 100).toFixed(0) : 0) + '%）' : '暂无数据'}</div>`;
  html += '</div></div>';

  el.innerHTML = html;
}

function generateMonthReportMd() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const exp = mStats(0).exp;
  const inc = mStats(0).inc;
  const bal = inc - exp;
  const saveRate = inc > 0 ? (bal / inc * 100) : 0;
  const budPct = data.budget > 0 ? (exp / data.budget * 100) : 0;
  const ce = {};
  data.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(ym))
    .forEach(t => { ce[t.category] = (ce[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(ce).sort((a, b) => b[1] - a[1]);
  const pv = mStats(-1);
  const expChange = pv.exp > 0 ? ((exp - pv.exp) / pv.exp * 100) : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const txCount = data.transactions.filter(t => t.date && t.date.startsWith(ym)).length;

  let md = `# 小财迷 · ${now.getFullYear()}年${now.getMonth() + 1}月财务报告\n\n`;
  md += `> 生成时间：${now.toISOString().split('T')[0]}\n\n`;
  md += `## 📊 月度概览\n\n`;
  md += `| 指标 | 金额 |\n|------|------|\n`;
  md += `| 收入 | ${fmt(inc)} |\n| 支出 | ${fmt(exp)} |\n| 结余 | ${fmt(bal)} |\n`;
  md += `| 储蓄率 | ${saveRate.toFixed(1)}% |\n`;
  md += `| 预算使用率 | ${budPct.toFixed(0)}% |\n`;
  md += `| 环比支出变化 | ${expChange > 0 ? '+' : ''}${expChange.toFixed(1)}% |\n`;
  md += `| 日均支出 | ${fmt(daysInMonth > 0 ? exp / daysInMonth : 0)} |\n`;
  md += `| 交易笔数 | ${txCount} |\n\n`;

  if (sortedCats.length > 0) {
    md += `## 🏷️ 支出分类 Top5\n\n`;
    md += `| 排名 | 类别 | 金额 | 占比 |\n|------|------|------|------|\n`;
    sortedCats.slice(0, 5).forEach(([cat, amt], i) => {
      const pct = exp > 0 ? (amt / exp * 100) : 0;
      md += `| ${i + 1} | ${cat} | ${fmt(amt)} | ${pct.toFixed(1)}% |\n`;
    });
    md += '\n';
  }

  md += `## 💡 洞察\n\n`;
  if (saveRate >= 20) md += `- ✅ 储蓄率 ${saveRate.toFixed(0)}%，财务非常健康\n`;
  else if (saveRate >= 10) md += `- 👍 储蓄率 ${saveRate.toFixed(0)}%，继续保持\n`;
  else md += `- ⚠️ 储蓄率 ${saveRate.toFixed(0)}%，建议控制支出\n`;

  if (budPct > 100) md += `- 🔴 预算超支 ${(budPct - 100).toFixed(0)}%\n`;
  else if (budPct > 80) md += `- 🟡 预算已使用 ${budPct.toFixed(0)}%，注意控制\n`;
  else md += `- 🟢 预算控制良好（${budPct.toFixed(0)}%）\n`;

  if (sortedCats.length > 0) {
    md += `- 最大支出类别：${sortedCats[0][0]}（${fmt(sortedCats[0][1])}）\n`;
  }

  return md;
}

function exportMonthReportMd() {
  const md = generateMonthReportMd();
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const now = new Date();
  a.download = `小财迷_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}_月度报告.md`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Markdown 报告已导出', 'success');
}

function exportMonthReportCsv() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tx = data.transactions.filter(t => t.date && t.date.startsWith(ym))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const rows = [['日期','类型','分类','子类','金额','账户','备注','标签']];
  tx.forEach(t => {
    rows.push([
      t.date,
      t.type === 'income' ? '收入' : t.type === 'expense' ? '支出' : '转账',
      t.category || '',
      t.subCategory || '',
      t.amount.toFixed(2),
      t.accountName || t.account || '',
      t.note || '',
      (t.tags || []).join('; ')
    ]);
  });
  const BOM = '\uFEFF';
  const csv = BOM + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `小财迷_${ym}_记录.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('CSV 已导出', 'success');
}

function renderAutoInsight() {
  const el = document.getElementById('autoInsightContent');
  if (!el) return;

  const insights = generateAutoInsight();

  if (!insights || insights.length === 0) {
    el.innerHTML = '<div class="auto-insight-empty">本月数据较少，暂无可分析的洞察</div>';
    return;
  }

  el.innerHTML = insights.map(item => {
    const icon = item.type === 'good' ? '📈'
               : item.type === 'bad' ? '📉'
               : item.type === 'warn' ? '⚠️'
               : '💡';
    return `<div class="auto-insight-item ${item.type || 'info'}">
      <span class="auto-insight-icon">${icon}</span>
      <span class="auto-insight-text">${esc(item.text)}</span>
    </div>`;
  }).join('');
}

function generateAutoInsight() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mt = data.transactions.filter(t => t.date && t.date.startsWith(ym));
  const exp = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const inc = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const bal = inc - exp;
  const saveRate = inc > 0 ? (bal / inc * 100) : 0;

  if (mt.length === 0) return [];

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const pt = data.transactions.filter(t => t.date && t.date.startsWith(pym));
  const pExp = pt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const pInc = pt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const ce = {};
  mt.filter(t => t.type === 'expense').forEach(t => {
    ce[t.category] = (ce[t.category] || 0) + t.amount;
  });
  const sortedCats = Object.entries(ce).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCats.length ? sortedCats[0] : null;

  const pCe = {};
  pt.filter(t => t.type === 'expense').forEach(t => {
    pCe[t.category] = (pCe[t.category] || 0) + t.amount;
  });

  const insights = [];

  if (inc > 0) {
    insights.push({
      type: saveRate >= 20 ? 'good' : saveRate >= 10 ? 'info' : 'warn',
      text: `储蓄率 ${saveRate.toFixed(0)}%（收入 ${fmt(inc)}，支出 ${fmt(exp)}，结余 ${fmt(bal)}）${saveRate >= 20 ? '，非常健康 💪' : saveRate >= 10 ? '，继续保持' : '，建议适当控制支出'}`
    });
  }

  if (pExp > 0) {
    const expChange = (exp - pExp) / pExp * 100;
    if (Math.abs(expChange) > 2) {
      insights.push({
        type: expChange <= 0 ? 'good' : 'bad',
        text: `支出环比上月${expChange > 0 ? '上涨' : '下降'} ${Math.abs(expChange).toFixed(1)}%${expChange > 0 ? '（¥' + fmt(exp - pExp) + '），建议关注消费明细' : '（¥' + fmt(pExp - exp) + '），继续坚持'}`,
      });
    }
  }

  if (pInc > 0) {
    const incChange = (inc - pInc) / pInc * 100;
    if (Math.abs(incChange) > 5) {
      insights.push({
        type: incChange > 0 ? 'good' : 'bad',
        text: `收入环比上月${incChange > 0 ? '增长' : '减少'} ${Math.abs(incChange).toFixed(1)}%`,
      });
    }
  }

  if (topCat && exp > 0) {
    const catPct = topCat[1] / exp * 100;
    const pTopVal = pCe[topCat[0]] || 0;
    if (pTopVal > 0) {
      const catChange = (topCat[1] - pTopVal) / pTopVal * 100;
      insights.push({
        type: catChange > 20 ? 'warn' : catChange < -20 ? 'good' : 'info',
        text: `「${topCat[0]}」支出 ${fmt(topCat[1])}（占比 ${catPct.toFixed(0)}%），环比${catChange > 0 ? '增加' : '减少'} ${Math.abs(catChange).toFixed(0)}%`,
      });
    } else {
      insights.push({
        type: 'info',
        text: `「${topCat[0]}」支出 ${fmt(topCat[1])}，为本月最大支出类别`,
      });
    }
  }

  if (data.budget > 0) {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const budPct = exp / data.budget * 100;
    if (budPct > 100) {
      insights.push({
        type: 'bad',
        text: `预算已超支 ${(budPct - 100).toFixed(0)}%（超支 ${fmt(exp - data.budget)}）`,
      });
    } else if (budPct > 80) {
      const daysLeft = daysInMonth - now.getDate();
      const dailyAvail = (data.budget - exp) / Math.max(1, daysLeft);
      insights.push({
        type: 'warn',
        text: `预算已使用 ${budPct.toFixed(0)}%，剩余 ${fmt(data.budget - exp)}（日均可用 ${fmt(dailyAvail)}）`,
      });
    } else if (budPct < 40 && now.getDate() > daysInMonth * 0.6) {
      insights.push({
        type: 'good',
        text: `预算控制出色！仅使用 ${budPct.toFixed(0)}%，结余 ${fmt(data.budget - exp)}`,
      });
    }
  }

  if (sortedCats.length >= 2) {
    const numCats = sortedCats.length;
    insights.push({
      type: 'info',
      text: `本月共涉及 ${numCats} 个支出类别${topCat ? '，' + topCat[0] + '占比最高' : ''}`,
    });
  }

  return insights.slice(0, 4);
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  const wrap = document.getElementById('trendChartWrap');
  if (!canvas || !wrap) return;

  const now = new Date();
  const labels = [], ed = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(MONTHS[d.getMonth()]);
    ed.push(data.transactions.filter(t => t.date && t.date.startsWith(ym2) && t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }

  if (ed.every(v => v === 0)) {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-muted);font-size:var(--text-xs)">暂无支出数据</div>';
    return;
  }
  // Ensure canvas exists (recreate if was replaced by empty message)
  if (!wrap.querySelector('canvas')) {
    wrap.innerHTML = '<canvas id="trendChart"></canvas>';
  }
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const gridColor = 'rgba(255,255,255,0.04)';
  const textColor = 'rgba(255,255,255,0.25)';

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: ed,
        backgroundColor: ed.map(v => v > 0 ? 'rgba(99,102,241,0.35)' : 'transparent'),
        hoverBackgroundColor: 'rgba(99,102,241,0.55)',
        borderRadius: 4,
        borderSkipped: false,
        borderWidth: 0,
        maxBarThickness: 48,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(19,19,22,0.95)',
          titleColor: '#8A8A94',
          bodyColor: '#FAFAFA',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "'Fira Code', monospace", size: 11 },
          bodyFont: { family: "'Fira Code', monospace", size: 13, weight: '600' },
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => '支出  ' + fmt(item.raw),
          }
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 10, family: "'Fira Code', monospace" }, padding: 6 },
          border: { display: false },
        },
        y: {
          position: 'right',
          grid: { color: gridColor, drawBorder: false, lineWidth: 1 },
          ticks: {
            color: textColor, font: { size: 9, family: "'Fira Code', monospace" },
            maxTicksLimit: 4, padding: 8,
            callback: (v) => fmt(v),
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
      layout: { padding: { top: 4, right: 8, bottom: 0, left: 0 } },
    },
    plugins: [{
      id: 'crosshairBar',
      afterDraw(chart) {
        if (!chart.tooltip?._active?.length) return;
        const { ctx, scales: { x, y }, chartArea: { top, bottom } } = chart;
        const xPos = x.getPixelForValue(chart.tooltip.dataPoints[0].dataIndex);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();
        ctx.restore();
      }
    }]
  });
}

function renderCategoryRanking() {
  const el = document.getElementById('catRanking');
  if (!el) return;

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cm = {};
  data.transactions
    .filter(t => t.type === 'expense' && t.date && t.date.startsWith(ym))
    .forEach(t => { cm[t.category] = (cm[t.category] || 0) + t.amount; });

  const entries = Object.entries(cm).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!entries.length) {
    el.innerHTML = '<div class="cat-rank-empty">本月暂无支出记录</div>';
    return;
  }

  // Refined low-saturation palette — no rainbow
  const palette = [
    'rgba(99,102,241,0.7)',   // indigo
    'rgba(139,92,246,0.6)',   // violet
    'rgba(59,130,246,0.6)',   // blue
    'rgba(16,185,129,0.6)',   // emerald
    'rgba(245,158,11,0.6)',   // amber
    'rgba(239,68,68,0.6)',    // red
    'rgba(99,102,241,0.45)',  // indigo light
    'rgba(139,92,246,0.4)',   // violet light
  ];

  el.innerHTML = entries.map(([cat, amount], i) => {
    const pct = total ? amount / total * 100 : 0;
    const color = palette[i % palette.length];
    const icon = CAT_ICONS[cat] || '';
    return `<div class="cat-rank-row">
      <div class="cat-rank-icon">${icon}</div>
      <div class="cat-rank-info">
        <div class="cat-rank-name">${esc(cat)}</div>
        <div class="cat-rank-bar-track">
          <div class="cat-rank-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
      <div class="cat-rank-amount">${fmt(amount)}</div>
      <div class="cat-rank-pct">${pct.toFixed(1)}%</div>
    </div>`;
  }).join('');
}

function renderRecords() {
  const kw = document.getElementById('searchKeyword')?.value || '';
  const tp = document.getElementById('filterType')?.value || '';
  const ac = document.getElementById('filterAccount')?.value || '';
  const st = document.getElementById('filterStart')?.value || '';
  const en = document.getElementById('filterEnd')?.value || '';
  const tg = document.getElementById('filterTag')?.value || '';

  let f = data.transactions.filter(t => {
    if (tp && t.type !== tp) return false;
    if (ac && t.account !== ac) return false;
    if (st && t.date < st) return false;
    if (en && t.date > en) return false;
    if (tg && !(t.tags || []).includes(tg)) return false;
    if (kw && !(t.note || '').includes(kw) && !(t.category || '').includes(kw)) return false;
    return true;
  });
  f = f.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tp2 = Math.max(1, Math.ceil(f.length / PP));
  if (page > tp2) page = tp2;
  const pg = f.slice((page - 1) * PP, page * PP);

  const el = document.getElementById('recordList');
  if (!el) return;
  if (!pg.length) {
    el.innerHTML = '<div class="record-row" style="justify-content:center;color:var(--ink-muted);height:64px;cursor:default">无匹配记录</div>';
  } else {
    el.innerHTML = pg.map(t => {
      const cl = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : 'transfer';
      const sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '↔';
      const catIcon = CAT_ICONS[t.category] || '';
      const catName = t.category || (t.type === 'transfer' ? '转账' : '其他');
      const acctName = t.accountName || (data.assets.find(a => a.id === t.account)?.name || t.account || '—');
      return `<div class="record-row" onclick="editTx(${t.id})">
        <div class="record-col record-col-cat">
          <span class="record-cat-icon">${catIcon}</span>
          <span class="record-cat-name">${esc(catName)}</span>
        </div>
        <div class="record-col record-col-date">${esc(t.date || '')}</div>
        <div class="record-col record-col-account">${esc(acctName)}</div>
        <div class="record-col record-col-note">${esc(t.note || '—')}</div>
        <div class="record-col record-col-amount ${cl}">${sign}${fmt(t.amount)}</div>
        <div class="record-col record-col-actions">
          <button class="record-action-btn" onclick="event.stopPropagation();editTx(${t.id})" title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="record-action-btn danger" onclick="event.stopPropagation();delTx(${t.id})" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');
  }

  const pe = document.getElementById('recordPagination');
  if (pe) {
    pe.innerHTML = tp2 <= 1 ? '' :
      `<button class="quick-btn secondary" onclick="page=1;renderRecords()">«</button>
       <button class="quick-btn secondary" onclick="page=Math.max(1,page-1);renderRecords()">‹</button>
       <span style="font-size:11px;color:var(--text2);padding:6px 8px;">${page}/${tp2}</span>
       <button class="quick-btn secondary" onclick="page=Math.min(${tp2},page+1);renderRecords()">›</button>
       <button class="quick-btn secondary" onclick="page=${tp2};renderRecords()">»</button>`;
  }
}

function populateFilters() {
  const s = document.getElementById('filterAccount');
  if (s) {
    const seen = new Set();
    s.innerHTML = '<option value="">全账户</option>' +
      data.transactions
        .filter(t => { if (seen.has(t.account)) return false; seen.add(t.account); return true; })
        .map(t => {
          const a = data.assets.find(aa => aa.id === t.account);
          return `<option value="${esc(t.account)}">${a ? esc(a.name) : esc(t.account)}</option>`;
        }).join('');
  }
  // 账户筛选 chips
  const ag = document.getElementById('filterAccountGroup');
  if (ag) {
    const opts = [...s.options].slice(1);
    ag.innerHTML = `<button class="filter-chip active" data-filter="account" data-value="" onclick="toggleFilterChip(this,'filterAccount')">全账户</button>` +
      opts.map(o => `<button class="filter-chip" data-filter="account" data-value="${esc(o.value)}" onclick="toggleFilterChip(this,'filterAccount')">${esc(o.textContent)}</button>`).join('');
  }

  // 标签筛选 chips
  const ts = document.getElementById('filterTag');
  if (ts) {
    const allTags = new Set();
    data.transactions.forEach(t => (t.tags || []).forEach(tag => allTags.add(tag)));
    ts.innerHTML = '<option value="">全标签</option>' +
      [...allTags].sort().map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('');

    const tg = document.getElementById('filterTagGroup');
    if (tg) {
      const opts = [...ts.options].slice(1);
      tg.innerHTML = `<button class="filter-chip active" data-filter="tag" data-value="" onclick="toggleFilterChip(this,'filterTag')">全标签</button>` +
        opts.map(o => `<button class="filter-chip" data-filter="tag" data-value="${esc(o.value)}" onclick="toggleFilterChip(this,'filterTag')">${esc(o.textContent)}</button>`).join('');
    }
  }
}

// ─── 筛选器交互 ────────────────────────────────────

function toggleFilterChip(btn, selectId) {
  const group = btn.parentElement;
  // 取消同组其他 chip 的 active
  group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  // 同步隐藏的 select
  const sel = document.getElementById(selectId);
  if (sel) sel.value = btn.dataset.value || '';
  renderRecords();
}

function syncDateFilter() {
  // 空函数，由 onchange 触发 renderRecords
}

// ─── 导航 ──────────────────────────────────────────

function safePageRun(name, fn) {
  try {
    if (typeof fn === 'function') fn();
  } catch (e) {
    console.error(`[page] ${name} failed:`, e);
    if (typeof showToast === 'function') showToast(`${name} 加载失败`, 'error');
  }
}

function getPageModule(pg) {
  const modules = {
    analysis: { title: '数据分析', render: renderAnalysis },
    records: { title: '交易记录', render: () => { populateFilters(); page = 1; renderRecords(); } },
    meals: { title: '餐食计划', render: () => { renderRecipes(); renderMealPlan(); } },
    birthdays: { title: '生日', render: renderBirthdays },
    documents: { title: '文档', render: renderDocuments },
    contacts: { title: '联系人', render: renderContacts },
    notes: { title: '便签', render: renderNotes },
    shopping: { title: '购物清单', render: renderShopping },
    tasks: { title: '任务管理', render: renderTaskBoard },
    reminders: { title: '提醒', render: renderReminderPage },
    calendar: {
      title: '日历',
      render: () => {
        const now = new Date();
        renderCalendar(now.getFullYear(), now.getMonth());
      },
    },
    settings: {
      title: '设置',
      render: () => {
        document.getElementById('settingBudget').value = data.budget;
        document.getElementById('settingVault').value = data.settings?.obsidianVault || 'finance-vault';
        document.getElementById('settingTags').value   = data.settings?.obsidianTags   || 'yaml';
        const at = document.getElementById('settingAlertThreshold');
        if (at) at.value = data.settings?.alertThreshold || 500;
        const ae = document.getElementById('settingAiEndpoint');
        if (ae) ae.value = data.settings?.financeAiEndpoint || '';
        const am = document.getElementById('settingAiModel');
        if (am) am.value = data.settings?.financeAiModel || '';
        const ak = document.getElementById('settingAiKey');
        if (ak) ak.value = data.settings?.financeAiKey || storageService.get('v1:aiKey') || '';
        const su = document.getElementById('settingSyncUrl');
        if (su) su.value = data.settings?.syncServerUrl || '';
        const st = document.getElementById('settingSyncToken');
        if (st) st.value = data.settings?.syncToken || '';
        const rc = document.getElementById('recRuleCat');
        if (rc) rc.innerHTML = [...CATS.expense, ...CATS.income].map(c => `<option value="${c}">${c}</option>`).join('');
        const ra = document.getElementById('recRuleAccount');
        if (ra) ra.innerHTML = data.assets.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
        renderRecurringList();
        renderLoansList();
        renderNavModuleSettings();
        const ls = document.getElementById('settingLocale');
        if (ls) ls.value = getLocale();
      },
    },
    trash: {
      title: '回收站',
      render: () => { safePageRun('renderTrash', renderTrash); },
    },
  };
  return modules[pg] || null;
}

function renderPageSideEffects(pg) {
  if (!data) return;
  const module = getPageModule(pg);
  if (module) safePageRun(module.title, module.render);
}

function switchPage(pg) {
  if (typeof navigatePage === 'function') navigatePage(pg);
  else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pg)?.classList.add('active');
  }
  renderPageSideEffects(pg);
}

function renderMonthlyTrend() {
  const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
  if (!ctx) return;
  if (window._monthlyTrend) window._monthlyTrend.destroy();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const labels = months.map(m => m.split('-')[1] + '月');
  const incData = months.map(ym => data.transactions.filter(t => t.type==='income'&&t.date?.startsWith(ym)).reduce((s,t)=>s+t.amount,0));
  const expData = months.map(ym => data.transactions.filter(t => t.type==='expense'&&t.date?.startsWith(ym)).reduce((s,t)=>s+t.amount,0));
  window._monthlyTrend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:'收入',
          data:incData,
          backgroundColor: incData.map(v => v > 0 ? 'rgba(0,245,212,0.55)' : 'transparent'),
          hoverBackgroundColor: 'rgba(0,245,212,0.75)',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label:'支出',
          data:expData,
          backgroundColor: expData.map(v => v > 0 ? 'rgba(255,107,107,0.55)' : 'transparent'),
          hoverBackgroundColor: 'rgba(255,107,107,0.75)',
          borderRadius: 4,
          borderSkipped: false,
        },
      ]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins:{
        legend:{
          labels:{ color:'#888', font:{size:10}, usePointStyle:true, padding:12 }
        },
        tooltip: {
          backgroundColor: 'rgba(19,19,22,0.95)',
          titleColor: '#8A8A94',
          bodyColor: '#FAFAFA',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          titleFont: { family: "'Fira Code', monospace", size: 11 },
          bodyFont: { family: "'Fira Code', monospace", size: 12 },
          displayColors: true,
          boxPadding: 4,
        }
      },
      scales:{
        x:{
          ticks:{ color:'#888',font:{size:9} },
          grid:{display:false},
          border:{display:false}
        },
        y:{
          ticks:{ color:'#888',callback:v=>'¥'+v,font:{size:9} },
          grid:{color:'rgba(255,255,255,0.04)'},
          border:{display:false},
          beginAtZero: true
        }
      }
    }
  });
}

/** 快捷获取 element by id */
function el(id) { return document.getElementById(id); }
