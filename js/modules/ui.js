// ============================================
// UI Module - Zero-dependency, GPU-friendly
// ============================================

// ===== TOAST =====
export function toast(message, type = 'info', duration = 2800) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span class="mr-2 font-bold">${icons[type] || ''}</span>${message}`;
  document.body.appendChild(el);

  // Trigger animation on next frame
  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ===== SKELETON LOADER =====
export function renderSkeletonGrid(container, count = 6) {
  container.innerHTML = Array(count).fill(0).map(() => `
    <div class="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
      <div class="skeleton aspect-video"></div>
      <div class="p-4 space-y-2">
        <div class="skeleton h-4 w-3/4"></div>
        <div class="skeleton h-3 w-1/2"></div>
      </div>
    </div>
  `).join('');
}

// ===== EMPTY STATE =====
export function renderEmptyState(container, { icon = '📺', title, message, actionText, onAction }) {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div class="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 flex items-center justify-center text-5xl">
        ${icon}
      </div>
      <h3 class="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2">${title}</h3>
      <p class="text-slate-500 dark:text-slate-400 max-w-md mb-6">${message}</p>
      ${actionText ? `<button id="emptyStateAction" class="btn-primary">${actionText}</button>` : ''}
    </div>
  `;
  if (onAction) {
    container.querySelector('#emptyStateAction')?.addEventListener('click', onAction);
  }
}

// ===== CONFIRM DIALOG =====
export function confirmDialog({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';

    overlay.innerHTML = `
      <div class="glass rounded-2xl p-6 max-w-md w-full shadow-floating" style="transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);">
        <h3 class="text-xl font-display font-bold mb-2">${title}</h3>
        <p class="text-slate-600 dark:text-slate-400 mb-6">${message}</p>
        <div class="flex gap-3 justify-end">
          <button data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
          <button data-confirm class="${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'} px-5 py-2 rounded-xl font-medium transition">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.querySelector('.glass').style.transform = 'scale(1)';
    });

    const close = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.querySelector('[data-cancel]').onclick = () => close(false);
    overlay.querySelector('[data-confirm]').onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
  });
}

// ===== MODAL (generic) =====
export function openModal(contentHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s';

  overlay.innerHTML = `
    <div class="glass rounded-2xl max-w-lg w-full shadow-floating" style="transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);">
      ${contentHtml}
    </div>
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    overlay.querySelector('.glass').style.transform = 'scale(1)';
  });

  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  return { overlay, close };
}

// ===== THEME TOGGLE =====
export function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  });
}
