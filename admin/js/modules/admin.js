// ════════════════════════════════════════════════════════════════════════
//  ADMINISTRACIÓN — catálogo de productos, insumos, proveedores. Solo dueño.
// ════════════════════════════════════════════════════════════════════════
import { Products, Supplies, Suppliers } from '../data.js';
import { el, pageHeader, table, badge, money, toast, modal, loader } from '../ui.js';

export default async function admin(params) {
  const tab = params.tab || 'productos';
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Administración', null));
  root.appendChild(el('div', { class: 'tabs' }, [
    t('productos', 'Catálogo', tab), t('insumos', 'Insumos', tab), t('proveedores', 'Proveedores', tab),
  ]));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  async function load() {
    if (tab === 'insumos') return loadSupplies();
    if (tab === 'proveedores') return loadSuppliers();
    return loadProducts();
  }

  async function loadProducts() {
    const rows = await Products.list();
    body.replaceChildren(el('div', {}, [
      el('div', { class: 'page-actions', style: 'margin-bottom:1rem' }, [
        el('button', { class: 'btn btn--primary', text: '+ Nuevo producto', onClick: () => productForm(null, () => load()) }),
      ]),
      table([
        { key: 'name', label: 'Producto' },
        { key: 'category', label: 'Categoría', render: r => r.category || '—' },
        { key: 'cost', label: 'Costo', align: 'right', render: r => money(r.cost) },
        { key: 'a', label: 'Mayor A', align: 'right', render: r => money(r.price_mayor_a) },
        { key: 'b', label: 'Mayor B', align: 'right', render: r => money(r.price_mayor_b) },
        { key: 'm', label: 'Minorista', align: 'right', render: r => money(r.price_minorista) },
        { key: 'labor', label: 'M. obra', align: 'right', render: r => money(r.labor_cost) },
        { key: 'active', label: '', render: r => r.is_active ? '' : badge('Inactivo', 'muted') },
      ], rows, { empty: 'Sin productos.', onRow: r => productForm(r, () => load()) }),
    ]));
  }

  async function loadSupplies() {
    const rows = await Supplies.list();
    body.replaceChildren(el('div', {}, [
      el('div', { class: 'page-actions', style: 'margin-bottom:1rem' }, [
        el('button', { class: 'btn btn--primary', text: '+ Nuevo insumo', onClick: () => supplyForm(null, () => load()) }),
      ]),
      table([
        { key: 'name', label: 'Insumo' },
        { key: 'supplier', label: 'Proveedor', render: r => r.suppliers?.name || '—' },
        { key: 'unit_cost', label: 'Costo unit.', align: 'right', render: r => money(r.unit_cost) },
        { key: 'stock_inicial', label: 'Stock inicial', align: 'right' },
      ], rows, { empty: 'Sin insumos.', onRow: r => supplyForm(r, () => load()) }),
    ]));
  }

  async function loadSuppliers() {
    const rows = await Suppliers.list();
    body.replaceChildren(el('div', {}, [
      el('div', { class: 'page-actions', style: 'margin-bottom:1rem' }, [
        el('button', { class: 'btn btn--primary', text: '+ Nuevo proveedor', onClick: () => supplierForm(null, () => load()) }),
      ]),
      table([
        { key: 'name', label: 'Proveedor' },
        { key: 'supply_type', label: 'Provee', render: r => r.supply_type || '—' },
        { key: 'zone', label: 'Zona', render: r => r.zone || '—' },
        { key: 'contact', label: 'Contacto', render: r => r.contact || '—' },
      ], rows, { empty: 'Sin proveedores.', onRow: r => supplierForm(r, () => load()) }),
    ]));
  }

  await load();
  return root;
}

