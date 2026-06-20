// ════════════════════════════════════════════════════════════════════════
//  REPORTES — márgenes por producto, ventas por canal, evolución mensual.
//  Exportación a CSV (Excel) y a PDF (impresión del navegador).
// ════════════════════════════════════════════════════════════════════════
import { Sales, Finance } from '../data.js';
import { el, pageHeader, table, badge, money, num, pct, monthLabel, loader, toast } from '../ui.js';
import { barChart } from './charts.js';

export default async function reports() {
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Reportes', null, [
    el('button', { class: 'btn btn--ghost', text: '⎙ Imprimir / PDF', onClick: () => window.print() }),
  ]));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  const [margins, sales, monthly] = await Promise.all([
    Sales.margins(), Sales.list({}), Finance.salesMonthly(),
  ]);

  // Márgenes por producto (top rentables)
  const topMargins = [...margins].sort((a, b) => (b.margen_total || 0) - (a.margen_total || 0)).slice(0, 20);

  // Ventas por canal
  const counted = sales.filter(s => ['confirmado','en_proceso','entregado'].includes(s.status));
  const byChannel = {};
  counted.forEach(s => { byChannel[s.sale_type] = (byChannel[s.sale_type] || 0) + Number(s.total || 0); });
  const channelRows = Object.entries(byChannel).map(([k, v]) => ({ canal: k, total: v }));
  const totalChannel = channelRows.reduce((s, r) => s + r.total, 0);

  // Evolución mensual
  const monthSorted = [...monthly].sort((a, b) => (a.period < b.period ? -1 : 1));
  const chart = barChart(monthSorted.map(m => ({ x: monthLabel(m.period).slice(0, 3), y: Number(m.facturacion || 0) })));

  body.replaceChildren(el('div', {}, [
    el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Evolución de facturación mensual' }),
      ]), chart,
    ]),
    el('div', { class: 'col-2' }, [
      el('section', { class: 'card' }, [
        el('div', { class: 'card__head' }, [
          el('h2', { class: 'card__title', text: 'Ventas por canal' }),
          csvBtn('ventas-por-canal', channelRows.map(r => ({ Canal: r.canal, Total: r.total }))),
        ]),
        table([
          { key: 'canal', label: 'Canal', render: r => ({ mayor_a: 'Mayor A', mayor_b: 'Mayor B', minorista: 'Minorista' }[r.canal] || r.canal) },
          { key: 'total', label: 'Facturación', align: 'right', render: r => money(r.total) },
          { key: 'pct', label: '%', align: 'right', render: r => pct(totalChannel ? r.total / totalChannel * 100 : 0) },
        ], channelRows, { empty: 'Sin ventas.' }),
      ]),
      el('section', { class: 'card' }, [
        el('div', { class: 'card__head' }, [
          el('h2', { class: 'card__title', text: 'Top productos más rentables' }),
          csvBtn('margenes-producto', topMargins.map(r => ({ Producto: r.product_name, Unidades: r.unidades_vendidas, Facturado: r.facturado, Margen: r.margen_total }))),
        ]),
        table([
          { key: 'product_name', label: 'Producto' },
          { key: 'unidades_vendidas', label: 'Unid.', align: 'right', render: r => num(r.unidades_vendidas) },
          { key: 'margen_total', label: 'Margen', align: 'right', render: r => money(r.margen_total) },
        ], topMargins, { empty: 'Sin datos de márgenes.' }),
      ]),
    ]),
  ]));

  return root;
}

function csvBtn(filename, rows) {
  return el('button', { class: 'btn btn--sm btn--ghost', text: '↓ Excel (CSV)', onClick: () => exportCSV(filename, rows) });
}

function exportCSV(filename, rows) {
  if (!rows || !rows.length) { toast('Nada para exportar.', 'err'); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename + '.csv' });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
