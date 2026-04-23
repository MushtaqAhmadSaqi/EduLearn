// ============================================
// Homepage logic
// ============================================
import { Videos, extractYouTubeId } from '../modules/storage.js';
import { toast, renderSkeletonGrid, renderEmptyState, openModal, initTheme } from '../modules/ui.js';
import { animateHeroEntrance, animateCardStagger } from '../modules/animations.js';
import { getUser } from '../config/supabase.js';
import { initUserMenu } from '../modules/user-menu.js';

let currentFilter = 'all';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMobileMenu();
  initFilters();
  initAddVideoBtn();
  animateHeroEntrance();

  // Show skeleton while checking auth + loading
  const grid = document.getElementById('videoGrid');
  renderSkeletonGrid(grid, 8);

  initUserMenu();

  const user = await getUser();
  if (!user) {
    showWelcomeState();
    return;
  }

  await loadVideos();
});

// ===== AUTH-AWARE STATES =====
function showWelcomeState() {
  renderEmptyState(document.getElementById('videoGrid'), {
    icon: '👋',
    title: 'Welcome to EduLearn',
    message: 'Sign in to start adding videos, creating playlists, and tracking your learning journey across devices.',
    actionText: 'Sign In to Get Started',
    onAction: () => window.location.href = 'auth.html'
  });
}

// ===== LOAD VIDEOS =====
async function loadVideos() {
  const videos = await Videos.list();
  renderVideos(videos);
}

function renderVideos(videos) {
  const grid = document.getElementById('videoGrid');
  const filtered = filterVideos(videos, currentFilter);

  if (filtered.length === 0) {
    if (videos.length === 0) {
      renderEmptyState(grid, {
        icon: '🎬',
        title: 'Your library is empty',
        message: 'Paste a YouTube link to add your first learning video. Your progress will be saved automatically.',
        actionText: '＋ Add Video',
        onAction: showAddVideoModal
      });
    } else {
      renderEmptyState(grid, {
        icon: '🔍',
        title: 'No videos match',
        message: `No videos in "${currentFilter}" category. Try switching filters.`
      });
    }
    return;
  }

  grid.innerHTML = filtered.map(videoCardHTML).join('');

  // Attach click handlers
  grid.querySelectorAll('[data-video-id]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `video.html?id=${card.dataset.videoId}`;
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  animateCardStagger('#videoGrid > [data-video-id]');
}

function videoCardHTML(v) {
  const thumb = `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`;
  const progress = v.progress || 0;
  const tags = (v.tags || []).slice(0, 2);

  return `
    <article
      data-video-id="${v.id}"
      role="button"
      tabindex="0"
      class="card-lift group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle ${v._pending ? 'opacity-60' : ''}"
      aria-label="${v.title}">

      <div class="relative aspect-video overflow-hidden bg-slate-900">
        <img src="${thumb}" alt=""
             loading="lazy"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">

        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition">
            <svg class="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        ${v.completed ? `
          <span class="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            Completed
          </span>
        ` : ''}

        <div class="absolute bottom-0 inset-x-0 h-1 bg-black/40">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500" style="width:${progress}%"></div>
        </div>
      </div>

      <div class="p-4">
        <h3 class="font-display font-semibold text-base leading-snug line-clamp-2 mb-2">${escapeHtml(v.title)}</h3>
        <div class="flex flex-wrap gap-1.5">
          ${tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    </article>
  `;
}

function filterVideos(videos, filter) {
  if (filter === 'inprogress') return videos.filter(v => !v.completed && v.progress > 0);
  if (filter === 'completed') return videos.filter(v => v.completed);
  return videos;
}

// ===== FILTERS =====
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm');
        b.classList.add('text-slate-500');
      });
      btn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm');
      btn.classList.remove('text-slate-500');
      currentFilter = btn.dataset.filter;
      loadVideos();
    });
  });
}

// ===== ADD VIDEO MODAL =====
function initAddVideoBtn() {
  document.getElementById('addVideoBtn')?.addEventListener('click', showAddVideoModal);
}

function showAddVideoModal() {
  const { close } = openModal(`
    <form id="addVideoForm" class="p-6 space-y-5">
      <h3 class="font-display font-bold text-2xl">Add YouTube Video</h3>

      <div>
        <label class="block text-sm font-medium mb-1.5">YouTube URL *</label>
        <input name="url" type="url" required autofocus
          placeholder="https://youtube.com/watch?v=..."
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
      </div>

      <div>
        <label class="block text-sm font-medium mb-1.5">Title *</label>
        <input name="title" type="text" required
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
      </div>

      <div>
        <label class="block text-sm font-medium mb-1.5">Tags (comma-separated)</label>
        <input name="tags" type="text" placeholder="math, algebra, calculus"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
      </div>

      <div class="flex gap-3 justify-end pt-2">
        <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
        <button type="submit" class="btn-primary">Add Video</button>
      </div>
    </form>
  `);

  const form = document.getElementById('addVideoForm');
  form.querySelector('[data-cancel]').onclick = close;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const url = fd.get('url');
    if (!extractYouTubeId(url)) {
      toast('Invalid YouTube URL', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      await Videos.add({
        url,
        title: fd.get('title'),
        tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean)
      });
      close();
      toast('Video added!', 'success');
      await loadVideos();
    } catch (err) {
      toast(err.message || 'Failed to add video', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Video';
    }
  };
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  btn?.addEventListener('click', () => menu.classList.toggle('hidden'));
}

// ===== REACTIVE UPDATES =====
window.addEventListener('videos:changed', loadVideos);
window.addEventListener('videos:synced', loadVideos);

// ===== UTIL =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
