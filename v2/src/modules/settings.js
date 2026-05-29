import { exportSnapshot, getState, importSnapshot, update } from '../core/store.js';
import { escapeHtml, html, readForm } from '../core/dom.js';
import { getLocale, localeOptions, setLocale, t } from '../core/i18n.js';

export function renderSettings() {
  const { budget, settings } = getState().finance;
  const currentLocale = getLocale();
  return html`
    <section class="card">
      <h3>${t('basicSettings')}</h3>
      <form data-action="save-settings" class="form-grid">
        <div class="field"><label>${t('monthlyBudget')}</label><input name="budget" type="number" value="${escapeHtml(budget)}"></div>
        <div class="field"><label>${t('language')}</label><select name="locale">${localeOptions().map(option => `<option value="${option.value}" ${option.value === currentLocale ? 'selected' : ''}>${option.label}</option>`).join('')}</select></div>
        <div class="field span-2"><label>${t('syncUrl')}</label><input name="syncServerUrl" value="${escapeHtml(settings.syncServerUrl || '')}" placeholder="${t('syncUrlPlaceholder')}"></div>
        <div class="field"><label>${t('syncToken')}</label><input name="syncToken" value="${escapeHtml(settings.syncToken || '')}"></div>
        <button class="primary span-4">${t('saveSettings')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <h3>${t('dataManagement')}</h3>
      <div class="actions">
        <button data-action="export-snapshot">${t('exportFullBackup')}</button>
        <button data-action="import-snapshot">${t('importFullBackup')}</button>
        <input id="snapshot-file" type="file" accept=".json" hidden>
      </div>
      <p class="muted">${t('backupHint')}</p>
    </section>
    <section class="card" style="margin-top:14px">
      <h3>${t('forceRefresh')}</h3>
      <p class="muted">${t('forceRefreshDesc')}</p>
      <div class="actions" style="margin-top:10px">
        <button class="danger" data-action="force-refresh">${t('forceRefresh')}</button>
      </div>
      <p class="dim" style="margin-top:6px">${t('forceRefreshHint')}</p>
    </section>
  `;
}

export function bindSettingsActions(event) {
  const form = event.target.closest('form[data-action="save-settings"]');
  if (event.type === 'submit' && form) {
    event.preventDefault();
    const value = readForm(form);
    update(state => {
      state.finance.budget = Number(value.budget || 0);
      state.finance.settings.syncServerUrl = value.syncServerUrl || '';
      state.finance.settings.syncToken = value.syncToken || '';
      state.finance.settings.locale = value.locale || getLocale();
    });
    setLocale(value.locale);
    return true;
  }

  const exportButton = event.target.closest('[data-action="export-snapshot"]');
  if (exportButton) {
    const blob = new Blob([exportSnapshot()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `xiaocaimi-v2-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  const importButton = event.target.closest('[data-action="import-snapshot"]');
  if (importButton) {
    document.getElementById('snapshot-file')?.click();
    return true;
  }

  return false;
}

export function bindSettingsFileImport(rerender) {
  document.addEventListener('change', async event => {
    if (event.target.id !== 'snapshot-file') return;
    const file = event.target.files?.[0];
    if (!file) return;
    importSnapshot(await file.text());
    event.target.value = '';
    rerender();
  });
}