async function productForm(p, onDone) {
  const suppliers = [];
  const inp = (v, attrs = {}) => el('input', { class: 'input', value: v ?? '', ...attrs });
  const name = inp(p?.name, { placeholder: 'Nombre oficial' });
  const category = inp(p?.category, { placeholder: 'Categoría' });
  const cost = inp(p?.cost, { type: 'number', min: '0', step: '0.01' });
  const a = inp(p?.price_mayor_a, { type: 'number', min: '0', step: '0.01' });
  const b = inp(p?.price_mayor_b, { type: 'number', min: '0', step: '0.01' });
  const m = inp(p?.price_minorista, { type: 'number', min: '0', step: '0.01' });
  const labor = inp(p?.labor_cost, { type: 'number', min: '0', step: '0.01' });
  const lowStock = inp(p?.low_stock_threshold, { type: 'number', min: '0', step: '1' });
  const stockIni = inp(p?.stock_inicial, { type: 'number', min: '0', step: '1' });
  const active = el('input', { type: 'checkbox' }); active.checked = p ? p.is_active : true;
  const st = el('input', { type: 'checkbox' }); st.checked = !!p?.is_st;

  modal({
    title: p ? 'Editar producto' : 'Nuevo producto', wide: true,
    body: el('div', { class: 'form' }, [
      el('div', { class: 'form-grid' }, [
        f('Nombre', name), f('Categoría', category), f('Costo', cost),
        f('Precio Mayor A', a), f('Precio Mayor B', b), f('Precio Minorista', m),
        f('Mano de obra', labor), f('Umbral stock bajo', lowStock), f('Stock inicial (conteo)', stockIni),
      ]),
      el('div', { class: 'check-row' }, [
        el('label', { class: 'check' }, [ active, el('span', { text: 'Activo' }) ]),
        el('label', { class: 'check' }, [ st, el('span', { text: 'Semiterminado (ST)' }) ]),
      ]),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          if (!name.value.trim()) { toast('Poné un nombre.', 'err'); return; }
          const data = { name: name.value.trim(), category: category.value || null,
            cost: +cost.value || 0, price_mayor_a: a.value === '' ? null : +a.value,
            price_mayor_b: b.value === '' ? null : +b.value, price_minorista: m.value === '' ? null : +m.value,
            labor_cost: +labor.value || 0, low_stock_threshold: +lowStock.value || 0,
            stock_inicial: +stockIni.value || 0, is_active: active.checked, is_st: st.checked };
          try { p ? await Products.update(p.id, data) : await Products.create(data);
            toast('Producto guardado.'); close(); onDone?.(); } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

async function supplyForm(s, onDone) {
  const suppliers = await Suppliers.list();
  const name = el('input', { class: 'input', value: s?.name || '', placeholder: 'Nombre' });
  const supplier = el('select', { class: 'input' },
    [el('option', { value: '', text: '— Proveedor —' })].concat(suppliers.map(x => el('option', { value: x.id, text: x.name, selected: s?.supplier_id === x.id }))));
  const cost = el('input', { class: 'input', type: 'number', min: '0', step: '0.01', value: s?.unit_cost ?? '' });
  const lowStock = el('input', { class: 'input', type: 'number', min: '0', value: s?.low_stock_threshold ?? '' });
  const stockIni = el('input', { class: 'input', type: 'number', min: '0', value: s?.stock_inicial ?? '' });
  modal({
    title: s ? 'Editar insumo' : 'Nuevo insumo', wide: true,
    body: el('div', { class: 'form' }, [ el('div', { class: 'form-grid' }, [
      f('Nombre', name), f('Proveedor', supplier), f('Costo unit.', cost), f('Umbral stock bajo', lowStock), f('Stock inicial', stockIni),
    ]) ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          if (!name.value.trim()) { toast('Poné un nombre.', 'err'); return; }
          const data = { name: name.value.trim(), supplier_id: supplier.value || null,
            unit_cost: +cost.value || 0, low_stock_threshold: +lowStock.value || 0, stock_inicial: +stockIni.value || 0 };
          try { s ? await Supplies.update(s.id, data) : await Supplies.create(data);
            toast('Insumo guardado.'); close(); onDone?.(); } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

async function supplierForm(s, onDone) {
  const name = el('input', { class: 'input', value: s?.name || '', placeholder: 'Nombre' });
  const type = el('input', { class: 'input', value: s?.supply_type || '', placeholder: 'Qué provee' });
  const zone = el('input', { class: 'input', value: s?.zone || '', placeholder: 'Zona' });
  const contact = el('input', { class: 'input', value: s?.contact || '', placeholder: 'Contacto' });
  modal({
    title: s ? 'Editar proveedor' : 'Nuevo proveedor',
    body: el('div', { class: 'form' }, [ f('Nombre', name), f('Provee', type), f('Zona', zone), f('Contacto', contact) ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          if (!name.value.trim()) { toast('Poné un nombre.', 'err'); return; }
          const data = { name: name.value.trim(), supply_type: type.value || null, zone: zone.value || null, contact: contact.value || null };
          try { s ? await Suppliers.update(s.id, data) : await Suppliers.create(data);
            toast('Proveedor guardado.'); close(); onDone?.(); } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

function t(key, lbl, active) {
  return el('a', { class: 'tab' + (active === key ? ' is-active' : ''), href: '#/admin?tab=' + key, text: lbl });
}
