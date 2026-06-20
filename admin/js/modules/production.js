// ════════════════════════════════════════════════════════════════════════
//  PRODUCCIÓN — por módulo (Mates / Cuero / Costurera / Grabados).
//  Compras de insumos (suma stock al estado Recibido) y productos terminados
//  (descuenta insumos por Ficha Técnica + paga mano de obra).
// ════════════════════════════════════════════════════════════════════════
import { Purchases, Production, Products, Supplies, Suppliers, Engraving } from '../data.js';
import { el, pageHeader, table, badge, money, num, fmtDate, label, toast, modal, loader, todayISO } from '../ui.js';

const MODULES = { mates: 'Mates', cuero: 'Cuero', costurera: 'Costurera', grabados: 'Grabados' };

export default async function production(params) {
  const mod = params.mod || 'mates';
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Producción', null));
  root.appendChild(el('div', { class: 'tabs' },
    Object.entries(MODULES).map(([k, v]) =>
      el('a', { class: 'tab' + (mod === k ? ' is-active' : ''), href: '#/produccion?mod=' + k, text: v }))));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  async function load() {
    if (mod === 'grabados') return loadGrabados();
    const [purchases, prod] = await Promise.all([Purchases.list(mod), Production.list(mod)]);

    const buy = el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Compras de insumos' }),
        el('button', { class: 'btn btn--sm btn--primary', text: '+ Registrar compra', onClick: () => purchaseForm(mod, () => load()) }),
      ]),
      table([
        { key: 'purchase_date', label: 'Fecha', render: r => fmtDate(r.purchase_date) },
        { key: 'supply', label: 'Insumo', render: r => r.supply_name || '—' },
        { key: 'qty', label: 'Cant.', align: 'right', render: r => num(r.qty) },
        { key: 'total', label: 'Total', align: 'right', render: r => money(r.total) },
        { key: 'status', label: 'Estado', render: r => statusSelect(r, () => load()) },
        { key: 'paid', label: 'Pago', render: r => badge(r.paid ? 'Pagado' : 'No', r.paid ? 'ok' : 'warn') },
      ], purchases, { empty: 'Sin compras registradas.' }),
    ]);

    const make = el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Productos terminados' }),
        el('button', { class: 'btn btn--sm btn--primary', text: '+ Registrar terminados', onClick: () => productionForm(mod, () => load()) }),
      ]),
      table([
        { key: 'prod_date', label: 'Fecha', render: r => fmtDate(r.prod_date) },
        { key: 'product_name', label: 'Producto', render: r => r.product_name || '—' },
        { key: 'qty', label: 'Cant.', align: 'right', render: r => num(r.qty) },
        { key: 'labor_total', label: 'Mano de obra', align: 'right', render: r => money(r.labor_total) },
      ], prod, { empty: 'Sin producción registrada.' }),
    ]);

    body.replaceChildren(el('div', {}, [buy, make]));
  }

  async function loadGrabados() {
    const rows = await Engraving.list();
    body.replaceChildren(el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Pedidos de grabado' }),
        el('button', { class: 'btn btn--sm btn--primary', text: '+ Nuevo pedido', onClick: () => engravingForm(() => load()) }),
      ]),
      table([
        { key: 'entry_date', label: 'Ingreso', render: r => fmtDate(r.entry_date) },
        { key: 'exit_date', label: 'Salida', render: r => fmtDate(r.exit_date) },
        { key: 'client_name', label: 'Cliente', render: r => r.client_name || '—' },
        { key: 'model', label: 'Modelo', render: r => r.model || '—' },
        { key: 'qty', label: 'Cant.', align: 'right', render: r => num(r.qty) },
        { key: 'price', label: 'Precio', align: 'right', render: r => money(r.price) },
        { key: 'status', label: 'Estado', render: r => badge(label(r.status), r.status === 'entregado' ? 'ok' : 'info') },
      ], rows, { empty: 'Sin pedidos de grabado.' }),
    ]));
  }

  await load();
  return root;
}

function statusSelect(row, onDone) {
  const sel = el('select', { class: 'input input--sm' },
    ['pedido', 'a_levantar', 'recibido'].map(s => el('option', { value: s, text: label(s), selected: row.status === s })));
  sel.addEventListener('change', async () => {
    try { await Purchases.setStatus(row.id, sel.value);
      toast(sel.value === 'recibido' ? 'Recibido. Stock actualizado.' : 'Estado actualizado.'); onDone?.(); }
    catch (ex) { toast(ex.message, 'err'); }
  });
  return sel;
}

