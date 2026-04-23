// ============================================
// Supabase Client — with graceful fallback
// If not configured, app runs in offline mode
// ============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Detect if properly configured
export const isCloudEnabled =
  SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE';

// Stub client if not configured (prevents crashes)
let supabase;

if (isCloudEnabled) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
} else {
  console.warn('ℹ️ Running in OFFLINE MODE (localStorage only). Configure Supabase in js/config/supabase.js to enable cloud sync.');
  // Stub that won't crash the app
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'local-user', email: 'local@offline.mode' } } } }),
      signInWithPassword: async () => ({ error: { message: 'Cloud not configured' } }),
      signUp: async () => ({ error: { message: 'Cloud not configured' } }),
      signOut: async () => ({})
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null }), order: async () => ({ data: [] }) }), order: async () => ({ data: [] }), in: async () => ({ data: [] }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null }) }) }),
      update: () => ({ eq: async () => ({ data: null }) }),
      delete: () => ({ eq: async () => ({ data: null }) })
    })
  };
}

export { supabase };

// No redirect — always returns a "local" user in offline mode
export async function requireAuth(redirect = 'auth.html') {
  if (!isCloudEnabled) {
    return { id: 'local-user', email: 'local@offline.mode' };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = redirect;
    return null;
  }
  return session.user;
}

export async function getUser() {
  if (!isCloudEnabled) {
    return { id: 'local-user', email: 'local@offline.mode' };
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}
