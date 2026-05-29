import { addItem, getState, update } from '../core/store.js';
import { escapeHtml, html, readForm, today } from '../core/dom.js';
import { t } from '../core/i18n.js';

let editingContactId = null;
let editingBirthdayId = null;

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function dateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function nextBirthdayInfo(dateValue) {
  if (!dateValue) return { nextDate: '', daysUntil: Infinity, age: null };
  const parts = dateOnly(dateValue).split('-').map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return { nextDate: '', daysUntil: Infinity, age: null };
  const [birthYear, month, day] = parts;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < todayStart) next = new Date(now.getFullYear() + 1, month - 1, day);
  const daysUntil = Math.round((next - todayStart) / 86400000);
  const age = birthYear > 1900 ? next.getFullYear() - birthYear : null;
  return { nextDate: next.toISOString().slice(0, 10), daysUntil, age };
}

function birthdayEntries(state = getState()) {
  const contactEntries = (state.modules.contacts || [])
    .filter(contact => contact.birthday)
    .map(contact => ({
      id: `contact:${contact.id}`,
      source: 'contact',
      contactId: contact.id,
      title: contact.title,
      phone: contact.phone || '',
      date: contact.birthday,
      note: contact.note || '',
    }));
  const standalone = (state.modules.birthdays || []).map(item => ({ ...item, source: item.contactId ? 'linked' : 'standalone' }));
  const linkedIds = new Set(standalone.filter(item => item.contactId).map(item => item.contactId));
  return [...contactEntries.filter(item => !linkedIds.has(item.contactId)), ...standalone]
    .map(item => ({ ...item, ...nextBirthdayInfo(item.date) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function upsertLinkedBirthday(draft, contact) {
  const list = draft.modules.birthdays;
  const linked = list.find(item => item.contactId === contact.id);
  if (!contact.birthday) {
    if (linked) list.splice(list.indexOf(linked), 1);
    return;
  }
  const payload = {
    title: contact.title,
    date: contact.birthday,
    note: contact.note || '',
    contactId: contact.id,
    updatedAt: new Date().toISOString(),
  };
  if (linked) Object.assign(linked, payload);
  else list.push({ ...payload, id: uid('birthday'), createdAt: new Date().toISOString() });
}

export function renderContacts() {
  const contacts = [...(getState().modules.contacts || [])].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const editing = contacts.find(item => item.id === editingContactId);
  return html`
    <section class="card">
      <h3>${editing ? t('editContact') : t('addContact')}</h3>
      <form data-action="${editing ? 'update-contact' : 'add-contact'}" data-id="${escapeHtml(editing?.id || '')}" class="form-grid">
        <div class="field span-2"><label>${t('name')}</label><input name="title" value="${escapeHtml(editing?.title || '')}" required></div>
        <div class="field"><label>${t('phone')}</label><input name="phone" value="${escapeHtml(editing?.phone || '')}"></div>
        <div class="field"><label>${t('birthday')}</label><input name="birthday" type="date" value="${escapeHtml(dateOnly(editing?.birthday || ''))}"></div>
        <div class="field span-4"><label>${t('note')}</label><textarea name="note">${escapeHtml(editing?.note || '')}</textarea></div>
        <button class="primary span-4">${t('save')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <div class="chore-head">
        <div>
          <h3>${t('contacts')}</h3>
          <p>${t('contactBirthdayHint')}</p>
        </div>
      </div>
      ${contacts.length ? contacts.map(contactRow).join('') : `<div class="empty">${t('noData')}</div>`}
    </section>
  `;
}

function contactRow(contact) {
  const info = nextBirthdayInfo(contact.birthday);
  return html`
    <div class="row">
      <div>
        <div class="list-title">${escapeHtml(contact.title)}</div>
        <div class="dim">${[contact.phone, contact.birthday ? `${t('birthday')} ${dateOnly(contact.birthday)} · ${info.daysUntil} ${t('daysLater')}` : ''].filter(Boolean).map(escapeHtml).join(' · ')}</div>
        ${contact.note ? `<div class="muted">${escapeHtml(contact.note)}</div>` : ''}
      </div>
      <div class="reminder-actions">
        <button data-action="edit-contact" data-id="${escapeHtml(contact.id)}">${t('edit')}</button>
        <button class="danger" data-action="delete-contact" data-id="${escapeHtml(contact.id)}">${t('delete')}</button>
      </div>
    </div>
  `;
}

export function renderBirthdays() {
  const state = getState();
  const contacts = state.modules.contacts || [];
  const birthdays = state.modules.birthdays || [];
  const entries = birthdayEntries(state);
  const editing = birthdays.find(item => item.id === editingBirthdayId);
  return html`
    <div class="grid cols-3">
      ${birthdayKpi(t('birthdayToday'), entries.filter(item => item.daysUntil === 0).length)}
      ${birthdayKpi(t('birthdayUpcoming'), entries.filter(item => item.daysUntil > 0 && item.daysUntil <= 30).length)}
      ${birthdayKpi(t('linkedBirthdays'), entries.filter(item => item.source !== 'standalone').length)}
    </div>
    <section class="card" style="margin-top:14px">
      <h3>${editing ? t('editBirthday') : t('addBirthday')}</h3>
      <form data-action="${editing ? 'update-birthday' : 'add-birthday'}" data-id="${escapeHtml(editing?.id || '')}" class="form-grid">
        <div class="field span-2"><label>${t('name')}</label><input name="title" value="${escapeHtml(editing?.title || '')}" required></div>
        <div class="field"><label>${t('birthday')}</label><input name="date" type="date" value="${escapeHtml(dateOnly(editing?.date || today()))}"></div>
        <div class="field"><label>${t('linkedContact')}</label><select name="contactId"><option value="">${t('standaloneBirthday')}</option>${contacts.map(contact => `<option value="${escapeHtml(contact.id)}" ${contact.id === editing?.contactId ? 'selected' : ''}>${escapeHtml(contact.title)}</option>`).join('')}</select></div>
        <div class="field span-4"><label>${t('note')}</label><textarea name="note">${escapeHtml(editing?.note || '')}</textarea></div>
        <button class="primary span-4">${t('save')}</button>
      </form>
    </section>
    <section class="card" style="margin-top:14px">
      <div class="chore-head">
        <div>
          <h3>${t('birthdays')}</h3>
          <p>${t('birthdayLinkHint')}</p>
        </div>
      </div>
      ${entries.length ? entries.map(birthdayRow).join('') : `<div class="empty">${t('noData')}</div>`}
    </section>
  `;
}

function birthdayKpi(label, value) {
  return html`<section class="card"><h3>${label}</h3><div class="metric">${value}</div></section>`;
}

function birthdayRow(item) {
  const sourceLabel = item.source === 'contact' || item.source === 'linked' ? t('fromContacts') : t('standaloneBirthday');
  const dayLabel = item.daysUntil === 0 ? t('today') : `${item.daysUntil} ${t('daysLater')}`;
  return html`
    <div class="row">
      <div>
        <div class="list-title">${escapeHtml(item.title)}</div>
        <div class="dim">${dateOnly(item.date)} · ${dayLabel} · ${sourceLabel}${item.age ? ` · ${item.age}` : ''}</div>
        ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ''}
      </div>
      <div class="reminder-actions">
        ${item.source === 'standalone' || item.source === 'linked' ? `<button data-action="edit-birthday" data-id="${escapeHtml(item.id)}">${t('edit')}</button><button class="danger" data-action="delete-birthday" data-id="${escapeHtml(item.id)}">${t('delete')}</button>` : `<button data-action="edit-contact" data-id="${escapeHtml(item.contactId)}">${t('editContact')}</button>`}
      </div>
    </div>
  `;
}

export function bindPeopleActions(event) {
  const form = event.target.closest('form[data-action]');
  if (event.type === 'submit' && form?.dataset.action === 'add-contact') {
    event.preventDefault();
    const value = readForm(form);
    const contact = addItem('modules.contacts', {
      title: value.title,
      phone: value.phone || '',
      birthday: value.birthday || '',
      note: value.note || '',
    }, 'contact');
    update(draft => upsertLinkedBirthday(draft, contact));
    form.reset();
    return true;
  }

  if (event.type === 'submit' && form?.dataset.action === 'update-contact') {
    event.preventDefault();
    const value = readForm(form);
    update(draft => {
      const contact = draft.modules.contacts.find(item => item.id === form.dataset.id);
      if (!contact) return;
      Object.assign(contact, {
        title: value.title,
        phone: value.phone || '',
        birthday: value.birthday || '',
        note: value.note || '',
        updatedAt: new Date().toISOString(),
      });
      upsertLinkedBirthday(draft, contact);
    });
    editingContactId = null;
    return true;
  }

  if (event.type === 'submit' && ['add-birthday', 'update-birthday'].includes(form?.dataset.action)) {
    event.preventDefault();
    const value = readForm(form);
    update(draft => {
      const existing = form.dataset.action === 'update-birthday'
        ? draft.modules.birthdays.find(item => item.id === form.dataset.id)
        : null;
      const payload = {
        title: value.title,
        date: value.date,
        note: value.note || '',
        contactId: value.contactId || '',
        updatedAt: new Date().toISOString(),
      };
      if (existing) Object.assign(existing, payload);
      else draft.modules.birthdays.push({ ...payload, id: uid('birthday'), createdAt: new Date().toISOString() });

      if (value.contactId) {
        const contact = draft.modules.contacts.find(item => item.id === value.contactId);
        if (contact) {
          contact.title = value.title || contact.title;
          contact.birthday = value.date;
          contact.note = contact.note || value.note || '';
          contact.updatedAt = new Date().toISOString();
        }
      }
    });
    editingBirthdayId = null;
    return true;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return false;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'edit-contact') {
    editingContactId = id;
    return true;
  }
  if (action === 'delete-contact') {
    update(draft => {
      draft.modules.contacts = draft.modules.contacts.filter(item => item.id !== id);
      draft.modules.birthdays = draft.modules.birthdays.filter(item => item.contactId !== id);
    });
    editingContactId = null;
    return true;
  }
  if (action === 'edit-birthday') {
    editingBirthdayId = id;
    return true;
  }
  if (action === 'delete-birthday') {
    update(draft => {
      draft.modules.birthdays = draft.modules.birthdays.filter(item => item.id !== id);
    });
    editingBirthdayId = null;
    return true;
  }

  return false;
}
