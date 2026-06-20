// ════════════════════════════════════════════════════════════════════════
//  JICREA Gestión — punto de entrada. Gate de configuración + auth + shell.
// ════════════════════════════════════════════════════════════════════════
import { CONFIGURED } from './api.js';
import { loadSession, signIn, signOut, setupOwner, session } from './auth.js';
import { defineRoutes, render, go } from './router.js';
import { el, clear, toast, loader } from './ui.js';

import dashboard from './modules/dashboard.js';
import sales from './modules/sales.js';
import inventory from './modules/inventory.js';
import production from './modules/production.js';
import finance from './modules/finance.js';
import crm from './modules/crm.js';
import admin from './modules/admin.js';
import reports from './modules/reports.js';

const app = document.getElementById('app');

// Navegación: { route, label, icon, ownerOnly }
const NAV = [
  { route: 'dashboard',  label: 'Dashboard',     icon: '◧' },
  { route: 'ventas',     label: 'Ventas',         icon: '🛒' },
  { route: 'inventario', label: 'Inventario',     icon: '📦' },
  { route: 'produccion', label: 'Producción',     icon: '🔨' },
  { route: 'finanzas',   label: 'Finanzas',       icon: '💰', ownerOnly: true },
  { route: 'crm',        label: 'Clientes',       icon: '👤' },
  { route: 'reportes',   label: 'Reportes',       icon: '📊', ownerOnly: true },
  { route: 'admin',      label: 'Administración', icon: '⚙',  ownerOnly: true },
];

// ── Pantalla de error de conexión a la base ──────────────────────────────
function connectionScreen() {
  return el('div', { class: 'auth-screen' }, [
    el('div', { class: 'auth-card' }, [
      el('div', { class: 'auth-logo', text: 'JIcrea' }),
      el('h2', { text: 'No se pudo conectar' }),
      el('p', { class: 'auth-sub', html:
        'No se pudo conectar con la base de datos. Verificá que ejecutaste ' +
        '<code>api/sql/schema.sql</code> en tu MySQL y que <code>api/config.php</code> ' +
        'tenga los datos correctos. El README tiene el paso a paso.' }),
      el('button', { class: 'btn btn--ghost btn--block', text: 'Reintentar', onClick: () => init() }),
    ]),
  ]);
}

// ── Primera vez: crear usuario dueño ──────────────────────────────────────
function setupOwnerScreen() {
  const name = el('input', { class: 'input', placeholder: 'Tu nombre', autocomplete: 'name' });
  const email = el('input', { type: 'email', class: 'input', placeholder: 'tu@email.com', autocomplete: 'username' });
  const pass = el('input', { type: 'password', class: 'input', placeholder: 'Contraseña (6+ caracteres)', autocomplete: 'new-password' });
  const btn = el('button', { class: 'btn btn--primary btn--block', text: 'Crear cuenta de dueño' });
  const err = el('div', { class: 'auth-error' });
  const submit = async (e) => {
    e?.preventDefault(); err.textContent = '';
    btn.disabled = true; btn.textContent = 'Creando…';
    try {
      await setupOwner(email.value.trim(), pass.value, name.value.trim());
      await signIn(email.value.trim(), pass.value);
      mountApp();
    } catch (ex) {
      err.textContent = ex.message || 'No se pudo crear la cuenta.';
      btn.disabled = false; btn.textContent = 'Crear cuenta de dueño';
    }
  };
  const form = el('form', { class: 'auth-card', onSubmit: submit }, [
    el('div', { class: 'auth-logo', text: 'JIcrea' }),
    el('h2', { text: 'Primera puesta en marcha' }),
    el('p', { class: 'auth-sub', text: 'Creá tu usuario de dueño para empezar a usar el sistema.' }),
    el('label', { class: 'field' }, [ el('span', { text: 'Nombre' }), name ]),
    el('label', { class: 'field' }, [ el('span', { text: 'Email' }), email ]),
    el('label', { class: 'field' }, [ el('span', { text: 'Contraseña' }), pass ]),
    err, btn,
  ]);
  return el('div', { class: 'auth-screen' }, [form]);
}

