import { addItem, getState, removeItem } from '../core/store.js';
import { escapeHtml, html, readForm, today } from '../core/dom.js';
import { t } from '../core/i18n.js';

export const genericModules = {
  calendar: { path: 'modules.calendar', title: () => t('calendar'), singular: () => t('event'), fields: ['title', 'date', 'note'] },
  tasks: { path: 'modules.tasks', title: () => t('tasks'), singular: () => t('task'), fields: ['title', 'status', 'date', 'note'] },
  reminders: { path: 'modules.reminders', title: () => t('reminders'), singular: () => t('reminder'), fields: ['title', 'date', 'note'] },
  shopping: { path: 'modules.shoppingItems', title: () => t('shopping'), singular: () => t('shoppingItem'), fields: ['title', 'category', 'note'] },
  notes: { path: 'modules.notes', title: () => t('notes'), singular: () => t('noteItem'), fields: ['title', 'note'] },
  contacts: { path: 'modules.contacts', title: () => t('contacts'), singular: () => t('contact'), fields: ['title', 'phone', 'note'] },
  birthdays: { path: 'modules.birthdays', title: () => t('birthdays'), singular: () => t('birthday'), fields: ['title', 'date', 'note'] },
  meals: { path: 'modules.meals', title: () => t('meals'), singular: () => t('meal'), fields: ['title', 'date', 'note'] },
};

export function renderGeneric(id) {
  const config = genericModules[id];
  const list = config.path.split('.').reduce((target, key) => target[key], getState());
  const singular = config.singular();
  return html`
    <section class="card">
      <h3>${t('add')}${singular}</h3>
      <form data-action="add-generic" data-module="${id}" class="form-grid">
        ${config.fields.map(fieldTemplate).join('')}
        <button class="primary span-4">${t('save')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <h3>${config.title()}</h3>
      ${list.length ? list.map(item => itemRow(id, item)).join('') : `<div class="empty">${t('noData')}</div>`}
    </section>
  `;
}

function fieldTemplate(name) {
  const labels = {
    title: t('title'),
    date: t('date'),
    note: t('note'),
    status: t('status'),
    category: t('category'),
    phone: t('phone'),
  };
  if (name === 'note') return `<div class="field span-4"><label>${labels[name]}</label><textarea name="${name}"></textarea></div>`;
  if (name === 'date') return `<div class="field"><label>${labels[name]}</label><input name="${name}" type="date" value="${today()}"></div>`;
  if (name === 'status') return `<div class="field"><label>${labels[name]}</label><select name="${name}"><option>${t('todo')}</option><option>${t('inProgress')}</option><option>${t('done')}</option></select></div>`;
  return `<div class="field ${name === 'title' ? 'span-2' : ''}"><label>${labels[name]}</label><input name="${name}" ${name === 'title' ? 'required' : ''}></div>`;
}

function itemRow(moduleId, item) {
  return html`
    <div class="row">
      <div>
        <div class="list-title">${escapeHtml(item.title)}</div>
        <div class="dim">${escapeHtml([item.date, item.status, item.category, item.phone].filter(Boolean).join(' · '))}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ''}
      </div>
      <button class="danger" data-action="delete-generic" data-module="${moduleId}" data-id="${escapeHtml(item.id)}">${t('delete')}</button>
    </div>
  `;
}

export function bindGenericActions(event) {
  const form = event.target.closest('form[data-action="add-generic"]');
  if (event.type === 'submit' && form) {
    event.preventDefault();
    const config = genericModules[form.dataset.module];
    addItem(config.path, readForm(form), form.dataset.module);
    form.reset();
    return true;
  }

  const button = event.target.closest('[data-action="delete-generic"]');
  if (button) {
    const config = genericModules[button.dataset.module];
    removeItem(config.path, button.dataset.id);
    return true;
  }
  return false;
}
