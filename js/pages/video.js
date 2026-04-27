// ============================================
// Video Page
// YouTube player, progress tracking, notes, Pomodoro, focus mode
// ============================================

import { Videos, Playlists, formatTime } from '../modules/storage.js';
import {
  confirmDialog,
  escapeHTML,
  fieldValue,
  initTheme,
  openModal,
  renderEmptyState,
  toast
} from '../modules/ui.js';
import { requireAuth } from '../config/supabase.js';
import { initUserMenu } from '../modules/user-menu.js';
import { Pomodoro } from '../components/pomodoro.js';
import { NoteEditor } from '../components/note-editor.js';

let player = null;
let currentVideo = null;
let noteEditor = null;
let progressTimer = null;
let playerReady = false;
let lastSavedSecond = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initUserMenu();

  const user = await requireAuth('auth.html');

  if (!user) return;

  const videoId = new URLSearchParams(window.location.search).get('id');

  if (!videoId) {
    toast('No video selected.', 'error');
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 900);
    return;
  }

  currentVideo = await Videos.get(videoId);

  if (!currentVideo) {
    toast('Video not found.', 'error');
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 900);
    return;
  }

  renderVideoInfo();
  setupYouTubePlayer();
  setupPomodoro();
  setupFocusMode();
  setupActions();
  setupKeyboardShortcuts();
  renderRelatedVideos();

  window.addEventListener('beforeunload', saveProgressNow);
});

