// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD — métricas del mes, alertas de stock, pedidos web, últimas ventas.
// ════════════════════════════════════════════════════════════════════════
import { Sales, Products, Supplies, Finance, Purchases, subscribe } from '../data.js';
import { session } from '../auth.js';
import { el, statCard, pageHeader, table, badge, money, num, fmtDate, label, toast,
         confirmDialog, loader, firstOfMonthISO, monthLabel } from '../ui.js';
import { go } from '../router.js';
import { confirmSale, cancelSale, saleDetailModal } from './sales.js';

export default async function dashboard() {
  const root = el('div', { class: 'view' });
  root.appendChild(pageHeader('Dashboard', monthLabel(new Date())));
  const body = el('div', {}, [loader()]);
  root.appendChild(body);

  let unsub = [];
  const cleanup = () => unsub.forEach(u => u());
  // limpiar suscripciones al salir de la vista
  window.addEventListener('hashchange', cleanup, { once: true });

  async function load() {
    const monthStart = firstOfMonthISO();
    const [monthSales, pending, prodStock, supStock, recent, cash, purchPending] = await Promise.all([
      Sales.list({ from: monthStart }),
      Sales.pendingWeb(),
      Products.stock(),
      Supplies.stock(),
      Sales.recent(12),
      session.isOwner ? Finance.cashFlow() : Promise.resolve([]),
      Purchases.pending(),
    ]);

    // Métricas del mes (solo ventas que cuentan)
    const counted = monthSales.filter(s => ['confirmado','en_proceso','entregado'].includes(s.status));
    const facturacion = counted.reduce((s, v) => s + Number(v.total || 0), 0);
    const costo = counted.reduce((s, v) => s + Number(v.total_cost || 0), 0);
    const margen = facturacion - costo;
    const fixedThisMonth = (cash.find(c => c.period === monthStart)?.egresos_fijos) || 0;
    const ganancia = margen - fixedThisMonth;
    const saldoAcum = cash.reduce((s, c) => s + Number(c.saldo_mensual || 0), 0);

    const pend = monthSales.filter(s => s.status === 'pendiente' || s.status === 'confirmado').length;
    const entreg = monthSales.filter(s => s.status === 'entregado').length;
    const canc = monthSales.filter(s => s.status === 'cancelado').length;

    const lowProducts = prodStock.filter(p => p.is_active && Number(p.stock_actual) <= Number(p.low_stock_threshold || 0) && Number(p.low_stock_threshold || 0) > 0);
    const lowSupplies = supStock.filter(s => Number(s.stock_actual) <= Number(s.low_stock_threshold || 0) && Number(s.low_stock_threshold || 0) > 0);

    const content = el('div', {});

    // Stat cards
    content.appendChild(el('div', { class: 'stat-grid' }, [
      statCard('Facturación del mes', money(facturacion), `${counted.length} ventas`, 'gold'),
      statCard('Margen bruto', money(margen), facturacion ? Math.round(margen / facturacion * 100) + '%' : '—'),
      session.isOwner ? statCard('Ganancia neta estimada', money(ganancia), 'menos costos fijos', ganancia >= 0 ? 'ok' : 'danger') : null,
      session.isOwner ? statCard('Saldo de caja', money(saldoAcum), 'acumulado') : null,
      statCard('Pedidos', `${pend} / ${entreg} / ${canc}`, 'pend. / entreg. / canc.'),
    ].filter(Boolean)));

    // Pedidos web pendientes
    if (session.isOwner) {
      const pendingCard = el('section', { class: 'card' }, [
        el('div', { class: 'card__head' }, [
          el('h2', { class: 'card__title', text: 'Pedidos pendientes de confirmar' }),
          badge(String(pending.length), pending.length ? 'warn' : 'muted'),
        ]),
      ]);
      if (!pending.length) {
        pendingCard.appendChild(el('div', { class: 'empty', text: 'No hay pedidos pendientes.' }));
      } else {
        pendingCard.appendChild(table([
          { key: 'order_date', label: 'Fecha', render: r => fmtDate(r.created_at) },
          { key: 'client_name', label: 'Cliente', render: r => r.client_name || '—' },
          { key: 'channel', label: 'Canal', render: r => r.channel || 'web' },
          { key: 'total', label: 'Total', align: 'right', render: r => money(r.total) },
          { key: 'acc', label: '', align: 'right', render: r => {
              const wrap = el('div', { class: 'row-actions' });
              wrap.appendChild(el('button', { class: 'btn btn--sm btn--ghost', text: 'Ver',
                onClick: (e) => { e.stopPropagation(); saleDetailModal(r.id); } }));
              wrap.appendChild(el('button', { class: 'btn btn--sm btn--primary', text: 'Confirmar',
                onClick: async (e) => { e.stopPropagation();
                  try { await confirmSale(r.id); toast('Pedido confirmado, stock descontado.'); load(); }
                  catch (ex) { toast(ex.message, 'err'); } } }));
              wrap.appendChild(el('button', { class: 'btn btn--sm btn--danger', text: 'Rechazar',
                onClick: (e) => { e.stopPropagation();
                  confirmDialog('¿Rechazar este pedido? Queda archivado como cancelado.',
                    async () => { await cancelSale(r.id); toast('Pedido rechazado.'); load(); }, { danger: true, yesLabel: 'Rechazar' }); } }));
              return wrap;
            } },
        ], pending));
      }
      content.appendChild(pendingCard);
    }

    // Insumos por recibir / a levantar (todos los usuarios)
    const purchCard = el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Insumos por recibir' }),
        badge(String(purchPending.length), purchPending.length ? 'warn' : 'muted'),
      ]),
    ]);
    if (!purchPending.length) {
      purchCard.appendChild(el('div', { class: 'empty', text: 'No hay compras pendientes. Todo recibido.' }));
    } else {
      purchCard.appendChild(table([
        { key: 'purchase_date', label: 'Fecha', render: r => fmtDate(r.purchase_date) },
        { key: 'supply_name', label: 'Insumo', render: r => r.supply_name || '—' },
        { key: 'module', label: 'Módulo', render: r => label(r.module) },
        { key: 'qty', label: 'Cant.', align: 'right', render: r => num(r.qty) },
        { key: 'status', label: 'Estado', render: r => badge(label(r.status), r.status === 'a_levantar' ? 'warn' : 'muted') },
        { key: 'acc', label: '', align: 'right', render: r => {
            const wrap = el('div', { class: 'row-actions' });
            if (r.status === 'pedido')
              wrap.appendChild(el('button', { class: 'btn btn--sm btn--ghost', text: 'A levantar',
                onClick: async () => { await Purchases.setStatus(r.id, 'a_levantar'); toast('Marcado: a levantar.'); load(); } }));
            wrap.appendChild(el('button', { class: 'btn btn--sm btn--primary', text: 'Recibido ✓',
              onClick: async () => { try { await Purchases.setStatus(r.id, 'recibido'); toast('Recibido. Stock actualizado.'); load(); } catch (ex) { toast(ex.message, 'err'); } } }));
            return wrap;
          } },
      ], purchPending));
    }
    content.appendChild(purchCard);

    // Grilla: alertas de stock + últimas ventas
    const grid = el('div', { class: 'col-2' });

    const alerts = el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [ el('h2', { class: 'card__title', text: 'Alertas de stock' }) ]),
    ]);
    if (!lowProducts.length && !lowSupplies.length) {
      alerts.appendChild(el('div', { class: 'empty', text: 'Todo el stock está por encima del umbral.' }));
    } else {
      if (lowProducts.length) {
        alerts.appendChild(el('h4', { class: 'card__subtitle', text: 'Productos con stock bajo' }));
        alerts.appendChild(table([
          { key: 'name', label: 'Producto' },
          { key: 'stock_actual', label: 'Stock', align: 'right', render: r => badge(String(Math.round(r.stock_actual)), 'warn') },
        ], lowProducts));
      }
      if (lowSupplies.length) {
        alerts.appendChild(el('h4', { class: 'card__subtitle', text: 'Insumos con stock crítico' }));
        alerts.appendChild(table([
          { key: 'name', label: 'Insumo' },
          { key: 'stock_actual', label: 'Stock', align: 'right', render: r => badge(String(Math.round(r.stock_actual)), 'danger') },
        ], lowSupplies));
      }
    }
    grid.appendChild(alerts);

    const recentCard = el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: 'Últimas ventas' }),
        el('button', { class: 'btn btn--sm btn--ghost', text: 'Ver todas', onClick: () => go('ventas') }),
      ]),
      table([
        { key: 'order_date', label: 'Fecha', render: r => fmtDate(r.order_date) },
        { key: 'client', label: 'Cliente', render: r => r.clients?.name || r.client_name || '—' },
        { key: 'total', label: 'Total', align: 'right', render: r => money(r.total) },
        { key: 'status', label: 'Estado', render: r => badge(label(r.status), r.status === 'entregado' ? 'ok' : 'info') },
      ], recent, { empty: 'Todavía no hay ventas registradas.', onRow: r => saleDetailModal(r.id) }),
    ]);
    grid.appendChild(recentCard);

    content.appendChild(grid);
    body.replaceChildren(content);
  }

  await load();
  // Tiempo real: refrescar cuando cambian ventas o producción
  unsub.push(subscribe('sales', () => load()));
  unsub.push(subscribe('production', () => load()));
  return root;
}
