/* ════════════════════════════════════════════════════════════════════════
   JIcrea — Integración web → Software de gestión.
   Cuando el cliente toca "Finalizar pedido", además de abrir WhatsApp,
   guarda el pedido en estado PENDIENTE en Supabase para que aparezca en el
   dashboard del dueño.

   · Sin dependencias: usa fetch contra la API REST de Supabase.
   · Seguro: solo envía nombres, cantidades y precio MINORISTA (lo que el
     cliente ve). Nunca toca precios mayoristas. El dueño reprecia al confirmar.
   · No invasivo: si el backend no está configurado, no hace nada y la web
     sigue funcionando igual (WhatsApp). Nunca rompe el checkout.

   CONFIGURACIÓN: definí estos valores (la anon key es pública y segura).
   Podés editarlos acá o setear window.JICREA_BACKEND antes de cargar este script.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const CFG = window.JICREA_BACKEND || {
    url: '',        // ej: https://TU-PROYECTO.supabase.co
    anonKey: '',    // anon / public key
  };

  const configured = CFG.url && CFG.anonKey;

  /**
   * Guarda un pedido pendiente. Devuelve una promesa (no lanza: si falla,
   * resuelve false para no bloquear el WhatsApp).
   * @param {Array<{name, qty, price}>} cart
   * @param {{name?, contact?, total?}} info
   */
  async function pushOrder(cart, info = {}) {
    if (!configured || !cart || !cart.length) return false;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'apikey': CFG.anonKey,
        'Authorization': 'Bearer ' + CFG.anonKey,
        'Prefer': 'return=representation',
      };
      const total = info.total != null ? info.total
        : cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);

      // 1) Crear la venta pendiente
      const saleRes = await fetch(CFG.url + '/rest/v1/sales', {
        method: 'POST', headers,
        body: JSON.stringify([{
          source: 'web', status: 'pendiente', sale_type: 'minorista', channel: 'Web',
          client_name: info.name || 'Pedido web', client_contact: info.contact || null,
          total: total, total_minorista_ref: total,
        }]),
      });
      if (!saleRes.ok) throw new Error('sales ' + saleRes.status);
      const [sale] = await saleRes.json();

      // 2) Crear los ítems
      const items = cart.map(i => ({
        sale_id: sale.id, product_name: i.name,
        qty: i.qty || 1, unit_price: i.price || 0, unit_cost: 0,
      }));
      const itemsRes = await fetch(CFG.url + '/rest/v1/sale_items', {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(items),
      });
      if (!itemsRes.ok) throw new Error('items ' + itemsRes.status);
      return true;
    } catch (e) {
      console.warn('[JIcrea] no se pudo registrar el pedido web:', e.message);
      return false;
    }
  }

  window.JIcreaOrders = { pushOrder, get configured() { return configured; } };
})();
