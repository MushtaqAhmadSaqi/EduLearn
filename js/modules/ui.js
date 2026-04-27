// ============================================
// EduLearn UI Helpers
// Toasts, theme, modals, empty states, escaping
// ============================================

export function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function debounce(fn, wait = 250) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('edulearn:theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'dark' || (!saved && prefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      root.classList.toggle('dark');
      localStorage.setItem(
        'edulearn:theme',
        root.classList.contains('dark') ? 'dark' : 'light'
      );

      toast(
        root.classList.contains('dark') ? 'Dark mode enabled' : 'Light mode enabled',
        'success'
      );
    });
  });
}

export function toast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toastRegion');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toastRegion';
    container.className =
      'fixed top-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '!',
    info: 'i',
    warning: '!'
  };

  const color = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-100',
    error: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100',
    info: 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
  };

  const el = document.createElement('div');

  el.className = [
    'toast translate-x-6 opacity-0 rounded-2xl border px-4 py-3 shadow-floating backdrop-blur transition duration-300',
    color[type] || color.info
  ].join(' ');

  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

  el.innerHTML = `
    <div class="flex gap-3">
      <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-sm font-bold">
        ${icons[type] || icons.info}
      </span>
      <div class="min-w-0">
        <p class="text-sm font-medium leading-5">${escapeHTML(message)}</p>
      </div>
      <button class="ml-auto rounded-lg px-1 text-current/60 hover:text-current focus:outline-none focus-visible:ring-2 focus-visible:ring-current" aria-label="Dismiss notification">
        ×
      </button>
    </div>
  `;

  container.appendChild(el);

  const close = () => {
    el.classList.add('translate-x-6', 'opacity-0');
    window.setTimeout(() => el.remove(), 250);
  };

  el.querySelector('button')?.addEventListener('click', close);

  requestAnimationFrame(() => {
    el.classList.remove('translate-x-6', 'opacity-0');
  });

  window.setTimeout(close, duration);
}

export function setButtonLoading(button, loading, loadingText = 'Working...') {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
      <span>${escapeHTML(loadingText)}</span>
    `;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

export function renderSkeletonGrid(container, count = 6) {
  if (!container) return;

  container.innerHTML = Array.from(
    {
      length: count
    },
    () => `
      <article class="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="skeleton aspect-video"></div>
        <div class="space-y-3 p-5">
          <div class="skeleton h-5 w-4/5"></div>
          <div class="skeleton h-4 w-2/3"></div>
          <div class="flex gap-2 pt-2">
            <div class="skeleton h-7 w-16 rounded-full"></div>
            <div class="skeleton h-7 w-20 rounded-full"></div>
          </div>
        </div>
      </article>
    `
  ).join('');
}

export function renderEmptyState(
  container,
  {
    icon = '📚',
    title = 'Nothing here yet',
    message = 'Add something to get started.',
    actionText = '',
    onAction = null
  } = {}
) {
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 text-4xl">
        ${escapeHTML(icon)}
      </div>
      <h3 class="font-display text-xl font-bold text-slate-950 dark:text-white">${escapeHTML(title)}</h3>
      <p class="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">${escapeHTML(message)}</p>
      ${
        actionText
          ? `<button data-empty-action class="btn-primary mt-6">${escapeHTML(actionText)}</button>`
          : ''
      }
    </div>
  `;

  if (actionText && typeof onAction === 'function') {
    container.querySelector('[data-empty-action]')?.addEventListener('click', onAction);
  }
}

export function openModal({
  title = '',
  description = '',
  content = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  danger = false,
  onConfirm = null,
  size = 'md'
} = {}) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');

    const maxWidth = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    }[size] || 'max-w-lg';

    modal.className =
      'fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="modal-card w-full ${maxWidth} scale-95 rounded-3xl border border-slate-200 bg-white p-6 opacity-0 shadow-floating transition duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 class="font-display text-xl font-bold text-slate-950 dark:text-white">${escapeHTML(title)}</h2>
            ${
              description
                ? `<p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">${escapeHTML(description)}</p>`
                : ''
            }
          </div>
          <button data-modal-close class="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close modal">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div data-modal-body>${content}</div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button data-modal-cancel class="btn-secondary">${escapeHTML(cancelText)}</button>
          <button data-modal-confirm class="${danger ? 'btn-danger' : 'btn-primary'}">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const card = modal.querySelector('.modal-card');
    const closeButton = modal.querySelector('[data-modal-close]');
    const cancelButton = modal.querySelector('[data-modal-cancel]');
    const confirmButton = modal.querySelector('[data-modal-confirm]');

    const close = (value = null) => {
      card.classList.add('scale-95', 'opacity-0');
      modal.classList.add('opacity-0');

      window.setTimeout(() => {
        modal.remove();
        resolve(value);
      }, 180);
    };

    requestAnimationFrame(() => {
      card.classList.remove('scale-95', 'opacity-0');
    });

    closeButton.addEventListener('click', () => close(null));
    cancelButton.addEventListener('click', () => close(null));

    modal.addEventListener('click', (event) => {
      if (event.target === modal) close(null);
    });

    document.addEventListener(
      'keydown',
      function onEscape(event) {
        if (event.key === 'Escape' && document.body.contains(modal)) {
          document.removeEventListener('keydown', onEscape);
          close(null);
        }
      },
      {
        once: true
      }
    );

    confirmButton.addEventListener('click', async () => {
      if (!onConfirm) {
        close(true);
        return;
      }

      try {
        setButtonLoading(confirmButton, true);
        const result = await onConfirm(modal);

        if (result === false) {
          setButtonLoading(confirmButton, false);
          return;
        }

        close(result ?? true);
      } catch (error) {
        setButtonLoading(confirmButton, false);
        toast(error.message || 'Something went wrong.', 'error');
      }
    });

    const firstInput = modal.querySelector('input, textarea, select, button');

    firstInput?.focus();
  });
}

export function confirmDialog({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
} = {}) {
  return openModal({
    title,
    description: message,
    content: '',
    confirmText,
    cancelText,
    danger
  });
}

export function fieldValue(modal, selector) {
  return modal.querySelector(selector)?.value?.trim() || '';
}

export function copyToClipboard(text, successMessage = 'Copied to clipboard') {
  if (!navigator.clipboard) {
    const input = document.createElement('textarea');

    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();

    toast(successMessage, 'success');
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => toast(successMessage, 'success'))
    .catch(() => toast('Could not copy text.', 'error'));
}
