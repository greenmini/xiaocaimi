export function html(strings, ...values) {
  return strings.reduce((out, part, index) => out + part + (values[index] ?? ''), '');
}

export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

const currencyFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function currency(value) {
  return '¥' + currencyFormatter.format(Number(value || 0));
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