function renderVideoInfo() {
  document.title = `${currentVideo.title} — EduLearn`;

  const info = document.getElementById('videoInfo');
  const progress = Math.round(Number(currentVideo.progress || 0));

  if (!info) return;

  const tags = (currentVideo.tags || [])
    .map(
      (tag) => `
        <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          ${escapeHTML(tag)}
        </span>
      `
    )
    .join('');

  info.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">${tags}</div>
    <h1 class="font-display text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
      ${escapeHTML(currentVideo.title)}
    </h1>
    ${
      currentVideo.description
        ? `<p class="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">${escapeHTML(currentVideo.description)}</p>`
        : ''
    }
    <div class="mt-4 max-w-xl">
      <div class="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span id="progressText">${progress}% complete</span>
        <span>${currentVideo.completed ? 'Completed' : currentVideo.watch_time ? `Resume at ${formatTime(currentVideo.watch_time)}` : 'Not started yet'}</span>
      </div>
      <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div id="progressBar" class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all" style="width:${progress}%"></div>
      </div>
    </div>
  `;
}

function setupYouTubePlayer() {
  window.onYouTubeIframeAPIReady = createPlayer;

  if (window.YT?.Player) {
    createPlayer();
  }
}

function createPlayer() {
  if (!currentVideo || player) return;

  player = new YT.Player('player', {
    width: '100%',
    height: '100%',
    videoId: currentVideo.youtube_id,
    playerVars: {
      start: Math.floor(Number(currentVideo.watch_time || 0)),
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      enablejsapi: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady() {
  playerReady = true;
  initNoteEditor();
  startProgressTracking();
}

function onPlayerStateChange(event) {
  if (!window.YT) return;

  if (event.data === YT.PlayerState.ENDED) {
    completeVideo();
  }

  if (event.data === YT.PlayerState.PLAYING) {
    startProgressTracking();
  }
}

function getCurrentTime() {
  if (!playerReady || !player?.getCurrentTime) return Number(currentVideo.watch_time || 0);

  return player.getCurrentTime();
}

function getDuration() {
  if (!playerReady || !player?.getDuration) return 0;

  return player.getDuration();
}

function seekTo(seconds) {
  if (!playerReady || !player?.seekTo) return;

  player.seekTo(seconds, true);
  player.playVideo?.();
}

function startProgressTracking() {
  window.clearInterval(progressTimer);

  progressTimer = window.setInterval(saveProgressNow, 5000);
}

async function saveProgressNow() {
  if (!playerReady || !currentVideo) return;

  const current = getCurrentTime();
  const duration = getDuration();

  if (!duration || current < 0) return;

  const rounded = Math.floor(current);

  if (Math.abs(rounded - lastSavedSecond) < 4) return;

  lastSavedSecond = rounded;

  const progress = Math.min(100, Math.round((current / duration) * 100));

  currentVideo = await Videos.updateProgress(currentVideo.id, progress, current);

  updateProgressUI();
}

function updateProgressUI() {
  const progress = Math.round(Number(currentVideo.progress || 0));
  const text = document.getElementById('progressText');
  const bar = document.getElementById('progressBar');

  if (text) text.textContent = `${progress}% complete`;
  if (bar) bar.style.width = `${progress}%`;
}

async function completeVideo() {
  currentVideo = await Videos.markComplete(currentVideo.id);
  updateProgressUI();
  toast('Video completed. Great work! 🎉', 'success');
}

function initNoteEditor() {
  if (noteEditor) return;

  noteEditor = new NoteEditor({
    videoId: currentVideo.id,
    getCurrentTime,
    seekTo,
    listEl: document.getElementById('notesList'),
    inputEl: document.getElementById('noteInput'),
    saveBtnEl: document.getElementById('saveNoteBtn'),
    timeDisplayEl: document.getElementById('noteTimestamp')
  });
}

function setupPomodoro() {
  const pomodoro = new Pomodoro({
    displayEl: document.getElementById('pomodoroTime'),
    triggerEl: document.getElementById('pomodoroBtn'),
    onPhaseChange: (phase) => {
      if (phase === 'break') {
        toast('Focus session complete. Take a short break.', 'success');
      } else {
        toast('Break complete. Back to learning.', 'info');
      }
    }
  });

  const notificationButton = document.getElementById('enableNotificationsBtn');

  notificationButton?.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      toast('Notifications are not supported in this browser.', 'error');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      toast('Timer notifications enabled.', 'success');
    }
  });

  window.edulearnPomodoro = pomodoro;
}

function setupFocusMode() {
  const button = document.getElementById('focusBtn');
  const shell = document.getElementById('videoShell');

  button?.addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
    shell?.classList.toggle('focus-mode-shell');

    const enabled = document.body.classList.contains('focus-mode');

    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('[data-focus-label]').textContent = enabled ? 'Exit focus' : 'Focus';
  });
}

function setupActions() {
  document.getElementById('markCompleteBtn')?.addEventListener('click', completeVideo);

  document.getElementById('addToPlaylistBtn')?.addEventListener('click', showAddToPlaylistModal);

  document.getElementById('deleteVideoBtn')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Delete this video?',
      message:
        'This removes the video, its notes, and playlist references from your library.',
      confirmText: 'Delete video',
      danger: true
    });

    if (!confirmed) return;

    await Videos.remove(currentVideo.id);
    toast('Video deleted.', 'success');

    window.location.href = 'index.html';
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isTyping = ['input', 'textarea', 'select'].includes(tag);

    if (event.key === 'f' && !isTyping) {
      event.preventDefault();
      document.getElementById('focusBtn')?.click();
    }

    if (event.key === 'm' && !isTyping) {
      event.preventDefault();
      document.getElementById('markCompleteBtn')?.click();
    }

    if (event.key === ' ' && !isTyping && player?.getPlayerState) {
      event.preventDefault();

      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  });
}

async function showAddToPlaylistModal() {
  const playlists = await Playlists.list();

  if (!playlists.length) {
    const create = await openModal({
      title: 'Create your first playlist',
      description: 'You need a playlist before you can add this video.',
      confirmText: 'Create playlist',
      content: `
        <label class="block">
          <span class="form-label">Playlist name</span>
          <input id="playlistNameInput" class="form-input" placeholder="Example: Biology revision" />
        </label>
        <label class="mt-4 block">
          <span class="form-label">Description</span>
          <textarea id="playlistDescriptionInput" class="form-input min-h-[84px]" placeholder="Optional"></textarea>
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

        await Playlists.addVideo(playlist.id, currentVideo.id);

        toast('Playlist created and video added.', 'success');

        return true;
      }
    });

    return create;
  }

  openModal({
    title: 'Add to playlist',
    description: 'Choose where this video belongs.',
    confirmText: 'Add video',
    content: `
      <label class="block">
        <span class="form-label">Playlist</span>
        <select id="playlistSelectInput" class="form-input">
          ${playlists
            .map(
              (playlist) => `
                <option value="${escapeHTML(playlist.id)}">${escapeHTML(playlist.name)}</option>
              `
            )
            .join('')}
        </select>
      </label>
    `,
    onConfirm: async (modal) => {
      const playlistId = fieldValue(modal, '#playlistSelectInput');

      await Playlists.addVideo(playlistId, currentVideo.id);

      toast('Video added to playlist.', 'success');

      return true;
    }
  });
}

async function renderRelatedVideos() {
  const container = document.getElementById('relatedVideos');

  if (!container) return;

  const videos = (await Videos.list())
    .filter((video) => video.id !== currentVideo.id)
    .filter((video) => {
      const currentTags = new Set(currentVideo.tags || []);

      return (video.tags || []).some((tag) => currentTags.has(tag));
    })
    .slice(0, 4);

  if (!videos.length) {
    renderEmptyState(container, {
      icon: '📚',
      title: 'No related videos yet',
      message: 'Add more videos with matching topics to see recommendations here.'
    });

    return;
  }

  container.innerHTML = videos
    .map(
      (video) => `
        <a href="video.html?id=${encodeURIComponent(video.id)}"
          class="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <img
            src="https://img.youtube.com/vi/${escapeHTML(video.youtube_id)}/mqdefault.jpg"
            alt=""
            loading="lazy"
            class="h-16 w-24 rounded-xl object-cover"
          />
          <div class="min-w-0">
            <h3 class="line-clamp-2 text-sm font-bold text-slate-950 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
              ${escapeHTML(video.title)}
            </h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              ${Math.round(Number(video.progress || 0))}% complete
            </p>
          </div>
        </a>
      `
    )
    .join('');
}
