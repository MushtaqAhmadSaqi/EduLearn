// ============================================
// User Menu - Avatar + Sign out
// Drop into any page with <div id="userMenu"></div>
// ============================================
import { supabase, getUser } from '../config/supabase.js';

export async function initUserMenu() {
  const container = document.getElementById('userMenu');
  if (!container) return;

  const user = await getUser();
  if (!user) {
    container.innerHTML = `<a href="auth.html" class="btn-primary text-sm">Sign In</a>`;
    return;
  }

  const initial = (user.email?.[0] || '?').toUpperCase();
  container.innerHTML = `
    <div class="relative">
      <button id="userMenuBtn" class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white font-semibold flex items-center justify-center hover:shadow-premium transition" aria-label="User menu">
        ${initial}
      </button>
      <div id="userMenuDropdown" class="hidden absolute right-0 mt-2 w-64 rounded-2xl glass shadow-floating border border-slate-200/50 dark:border-slate-700/50 overflow-hidden z-50">
        <div class="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div class="font-semibold text-sm truncate">${user.email}</div>
          <div class="text-xs text-slate-500 mt-0.5">Signed in</div>
        </div>
        <div class="p-2">
          <a href="dashboard.html" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Dashboard
          </a>
          <a href="playlist.html" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10m-10 4h10"/></svg>
            Playlists
          </a>
          <button id="signOutBtn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-sm transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  `;

  const btn = container.querySelector('#userMenuBtn');
  const dropdown = container.querySelector('#userMenuDropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) dropdown.classList.add('hidden');
  });

  container.querySelector('#signOutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = 'auth.html';
  });
}