async function purchaseForm(mod, onDone) {
  const [supplies, suppliers] = await Promise.all([Supplies.list(), Suppliers.list()]);
  const supplySel = el('select', { class: 'input' },
    supplies.map(s => el('option', { value: s.id, text: s.name, dataset: { cost: s.unit_cost } })));
  const supplierSel = el('select', { class: 'input' },
    [el('option', { value: '', text: '— Proveedor —' })].concat(suppliers.map(s => el('option', { value: s.id, text: s.name }))));
  const qty = el('input', { class: 'input', type: 'number', min: '1', value: '1' });
  const price = el('input', { class: 'input', type: 'number', min: '0', step: '0.01' });
  const orderNum = el('input', { class: 'input', placeholder: 'N° pedido' });
  const date = el('input', { class: 'input', type: 'date', value: todayISO() });
  const status = el('select', { class: 'input' }, ['pedido','a_levantar','recibido'].map(s => el('option', { value: s, text: label(s) })));
  const paid = el('input', { type: 'checkbox' });
  const setPrice = () => { const opt = supplySel.selectedOptions[0]; if (opt && !price.value) price.value = opt.dataset.cost; };
  supplySel.addEventListener('change', setPrice); setPrice();

  modal({
    title: 'Registrar compra · ' + MODULES[mod], wide: true,
    body: el('div', { class: 'form' }, [
      el('div', { class: 'form-grid' }, [
        f('Insumo', supplySel), f('Proveedor', supplierSel), f('Cantidad', qty),
        f('Precio unitario', price), f('N° pedido', orderNum), f('Fecha', date), f('Estado', status),
      ]),
      el('label', { class: 'check' }, [ paid, el('span', { text: 'Pagado' }) ]),
      el('p', { class: 'muted', text: 'El stock suma solo cuando el estado es "Recibido".' }),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          try {
            await Purchases.create({ module: mod, supply_id: supplySel.value,
              supply_name: supplySel.selectedOptions[0]?.text, supplier_id: supplierSel.value || null,
              qty: Number(qty.value) || 0, unit_price: Number(price.value) || 0,
              order_number: orderNum.value || null, status: status.value, paid: paid.checked,
              purchase_date: date.value });
            toast('Compra registrada.'); close(); onDone?.();
          } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

async function productionForm(mod, onDone) {
  const products = await Products.list(true);
  const sel = el('select', { class: 'input' },
    products.map(p => el('option', { value: p.id, text: p.name, dataset: { labor: p.labor_cost } })));
  const qty = el('input', { class: 'input', type: 'number', min: '1', value: '1' });
  const labor = el('input', { class: 'input', type: 'number', min: '0', step: '0.01' });
  const date = el('input', { class: 'input', type: 'date', value: todayISO() });
  const operator = el('input', { class: 'input', placeholder: 'Operario (opcional)' });
  const setLabor = () => { const opt = sel.selectedOptions[0]; if (opt) labor.value = opt.dataset.labor || '0'; };
  sel.addEventListener('change', setLabor); setLabor();

  modal({
    title: 'Registrar productos terminados · ' + MODULES[mod], wide: true,
    body: el('div', { class: 'form' }, [
      el('div', { class: 'form-grid' }, [
        f('Producto', sel), f('Cantidad', qty), f('Mano de obra unit.', labor), f('Fecha', date), f('Operario', operator),
      ]),
      el('p', { class: 'muted', text: 'Al guardar, suma stock del producto y descuenta los insumos según la Ficha Técnica.' }),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          try {
            await Production.create({ module: mod, product_id: sel.value,
              product_name: sel.selectedOptions[0]?.text, qty: Number(qty.value) || 0,
              labor_unit_cost: Number(labor.value) || 0, prod_date: date.value, operator: operator.value || null });
            toast('Producción registrada. Stock actualizado.'); close(); onDone?.();
          } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

async function engravingForm(onDone) {
  const entry = el('input', { class: 'input', type: 'date', value: todayISO() });
  const client = el('input', { class: 'input', placeholder: 'Cliente' });
  const model = el('input', { class: 'input', placeholder: 'Modelo / detalle' });
  const qty = el('input', { class: 'input', type: 'number', min: '1', value: '1' });
  const price = el('input', { class: 'input', type: 'number', min: '0' });
  modal({
    title: 'Nuevo pedido de grabado',
    body: el('div', { class: 'form' }, [ f('Fecha ingreso', entry), f('Cliente', client), f('Modelo', model), f('Cantidad', qty), f('Precio', price) ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          try { await Engraving.create({ entry_date: entry.value, client_name: client.value || null,
            model: model.value || null, qty: Number(qty.value) || 0, price: Number(price.value) || 0 });
            toast('Pedido de grabado registrado.'); close(); onDone?.(); } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}
