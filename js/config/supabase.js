// ============================================
// Supabase Client — optional cloud backend
// Replace placeholders below or set window.EDULEARN_SUPABASE_URL / ANON_KEY before this module loads.
// App remains fully functional offline through localStorage.
// ============================================

const SUPABASE_URL = window.EDULEARN_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = window.EDULEARN_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const isCloudEnabled = Boolean(
  SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE'
);

function emptyQueryResult(data = null) {
  return Promise.resolve({ data, error: null });
}

function createStubQuery() {
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => emptyQueryResult(null),
    maybeSingle: () => emptyQueryResult(null),
    then: (resolve) => resolve({ data: [], error: null })
  };

  return chain;
}

let supabase;

if (isCloudEnabled) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.info(
    'EduLearn is running in offline mode. Configure js/config/supabase.js to enable cloud sync.'
  );

  supabase = {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: {
              id: 'local-user',
              email: 'local@offline.mode'
            }
          }
        },
        error: null
      }),
      signInWithPassword: async () => ({
        data: null,
        error: { message: 'Cloud auth is not configured yet.' }
      }),
      signUp: async () => ({
        data: null,
        error: { message: 'Cloud auth is not configured yet.' }
      }),
      signOut: async () => ({ error: null })
    },
    from: () => createStubQuery()
  };
}

export { supabase };

export async function requireAuth(redirect = 'auth.html') {
  if (!isCloudEnabled) {
    return {
      id: 'local-user',
      email: 'local@offline.mode'
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = redirect;
    return null;
  }

  return session.user;
}

export async function getUser() {
  if (!isCloudEnabled) {
    return {
      id: 'local-user',
      email: 'local@offline.mode'
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user || null;
}
