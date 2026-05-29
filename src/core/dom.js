export function html(strings, ...values) {
  return strings.reduce((out, part, index) => out + part + (values[index] ?? ''), '');
}

export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

export function currency(value) {
  return '¥' + Number(value || 0).toFixed(2);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function byId(id) {
  return document.getElementById(id);
}

export function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}
