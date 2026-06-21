// ════════════════════════════════════════════════════════════════════════
//  INVENTARIO — stock de productos terminados e insumos (tiempo real),
//  Ficha Técnica (matriz producto×insumo) y registro de mermas.
// ════════════════════════════════════════════════════════════════════════
import { Products, Supplies, Adjustments } from '../data.js';
import { session } from '../auth.js';
import { el, pageHeader, table, badge, money, num, toast, modal, loader, todayISO } from '../ui.js';

export default async function inventory(params) {
  const tab = params.tab || 'productos';
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Inventario', null, [
    el('button', { class: 'btn btn--ghost', text: '− Registrar merma / rotura', onClick: () => mermaForm(() => load()) }),
  ]));
  root.appendChild(el('div', { class: 'tabs' }, [
    t('productos', 'Productos terminados', tab),
    t('insumos', 'Insumos', tab),
    session.isOwner ? t('ficha', 'Ficha Técnica', tab) : null,
  ].filter(Boolean)));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  async function load() {
    if (tab === 'insumos') return loadSupplies();
    if (tab === 'ficha') return loadFicha();
    return loadProducts();
  }

  async function loadProducts() {
    const all = (await Products.stock()).filter(p => p.is_active);
    const search = el('input', { class: 'input input--sm', placeholder: 'Buscar producto por nombre…' });
    const wrap = el('div', {});
    const cols = [
      { key: 'name', label: 'Producto' },
      { key: 'category', label: 'Categoría', render: r => r.category || '—' },
      { key: 'stock_actual', label: 'Stock', align: 'center', render: r => stockLight(r.stock_actual, r.low_stock_threshold) },
      { key: 'cost', label: 'Costo', align: 'center', render: r => money(r.cost) },
      { key: 'price_minorista', label: 'P. Minorista', align: 'center', render: r => money(r.price_minorista) },
    ];
    if (session.isOwner) cols.push(
      { key: 'price_mayor_a', label: 'Mayor A', align: 'center', render: r => money(r.price_mayor_a) });
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const rows = q ? all.filter(p => (p.name || '').toLowerCase().includes(q)) : all;
      wrap.replaceChildren(table(cols, rows, { empty: 'No hay productos con ese nombre.' }));
    };
    search.addEventListener('input', draw);
    body.replaceChildren(el('div', {}, [ el('div', { class: 'toolbar' }, [searchBox(search)]), wrap ]));
    draw();
  }

  async function loadSupplies() {
    const all = await Supplies.stock();
    const search = el('input', { class: 'input input--sm', placeholder: 'Buscar insumo por nombre…' });
    const wrap = el('div', {});
    const cols = [
      { key: 'name', label: 'Insumo' },
      { key: 'stock_inicial', label: 'Inicial', align: 'center', render: r => num(r.stock_inicial) },
      { key: 'stock_actual', label: 'Stock actual', align: 'center', render: r => stockLight(r.stock_actual, r.low_stock_threshold) },
      { key: 'unit_cost', label: 'Costo unit.', align: 'center', render: r => money(r.unit_cost) },
    ];
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const rows = q ? all.filter(p => (p.name || '').toLowerCase().includes(q)) : all;
      wrap.replaceChildren(table(cols, rows, { empty: 'No hay insumos con ese nombre.' }));
    };
    search.addEventListener('input', draw);
    body.replaceChildren(el('div', {}, [ el('div', { class: 'toolbar' }, [searchBox(search)]), wrap ]));
    draw();
  }

  async function loadFicha() {
    const [products, supplies] = await Promise.all([Products.list(), Supplies.list()]);
    body.replaceChildren(el('div', {}, [
      el('p', { class: 'page-sub', text: 'Definí qué insumos consume cada producto. Al registrar producción se descuentan automáticamente del stock.' }),
      table([
        { key: 'name', label: 'Producto' },
        { key: 'category', label: 'Categoría', render: r => r.category || '—' },
        { key: 'edit', label: '', align: 'right', render: r => el('button', { class: 'btn btn--sm btn--ghost', text: 'Editar receta',
            onClick: () => fichaEditor(r, supplies, () => load()) }) },
      ], products.filter(p => !p.is_combo), { empty: 'Sin productos.' }),
    ]));
  }

  await load();
  return root;
}

