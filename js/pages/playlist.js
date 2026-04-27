// ============================================
// Playlists Page
// Create, view, reorder, add/remove videos, share/export
// ============================================

import { Playlists, Videos } from '../modules/storage.js';
import {
  confirmDialog,
  copyToClipboard,
  escapeHTML,
  fieldValue,
  initTheme,
  openModal,
  renderEmptyState,
  toast
} from '../modules/ui.js';
import { requireAuth } from '../config/supabase.js';
import { initUserMenu } from '../modules/user-menu.js';
import { animateCardStagger } from '../modules/animations.js';

let playlists = [];
let videos = [];
let currentPlaylistId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMobileMenu();
  initUserMenu();

  const user = await requireAuth('auth.html');

  if (!user) return;

  document.getElementById('newPlaylistBtn')?.addEventListener('click', showCreatePlaylistModal);

  await loadData();

  window.addEventListener('playlists:changed', loadData);
  window.addEventListener('videos:changed', loadData);
});

function initMobileMenu() {
  const button = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');

  button?.addEventListener('click', () => {
    menu?.classList.toggle('hidden');
  });
}

async function loadData() {
  [playlists, videos] = await Promise.all([Playlists.list(), Videos.list()]);

  if (!currentPlaylistId && playlists[0]) {
    currentPlaylistId = playlists[0].id;
  }

  if (currentPlaylistId && !playlists.some((playlist) => playlist.id === currentPlaylistId)) {
    currentPlaylistId = playlists[0]?.id || null;
  }

  renderPlaylistList();
  renderPlaylistDetail();
}

