// ════════════════════════════════════════════════════════════════════════
//  Capa de datos — todas las consultas y operaciones contra Supabase.
//  Los módulos de la app usan estas funciones, nunca el cliente directo.
// ════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient.js';

const ok = ({ data, error }) => { if (error) throw error; return data; };

// ── Catálogo / Listas Oficial ───────────────────────────────────────────
export const Products = {
  list: (activeOnly = false) => supabase.from('products').select('*')
    .order('category').order('name').then(r => (ok(r) || []).filter(p => !activeOnly || p.is_active)),
  stock: () => supabase.from('v_product_stock').select('*').order('name').then(ok),
  create: (p) => supabase.from('products').insert(p).select().single().then(ok),
  update: (id, p) => supabase.from('products').update(p).eq('id', id).select().single().then(ok),
  recipe: (productId) => supabase.from('product_recipe').select('*').eq('product_id', productId).then(ok),
  setRecipe: async (productId, rows) => {
    await supabase.from('product_recipe').delete().eq('product_id', productId);
    if (rows.length) ok(await supabase.from('product_recipe').insert(
      rows.map(r => ({ product_id: productId, supply_id: r.supply_id, qty: r.qty }))));
  },
  comboComponents: (comboId) => supabase.from('combo_components').select('*').eq('combo_id', comboId).then(ok),
  setComboComponents: async (comboId, rows) => {
    await supabase.from('combo_components').delete().eq('combo_id', comboId);
    if (rows.length) ok(await supabase.from('combo_components').insert(
      rows.map(r => ({ combo_id: comboId, component_id: r.component_id, qty: r.qty }))));
  },
};

// ── Insumos ──────────────────────────────────────────────────────────────
export const Supplies = {
  list: () => supabase.from('supplies').select('*, suppliers(name)').order('name').then(ok),
  stock: () => supabase.from('v_supply_stock').select('*').order('name').then(ok),
  create: (s) => supabase.from('supplies').insert(s).select().single().then(ok),
  update: (id, s) => supabase.from('supplies').update(s).eq('id', id).select().single().then(ok),
};

// ── Proveedores ──────────────────────────────────────────────────────────
export const Suppliers = {
  list: () => supabase.from('suppliers').select('*').order('name').then(ok),
  create: (s) => supabase.from('suppliers').insert(s).select().single().then(ok),
  update: (id, s) => supabase.from('suppliers').update(s).eq('id', id).select().single().then(ok),
};

// ── Clientes (CRM) ───────────────────────────────────────────────────────
export const Clients = {
  list: () => supabase.from('clients').select('*').order('name').then(ok),
  create: (c) => supabase.from('clients').insert(c).select().single().then(ok),
  update: (id, c) => supabase.from('clients').update(c).eq('id', id).select().single().then(ok),
  history: () => supabase.from('v_client_history').select('*').then(ok),
};

