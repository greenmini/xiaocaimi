/**
 * 入口文件
 * 小财迷 · Init
 */

window.onerror = (msg, url, line) => { console.error('未捕获错误:', msg, line); };
window.addEventListener('unhandledrejection', e => { console.error('未捕获Promise:', e.reason); });

function bootStep(name, fn) {
  try {
    return fn();
  } catch (e) {
    console.error(`[init] ${name} failed:`, e);
    return null;
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Chart.js 全局配置
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#B0B0B8';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.04)';
    Chart.defaults.font.family = "'Fira Code','JetBrains Mono',monospace";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(19,19,22,0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#FAFAFA';
    Chart.defaults.plugins.tooltip.bodyColor = '#B0B0B8';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.legend.labels.color = '#A1A1AA';
  }

  // 主题切换
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // 打开 IndexedDB
  try { await withTimeout(financeDB.open(), 1500, 'IndexedDB open'); } catch (e) { console.warn('IndexedDB 不可用:', e.message); }

  // 加载数据
  try { await withTimeout(loadData(), 2500, 'loadData'); } catch (e) {
    console.error('[init] 数据加载失败，使用默认数据:', e);
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  // 初始化主题
  bootStep('initTheme', initTheme);

  // 初始化语言
  bootStep('initLocale', () => {
    const saved = localStorage.getItem('financeLocale');
    if (saved && LOCALES[saved]) _locale = saved;
    updateLangBtn();
    applyLocale(getLocale());
  });

  // 周期性交易
  bootStep('processRecurring', processRecurring);

  // Enter 提交弹窗 + Esc 关闭
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const m = document.querySelector('.modal-overlay.show');
      if (m) {
        const b = m.querySelector('button.quick-btn.primary');
        if (b) b.click();
      }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.show, #confirmModal.show').forEach(el => {
        const closeBtn = el.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
        const cancelBtn = el.querySelector('.confirm-cancel');
        if (cancelBtn) cancelBtn.click();
        el.classList.remove('show');
      });
    }
  });

  // 首次渲染
  bootStep('render', render);

  // OTA 更新检查
  bootStep('otaUpdateCheck', initOtaUpdateCheck);

  // 恢复侧边栏模块可见性
  bootStep('applyNavVisibility', applyNavModuleVisibility);
});

// ─── OTA 更新检查 ──────────────────────────────────

function initOtaUpdateCheck() {
  checkForUpdates();
  setInterval(checkForUpdates, 3600000);
}

async function checkForUpdates() {
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (!res.ok) return;
    const server = await res.json();
    if (server.version !== VERSION) {
      showUpdateBanner(server.version);
    }
  } catch (e) {
    console.log('[OTA] 版本检查跳过（开发模式或无网络）');
  }
}

function showUpdateBanner(newVersion) {
  const existing = document.getElementById('otaUpdateBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'otaUpdateBanner';
  banner.className = 'ota-update-banner';
  banner.innerHTML =
    '<div class="ota-update-content">' +
      '<span>🔄 新版本 <strong>' + esc(newVersion) + '</strong> 可用</span>' +
      '<div class="ota-update-actions">' +
        '<button class="ota-update-btn" onclick="applyUpdate()">立即更新</button>' +
        '<button class="ota-update-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(banner);
}

async function applyUpdate() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  caches.keys().then(keys => {
    keys.filter(k => k.startsWith('xiaocaimi')).forEach(k => caches.delete(k));
  }).then(() => {
    window.location.reload();
  });
}
