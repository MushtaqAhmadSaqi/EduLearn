// ============================================
// User Menu
// Avatar, sign out, backup export
// ============================================

import { supabase, getUser, isCloudEnabled } from '../config/supabase.js';
import { toast, escapeHTML } from './ui.js';
import { downloadBackup } from './storage.js';

export async function initUserMenu() {
  const container = document.getElementById('userMenu');

  if (!container) return;

  const user = await getUser();

  if (!user) {
    container.innerHTML = `
      <a href="auth.html" class="btn-primary text-sm">Sign in</a>
    `;
    return;
  }

  const email = user.email || 'local@offline.mode';
  const initial = email[0]?.toUpperCase() || 'E';

  container.innerHTML = `
    <div class="relative">
      <button
        id="userMenuBtn"
        class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        aria-label="Open user menu"
        aria-expanded="false"
      >
        ${escapeHTML(initial)}
      </button>

      <div
        id="userMenuDropdown"
        class="absolute right-0 top-12 z-50 hidden w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-floating dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="border-b border-slate-200 p-4 dark:border-slate-800">
          <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">${escapeHTML(email)}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ${isCloudEnabled ? 'Cloud sync enabled' : 'Offline mode'}
          </p>
        </div>

        <div class="p-2">
          <a href="dashboard.html" class="menu-item">
            <span>📊</span>
            Dashboard
          </a>
          <a href="playlist.html" class="menu-item">
            <span>📋</span>
            Playlists
          </a>
          <button id="backupDataBtn" class="menu-item w-full">
            <span>⬇️</span>
            Export backup
          </button>
          <button id="signOutBtn" class="menu-item w-full text-rose-600 dark:text-rose-400">
            <span>↪</span>
            ${isCloudEnabled ? 'Sign out' : 'Leave offline session'}
          </button>
        </div>
      </div>
    </div>
  `;

  const button = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userMenuDropdown');

  button?.addEventListener('click', (event) => {
    event.stopPropagation();

    const hidden = dropdown.classList.toggle('hidden');

    button.setAttribute('aria-expanded', String(!hidden));
  });

  document.addEventListener('click', () => {
    dropdown?.classList.add('hidden');
    button?.setAttribute('aria-expanded', 'false');
  });

  dropdown?.addEventListener('click', (event) => event.stopPropagation());

  document.getElementById('backupDataBtn')?.addEventListener('click', () => {
    downloadBackup();
  });

  document.getElementById('signOutBtn')?.addEventListener('click', async () => {
    if (isCloudEnabled) {
      await supabase.auth.signOut();
      toast('Signed out successfully.', 'success');
    } else {
      toast('Offline session closed.', 'info');
    }

    window.location.href = 'auth.html';
  });
}
