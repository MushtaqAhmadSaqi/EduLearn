// ============================================
// Profile Module — User Menu & Auth Actions
// ============================================
import { supabase, getUser } from '../config/supabase.js';
import { toast } from './ui.js';

/**
 * Mounts a premium user menu into the provided container.
 * If user is not logged in, shows a "Sign In" button.
 * If logged in, shows a dropdown with user avatar and actions.
 */
export async function mountProfileMenu(container) {
  if (!container) return;

  const user = await getUser();

  if (!user) {
    container.innerHTML = `
      <a href="auth.html" class="btn-primary text-sm px-5 py-2">Sign In</a>
    `;
    return;
  }

  const initial = user.email ? user.email[0].toUpperCase() : 'U';
  
  container.innerHTML = `
    <div class="relative group">
      <button id="userMenuBtn" class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-sm hover:shadow-md transition">
        ${initial}
      </button>
      
      <!-- Dropdown -->
      <div id="userDropdown" class="absolute right-0 mt-2 w-56 glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
        <div class="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Signed in as</p>
          <p class="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">${user.email}</p>
        </div>
        
        <div class="p-2">
          <a href="dashboard.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Dashboard
          </a>
          <a href="playlist.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10m-10 4h10"/></svg>
            My Playlists
          </a>
        </div>
        
        <div class="p-2 border-t border-slate-200/50 dark:border-slate-800/50">
          <button id="signOutBtn" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  `;

  // Handlers
  container.querySelector('#signOutBtn')?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast('Failed to sign out', 'error');
    } else {
      toast('Signed out successfully', 'success');
      setTimeout(() => window.location.href = 'index.html', 800);
    }
  });
}
