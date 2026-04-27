// ============================================
// Home Page — Video Library
// Search, filters, sorting, tags, add video modal
// ============================================

import { Videos, extractYouTubeId, formatTime } from '../modules/storage.js';
import {
  debounce,
  escapeHTML,
  fieldValue,
  initTheme,
  openModal,
  renderEmptyState,
  renderSkeletonGrid,
  toast
} from '../modules/ui.js';
import { initUserMenu } from '../modules/user-menu.js';
import { animateCardStagger, animateHeroEntrance } from '../modules/animations.js';

let allVideos = [];
let currentFilter = 'all';
let currentSort = 'newest';
let activeTag = '';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMobileMenu();
  initUserMenu();
  initControls();
  initKeyboardShortcuts();

  animateHeroEntrance();

  await loadVideos();

  window.addEventListener('videos:changed', loadVideos);
});

function initMobileMenu() {
  const button = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');

  button?.addEventListener('click', () => {
    menu?.classList.toggle('hidden');
    button.setAttribute(
      'aria-expanded',
      String(!menu?.classList.contains('hidden'))
    );
  });
}

function initControls() {
  document.querySelectorAll('[data-add-video]').forEach((button) => {
    button.addEventListener('click', showAddVideoModal);
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter || 'all';

      document.querySelectorAll('[data-filter]').forEach((item) => {
        item.classList.remove('active-filter');
        item.setAttribute('aria-pressed', 'false');
      });

      button.classList.add('active-filter');
      button.setAttribute('aria-pressed', 'true');

      renderVideos();
    });
  });

  const sortSelect = document.getElementById('sortSelect');

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderVideos();
  });

  const searchInputs = [
    document.getElementById('navSearchInput'),
    document.getElementById('librarySearchInput')
  ].filter(Boolean);

  const updateSearch = debounce((value) => {
    searchQuery = value.trim().toLowerCase();

    searchInputs.forEach((input) => {
      if (input.value !== value) input.value = value;
    });

    renderVideos();
  }, 180);

  searchInputs.forEach((input) => {
    input.addEventListener('input', () => updateSearch(input.value));
  });
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isTyping = ['input', 'textarea', 'select'].includes(tag);

    if (isTyping) return;

    if (event.key === '/') {
      event.preventDefault();
      document.getElementById('librarySearchInput')?.focus();
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      showAddVideoModal();
    }
  });
}

async function loadVideos() {
  const grid = document.getElementById('videoGrid');

  renderSkeletonGrid(grid, 6);

  try {
    allVideos = await Videos.list();

    renderHeroStats();
    renderContinueRail();
    renderTagFilters();
    renderVideos();
  } catch (error) {
    console.error(error);
    toast('Could not load your library.', 'error');

    renderEmptyState(grid, {
      icon: '⚠️',
      title: 'Could not load videos',
      message: 'Refresh the page or check your browser storage permissions.'
    });
  }
}

