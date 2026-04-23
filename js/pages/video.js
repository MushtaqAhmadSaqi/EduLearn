// ============================================
// Video Page - Crown Jewel
// YouTube IFrame API + Timestamped Notes + Pomodoro + Focus
// ============================================
import { Videos, Playlists, formatTime } from '../modules/storage.js';
import { toast, openModal, confirmDialog, initTheme } from '../modules/ui.js';
import { requireAuth } from '../config/supabase.js';
import { Pomodoro } from '../components/pomodoro.js';
import { NoteEditor } from '../components/note-editor.js';
import { initUserMenu } from '../modules/user-menu.js';

let player = null;
let currentVideo = null;
let noteEditor = null;
let progressTimer = null;
let isPlayerReady = false;

// ===== INIT =====
(async function init() {
  initTheme();
  initUserMenu();

  const user = await requireAuth('auth.html');
  if (!user) return;

  const videoId = new URLSearchParams(location.search).get('id');
  if (!videoId) {
    toast('No video selected', 'error');
    setTimeout(() => location.href = 'index.html', 1200);
    return;
  }

  currentVideo = await Videos.get(videoId);
  if (!currentVideo) {
    toast('Video not found', 'error');
    setTimeout(() => location.href = 'index.html', 1200);
    return;
  }

  renderVideoInfo();
  setupYouTubePlayer();
  setupPomodoro();
  setupFocusMode();
  setupActions();
  setupKeyboardShortcuts();
  restoreScrollPosition();
})();

// ===== RENDER INFO =====
function renderVideoInfo() {
  document.title = `${currentVideo.title} — EduLearn`;
  const el = document.getElementById('videoInfo');
  const tags = (currentVideo.tags || []).map(t =>
    `<span class="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium">${escape(t)}</span>`
  ).join('');

  el.innerHTML = `
    <h1 class="font-display font-bold text-2xl sm:text-3xl leading-tight">${escape(currentVideo.title)}</h1>
    ${tags ? `<div class="flex flex-wrap gap-2">${tags}</div>` : ''}
    ${currentVideo.description ? `<p class="text-slate-600 dark:text-slate-400 leading-relaxed">${escape(currentVideo.description)}</p>` : ''}
  `;
}

// ===== YOUTUBE PLAYER =====
function setupYouTubePlayer() {
  // YouTube API calls this global when ready
  window.onYouTubeIframeAPIReady = createPlayer;
  if (window.YT && window.YT.Player) createPlayer();
}

function createPlayer() {
  const startTime = Math.floor(currentVideo.watch_time || 0);
  player = new YT.Player('player', {
    videoId: currentVideo.youtube_id,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      start: startTime,
      enablejsapi: 1,
      playsinline: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady() {
  isPlayerReady = true;
  initNoteEditor();
  // Start tracking progress
  startProgressTracking();
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.ENDED) {
    Videos.markComplete(currentVideo.id);
    currentVideo.completed = true;
    toast('Video completed! 🎉', 'success');
  }
}

function startProgressTracking() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (!isPlayerReady || !player || typeof player.getCurrentTime !== 'function') return;

    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (!duration || duration <= 0) return;

    const progress = Math.min((current / duration) * 100, 100);
    document.getElementById('videoProgressFill').style.width = progress + '%';
    Videos.updateProgress(currentVideo.id, progress, current);
  }, 1000);
}

// Save progress when leaving page
window.addEventListener('beforeunload', () => {
  if (isPlayerReady && player?.getCurrentTime) {
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (duration > 0) {
      Videos.updateProgress(currentVideo.id, (current / duration) * 100, current);
    }
  }
  // Save scroll position
  sessionStorage.setItem(`scroll:${currentVideo.id}`, window.scrollY);
});

function restoreScrollPosition() {
  const y = sessionStorage.getItem(`scroll:${currentVideo.id}`);
  if (y) window.scrollTo(0, parseInt(y));
}

// ===== NOTE EDITOR =====
function initNoteEditor() {
  noteEditor = new NoteEditor({
    videoId: currentVideo.id,
    getCurrentTime: () => {
      try { return player?.getCurrentTime?.() || 0; } catch { return 0; }
    },
    seekTo: (t) => {
      player?.seekTo(t, true);
      player?.playVideo();
    },
    listEl: document.getElementById('notesList'),
    inputEl: document.getElementById('noteInput'),
    saveBtnEl: document.getElementById('saveNoteBtn'),
    timeDisplayEl: document.getElementById('currentTimeDisplay')
  });
}

// ===== POMODORO =====
function setupPomodoro() {
  new Pomodoro({
    displayEl: document.getElementById('pomodoroTime'),
    triggerEl: document.getElementById('pomodoroBtn'),
    onPhaseChange: ({ message }) => toast(message, 'info', 4000)
  });
}

// ===== FOCUS MODE =====
function setupFocusMode() {
  const btn = document.getElementById('focusBtn');
  btn.addEventListener('click', toggleFocus);
}

function toggleFocus() {
  document.body.classList.toggle('focus-mode');
  const isFocus = document.body.classList.contains('focus-mode');
  toast(isFocus ? 'Focus mode on' : 'Focus mode off', 'info', 1500);
}

