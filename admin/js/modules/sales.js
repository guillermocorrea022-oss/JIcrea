// ════════════════════════════════════════════════════════════════════════
//  VENTAS — registro manual, lista con filtros, cuentas por cobrar,
//  confirmación de pedidos web. Descuenta stock al confirmar (vía vistas).
// ════════════════════════════════════════════════════════════════════════
import { Sales, Products, Clients } from '../data.js';
import { session } from '../auth.js';
import { el, clear, pageHeader, table, badge, money, fmtDate, label, toast,
         modal, confirmDialog, loader, todayISO, STATUS_LABEL } from '../ui.js';

const priceField = { mayor_a: 'price_mayor_a', mayor_b: 'price_mayor_b', minorista: 'price_minorista' };
const CHANNELS = ['WhatsApp', 'Instagram', 'Feria', 'Directo', 'Web', 'Otro'];

// ── Operaciones reutilizables (las usa el dashboard) ─────────────────────
export const confirmSale = (id) => Sales.setStatus(id, 'confirmado');
export const cancelSale = (id) => Sales.setStatus(id, 'cancelado');

// ── Detalle de una venta ─────────────────────────────────────────────────
export async function saleDetailModal(id) {
  const m = modal({ title: 'Cargando…', body: loader(), wide: true });
  const [all, items] = await Promise.all([Sales.list(), Sales.items(id)]);
  const s = all.find(x => x.id === id);
  if (!s) { m.close(); return; }

  const body = el('div', {}, [
    el('div', { class: 'detail-grid' }, [
      kv('Cliente', s.clients?.name || s.client_name || '—'),
      kv('Contacto', s.client_contact || '—'),
      kv('Tipo', label(s.sale_type)),
      kv('Canal', s.channel || (s.source === 'web' ? 'Web' : '—')),
      kv('Fecha', fmtDate(s.order_date)),
      kv('Entrega', fmtDate(s.delivery_date)),
      kv('Estado', label(s.status)),
      kv('Cobrado', s.paid ? 'Sí · ' + fmtDate(s.paid_date) : 'No'),
      kv('Zona', s.zone || '—'),
      kv('Empresa', s.company || '—'),
    ]),
    table([
      { key: 'product_name', label: 'Producto' },
      { key: 'qty', label: 'Cant.', align: 'right' },
      { key: 'unit_price', label: 'P. unit.', align: 'right', render: r => money(r.unit_price) },
      { key: 'subtotal', label: 'Subtotal', align: 'right', render: r => money(r.qty * r.unit_price) },
    ], items),
    el('div', { class: 'detail-total' }, [
      el('span', { text: 'Total' }), el('strong', { text: money(s.total) }),
    ]),
    s.notes ? el('p', { class: 'detail-notes', text: 'Notas: ' + s.notes }) : null,
  ]);

  const actions = [];
  if (session.isOwner || s.status === 'pendiente') {
    if (s.status === 'pendiente') {
      actions.push({ label: 'Confirmar', variant: 'primary', onClick: async (close) => {
        await confirmSale(id); toast('Pedido confirmado.'); close(); window.dispatchEvent(new Event('sales:changed')); } });
      actions.push({ label: 'Rechazar', variant: 'danger', onClick: async (close) => {
        await cancelSale(id); toast('Pedido rechazado.'); close(); window.dispatchEvent(new Event('sales:changed')); } });
    } else {
      if (!s.paid) actions.push({ label: 'Marcar cobrado', variant: 'primary', onClick: async (close) => {
        await Sales.setPaid(id, true); toast('Marcado como cobrado.'); close(); window.dispatchEvent(new Event('sales:changed')); } });
      if (s.status !== 'entregado') actions.push({ label: 'Marcar entregado', onClick: async (close) => {
        await Sales.setStatus(id, 'entregado'); toast('Marcado como entregado.'); close(); window.dispatchEvent(new Event('sales:changed')); } });
    }
  }
  actions.push({ label: 'Cerrar', variant: 'ghost' });

  m.box.querySelector('.modal__title').textContent = 'Venta · ' + fmtDate(s.order_date);
  clear(m.box.querySelector('.modal__body')).appendChild(body);
  const foot = m.box.querySelector('.modal__footer') || el('div', { class: 'modal__footer' });
  clear(foot);
  actions.forEach(a => foot.appendChild(el('button', { class: `btn ${a.variant ? 'btn--' + a.variant : ''}`, text: a.label,
    onClick: () => a.onClick ? a.onClick(m.close) : m.close() })));
  if (!foot.parentNode) m.box.appendChild(foot);
}

const kv = (k, v) => el('div', { class: 'kv' }, [ el('span', { class: 'kv__k', text: k }), el('span', { class: 'kv__v', text: v }) ]);

