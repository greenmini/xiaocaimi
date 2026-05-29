export function createRouter({ routes, onChange }) {
  function current() {
    const hash = location.hash.replace(/^#\/?/, '');
    return routes[hash] ? hash : Object.keys(routes)[0];
  }

  function go(id) {
    if (location.hash !== `#${id}`) location.hash = id;
    else onChange(id);
  }

  window.addEventListener('hashchange', () => onChange(current()));

  return { current, go };
}