// ===== ACTIONS =====
function setupActions() {
  document.getElementById('markCompleteBtn').addEventListener('click', async () => {
    await Videos.markComplete(currentVideo.id);
    currentVideo.completed = true;
    toast('Marked as viewed!', 'success');
  });

  document.getElementById('addToPlaylistBtn').addEventListener('click', showPlaylistModal);
  document.getElementById('shareBtn').addEventListener('click', showShareModal);
  document.getElementById('downloadBtn').addEventListener('click', downloadData);
}

// ===== PLAYLIST MODAL =====
async function showPlaylistModal() {
  const playlists = await Playlists.list();

  const content = `
    <div class="p-6">
      <h3 class="font-display font-bold text-xl mb-4">Add to Playlist</h3>

      <div id="plList" class="max-h-64 overflow-y-auto space-y-2 mb-4">
        ${playlists.length === 0
          ? '<p class="text-sm text-slate-500 text-center py-4">No playlists yet</p>'
          : playlists.map(p => `
            <button data-pl-id="${p.id}"
              class="pl-option w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition text-left">
              <div>
                <div class="font-medium">${escape(p.name)}</div>
                <div class="text-xs text-slate-500">${p.video_ids?.length || 0} videos</div>
              </div>
              ${p.video_ids?.includes(currentVideo.id)
                ? '<span class="text-xs text-emerald-500 font-medium">✓ Added</span>'
                : '<span class="text-xs text-indigo-500 font-medium">+ Add</span>'}
            </button>
          `).join('')}
      </div>

      <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div class="flex gap-2">
          <input id="newPlInput" type="text" placeholder="Create new playlist..."
            class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:border-indigo-500">
          <button id="createPlBtn" class="btn-primary text-sm px-4">Create</button>
        </div>
      </div>

      <div class="flex justify-end mt-4">
        <button data-close class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  `;

  const { overlay, close } = openModal(content);

  overlay.querySelectorAll('.pl-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      await Playlists.addVideo(btn.dataset.plId, currentVideo.id);
      toast('Added to playlist', 'success');
      close();
    });
  });

  overlay.querySelector('[data-close]').onclick = close;

  overlay.querySelector('#createPlBtn').onclick = async () => {
    const name = overlay.querySelector('#newPlInput').value.trim();
    if (!name) return;
    try {
      const pl = await Playlists.create({ name });
      await Playlists.addVideo(pl.id, currentVideo.id);
      toast('Playlist created & video added', 'success');
      close();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ===== SHARE MODAL =====
function showShareModal() {
  const url = `https://youtu.be/${currentVideo.youtube_id}`;
  const title = encodeURIComponent(currentVideo.title);
  const shareUrl = encodeURIComponent(url);

  const content = `
    <div class="p-6">
      <h3 class="font-display font-bold text-xl mb-4">Share Video</h3>

      <div class="flex gap-2 mb-5">
        <input value="${url}" readonly id="shareUrlInput"
          class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono">
        <button id="copyShareBtn" class="btn-primary text-sm px-4">Copy</button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <a href="https://wa.me/?text=${title}%20${shareUrl}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#25D366] text-white font-medium hover:opacity-90 transition text-sm">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          <span class="text-xs">WhatsApp</span>
        </a>
        <a href="https://twitter.com/intent/tweet?text=${title}&url=${shareUrl}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-medium hover:opacity-90 transition text-sm">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          <span class="text-xs">X (Twitter)</span>
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#1877F2] text-white font-medium hover:opacity-90 transition text-sm">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"/></svg>
          <span class="text-xs">Facebook</span>
        </a>
        <a href="mailto:?subject=${title}&body=${shareUrl}"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-medium hover:opacity-90 transition text-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <span class="text-xs">Email</span>
        </a>
      </div>

      <div class="flex justify-end mt-5">
        <button data-close class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  `;

  const { overlay, close } = openModal(content);

  overlay.querySelector('#copyShareBtn').onclick = () => {
    navigator.clipboard.writeText(url);
    toast('Link copied!', 'success');
  };
  overlay.querySelector('[data-close]').onclick = close;
}

// ===== DOWNLOAD =====
async function downloadData() {
  const { Notes } = await import('../modules/storage.js');
  const notes = await Notes.list(currentVideo.id);

  const data = {
    title: currentVideo.title,
    description: currentVideo.description,
    url: `https://youtu.be/${currentVideo.youtube_id}`,
    tags: currentVideo.tags,
    progress: currentVideo.progress,
    completed: currentVideo.completed,
    notes: notes.map(n => ({
      timestamp: formatTime(n.timestamp_sec),
      content: n.content
    })),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${currentVideo.title.replace(/[^a-z0-9]+/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported!', 'success');
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (!isPlayerReady) return;

    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        const state = player.getPlayerState();
        state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
        break;
      case 'n':
        e.preventDefault();
        noteEditor?.focusInput();
        break;
      case 'f':
        e.preventDefault();
        toggleFocus();
        break;
      case 'arrowleft':
        e.preventDefault();
        player.seekTo(Math.max(0, player.getCurrentTime() - 5), true);
        break;
      case 'arrowright':
        e.preventDefault();
        player.seekTo(player.getCurrentTime() + 5, true);
        break;
      case 'escape':
        if (document.body.classList.contains('focus-mode')) toggleFocus();
        break;
    }
  });
}

// ===== UTIL =====
function escape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
