// ============================================
// Playlists — Drag-drop reorder, share, auto-play next
// ============================================
import { Playlists, Videos } from '../modules/storage.js';
import { toast, openModal, confirmDialog, renderEmptyState, initTheme } from '../modules/ui.js';
import { requireAuth, supabase } from '../config/supabase.js';
import { initUserMenu } from '../modules/user-menu.js';
import { animateCardStagger } from '../modules/animations.js';

let currentPlaylistId = null;

(async function init() {
  initTheme();
  initMobileMenu();
  initUserMenu();
  const user = await requireAuth('auth.html');
  if (!user) return;
  
  await checkSharedImport();
  await loadPlaylists();

  document.getElementById('newPlaylistBtn').addEventListener('click', showCreateModal);
  window.addEventListener('playlists:changed', loadPlaylists);
  window.addEventListener('playlists:synced', loadPlaylists);
})();

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

// ===== IMPORT SHARED =====
async function checkSharedImport() {
  const token = new URLSearchParams(location.search).get('share');
  if (!token) return;

  // Fetch shared playlist (RLS allows public read)
  const { data: shared } = await supabase
    .from('playlists')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();

  if (!shared) {
    toast('Shared playlist not found', 'error');
    return;
  }

  const proceed = await confirmDialog({
    title: 'Import Playlist',
    message: `Import "${shared.name}" with ${shared.video_ids?.length || 0} videos into your account?`,
    confirmText: 'Import'
  });
  if (!proceed) {
    history.replaceState({}, '', location.pathname);
    return;
  }

  // Fetch video metadata
  let videoIds = [];
  if (shared.video_ids?.length) {
    const { data: sharedVideos } = await supabase
      .from('videos')
      .select('youtube_id, title, description, tags')
      .in('id', shared.video_ids);

    // Clone into user's library
    for (const sv of sharedVideos || []) {
      try {
        const v = await Videos.add({
          url: `https://youtu.be/${sv.youtube_id}`,
          title: sv.title,
          description: sv.description,
          tags: sv.tags || []
        });
        videoIds.push(v.id);
      } catch {}
    }
  }

  const pl = await Playlists.create({
    name: shared.name + ' (Imported)',
    description: shared.description || ''
  });

  // Add videos to the new playlist
  for (const vid of videoIds) await Playlists.addVideo(pl.id, vid);

  history.replaceState({}, '', location.pathname);
  toast('Playlist imported!', 'success');
}

// ===== LOAD =====
async function loadPlaylists() {
  const playlists = await Playlists.list();
  const list = document.getElementById('playlistList');

  if (playlists.length === 0) {
    list.innerHTML = `<p class="text-sm text-slate-500 text-center py-6 px-2">No playlists yet.<br>Create your first one!</p>`;
    renderEmptyState(document.getElementById('playlistContent'), {
      icon: '📋',
      title: 'Ready to organize?',
      message: 'Create your first playlist to group videos by topic, course, or study session.',
      actionText: '＋ New Playlist',
      onAction: showCreateModal
    });
    return;
  }

  list.innerHTML = playlists.map(p => `
    <button data-pl-id="${p.id}"
      class="pl-nav-item w-full text-left px-3 py-2.5 rounded-xl transition ${currentPlaylistId === p.id ? 'bg-gradient-to-r from-indigo-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-800/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}">
      <div class="font-medium text-sm truncate">${escape(p.name)}</div>
      <div class="text-xs text-slate-500 mt-0.5">${p.video_ids?.length || 0} video${p.video_ids?.length === 1 ? '' : 's'}</div>
    </button>
  `).join('');

  list.querySelectorAll('.pl-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPlaylistId = btn.dataset.plId;
      loadPlaylists();
      renderPlaylistDetail(currentPlaylistId);
    });
  });

  // Auto-select first
  if (!currentPlaylistId && playlists[0]) {
    currentPlaylistId = playlists[0].id;
    loadPlaylists();
    renderPlaylistDetail(currentPlaylistId);
  } else if (currentPlaylistId) {
    renderPlaylistDetail(currentPlaylistId);
  }
}

