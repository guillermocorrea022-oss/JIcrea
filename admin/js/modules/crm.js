// ════════════════════════════════════════════════════════════════════════
//  CRM — clientes, historial automático, TOP por facturación, contacto semanal.
// ════════════════════════════════════════════════════════════════════════
import { Clients } from '../data.js';
import { session } from '../auth.js';
import { el, pageHeader, table, badge, money, fmtDate, label, toast, modal, loader } from '../ui.js';

export default async function crm(params) {
  const tab = params.tab || 'todos';
  const root = el('div', { class: 'view' });
  const actions = session.isOwner ? [
    el('button', { class: 'btn btn--primary', text: '+ Nuevo cliente', onClick: () => clientForm(null, () => load()) }),
  ] : [];
  root.appendChild(pageHeader('Clientes', null, actions));
  root.appendChild(el('div', { class: 'tabs' }, [
    t('todos', 'Todos', tab), t('top', 'TOP por facturación', tab), t('semanal', 'Contacto semanal', tab),
  ]));
  const search = el('input', { class: 'input input--sm', placeholder: 'Buscar por nombre, tipo o zona…' });
  root.appendChild(el('div', { class: 'filters' }, [search]));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  let clients = [], history = {};

  async function load() {
    [clients, history] = await Promise.all([
      Clients.list(),
      Clients.history().then(h => Object.fromEntries(h.map(x => [x.client_id, x]))),
    ]);
    render();
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    let rows = clients.map(c => ({ ...c, h: history[c.id] || {} }));
    if (q) rows = rows.filter(c => [c.name, c.client_type, c.zone, c.locality].join(' ').toLowerCase().includes(q));
    if (tab === 'top') rows = rows.filter(c => c.h.total_facturado > 0)
      .sort((a, b) => (b.h.total_facturado || 0) - (a.h.total_facturado || 0)).slice(0, 20);
    if (tab === 'semanal') rows = rows.filter(c => c.weekly_contact);

    const cols = [
      { key: 'name', label: 'Cliente' },
      { key: 'client_type', label: 'Tipo', render: r => r.client_type ? label(r.client_type) : '—' },
      { key: 'zone', label: 'Zona', render: r => r.zone || r.locality || '—' },
      { key: 'responsible', label: 'Responsable', render: r => r.responsible || '—' },
      { key: 'total', label: 'Facturado', align: 'right', render: r => money(r.h.total_facturado) },
      { key: 'last', label: 'Última compra', render: r => r.h.ultima_compra ? fmtDate(r.h.ultima_compra) : '—' },
    ];
    body.replaceChildren(table(cols, rows, {
      empty: tab === 'semanal' ? 'No hay clientes marcados para contacto semanal.' : 'Sin clientes.',
      onRow: r => session.isOwner ? clientForm(r, () => load()) : clientDetail(r),
    }));
  }

  search.addEventListener('input', render);
  await load();
  return root;
}

function clientDetail(c) {
  modal({ title: c.name, body: el('div', { class: 'detail-grid' }, [
    kv('Tipo', c.client_type ? label(c.client_type) : '—'), kv('Zona', c.zone || c.locality || '—'),
    kv('Responsable', c.responsible || '—'), kv('Contacto', c.contact || '—'),
  ]), actions: [{ label: 'Cerrar', variant: 'ghost' }] });
}

function clientForm(c, onDone) {
  const name = el('input', { class: 'input', value: c?.name || '', placeholder: 'Nombre / razón social' });
  const type = el('select', { class: 'input' }, [
    el('option', { value: '', text: '— Tipo —' }),
    ...['mayor_a','mayor_b','minorista','empresarial'].map(x => el('option', { value: x, text: label(x), selected: c?.client_type === x })),
  ]);
  const locality = el('input', { class: 'input', value: c?.locality || '', placeholder: 'Localidad' });
  const zone = el('input', { class: 'input', value: c?.zone || '', placeholder: 'Zona' });
  const responsible = el('input', { class: 'input', value: c?.responsible || '', placeholder: 'Responsable' });
  const category = el('input', { class: 'input', value: c?.category || '', placeholder: 'Categoría' });
  const contact = el('input', { class: 'input', value: c?.contact || '', placeholder: 'Teléfono / email' });
  const weekly = el('input', { type: 'checkbox' }); weekly.checked = !!c?.weekly_contact;

  modal({
    title: c ? 'Editar cliente' : 'Nuevo cliente', wide: true,
    body: el('div', { class: 'form' }, [
      el('div', { class: 'form-grid' }, [
        f('Nombre', name), f('Tipo', type), f('Localidad', locality), f('Zona', zone),
        f('Responsable', responsible), f('Categoría', category), f('Contacto', contact),
      ]),
      el('label', { class: 'check' }, [ weekly, el('span', { text: 'Marcar para contacto semanal' }) ]),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          if (!name.value.trim()) { toast('Poné un nombre.', 'err'); return; }
          const data = { name: name.value.trim(), client_type: type.value || null, locality: locality.value || null,
            zone: zone.value || null, responsible: responsible.value || null, category: category.value || null,
            contact: contact.value || null, weekly_contact: weekly.checked };
          try { c ? await Clients.update(c.id, data) : await Clients.create(data);
            toast('Cliente guardado.'); close(); onDone?.(); } catch (ex) { toast(ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

const kv = (k, v) => el('div', { class: 'kv' }, [ el('span', { class: 'kv__k', text: k }), el('span', { class: 'kv__v', text: v }) ]);
function t(key, lbl, active) {
  return el('a', { class: 'tab' + (active === key ? ' is-active' : ''), href: '#/crm?tab=' + key, text: lbl });
}
