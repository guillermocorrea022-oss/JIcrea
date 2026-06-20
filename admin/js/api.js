// ════════════════════════════════════════════════════════════════════════
//  Cliente HTTP de la API PHP. Maneja JSON, cookies de sesión y errores.
// ════════════════════════════════════════════════════════════════════════
import { API_BASE } from './config.js';

export const CONFIGURED = true; // con backend PHP no hace falta configurar el frontend

async function req(method, path, bodyData) {
  const opts = { method, credentials: 'include', headers: {} };
  if (bodyData !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(bodyData);
  }
  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (e) {
    const err = new Error('No se pudo conectar con el servidor.');
    err.network = true; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || ('Error ' + res.status));
    err.status = res.status; throw err;
  }
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b || {}),
  patch: (p, b) => req('PATCH', p, b || {}),
  put: (p, b) => req('PUT', p, b || {}),
  del: (p) => req('DELETE', p),
};