async function fichaEditor(product, supplies, onDone) {
  const existing = await Products.recipe(product.id);
  const rows = existing.map(r => ({ supply_id: r.supply_id, qty: Number(r.qty) }));
  const wrap = el('div', { class: 'lines' });

  function addRow(preset) {
    const sel = el('select', { class: 'input' },
      [el('option', { value: '', text: '— Insumo —' })]
        .concat(supplies.map(s => el('option', { value: s.id, text: s.name }))));
    if (preset) sel.value = preset.supply_id;
    const qty = el('input', { class: 'input input--qty', type: 'number', min: '0', step: '0.01', value: preset ? preset.qty : '1' });
    const del = el('button', { class: 'btn btn--sm btn--ghost', html: '&times;', onClick: () => { row.remove(); } });
    const row = el('div', { class: 'line' }, [ sel, qty, del ]);
    row._get = () => ({ supply_id: sel.value, qty: Number(qty.value) || 0 });
    wrap.appendChild(row);
  }
  rows.forEach(addRow);
  if (!rows.length) addRow();

  modal({
    title: 'Receta · ' + product.name, wide: true,
    body: el('div', { class: 'form' }, [
      el('p', { class: 'muted', text: 'Cantidad de cada insumo por unidad producida.' }),
      wrap,
      el('button', { class: 'btn btn--sm btn--ghost', text: '+ Agregar insumo', onClick: () => addRow() }),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          const data = [...wrap.querySelectorAll('.line')].map(r => r._get()).filter(r => r.supply_id && r.qty > 0);
          try { await Products.setRecipe(product.id, data); toast('Receta guardada.'); close(); onDone?.(); }
          catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
}

async function mermaForm(onDone) {
  const [products, supplies] = await Promise.all([Products.list(true), Supplies.list()]);
  const kind = el('select', { class: 'input' }, [
    el('option', { value: 'product', text: 'Producto terminado' }),
    el('option', { value: 'supply', text: 'Insumo' }),
  ]);
  const itemSel = el('select', { class: 'input' });
  const fill = () => itemSel.replaceChildren(...(kind.value === 'product' ? products : supplies)
    .map(x => el('option', { value: x.id, text: x.name })));
  fill(); kind.addEventListener('change', fill);
  const qty = el('input', { class: 'input', type: 'number', min: '1', value: '1' });
  const reason = el('input', { class: 'input', placeholder: 'Motivo (rotura, fallado, perdido…)' });
  const date = el('input', { class: 'input', type: 'date', value: todayISO() });

  modal({
    title: 'Registrar merma / rotura',
    body: el('div', { class: 'form' }, [
      f('Tipo', kind), f('Ítem', itemSel), f('Cantidad', qty), f('Motivo', reason), f('Fecha', date),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Descontar del stock', variant: 'danger', onClick: async (close) => {
          try {
            await Adjustments.create({
              product_id: kind.value === 'product' ? itemSel.value : null,
              supply_id: kind.value === 'supply' ? itemSel.value : null,
              qty: Number(qty.value) || 0, reason: reason.value || null, adj_date: date.value,
            });
            toast('Merma registrada, stock actualizado.'); close(); onDone?.();
          } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

// Semáforo de stock: rojo (poco/negativo) · amarillo (medio) · verde (bastante).
// Si el producto tiene umbral configurado lo usa; si no, usa cortes por defecto.
function stockLight(stock, threshold) {
  const s = Number(stock) || 0;
  const t = Number(threshold) || 0;
  let kind;
  if (t > 0) kind = s <= t ? 'danger' : (s <= t * 2 ? 'warn' : 'ok');
  else kind = s <= 5 ? 'danger' : (s <= 20 ? 'warn' : 'ok');
  return badge(num(s), kind);
}
// Caja de búsqueda linda: ícono lupa + input redondeado.
function searchBox(input) {
  input.classList.add('searchbox__input');
  return el('div', { class: 'searchbox' }, [
    el('span', { class: 'searchbox__icon', text: '🔍' }),
    input,
  ]);
}

function t(key, lbl, active) {
  return el('a', { class: 'tab' + (active === key ? ' is-active' : ''), href: '#/inventario?tab=' + key, text: lbl });
}