function renderHeroStats() {
  const container = document.getElementById('heroStats');

  if (!container) return;

  const total = allVideos.length;
  const completed = allVideos.filter((video) => video.completed).length;
  const inProgress = allVideos.filter(
    (video) => !video.completed && Number(video.progress || 0) > 0
  ).length;

  if (!total) {
    container.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
        Start by saving your first learning video
      </span>
    `;
    return;
  }

  container.innerHTML = `
    <span class="inline-flex items-center gap-2">
      <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
      ${total} saved
    </span>
    <span class="text-slate-300 dark:text-slate-700">•</span>
    <span class="inline-flex items-center gap-2">
      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
      ${completed} completed
    </span>
    <span class="text-slate-300 dark:text-slate-700">•</span>
    <span class="inline-flex items-center gap-2">
      <span class="h-2 w-2 rounded-full bg-amber-500"></span>
      ${inProgress} in progress
    </span>
  `;
}

function renderContinueRail() {
  const section = document.getElementById('continueSection');
  const rail = document.getElementById('continueRail');

  if (!section || !rail) return;

  const videos = allVideos
    .filter((video) => !video.completed && Number(video.progress || 0) > 0)
    .sort((a, b) => Number(b.watch_time || 0) - Number(a.watch_time || 0))
    .slice(0, 6);

  if (!videos.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  rail.innerHTML = videos
    .map(
      (video) => `
        <a href="video.html?id=${encodeURIComponent(video.id)}"
          class="group min-w-[260px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div class="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-800">
            <img
              src="https://img.youtube.com/vi/${escapeHTML(video.youtube_id)}/mqdefault.jpg"
              alt=""
              loading="lazy"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div class="absolute inset-x-0 bottom-0 h-1 bg-slate-950/20">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-pink-500" style="width:${Number(video.progress || 0)}%"></div>
            </div>
          </div>
          <div class="p-4">
            <h3 class="line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">${escapeHTML(video.title)}</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Resume at ${formatTime(video.watch_time || 0)}
            </p>
          </div>
        </a>
      `
    )
    .join('');
}

function renderTagFilters() {
  const container = document.getElementById('tagFilters');

  if (!container) return;

  const tags = [
    ...new Set(allVideos.flatMap((video) => video.tags || []).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b));

  if (!tags.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button data-tag="" class="tag-filter ${!activeTag ? 'active-tag' : ''}">All topics</button>
    ${tags
      .map(
        (tag) => `
          <button data-tag="${escapeHTML(tag)}" class="tag-filter ${activeTag === tag ? 'active-tag' : ''}">
            ${escapeHTML(tag)}
          </button>
        `
      )
      .join('')}
  `;

  container.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTag = button.dataset.tag || '';
      renderTagFilters();
      renderVideos();
    });
  });
}

function getFilteredVideos() {
  let videos = [...allVideos];

  if (currentFilter === 'inprogress') {
    videos = videos.filter(
      (video) => !video.completed && Number(video.progress || 0) > 0
    );
  }

  if (currentFilter === 'completed') {
    videos = videos.filter((video) => video.completed);
  }

  if (currentFilter === 'unstarted') {
    videos = videos.filter(
      (video) => !video.completed && Number(video.progress || 0) === 0
    );
  }

  if (activeTag) {
    videos = videos.filter((video) => (video.tags || []).includes(activeTag));
  }

  if (searchQuery) {
    videos = videos.filter((video) => {
      const haystack = [
        video.title,
        video.description,
        ...(video.tags || [])
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchQuery);
    });
  }

  if (currentSort === 'oldest') {
    videos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (currentSort === 'progress') {
    videos.sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0));
  } else if (currentSort === 'az') {
    videos.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    videos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return videos;
}

function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const subtitle = document.getElementById('librarySubtitle');

  if (!grid) return;

  const videos = getFilteredVideos();

  if (subtitle) {
    subtitle.textContent =
      videos.length === allVideos.length
        ? `${allVideos.length} video${allVideos.length === 1 ? '' : 's'} in your library`
        : `${videos.length} of ${allVideos.length} videos shown`;
  }

  if (!allVideos.length) {
    renderEmptyState(grid, {
      icon: '🎬',
      title: 'Build your learning library',
      message:
        'Paste any YouTube learning video, organize it by topic, and EduLearn will track your progress.',
      actionText: 'Add your first video',
      onAction: showAddVideoModal
    });

    return;
  }

  if (!videos.length) {
    renderEmptyState(grid, {
      icon: '🔍',
      title: 'No videos match',
      message: searchQuery
        ? `No saved videos match “${searchQuery}”.`
        : 'Try changing the filter, tag, or sort option.'
    });

    return;
  }

  grid.innerHTML = videos.map(videoCardHTML).join('');

  grid.querySelectorAll('[data-video-card]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) return;

      window.location.href = `video.html?id=${encodeURIComponent(card.dataset.videoId)}`;
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });

  grid.querySelectorAll('[data-delete-video]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();

      const videoId = button.dataset.deleteVideo;
      const video = allVideos.find((item) => item.id === videoId);

      if (!video) return;

      const confirmed = confirm(`Delete "${video.title}" from your library?`);

      if (!confirmed) return;

      await Videos.remove(videoId);
      toast('Video deleted.', 'success');
      await loadVideos();
    });
  });

  animateCardStagger('[data-video-card]');
}