// ── Formulario de nueva venta ────────────────────────────────────────────
async function newSaleForm(onDone) {
  const [products, clients] = await Promise.all([Products.list(true), Clients.list()]);
  const lines = []; // { product, qty }

  const saleType = el('select', { class: 'input' },
    ['minorista', 'mayor_a', 'mayor_b'].map(t => el('option', { value: t, text: label(t) })));
  const channel = el('select', { class: 'input' }, CHANNELS.map(c => el('option', { value: c, text: c })));
  const clientSel = el('select', { class: 'input' },
    [el('option', { value: '', text: '— Sin cliente / consumidor final —' })]
      .concat(clients.map(c => el('option', { value: c.id, text: c.name }))));
  const clientName = el('input', { class: 'input', placeholder: 'o escribí un nombre suelto' });
  const orderDate = el('input', { class: 'input', type: 'date', value: todayISO() });
  const deliveryDate = el('input', { class: 'input', type: 'date' });
  const zone = el('input', { class: 'input', placeholder: 'Zona / envío' });
  const company = el('select', { class: 'input' }, ['Empresa 1', 'Empresa 2'].map(c => el('option', { text: c })));
  const paid = el('input', { type: 'checkbox' });
  const notes = el('textarea', { class: 'input', rows: 2, placeholder: 'Notas' });

  const linesWrap = el('div', { class: 'lines' });
  const totalEl = el('strong', { text: money(0) });
  const marginEl = el('span', { class: 'muted' });

  const productPicker = () => {
    const sel = el('select', { class: 'input' },
      [el('option', { value: '', text: '— Elegí producto —' })]
        .concat(products.map(p => el('option', { value: p.id, text: p.name }))));
    return sel;
  };

  function recalc() {
    let total = 0, cost = 0;
    const field = priceField[saleType.value];
    lines.forEach(l => {
      const price = Number(l.product?.[field] ?? l.product?.price_minorista ?? 0);
      total += price * l.qty;
      cost += Number(l.product?.cost || 0) * l.qty;
      if (l.priceEl) l.priceEl.textContent = money(price);
      if (l.subEl) l.subEl.textContent = money(price * l.qty);
    });
    totalEl.textContent = money(total);
    marginEl.textContent = total ? `margen ${money(total - cost)} (${Math.round((total - cost) / total * 100)}%)` : '';
  }

  function addLine() {
    const sel = productPicker();
    const qty = el('input', { class: 'input input--qty', type: 'number', min: '1', value: '1' });
    const priceEl = el('span', { class: 'line__price', text: '—' });
    const subEl = el('span', { class: 'line__sub', text: '—' });
    const line = { product: null, qty: 1, priceEl, subEl };
    sel.addEventListener('change', () => { line.product = products.find(p => p.id === sel.value) || null; recalc(); });
    qty.addEventListener('input', () => { line.qty = Math.max(1, Number(qty.value) || 1); recalc(); });
    const del = el('button', { class: 'btn btn--sm btn--ghost', html: '&times;', onClick: () => {
      const i = lines.indexOf(line); if (i >= 0) lines.splice(i, 1); row.remove(); recalc(); } });
    const row = el('div', { class: 'line' }, [ sel, qty, priceEl, subEl, del ]);
    lines.push(line);
    linesWrap.appendChild(row);
  }
  addLine();
  saleType.addEventListener('change', recalc);

  const body = el('div', { class: 'form' }, [
    el('div', { class: 'form-grid' }, [
      field('Tipo de venta', saleType),
      field('Canal', channel),
      field('Cliente (CRM)', clientSel),
      field('Nombre suelto', clientName),
      field('Fecha pedido', orderDate),
      field('Fecha entrega', deliveryDate),
      field('Zona / envío', zone),
      field('Empresa', company),
    ]),
    el('div', { class: 'lines-head' }, [
      el('h4', { text: 'Productos' }),
      el('button', { class: 'btn btn--sm btn--ghost', text: '+ Agregar producto', onClick: addLine }),
    ]),
    linesWrap,
    el('div', { class: 'lines-total' }, [ marginEl, el('span', { text: 'Total: ' }), totalEl ]),
    el('label', { class: 'check' }, [ paid, el('span', { text: 'Ya está cobrado' }) ]),
    field('Notas', notes),
  ]);

  modal({
    title: 'Nueva venta', body, wide: true,
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Registrar venta', variant: 'primary', onClick: async (close) => {
          const validLines = lines.filter(l => l.product && l.qty > 0);
          if (!validLines.length) { toast('Agregá al menos un producto.', 'err'); return; }
          const field2 = priceField[saleType.value];
          const items = validLines.map(l => ({
            product_id: l.product.id, product_name: l.product.name, qty: l.qty,
            unit_price: Number(l.product[field2] ?? l.product.price_minorista ?? 0),
            unit_cost: Number(l.product.cost || 0),
          }));
          try {
            await Sales.create({
              client_id: clientSel.value || null,
              client_name: clientName.value.trim() || (clients.find(c => c.id === clientSel.value)?.name) || null,
              sale_type: saleType.value, channel: channel.value, source: 'manual',
              status: 'confirmado', order_date: orderDate.value || todayISO(),
              delivery_date: deliveryDate.value || null, zone: zone.value || null,
              company: company.value, paid: paid.checked,
              paid_date: paid.checked ? todayISO() : null, notes: notes.value || null,
            }, items);
            toast('Venta registrada. Stock descontado.');
            close(); onDone?.();
          } catch (ex) { toast(ex.message, 'err'); }
        } },
    ],
  });

  function field(lbl, input) { return el('label', { class: 'field' }, [ el('span', { text: lbl }), input ]); }
}

