// ============================================
// Supabase Client - Singleton
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ Replace these with your Supabase project credentials
// Get them from: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper: check if user is authenticated
export async function requireAuth(redirect = 'auth.html') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = redirect;
    return null;
  }
  return session.user;
}

// Helper: get current user without redirect
export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}