function videoCardHTML(video) {
  const progress = Math.round(Number(video.progress || 0));
  const tags = (video.tags || [])
    .slice(0, 3)
    .map(
      (tag) => `
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          ${escapeHTML(tag)}
        </span>
      `
    )
    .join('');

  return `
    <article
      data-card
      data-video-card
      data-video-id="${escapeHTML(video.id)}"
      tabindex="0"
      class="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft outline-none transition hover:-translate-y-1 hover:shadow-premium focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-800">
        <img
          src="https://img.youtube.com/vi/${escapeHTML(video.youtube_id)}/hqdefault.jpg"
          alt=""
          loading="lazy"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div class="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/25">
          <span class="grid h-14 w-14 scale-95 place-items-center rounded-full bg-white/95 text-indigo-600 opacity-0 shadow-floating transition group-hover:scale-100 group-hover:opacity-100">
            <svg class="ml-1 h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </span>
        </div>

        ${
          video.completed
            ? `<span class="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-soft">Completed</span>`
            : ''
        }

        <div class="absolute inset-x-0 bottom-0 h-1.5 bg-slate-950/20">
          <div class="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-pink-500" style="width:${progress}%"></div>
        </div>
      </div>

      <div class="p-5">
        <div class="mb-3 flex items-start justify-between gap-3">
          <h3 class="line-clamp-2 font-display text-lg font-bold leading-snug text-slate-950 dark:text-white">
            ${escapeHTML(video.title)}
          </h3>

          <button
            data-delete-video="${escapeHTML(video.id)}"
            class="rounded-xl p-2 text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-950/40"
            aria-label="Delete video"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 7-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-9 0h12"/>
            </svg>
          </button>
        </div>

        ${
          video.description
            ? `<p class="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">${escapeHTML(video.description)}</p>`
            : `<p class="text-sm leading-6 text-slate-500 dark:text-slate-500">No description added yet.</p>`
        }

        <div class="mt-4 flex flex-wrap gap-2">${tags}</div>

        <div class="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>${progress}% complete</span>
          <span>${video.watch_time ? `Last watched ${formatTime(video.watch_time)}` : 'Not started'}</span>
        </div>
      </div>
    </article>
  `;
}

function showAddVideoModal() {
  openModal({
    title: 'Add a learning video',
    description:
      'Paste a YouTube link, give it a clear title, and optionally add topics separated by commas.',
    confirmText: 'Save video',
    content: `
      <form class="space-y-4" id="addVideoForm">
        <label class="block">
          <span class="form-label">YouTube URL</span>
          <input id="videoUrlInput" class="form-input" type="url" placeholder="https://www.youtube.com/watch?v=..." required />
          <span class="form-hint">Supports youtube.com, youtu.be, shorts, and embed links.</span>
        </label>

        <label class="block">
          <span class="form-label">Title</span>
          <input id="videoTitleInput" class="form-input" type="text" placeholder="Example: JavaScript async/await explained" required />
        </label>

        <label class="block">
          <span class="form-label">Description</span>
          <textarea id="videoDescriptionInput" class="form-input min-h-[92px]" placeholder="Why are you saving this video?"></textarea>
        </label>

        <label class="block">
          <span class="form-label">Topics</span>
          <input id="videoTagsInput" class="form-input" type="text" placeholder="javascript, web development, async" />
        </label>
      </form>
    `,
    onConfirm: async (modal) => {
      const url = fieldValue(modal, '#videoUrlInput');
      const title = fieldValue(modal, '#videoTitleInput');
      const description = fieldValue(modal, '#videoDescriptionInput');
      const tags = fieldValue(modal, '#videoTagsInput')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (!extractYouTubeId(url)) {
        toast('Please enter a valid YouTube link.', 'error');
        modal.querySelector('#videoUrlInput')?.focus();
        return false;
      }

      if (!title) {
        toast('Please add a title.', 'error');
        modal.querySelector('#videoTitleInput')?.focus();
        return false;
      }

      await Videos.add({
        url,
        title,
        description,
        tags
      });

      toast('Video added to your library.', 'success');
      await loadVideos();

      return true;
    }
  });
}
