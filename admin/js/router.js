// Router por hash, simple. Registra rutas y monta la vista en el contenedor.
const routes = {};
let notFound = null;
let mountEl = null;
let current = null;

export function defineRoutes(map, { mount, fallback }) {
  Object.assign(routes, map);
  mountEl = mount;
  notFound = fallback;
}

export async function render() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, queryStr] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(queryStr || ''));
  const view = routes[path] || notFound;
  current = path;
  mountEl.classList.add('is-loading');
  try {
    const node = await view(params);
    mountEl.replaceChildren(node);
  } catch (e) {
    console.error(e);
    const err = document.createElement('div');
    err.className = 'empty';
    err.textContent = 'Error al cargar: ' + (e.message || e);
    mountEl.replaceChildren(err);
  } finally {
    mountEl.classList.remove('is-loading');
    mountEl.scrollTop = 0;
  }
  document.querySelectorAll('[data-route]').forEach(a =>
    a.classList.toggle('is-active', a.dataset.route === path));
}

export const currentRoute = () => current;
export const go = (path) => { location.hash = '#/' + path; };
window.addEventListener('hashchange', render);
