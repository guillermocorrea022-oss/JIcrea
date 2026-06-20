// ════════════════════════════════════════════════════════════════════════
//  Helpers de interfaz: formato, creación de DOM, toasts, modales, tablas.
// ════════════════════════════════════════════════════════════════════════

// ── Formato ──────────────────────────────────────────────────────────────
export const money = (n) => {
  const v = Number(n || 0);
  return '$' + v.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
export const money2 = (n) => {
  const v = Number(n || 0);
  return '$' + v.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const pct = (n) => (Number(n || 0)).toLocaleString('es-UY', { maximumFractionDigits: 1 }) + '%';
export const num = (n) => Number(n || 0).toLocaleString('es-UY', { maximumFractionDigits: 2 });

export const fmtDate = (d) => {
  if (!d) return '—';
  const date = (d instanceof Date) ? d : new Date(d + (String(d).length === 10 ? 'T00:00:00' : ''));
  if (isNaN(date)) return d;
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const monthLabel = (d) => {
  const date = (d instanceof Date) ? d : new Date(d + 'T00:00:00');
  return date.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' });
};
export const todayISO = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const firstOfMonthISO = (offset = 0) => {
  const d = new Date();
  d.setDate(1); d.setMonth(d.getMonth() + offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// ── Creación de elementos (mini helper tipo hyperscript) ─────────────────
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}
export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

// ── Toasts ───────────────────────────────────────────────────────────────
let toastWrap;
export function toast(msg, type = 'ok') {
  if (!toastWrap) {
    toastWrap = el('div', { class: 'toast-wrap' });
    document.body.appendChild(toastWrap);
  }
  const t = el('div', { class: `toast toast--${type}`, text: msg });
  toastWrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, 3200);
}

// ── Modal ──────────────────────────────────────────────────────────────
export function modal({ title, body, actions = [], wide = false }) {
  const overlay = el('div', { class: 'modal-overlay' });
  const close = () => { overlay.classList.remove('is-in'); setTimeout(() => overlay.remove(), 200); };
  const footer = el('div', { class: 'modal__footer' });
  for (const a of actions) {
    footer.appendChild(el('button', {
      class: `btn ${a.variant ? 'btn--' + a.variant : ''}`,
      text: a.label,
      onClick: () => a.onClick ? a.onClick(close) : close(),
    }));
  }
  const box = el('div', { class: 'modal' + (wide ? ' modal--wide' : '') }, [
    el('div', { class: 'modal__head' }, [
      el('h3', { class: 'modal__title', text: title }),
      el('button', { class: 'modal__x', html: '&times;', onClick: close }),
    ]),
    el('div', { class: 'modal__body' }, [ typeof body === 'string' ? el('div', { html: body }) : body ]),
    actions.length ? footer : null,
  ]);
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-in'));
  return { close, overlay, box };
}

export function confirmDialog(message, onYes, { danger = false, yesLabel = 'Confirmar' } = {}) {
  modal({
    title: 'Confirmar',
    body: el('p', { text: message }),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: yesLabel, variant: danger ? 'danger' : 'primary', onClick: (close) => { close(); onYes(); } },
    ],
  });
}

// ── Tabla genérica ───────────────────────────────────────────────────────
// columns: [{ key, label, render?(row), align?, className? }]
export function table(columns, rows, { empty = 'Sin datos.', onRow } = {}) {
  if (!rows || !rows.length) return el('div', { class: 'empty', text: empty });
  const thead = el('thead', {}, [
    el('tr', {}, columns.map(c => el('th', { class: c.align ? 'ta-' + c.align : '', text: c.label }))),
  ]);
  const tbody = el('tbody', {}, rows.map(r => {
    const tr = el('tr', onRow ? { class: 'row-click', onClick: () => onRow(r) } : {},
      columns.map(c => {
        const content = c.render ? c.render(r) : (r[c.key] ?? '');
        const td = el('td', { class: (c.align ? 'ta-' + c.align + ' ' : '') + (c.className || '') });
        if (content instanceof Node) td.appendChild(content);
        else td.innerHTML = content === '' ? '—' : content;
        return td;
      }));
    return tr;
  }));
  return el('div', { class: 'table-wrap' }, [ el('table', { class: 'table' }, [thead, tbody]) ]);
}

// ── Badge de estado ──────────────────────────────────────────────────────
export function badge(text, kind = 'neutral') {
  return el('span', { class: `badge badge--${kind}`, text });
}
export const STATUS_KIND = {
  pendiente: 'warn', confirmado: 'info', en_proceso: 'info',
  entregado: 'ok', cancelado: 'muted',
  pedido: 'muted', a_levantar: 'warn', recibido: 'ok',
};
export const STATUS_LABEL = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', en_proceso: 'En proceso',
  entregado: 'Entregado', cancelado: 'Cancelado',
  pedido: 'Pedido', a_levantar: 'A levantar', recibido: 'Recibido',
  mayor_a: 'Mayor A', mayor_b: 'Mayor B', minorista: 'Minorista', empresarial: 'Empresarial',
};
export const label = (k) => STATUS_LABEL[k] || k || '—';

// ── Loader / sección ─────────────────────────────────────────────────────
export const loader = () => el('div', { class: 'loader' }, [ el('div', { class: 'spinner' }) ]);
export function pageHeader(title, subtitle, actions = []) {
  return el('div', { class: 'page-head' }, [
    el('div', {}, [
      el('h1', { class: 'page-title', text: title }),
      subtitle ? el('p', { class: 'page-sub', text: subtitle }) : null,
    ]),
    actions.length ? el('div', { class: 'page-actions' }, actions) : null,
  ]);
}
export function statCard(label, value, sub, kind) {
  return el('div', { class: 'stat' + (kind ? ' stat--' + kind : '') }, [
    el('div', { class: 'stat__label', text: label }),
    el('div', { class: 'stat__value', text: value }),
    sub ? el('div', { class: 'stat__sub', text: sub }) : null,
  ]);
}
