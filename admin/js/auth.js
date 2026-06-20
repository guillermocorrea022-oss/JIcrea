// ════════════════════════════════════════════════════════════════════════
//  Autenticación y sesión. Maneja login, logout, usuario y rol (dueño/operario).
// ════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient.js';

export const session = {
  user: null,
  profile: null,
  get role() { return this.profile?.role || 'operario'; },
  get isOwner() { return this.role === 'dueno'; },
  get name() { return this.profile?.full_name || this.user?.email || 'Usuario'; },
};

export async function loadSession() {
  const { data: { session: s } } = await supabase.auth.getSession();
  if (!s) { session.user = null; session.profile = null; return null; }
  session.user = s.user;
  const { data: prof } = await supabase
    .from('profiles').select('*').eq('id', s.user.id).maybeSingle();
  session.profile = prof || { id: s.user.id, full_name: s.user.email, role: 'operario' };
  return session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await loadSession();
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  session.user = null;
  session.profile = null;
}

// Reaccionar a cambios de sesión (logout en otra pestaña, expiración, etc.)
export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange((_event, s) => cb(s));
}
