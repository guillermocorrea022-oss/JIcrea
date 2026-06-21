// ════════════════════════════════════════════════════════════════════════
//  FINANZAS — Costos y Ganancias, Flujo de Caja (solo lectura) y Pagos Empresa.
// ════════════════════════════════════════════════════════════════════════
import { Finance, CompanyPayments } from '../data.js';
import { el, pageHeader, table, badge, money, fmtDate, toast, modal, loader,
         monthLabel, firstOfMonthISO, confirmDialog } from '../ui.js';
import { lineChart } from './charts.js';

const CONCEPTS = ['BPS', 'DGI', 'FIX', 'Alquiler', 'UTE', 'OSE', 'Contador', 'Marketing', 'Otros'];

export default async function finance(params) {
  const tab = params.tab || 'resumen';
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Finanzas', null));
  root.appendChild(el('div', { class: 'tabs' }, [
    t('resumen', 'Costos y Ganancias', tab),
    t('caja', 'Flujo de Caja', tab),
    t('pagos', 'Pagos Empresa', tab),
  ]));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  async function load() {
    if (tab === 'caja') return loadCaja();
    if (tab === 'pagos') return loadPagos();
    return loadResumen();
  }

  async function loadResumen() {
    const cash = await Finance.cashFlow();
    const sales = await Finance.salesMonthly();
    const byMonth = {};
    cash.forEach(c => byMonth[c.period] = { ...c });
    sales.forEach(s => { byMonth[s.period] = { ...(byMonth[s.period] || {}), ...s }; });
    const rows = Object.values(byMonth).sort((a, b) => (a.period < b.period ? 1 : -1));
    rows.forEach(r => {
      r.margen = Number(r.margen_bruto || 0);
      r.ganancia = Number(r.facturacion || 0) - Number(r.costo_ventas || 0)
        - Number(r.egresos_fijos || 0) - Number(r.mano_obra || 0);
    });
    body.replaceChildren(table([
      { key: 'period', label: 'Mes', render: r => monthLabel(r.period) },
      { key: 'facturacion', label: 'Facturación', align: 'right', render: r => money(r.facturacion) },
      { key: 'margen', label: 'Margen bruto', align: 'right', render: r => money(r.margen) },
      { key: 'egresos_fijos', label: 'Costos fijos', align: 'right', render: r => money(r.egresos_fijos) },
      { key: 'mano_obra', label: 'Mano de obra', align: 'right', render: r => money(r.mano_obra) },
      { key: 'ganancia', label: 'Ganancia neta', align: 'right', render: r => {
          const g = r.ganancia; return badge(money(g), g >= 0 ? 'ok' : 'danger'); } },
    ], rows, { empty: 'Todavía no hay datos financieros.' }));
  }

  async function loadCaja() {
    const cash = await Finance.cashFlow();
    const sorted = [...cash].sort((a, b) => (a.period < b.period ? -1 : 1));
    let acum = 0;
    const withAcum = sorted.map(c => { acum += Number(c.saldo_mensual || 0); return { ...c, acumulado: acum }; });
    const chart = lineChart(withAcum.map(c => ({ x: monthLabel(c.period).slice(0, 3), y: c.acumulado })), { label: 'Saldo acumulado' });
    body.replaceChildren(el('div', {}, [
      el('section', { class: 'card' }, [
        el('h2', { class: 'card__title', text: 'Evolución del saldo acumulado' }), chart,
      ]),
      el('p', { class: 'muted', text: 'El Flujo de Caja es solo lectura: se alimenta de ventas, pagos empresa y mano de obra.' }),
      table([
        { key: 'period', label: 'Mes', render: r => monthLabel(r.period) },
        { key: 'ingresos', label: 'Ingresos', align: 'right', render: r => money(r.ingresos) },
        { key: 'egresos_fijos', label: 'Costos fijos', align: 'right', render: r => money(r.egresos_fijos) },
        { key: 'mano_obra', label: 'Mano obra', align: 'right', render: r => money(r.mano_obra) },
        { key: 'compras_insumos', label: 'Insumos', align: 'right', render: r => money(r.compras_insumos) },
        { key: 'saldo_mensual', label: 'Saldo mes', align: 'right', render: r => badge(money(r.saldo_mensual), r.saldo_mensual >= 0 ? 'ok' : 'danger') },
        { key: 'acumulado', label: 'Acumulado', align: 'right', render: r => money(r.acumulado) },
      ], [...withAcum].reverse(), { empty: 'Sin movimientos.' }),
    ]));
  }

  async function loadPagos() {
    const rows = await CompanyPayments.list();
    body.replaceChildren(el('div', {}, [
      el('div', { class: 'page-actions', style: 'margin-bottom:1rem' }, [
        el('button', { class: 'btn btn--primary', text: '+ Registrar pago', onClick: () => pagoForm(() => load()) }),
      ]),
      table([
        { key: 'period_month', label: 'Mes', render: r => monthLabel(r.period_month) },
        { key: 'company', label: 'Empresa' },
        { key: 'concept', label: 'Concepto' },
        { key: 'amount', label: 'Monto', align: 'right', render: r => money(r.amount) },
        { key: 'registered_date', label: 'Registrado', render: r => fmtDate(r.registered_date) },
        { key: 'del', label: '', align: 'right', render: r => el('button', { class: 'btn btn--sm btn--ghost', html: '&times;',
            onClick: () => confirmDialog('¿Borrar este pago?', async () => { await CompanyPayments.remove(r.id); toast('Borrado.'); load(); }, { danger: true, yesLabel: 'Borrar' }) }) },
      ], rows, { empty: 'Sin pagos registrados.' }),
    ]));
  }

  await load();
  return root;
}

async function pagoForm(onDone) {
  const company = el('select', { class: 'input' }, ['JIcrea', 'AR&BE'].map(c => el('option', { text: c })));
  const month = el('input', { class: 'input', type: 'month', value: firstOfMonthISO(-1).slice(0, 7) });
  const concept = el('select', { class: 'input' }, CONCEPTS.map(c => el('option', { text: c })));
  const amount = el('input', { class: 'input', type: 'number', min: '0', step: '0.01' });
  modal({
    title: 'Registrar pago empresa',
    body: el('div', { class: 'form' }, [
      f('Empresa', company), f('Mes', month), f('Concepto', concept), f('Monto', amount),
      el('p', { class: 'muted', text: 'Se registra el día 10 con datos del mes anterior. No se puede duplicar empresa+mes+concepto.' }),
    ]),
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      { label: 'Guardar', variant: 'primary', onClick: async (close) => {
          try {
            await CompanyPayments.create({ company: company.value, period_month: month.value + '-01',
              concept: concept.value, amount: Number(amount.value) || 0 });
            toast('Pago registrado.'); close(); onDone?.();
          } catch (ex) { toast(ex.message?.includes('duplicate') ? 'Ya existe ese concepto para ese mes y empresa.' : ex.message, 'err'); } } },
    ],
  });
  function f(l, i) { return el('label', { class: 'field' }, [ el('span', { text: l }), i ]); }
}

function t(key, lbl, active) {
  return el('a', { class: 'tab' + (active === key ? ' is-active' : ''), href: '#/finanzas?tab=' + key, text: lbl });
}
