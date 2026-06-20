// ════════════════════════════════════════════════════════════════════════
//  Capa de datos — todas las consultas contra la API PHP. Los módulos usan
//  estas funciones (no llaman a fetch directamente).
// ════════════════════════════════════════════════════════════════════════
import { api } from './api.js';
import { state } from './state.js';

const biz = () => 'business=' + state.business;
const qs = (obj) => {
  const p = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
};
// Da forma { suppliers:{name} } / { clients:{name} } para compatibilidad con los módulos.
const withSupplier = (rows) => rows.map(r => ({ ...r, suppliers: r.supplier_name ? { name: r.supplier_name } : null }));
const withClient = (rows) => rows.map(r => ({ ...r, clients: r.client_db_name ? { name: r.client_db_name } : null }));

export const Products = {
  list: (activeOnly = false) => api.get('/products?' + biz() + (activeOnly ? '&active=1' : '')),
  stock: () => api.get('/product_stock?' + biz()),
  create: (p) => api.post('/products', { business: state.business, ...p }),
  update: (id, p) => api.patch('/products/' + id, p),
  recipe: (id) => api.get('/products/' + id + '/recipe'),
  setRecipe: (id, rows) => api.put('/products/' + id + '/recipe', { rows }),
  comboComponents: (id) => api.get('/products/' + id + '/combo'),
  setComboComponents: (id, rows) => api.put('/products/' + id + '/combo', { rows }),
};

export const Supplies = {
  list: () => api.get('/supplies').then(withSupplier),
  stock: () => api.get('/supply_stock'),
  create: (s) => api.post('/supplies', s),
  update: (id, s) => api.patch('/supplies/' + id, s),
};

export const Suppliers = {
  list: () => api.get('/suppliers'),
  create: (s) => api.post('/suppliers', s),
  update: (id, s) => api.patch('/suppliers/' + id, s),
};

export const Clients = {
  list: () => api.get('/clients'),
  create: (c) => api.post('/clients', c),
  update: (id, c) => api.patch('/clients/' + id, c),
  history: () => api.get('/client_history'),
};

export const Sales = {
  list: (filters = {}) => api.get('/sales' + qs({
    status: filters.status, source: filters.source, sale_type: filters.sale_type,
    from: filters.from, to: filters.to, business: state.business,
    paid: filters.paid === undefined ? undefined : (filters.paid ? 'true' : 'false'),
  })).then(withClient),
  pendingWeb: () => api.get('/sales/pending'),
  items: (id) => api.get('/sales/' + id + '/items'),
  recent: (n = 12) => api.get('/sales/recent?n=' + n + '&' + biz()).then(withClient),
  create: (sale, items) => api.post('/sales', { sale: { business: state.business, ...sale }, items }),
  setStatus: (id, status) => api.patch('/sales/' + id, {
    status,
    confirmed_at: ['confirmado', 'entregado', 'en_proceso'].includes(status) ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
  }),
  setPaid: (id, paid, paid_date) => api.patch('/sales/' + id, {
    paid: paid ? 1 : 0, paid_date: paid ? (paid_date || new Date().toISOString().slice(0, 10)) : null,
  }),
  update: (id, s) => api.patch('/sales/' + id, s),
  receivable: () => api.get('/receivable?' + biz()),
  margins: () => api.get('/product_margins?' + biz()),
};

export const Purchases = {
  list: (module) => api.get('/purchases' + (module ? '?module=' + module : '')).then(withSupplier),
  create: (p) => api.post('/purchases', p),
  setStatus: (id, status) => api.patch('/purchases/' + id, {
    status, received_date: status === 'recibido' ? new Date().toISOString().slice(0, 10) : null,
  }),
  setPaid: (id, paid) => api.patch('/purchases/' + id, { paid: paid ? 1 : 0 }),
};

export const Production = {
  list: (module) => api.get('/production' + (module ? '?module=' + module : '')),
  create: (p) => api.post('/production', p),
};

export const Engraving = {
  list: () => api.get('/engraving'),
  create: (e) => api.post('/engraving', e),
  setStatus: (id, status) => api.patch('/engraving/' + id, { status }),
};

export const Adjustments = {
  create: (a) => api.post('/adjustments', a),
  list: () => api.get('/adjustments'),
};

export const CompanyPayments = {
  list: () => api.get('/company_payments'),
  create: (p) => api.post('/company_payments', p),
  remove: (id) => api.del('/company_payments/' + id),
};

export const Finance = {
  salesMonthly: () => api.get('/sales_monthly'),
  cashFlow: () => api.get('/cash_flow'),
};

// Sin realtime nativo: refresco por polling. cb se llama cada ~18s.
export function subscribe(_table, cb) {
  const id = setInterval(() => { try { cb(); } catch (_) {} }, 18000);
  return () => clearInterval(id);
}