function renderPlaylistList() {
  const list = document.getElementById('playlistList');

  if (!list) return;

  if (!playlists.length) {
    list.innerHTML = `
      <div class="rounded-3xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">No playlists yet</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Group videos by topic, course, or study session.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = playlists
    .map(
      (playlist) => `
        <button
          data-playlist-id="${escapeHTML(playlist.id)}"
          class="w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            currentPlaylistId === playlist.id
              ? 'border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100'
              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }"
        >
          <span class="block truncate font-semibold">${escapeHTML(playlist.name)}</span>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            ${playlist.video_ids?.length || 0} video${playlist.video_ids?.length === 1 ? '' : 's'}
          </span>
        </button>
      `
    )
    .join('');

  list.querySelectorAll('[data-playlist-id]').forEach((button) => {
    button.addEventListener('click', () => {
      currentPlaylistId = button.dataset.playlistId;
      renderPlaylistList();
      renderPlaylistDetail();
    });
  });
}

function currentPlaylist() {
  return playlists.find((playlist) => playlist.id === currentPlaylistId) || null;
}

function playlistVideos(playlist) {
  return (playlist?.video_ids || [])
    .map((id) => videos.find((video) => video.id === id))
    .filter(Boolean);
}

function renderPlaylistDetail() {
  const container = document.getElementById('playlistContent');

  if (!container) return;

  const playlist = currentPlaylist();

  if (!playlists.length || !playlist) {
    renderEmptyState(container, {
      icon: '📋',
      title: 'Create your first playlist',
      message: 'Playlists help you organize videos into courses, topics, or exam revision plans.',
      actionText: 'New playlist',
      onAction: showCreatePlaylistModal
    });
    return;
  }

  const items = playlistVideos(playlist);
  const completed = items.filter((video) => video.completed).length;
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;

  container.innerHTML = `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Playlist</p>
          <h1 class="mt-1 font-display text-3xl font-extrabold text-slate-950 dark:text-white">${escapeHTML(playlist.name)}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            ${playlist.description ? escapeHTML(playlist.description) : 'No description yet.'}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button id="addVideoToPlaylistBtn" class="btn-primary">Add video</button>
          <button id="sharePlaylistBtn" class="btn-secondary">Share</button>
          <button id="exportPlaylistBtn" class="btn-secondary">Export</button>
          <button id="deletePlaylistBtn" class="btn-danger">Delete</button>
        </div>
      </div>

      <div class="mt-6">
        <div class="mb-2 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>${completed} of ${items.length} completed</span>
          <span>${progress}%</span>
        </div>
        <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500" style="width:${progress}%"></div>
        </div>
      </div>
    </section>

    <section class="mt-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-xl font-bold text-slate-950 dark:text-white">Videos</h2>
        <span class="text-sm text-slate-500 dark:text-slate-400">${items.length} item${items.length === 1 ? '' : 's'}</span>
      </div>

      <div id="playlistVideosList" class="space-y-3"></div>
    </section>
  `;

  document.getElementById('addVideoToPlaylistBtn')?.addEventListener('click', showAddVideoModal);
  document.getElementById('sharePlaylistBtn')?.addEventListener('click', () => sharePlaylist(playlist));
  document.getElementById('exportPlaylistBtn')?.addEventListener('click', () => exportPlaylist(playlist));
  document.getElementById('deletePlaylistBtn')?.addEventListener('click', () => deletePlaylist(playlist));

  renderPlaylistVideos(playlist, items);
}

function renderPlaylistVideos(playlist, items) {
  const list = document.getElementById('playlistVideosList');

  if (!list) return;

  if (!items.length) {
    renderEmptyState(list, {
      icon: '🎬',
      title: 'This playlist is empty',
      message: 'Add saved videos from your library to build a learning path.',
      actionText: 'Add video',
      onAction: showAddVideoModal
    });
    return;
  }

  list.innerHTML = items
    .map((video, index) => playlistVideoItemHTML(video, playlist, index, items.length))
    .join('');

  list.querySelectorAll('[data-remove-video]').forEach((button) => {
    button.addEventListener('click', async () => {
      await Playlists.removeVideo(playlist.id, button.dataset.removeVideo);
      toast('Video removed from playlist.', 'success');
      await loadData();
    });
  });

  list.querySelectorAll('[data-move-video]').forEach((button) => {
    button.addEventListener('click', async () => {
      const videoId = button.dataset.moveVideo;
      const direction = Number(button.dataset.direction);
      const order = [...playlist.video_ids];
      const from = order.indexOf(videoId);
      const to = from + direction;

      if (from < 0 || to < 0 || to >= order.length) return;

      [order[from], order[to]] = [order[to], order[from]];

      await Playlists.reorder(playlist.id, order);
      await loadData();
    });
  });

  animateCardStagger('[data-playlist-video]');
}

function playlistVideoItemHTML(video, playlist, index, total) {
  return `
    <article
      data-card
      data-playlist-video
      class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-premium dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
    >
      <a href="video.html?id=${encodeURIComponent(video.id)}" class="group flex min-w-0 flex-1 gap-4">
        <img
          src="https://img.youtube.com/vi/${escapeHTML(video.youtube_id)}/mqdefault.jpg"
          alt=""
          loading="lazy"
          class="h-24 w-36 shrink-0 rounded-2xl object-cover"
        />

        <div class="min-w-0">
          <h3 class="line-clamp-2 font-bold text-slate-950 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
            ${escapeHTML(video.title)}
          </h3>
          <p class="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            ${video.description ? escapeHTML(video.description) : 'No description added.'}
          </p>
          <div class="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>${Math.round(Number(video.progress || 0))}% complete</span>
            ${video.completed ? '<span class="font-semibold text-emerald-600 dark:text-emerald-300">Completed</span>' : ''}
          </div>
        </div>
      </a>

      <div class="flex shrink-0 items-center gap-2">
        <button
          data-move-video="${escapeHTML(video.id)}"
          data-direction="-1"
          class="icon-button"
          ${index === 0 ? 'disabled' : ''}
          aria-label="Move video up"
        >
          ↑
        </button>
        <button
          data-move-video="${escapeHTML(video.id)}"
          data-direction="1"
          class="icon-button"
          ${index === total - 1 ? 'disabled' : ''}
          aria-label="Move video down"
        >
          ↓
        </button>
        <button
          data-remove-video="${escapeHTML(video.id)}"
          class="icon-button text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          aria-label="Remove video from playlist"
        >
          ✕
        </button>
      </div>
    </article>
  `;
}

function showCreatePlaylistModal() {
  openModal({
    title: 'Create playlist',
    description: 'Group related videos into a focused study path.',
    confirmText: 'Create playlist',
    content: `
      <label class="block">
        <span class="form-label">Name</span>
        <input id="playlistNameInput" class="form-input" placeholder="Example: Physics exam prep" />
      </label>
      <label class="mt-4 block">
        <span class="form-label">Description</span>
        <textarea id="playlistDescriptionInput" class="form-input min-h-[92px]" placeholder="Optional study context"></textarea>
      </label>
    `,
    onConfirm: async (modal) => {
      const name = fieldValue(modal, '#playlistNameInput');
      const description = fieldValue(modal, '#playlistDescriptionInput');

      if (!name) {
        toast('Playlist name is required.', 'error');
        return false;
      }

      const playlist = await Playlists.create({
        name,
        description
      });

      currentPlaylistId = playlist.id;

      toast('Playlist created.', 'success');

      await loadData();

      return true;
    }
  });
}

function showAddVideoModal() {
  const playlist = currentPlaylist();

  if (!playlist) return;

  const availableVideos = videos.filter((video) => !playlist.video_ids.includes(video.id));

  if (!availableVideos.length) {
    renderNoAvailableVideosModal();
    return;
  }

  openModal({
    title: 'Add video to playlist',
    description: 'Select a saved video from your library.',
    confirmText: 'Add video',
    content: `
      <label class="block">
        <span class="form-label">Video</span>
        <select id="videoSelectInput" class="form-input">
          ${availableVideos
            .map(
              (video) => `
                <option value="${escapeHTML(video.id)}">${escapeHTML(video.title)}</option>
              `
            )
            .join('')}
        </select>
      </label>
    `,
    onConfirm: async (modal) => {
      const videoId = fieldValue(modal, '#videoSelectInput');

      await Playlists.addVideo(playlist.id, videoId);

      toast('Video added to playlist.', 'success');

      await loadData();

      return true;
    }
  });
}

function renderNoAvailableVideosModal() {
  openModal({
    title: 'No available videos',
    description:
      'All saved videos are already in this playlist, or your library is empty.',
    confirmText: 'Go to library',
    cancelText: 'Close',
    content: `
      <p class="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
        Add more learning videos from the home page, then come back to organize them here.
      </p>
    `,
    onConfirm: () => {
      window.location.href = 'index.html';
    }
  });
}

function sharePlaylist(playlist) {
  const payload = {
    name: playlist.name,
    description: playlist.description,
    video_ids: playlist.video_ids,
    exported_at: new Date().toISOString()
  };

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;

  copyToClipboard(url, 'Playlist share link copied.');
}

function exportPlaylist(playlist) {
  const items = playlistVideos(playlist);
  const data = {
    ...playlist,
    videos: items,
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const anchor = document.createElement('a');

  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${playlist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'playlist'}.json`;
  anchor.click();

  URL.revokeObjectURL(anchor.href);

  toast('Playlist exported.', 'success');
}

async function deletePlaylist(playlist) {
  const confirmed = await confirmDialog({
    title: 'Delete playlist?',
    message: `Delete "${playlist.name}"? Videos will remain in your library.`,
    confirmText: 'Delete playlist',
    danger: true
  });

  if (!confirmed) return;

  await Playlists.remove(playlist.id);

  toast('Playlist deleted.', 'success');

  await loadData();
}
