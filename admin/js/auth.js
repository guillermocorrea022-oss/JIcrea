// ════════════════════════════════════════════════════════════════════════
//  Autenticación contra la API PHP (sesión por cookie). Rol dueño/operario.
// ════════════════════════════════════════════════════════════════════════
import { api } from './api.js';

export const session = {
  user: null,
  profile: null,
  needsSetup: false,
  get role() { return this.profile?.role || 'operario'; },
  get isOwner() { return this.role === 'dueno'; },
  get name() { return this.profile?.full_name || this.user?.email || 'Usuario'; },
};

export async function loadSession() {
  const r = await api.get('/auth/me');
  session.user = r.user;
  session.profile = r.user;
  session.needsSetup = !!r.needs_setup;
  return session;
}

export async function signIn(email, password) {
  const r = await api.post('/auth/login', { email, password });
  session.user = r.user; session.profile = r.user;
  return r;
}

export async function signOut() {
  try { await api.post('/auth/logout', {}); } catch (_) {}
  session.user = null; session.profile = null;
}

// Crea el primer usuario (dueño) en la primera puesta en marcha.
export async function setupOwner(email, password, full_name) {
  await api.post('/auth/setup', { email, password, full_name });
}
