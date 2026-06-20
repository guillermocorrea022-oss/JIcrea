// Cliente Supabase compartido. Carga la librería oficial desde CDN (sin build).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const CONFIGURED =
  SUPABASE_URL && SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('TU-PROYECTO') &&
  !SUPABASE_ANON_KEY.includes('TU-ANON-KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