// ===== DETAIL =====
async function renderPlaylistDetail(id) {
  const playlists = await Playlists.list();
  const playlist = playlists.find(p => p.id === id);
  if (!playlist) return;

  const allVideos = await Videos.list();
  const videos = (playlist.video_ids || [])
    .map(vid => allVideos.find(v => v.id === vid))
    .filter(Boolean);

  const completed = videos.filter(v => v.completed).length;
  const progress = videos.length > 0 ? (completed / videos.length) * 100 : 0;

  const content = document.getElementById('playlistContent');
  content.innerHTML = `
    <div class="rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">

      <!-- Header -->
      <div class="p-6 border-b border-slate-200 dark:border-slate-700/60">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1">
            <h2 class="font-display font-bold text-2xl mb-1 truncate">${escape(playlist.name)}</h2>
            ${playlist.description ? `<p class="text-sm text-slate-500 dark:text-slate-400">${escape(playlist.description)}</p>` : ''}
          </div>
          <div class="flex gap-2 flex-wrap">
            ${videos.length > 0 ? `
              <button data-action="play-all" class="btn-primary text-sm inline-flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play All
              </button>
            ` : ''}
            <button data-action="share" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-pink-400 text-sm font-medium transition inline-flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              Share
            </button>
            <button data-action="export" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-sm font-medium transition inline-flex items-center gap-1.5" aria-label="Export">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button data-action="delete" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:text-red-500 text-sm font-medium transition" aria-label="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 4a1 1 0 011-1h2a1 1 0 011 1v3H9V4z"/></svg>
            </button>
          </div>
        </div>

        <!-- Progress -->
        <div class="progress-track mb-2">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="flex justify-between text-xs text-slate-500">
          <span>${completed} of ${videos.length} completed</span>
          <span class="font-medium">${Math.round(progress)}%</span>
        </div>
      </div>

      <!-- Videos -->
      <div class="p-4 sm:p-6">
        ${videos.length === 0 ? `
          <div class="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <div class="w-16 h-16 mb-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 flex items-center justify-center text-3xl">🎬</div>
            <p class="font-medium mb-1">This playlist is empty</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">Go to a video and add it to this playlist from the action panel.</p>
            <a href="index.html" class="btn-primary text-sm">Browse Videos</a>
          </div>
        ` : `
          <p class="text-xs text-slate-500 mb-3 px-1">Drag to reorder • Click to watch</p>
          <div id="sortableList" class="space-y-2">
            ${videos.map((v, i) => videoRowHTML(v, i, playlist.id)).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Attach actions
  content.querySelector('[data-action="play-all"]')?.addEventListener('click', () => {
    if (videos[0]) location.href = `video.html?id=${videos[0].id}&playlist=${playlist.id}&index=0`;
  });
  content.querySelector('[data-action="share"]').addEventListener('click', () => sharePlaylist(playlist));
  content.querySelector('[data-action="export"]').addEventListener('click', () => exportPlaylist(playlist, videos));
  content.querySelector('[data-action="delete"]').addEventListener('click', () => deletePlaylist(playlist));

  attachVideoRowHandlers(content, playlist.id);
  initDragDrop(content, playlist);
}

function videoRowHTML(v, index, playlistId) {
  const thumb = `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`;
  const progress = v.progress || 0;
  return `
    <div draggable="true" data-video-id="${v.id}" data-index="${index}"
         class="pl-video-row group flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer">

      <!-- Drag handle -->
      <div class="drag-handle shrink-0 w-5 text-slate-300 group-hover:text-slate-500 transition cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
        <svg class="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M10 13a1 1 0 100-2 1 1 0 000 2zm-4 0a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2zM10 7a1 1 0 100-2 1 1 0 000 2zM6 7a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2zm-4 12a1 1 0 100-2 1 1 0 000 2zm-4 0a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
      </div>

      <!-- Number -->
      <div class="shrink-0 w-7 text-center text-xs font-mono text-slate-400">${String(index + 1).padStart(2, '0')}</div>

      <!-- Thumbnail -->
      <div class="shrink-0 relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-slate-900">
        <img src="${thumb}" loading="lazy" alt="" class="w-full h-full object-cover">
        <div class="absolute bottom-0 inset-x-0 h-1 bg-black/40">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-pink-500" style="width:${progress}%"></div>
        </div>
        ${v.completed ? '<div class="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>' : ''}
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm line-clamp-2">${escape(v.title)}</div>
        <div class="text-xs text-slate-500 mt-1">${v.completed ? '✓ Viewed' : progress > 0 ? `${Math.round(progress)}% watched` : 'Not started'}</div>
      </div>

      <!-- Remove -->
      <button data-remove class="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition flex items-center justify-center" aria-label="Remove from playlist">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `;
}

function attachVideoRowHandlers(container, playlistId) {
  container.querySelectorAll('.pl-video-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove]') || e.target.closest('.drag-handle')) return;
      const idx = row.dataset.index;
      location.href = `video.html?id=${row.dataset.videoId}&playlist=${playlistId}&index=${idx}`;
    });

    row.querySelector('[data-remove]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await confirmDialog({
        title: 'Remove from playlist?',
        message: 'The video stays in your library. Only this playlist reference is removed.',
        confirmText: 'Remove',
        danger: true
      });
      if (!ok) return;

      // Optimistic remove
      row.style.transition = 'opacity 0.2s, transform 0.2s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      setTimeout(() => row.remove(), 200);

      const playlists = await Playlists.list();
      const pl = playlists.find(p => p.id === playlistId);
      if (pl) {
        pl.video_ids = pl.video_ids.filter(x => x !== row.dataset.videoId);
        await supabase.from('playlists').update({ video_ids: pl.video_ids }).eq('id', playlistId);
        window.dispatchEvent(new CustomEvent('playlists:changed'));
      }
    });
  });
}

