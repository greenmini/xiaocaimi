import { createRouter } from './core/router.js';
import { getState, loadState, subscribe } from './core/store.js';
import { html } from './core/dom.js';
import { t, toggleLocale } from './core/i18n.js';
import { bindFinanceActions, renderAccounts, renderAnalysis, renderDashboard, renderRecords } from './modules/finance.js';
import { bindChoreActions, renderChores } from './modules/chores.js';
import { bindGenericActions, genericModules, renderGeneric } from './modules/generic.js';
import { bindPeopleActions, renderBirthdays, renderContacts } from './modules/people.js';
import { bindReminderActions, renderReminders, startReminderRuntime } from './modules/reminders.js';
import { bindSettingsActions, bindSettingsFileImport, renderSettings } from './modules/settings.js';

function buildRouteGroups() {
  return [
    {
      title: t('groupCore'),
      routes: {
        dashboard: { title: t('routeDashboard'), subtitle: t('routeDashboardSubtitle'), render: renderDashboard },
        records: { title: t('routeRecords'), subtitle: t('routeRecordsSubtitle'), render: renderRecords },
        accounts: { title: t('routeAccounts'), subtitle: t('routeAccountsSubtitle'), render: renderAccounts },
        analysis: { title: t('routeAnalysis'), subtitle: t('routeAnalysisSubtitle'), render: renderAnalysis },
      },
    },
    {
      title: t('groupLife'),
      routes: Object.fromEntries(['calendar', 'tasks', 'reminders', 'chores', 'shopping', 'meals'].map(id => [
        id,
        lifeRoute(id),
      ])),
    },
    {
      title: t('groupLibrary'),
      routes: Object.fromEntries(['notes', 'contacts', 'birthdays'].map(id => [
        id,
        libraryRoute(id),
      ])),
    },
    {
      title: t('groupSystem'),
      routes: {
        settings: { title: t('routeSettings'), subtitle: t('routeSettingsSubtitle'), render: renderSettings },
      },
    },
  ];
}

function buildRoutes() {
  return Object.assign({}, ...buildRouteGroups().map(group => group.routes));
}

let currentRoute = null;
let router = null;

function icon(id) {
  const map = {
    dashboard: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/>',
    records: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    accounts: '<rect width="18" height="14" x="3" y="5" rx="2"/><path d="M3 10h18"/><path d="M7 15h2"/>',
    analysis: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    tasks: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    reminders: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    chores: '<path d="M4 21h16"/><path d="M6 21V9l6-5 6 5v12"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01"/><path d="M15 11h.01"/>',
    shopping: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    meals: '<path d="M3 2v7a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2Z"/>',
    notes: '<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    contacts: '<path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M2 21v-2a4 4 0 0 1 3-3.87"/>',
    birthdays: '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 2.25-3.6L12 7Z"/><path d="M12 7h4.5a2.5 2.5 0 1 0-2.25-3.6L12 7Z"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.1a2 2 0 1 1-3.92 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.1-.04a2 2 0 1 1 0-3.92L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.1a2 2 0 1 1 3.92 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.1.35.3.69.6 1l.1.04a2 2 0 1 1 0 3.92L20 14c-.3.31-.5.65-.6 1Z"/>',
  };
  return html`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${map[id] || map.dashboard}</svg>`;
}

function lifeRoute(id) {
  if (id === 'reminders') return { title: genericModules[id].title(), subtitle: `${genericModules[id].singular()} ${t('manageSuffix')}`, render: renderReminders };
  if (id === 'chores') return { title: t('chores'), subtitle: t('choresSubtitle'), render: renderChores };
  return { title: genericModules[id].title(), subtitle: `${genericModules[id].singular()} ${t('manageSuffix')}`, render: () => renderGeneric(id) };
}

function libraryRoute(id) {
  if (id === 'contacts') return { title: t('contacts'), subtitle: t('contactBirthdayHint'), render: renderContacts };
  if (id === 'birthdays') return { title: t('birthdays'), subtitle: t('birthdayLinkHint'), render: renderBirthdays };
  return { title: genericModules[id].title(), subtitle: `${genericModules[id].singular()} ${t('manageSuffix')}`, render: () => renderGeneric(id) };
}

function renderShell() {
  const routeGroups = buildRouteGroups();
  const routes = buildRoutes();
  const route = routes[currentRoute] || routes.dashboard;
  document.title = `${t('appName')} ${t('appSubtitle')}`;
  document.getElementById('app').innerHTML = html`
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7 6h10"/><path d="M7 11h10"/><path d="M12 3v18"/><path d="M8 15c1 2 3 3 6 3"/></svg>
        </div>
        <div class="brand-copy"><h1>${t('appName')}</h1><small>${t('appSubtitle')}</small></div>
      </div>
      <div class="nav-scroll">
        ${routeGroups.slice(0, -1).map(group => html`
          <div class="nav-group">
            <div class="nav-title">${group.title}</div>
            ${Object.entries(group.routes).map(([id, item]) => navItem(id, item)).join('')}
          </div>
        `).join('')}
      </div>
      <div class="nav-footer">
        ${routeGroups.slice(-1).map(group => html`
          <div class="nav-group">
            <div class="nav-title">${group.title}</div>
            ${Object.entries(group.routes).map(([id, item]) => navItem(id, item)).join('')}
          </div>
        `).join('')}
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <h2>${route.title}</h2>
          <p>${route.subtitle || ''}</p>
        </div>
        <div class="actions">
          <button class="lang-switch" data-action="toggle-locale" title="${t('switchLanguage')}" aria-label="${t('switchLanguage')}">
            <span>${t('languageToggleLabel')}</span>
          </button>
          <button data-route="records">${t('quickRecord')}</button>
          <button data-route="settings">${t('backup')}</button>
        </div>
      </header>
      <div id="view">${route.render(getState())}</div>
    </main>
    <div id="toast" class="toast"></div>
  `;
}

function navItem(id, item) {
  return html`
    <button class="nav-item ${id === currentRoute ? 'active' : ''}" data-route="${id}">
      ${icon(id)}
      <span class="nav-label">${item.title}</span>
    </button>
  `;
}

function rerender() {
  currentRoute = router.current();
  renderShell();
}

function toast(message) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  setTimeout(() => node.classList.remove('show'), 1800);
}

function bindEvents() {
  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      router.go(routeButton.dataset.route);
      return;
    }
    const localeButton = event.target.closest('[data-action="toggle-locale"]');
    if (localeButton) {
      toggleLocale();
      toast(t('switchLanguage'));
      return;
    }
    if (bindFinanceActions(event) || bindChoreActions(event) || bindReminderActions(event) || bindPeopleActions(event) || bindGenericActions(event) || bindSettingsActions(event)) {
      rerender();
      toast(t('saved'));
    }
  });

  document.addEventListener('submit', event => {
    if (bindFinanceActions(event) || bindChoreActions(event) || bindReminderActions(event) || bindPeopleActions(event) || bindGenericActions(event) || bindSettingsActions(event)) {
      rerender();
      toast(t('saved'));
    }
  });

  bindSettingsFileImport(() => {
    rerender();
    toast(t('imported'));
  });

  window.addEventListener('xiaocaimi:localechange', rerender);
  startReminderRuntime({ toast, rerender });
}

loadState();
router = createRouter({ routes: buildRoutes(), onChange: rerender });
currentRoute = router.current();
bindEvents();
subscribe(() => {});
renderShell();