// ── Vista principal ──────────────────────────────────────────────────────
export default async function sales(params) {
  const tab = params.tab || 'lista';
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Ventas', null, [
    el('button', { class: 'btn btn--primary', text: '+ Nueva venta',
      onClick: () => newSaleForm(() => load()) }),
  ]));

  // sub-tabs
  const tabs = el('div', { class: 'tabs' }, [
    tabLink('lista', 'Todas las ventas', tab),
    tabLink('cobrar', 'Cuentas por cobrar', tab),
  ]);
  root.appendChild(tabs);

  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  const onChanged = () => load();
  window.addEventListener('sales:changed', onChanged);
  window.addEventListener('hashchange', () => window.removeEventListener('sales:changed', onChanged), { once: true });

  async function load() {
    if (tab === 'cobrar') return loadReceivable();
    // Filtros
    const fStatus = el('select', { class: 'input input--sm' },
      [el('option', { value: '', text: 'Todos los estados' })]
        .concat(['pendiente','confirmado','en_proceso','entregado','cancelado'].map(s => el('option', { value: s, text: label(s) }))));
    const fType = el('select', { class: 'input input--sm' },
      [el('option', { value: '', text: 'Todos los canales' })]
        .concat(['mayor_a','mayor_b','minorista'].map(s => el('option', { value: s, text: label(s) }))));
    const fPaid = el('select', { class: 'input input--sm' }, [
      el('option', { value: '', text: 'Cobrado: todos' }),
      el('option', { value: 'true', text: 'Cobrados' }),
      el('option', { value: 'false', text: 'No cobrados' }),
    ]);
    const filtersBar = el('div', { class: 'filters' }, [fStatus, fType, fPaid]);

    const tableWrap = el('div', {}, [loader()]);
    const refresh = async () => {
      const filters = {};
      if (fStatus.value) filters.status = fStatus.value;
      if (fType.value) filters.sale_type = fType.value;
      if (fPaid.value) filters.paid = fPaid.value === 'true';
      const rows = await Sales.list(filters);
      tableWrap.replaceChildren(table([
        { key: 'order_date', label: 'Fecha', render: r => fmtDate(r.order_date) },
        { key: 'client', label: 'Cliente', render: r => r.clients?.name || r.client_name || '—' },
        { key: 'sale_type', label: 'Canal', render: r => label(r.sale_type) },
        { key: 'total', label: 'Total', align: 'right', render: r => money(r.total) },
        { key: 'paid', label: 'Cobro', render: r => badge(r.paid ? 'Cobrado' : 'Pendiente', r.paid ? 'ok' : 'warn') },
        { key: 'status', label: 'Estado', render: r => badge(label(r.status),
            r.status === 'entregado' ? 'ok' : r.status === 'cancelado' ? 'muted' : r.status === 'pendiente' ? 'warn' : 'info') },
      ], rows, { empty: 'No hay ventas con esos filtros.', onRow: r => saleDetailModal(r.id) }));
    };
    [fStatus, fType, fPaid].forEach(f => f.addEventListener('change', refresh));
    body.replaceChildren(el('div', {}, [filtersBar, tableWrap]));
    refresh();
  }

  async function loadReceivable() {
    const rows = await Sales.receivable();
    const totalDebt = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    body.replaceChildren(el('div', {}, [
      el('div', { class: 'stat-grid' }, [
        statCard2('Total por cobrar', money(totalDebt), `${rows.length} ventas`),
        statCard2('Vencidas (+30 días)', String(rows.filter(r => r.days_outstanding > 30).length), 'sin cobrar'),
      ]),
      table([
        { key: 'client_name', label: 'Cliente', render: r => r.client_name || '—' },
        { key: 'order_date', label: 'Fecha', render: r => fmtDate(r.order_date) },
        { key: 'days', label: 'Días', align: 'right', render: r => badge(String(r.days_outstanding), r.days_outstanding > 30 ? 'danger' : 'warn') },
        { key: 'total', label: 'Monto', align: 'right', render: r => money(r.total) },
        { key: 'acc', label: '', align: 'right', render: r => el('button', { class: 'btn btn--sm btn--primary', text: 'Cobrado',
            onClick: async (e) => { e.stopPropagation(); await Sales.setPaid(r.id, true); toast('Cobrado.'); load(); } }) },
      ], rows, { empty: '¡Todo cobrado! No hay deudas pendientes.' }),
    ]));
  }

  await load();
  return root;
}

function tabLink(key, lbl, active) {
  return el('a', { class: 'tab' + (active === key ? ' is-active' : ''), href: '#/ventas?tab=' + key, text: lbl });
}
function statCard2(l, v, s) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'stat__label', text: l }), el('div', { class: 'stat__value', text: v }),
    s ? el('div', { class: 'stat__sub', text: s }) : null,
  ]);
}