// ===== DRAG-DROP (native, no library) =====
function initDragDrop(container, playlist) {
  const list = container.querySelector('#sortableList');
  if (!list) return;

  let dragged = null;

  list.querySelectorAll('.pl-video-row').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragged = row;
      row.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', () => {
      row.style.opacity = '';
      saveOrder(playlist);
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragged || dragged === row) return;
      const rect = row.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      row.parentNode.insertBefore(dragged, after ? row.nextSibling : row);
    });
  });
}

async function saveOrder(playlist) {
  const rows = document.querySelectorAll('#sortableList .pl-video-row');
  const newOrder = Array.from(rows).map(r => r.dataset.videoId);

  // Update numbers optimistically
  rows.forEach((r, i) => {
    r.dataset.index = i;
    r.querySelector('.text-slate-400.font-mono').textContent = String(i + 1).padStart(2, '0');
  });

  await supabase.from('playlists').update({ video_ids: newOrder }).eq('id', playlist.id);
  window.dispatchEvent(new CustomEvent('playlists:synced'));
}

// ===== CREATE =====
function showCreateModal() {
  const { overlay, close } = openModal(`
    <form id="plCreateForm" class="p-6 space-y-4">
      <h3 class="font-display font-bold text-xl">New Playlist</h3>
      <div>
        <label class="block text-sm font-medium mb-1.5">Name *</label>
        <input name="name" required autofocus
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">Description</label>
        <textarea name="description" rows="2"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
        <button type="submit" class="btn-primary">Create</button>
      </div>
    </form>
  `);

  const form = overlay.querySelector('#plCreateForm');
  form.querySelector('[data-cancel]').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const pl = await Playlists.create({
        name: fd.get('name'),
        description: fd.get('description')
      });
      currentPlaylistId = pl.id;
      await loadPlaylists(); // Re-render to select the newly created playlist
      close();
      toast('Playlist created!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ===== SHARE =====
function sharePlaylist(playlist) {
  const shareUrl = `${location.origin}${location.pathname}?share=${playlist.share_token}`;
  const { overlay, close } = openModal(`
    <div class="p-6">
      <h3 class="font-display font-bold text-xl mb-2">Share Playlist</h3>
      <p class="text-sm text-slate-500 mb-4">Anyone with this link can import a copy of your playlist.</p>

      <div class="flex gap-2 mb-5">
        <input id="shareInput" value="${shareUrl}" readonly
          class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono">
        <button id="copyShare" class="btn-primary text-sm px-4">Copy</button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <a href="https://wa.me/?text=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#25D366] text-white font-medium hover:opacity-90 transition text-xs">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.287.129.332.202.045.073.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.251.617 4.369 1.69 6.169l-1.718 6.281 6.437-1.689c1.794 1.19 3.885 1.875 6.19 1.875 6.615 0 12-5.373 12-12 0-6.627-5.385-12-12-12zm0 22c-1.796 0-3.45-.51-4.884-1.379l-3.416.896.922-3.32c-1.002-1.515-1.622-3.253-1.622-5.197 0-5.522 4.478-10 10-10s10 4.478 10 10c0 5.522-4.478 10-10 10z"/></svg>
          WhatsApp
        </a>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my playlist: ' + playlist.name)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-medium hover:opacity-90 transition text-xs">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Twitter
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener"
           class="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#1877F2] text-white font-medium hover:opacity-90 transition text-xs">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"/></svg>
          Facebook
        </a>
      </div>

      <div class="flex justify-end mt-5">
        <button data-close class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  `);

  overlay.querySelector('#copyShare').onclick = () => {
    navigator.clipboard.writeText(shareUrl);
    toast('Link copied!', 'success');
  };
  overlay.querySelector('[data-close]').onclick = close;
}

// ===== EXPORT =====
function exportPlaylist(playlist, videos) {
  const data = {
    name: playlist.name,
    description: playlist.description,
    videos: videos.map(v => ({
      title: v.title,
      url: `https://youtu.be/${v.youtube_id}`,
      tags: v.tags,
      completed: v.completed
    })),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${playlist.name.replace(/[^a-z0-9]+/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported!', 'success');
}

// ===== DELETE =====
async function deletePlaylist(playlist) {
  const ok = await confirmDialog({
    title: 'Delete this playlist?',
    message: 'Videos remain in your library. Only the playlist will be removed.',
    confirmText: 'Delete',
    danger: true
  });
  if (!ok) return;
  await Playlists.remove(playlist.id);
  currentPlaylistId = null;
  toast('Playlist deleted', 'info');
}

// ===== UTIL =====
function escape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