// ── 2. Login ─────────────────────────────────────────────────────────────
function loginScreen() {
  const email = el('input', { type: 'email', class: 'input', placeholder: 'tu@email.com', autocomplete: 'username' });
  const pass = el('input', { type: 'password', class: 'input', placeholder: 'Contraseña', autocomplete: 'current-password' });
  const btn = el('button', { class: 'btn btn--primary btn--block', text: 'Entrar' });
  const err = el('div', { class: 'auth-error' });
  const submit = async (e) => {
    e?.preventDefault();
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await signIn(email.value.trim(), pass.value);
      mountApp();
    } catch (ex) {
      err.textContent = ex.message?.includes('Invalid') ? 'Email o contraseña incorrectos.' : (ex.message || 'Error al entrar.');
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  };
  const form = el('form', { class: 'auth-card', onSubmit: submit }, [
    el('div', { class: 'auth-logo', text: 'JIcrea' }),
    el('h2', { text: 'Sistema de gestión' }),
    el('p', { class: 'auth-sub', text: 'Ingresá con tu usuario para continuar.' }),
    el('label', { class: 'field' }, [ el('span', { text: 'Email' }), email ]),
    el('label', { class: 'field' }, [ el('span', { text: 'Contraseña' }), pass ]),
    err, btn,
  ]);
  return el('div', { class: 'auth-screen' }, [form]);
}

// ── 3. Shell autenticado ─────────────────────────────────────────────────
function shell() {
  const items = NAV.filter(n => !n.ownerOnly || session.isOwner);
  const navLinks = items.map(n => el('a', {
    class: 'navlink', href: '#/' + n.route, 'data-route': n.route,
  }, [ el('span', { class: 'navlink__icon', text: n.icon }), el('span', { text: n.label }) ]));

  const sidebar = el('aside', { class: 'sidebar' }, [
    el('div', { class: 'sidebar__brand' }, [
      el('span', { class: 'sidebar__brand-mark', text: 'JI' }),
      el('span', { class: 'sidebar__brand-text', text: 'crea' }),
    ]),
    el('nav', { class: 'sidebar__nav' }, navLinks),
    el('div', { class: 'sidebar__foot' }, [
      el('div', { class: 'sidebar__user' }, [
        el('div', { class: 'sidebar__user-name', text: session.name }),
        el('div', { class: 'sidebar__user-role', text: session.isOwner ? 'Dueño' : 'Operario' }),
      ]),
      el('button', { class: 'btn btn--ghost btn--sm', text: 'Salir', onClick: async () => { await signOut(); mountApp(); } }),
    ]),
  ]);

  const mount = el('main', { class: 'content', id: 'view' });

  const burger = el('button', { class: 'topbar__burger', html: '☰',
    onClick: () => document.body.classList.toggle('nav-open') });
  const topbar = el('header', { class: 'topbar' }, [
    burger,
    el('div', { class: 'topbar__brand', text: 'JIcrea · Gestión' }),
  ]);

  const overlay = el('div', { class: 'nav-overlay', onClick: () => document.body.classList.remove('nav-open') });
  // cerrar menú mobile al navegar
  sidebar.addEventListener('click', (e) => { if (e.target.closest('.navlink')) document.body.classList.remove('nav-open'); });

  return el('div', { class: 'layout' }, [ sidebar, overlay, el('div', { class: 'main' }, [ topbar, mount ]) ]);
}

// ── Montaje según estado ─────────────────────────────────────────────────
let connectionFailed = false;
function mountApp() {
  clear(app);
  if (connectionFailed) { app.appendChild(connectionScreen()); return; }
  if (session.needsSetup) { app.appendChild(setupOwnerScreen()); return; }
  if (!session.user) { app.appendChild(loginScreen()); return; }

  app.appendChild(shell());
  const mount = document.getElementById('view');
  const guard = (fn, ownerOnly) => async (params) => {
    if (ownerOnly && !session.isOwner)
      return el('div', { class: 'empty', text: 'No tenés permisos para ver esta sección.' });
    return fn(params);
  };
  defineRoutes({
    dashboard,
    ventas: sales,
    inventario: inventory,
    produccion: production,
    finanzas: guard(finance, true),
    crm,
    reportes: guard(reports, true),
    admin: guard(admin, true),
  }, { mount, fallback: () => el('div', { class: 'empty', text: 'Página no encontrada.' }) });
  if (!location.hash) location.hash = '#/dashboard';
  render();
}

// ── Init ─────────────────────────────────────────────────────────────────
async function init() {
  clear(app);
  app.appendChild(loader());
  connectionFailed = false;
  try {
    await loadSession();
  } catch (e) {
    console.error(e);
    connectionFailed = true;
  }
  mountApp();
}
init();
