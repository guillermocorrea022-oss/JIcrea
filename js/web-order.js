/* ════════════════════════════════════════════════════════════════════════
   JIcrea — Integración web → Software de gestión.
   Cuando el cliente toca "Finalizar pedido", además de abrir WhatsApp,
   guarda el pedido en estado PENDIENTE para que aparezca en el dashboard.

   · Sin dependencias: un solo fetch a la API PHP.
   · Seguro: solo envía nombres, cantidades y precio minorista (lo que el
     cliente ve). Los precios mayoristas nunca salen del servidor.
   · No invasivo: si el backend no está disponible, no hace nada y la web
     sigue funcionando igual con WhatsApp. Nunca rompe el checkout.

   CONFIGURACIÓN: si la web y el sistema están en el mismo dominio
   (ej. jicrea.com), dejá API_BASE = '/api'. Si no, poné la URL completa.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const API_BASE = (window.JICREA_API_BASE) || '/api';

  async function pushOrder(cart, info = {}) {
    if (!cart || !cart.length) return false;
    try {
      const total = info.total != null ? info.total
        : cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
      const res = await fetch(API_BASE + '/web-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          info: { name: info.name || 'Pedido web', contact: info.contact || '', total },
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[JIcrea] no se pudo registrar el pedido web:', e.message);
      return false;
    }
  }

  // Siempre "configurado": si el endpoint no existe, el fetch falla en silencio.
  window.JIcreaOrders = { pushOrder, configured: true };
})();