// ── Ventas ───────────────────────────────────────────────────────────────
export const Sales = {
  list: (filters = {}) => {
    let q = supabase.from('sales').select('*, clients(name)').order('order_date', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.source) q = q.eq('source', filters.source);
    if (filters.sale_type) q = q.eq('sale_type', filters.sale_type);
    if (filters.from) q = q.gte('order_date', filters.from);
    if (filters.to) q = q.lte('order_date', filters.to);
    if (filters.paid != null) q = q.eq('paid', filters.paid);
    return q.then(ok);
  },
  pendingWeb: () => supabase.from('sales').select('*').eq('status', 'pendiente')
    .order('created_at', { ascending: false }).then(ok),
  items: (saleId) => supabase.from('sale_items').select('*').eq('sale_id', saleId).then(ok),
  recent: (n = 12) => supabase.from('sales').select('*, clients(name)')
    .in('status', ['confirmado', 'en_proceso', 'entregado'])
    .order('created_at', { ascending: false }).limit(n).then(ok),
  // Crea una venta con sus ítems. Calcula totales.
  create: async (sale, items) => {
    const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const total_cost = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
    const row = ok(await supabase.from('sales').insert({ ...sale, total, total_cost })
      .select().single());
    if (items.length) ok(await supabase.from('sale_items').insert(
      items.map(i => ({ sale_id: row.id, product_id: i.product_id, product_name: i.product_name,
        qty: i.qty, unit_price: i.unit_price, unit_cost: i.unit_cost }))));
    return row;
  },
  setStatus: (id, status) => supabase.from('sales')
    .update({ status, confirmed_at: ['confirmado','entregado','en_proceso'].includes(status) ? new Date().toISOString() : null })
    .eq('id', id).select().single().then(ok),
  setPaid: (id, paid, paid_date) => supabase.from('sales')
    .update({ paid, paid_date: paid ? (paid_date || new Date().toISOString().slice(0,10)) : null })
    .eq('id', id).then(ok),
  update: (id, s) => supabase.from('sales').update(s).eq('id', id).then(ok),
  receivable: () => supabase.from('v_accounts_receivable').select('*')
    .order('days_outstanding', { ascending: false }).then(ok),
  margins: () => supabase.from('v_product_margins').select('*').then(ok),
};

// ── Compras de insumos ───────────────────────────────────────────────────
export const Purchases = {
  list: (module) => { let q = supabase.from('purchases').select('*, suppliers(name)')
    .order('purchase_date', { ascending: false });
    if (module) q = q.eq('module', module); return q.then(ok); },
  create: (p) => supabase.from('purchases').insert({ ...p, total: (p.qty||0)*(p.unit_price||0) })
    .select().single().then(ok),
  setStatus: (id, status) => supabase.from('purchases')
    .update({ status, received_date: status === 'recibido' ? new Date().toISOString().slice(0,10) : null })
    .eq('id', id).then(ok),
  setPaid: (id, paid) => supabase.from('purchases').update({ paid }).eq('id', id).then(ok),
};

// ── Producción (productos terminados) ─────────────────────────────────────
export const Production = {
  list: (module) => { let q = supabase.from('production').select('*')
    .order('prod_date', { ascending: false });
    if (module) q = q.eq('module', module); return q.then(ok); },
  create: (p) => supabase.from('production').insert({ ...p, labor_total: (p.qty||0)*(p.labor_unit_cost||0) })
    .select().single().then(ok),
};

// ── Grabados ─────────────────────────────────────────────────────────────
export const Engraving = {
  list: () => supabase.from('engraving_orders').select('*').order('entry_date', { ascending: false }).then(ok),
  create: (e) => supabase.from('engraving_orders').insert(e).select().single().then(ok),
  setStatus: (id, status) => supabase.from('engraving_orders').update({ status }).eq('id', id).then(ok),
};

// ── Mermas / ajustes ─────────────────────────────────────────────────────
export const Adjustments = {
  create: (a) => supabase.from('inventory_adjustments').insert(a).select().single().then(ok),
  list: () => supabase.from('inventory_adjustments')
    .select('*, products(name), supplies(name)').order('adj_date', { ascending: false }).then(ok),
};

// ── Pagos Empresa ────────────────────────────────────────────────────────
export const CompanyPayments = {
  list: () => supabase.from('company_payments').select('*')
    .order('period_month', { ascending: false }).then(ok),
  create: (p) => supabase.from('company_payments').insert(p).select().single().then(ok),
  remove: (id) => supabase.from('company_payments').delete().eq('id', id).then(ok),
};

// ── Finanzas (vistas) ────────────────────────────────────────────────────
export const Finance = {
  salesMonthly: () => supabase.from('v_sales_monthly').select('*').order('period').then(ok),
  cashFlow: () => supabase.from('v_cash_flow').select('*').order('period').then(ok),
};

// ── Realtime ─────────────────────────────────────────────────────────────
export function subscribe(table, cb) {
  const ch = supabase.channel('rt-' + table + '-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
