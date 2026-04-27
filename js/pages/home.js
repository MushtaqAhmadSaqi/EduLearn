// ============================================
// Homepage v2 — search, sort, tags, continue rail
// ============================================
import { Videos, extractYouTubeId } from '../modules/storage.js';
import { toast, renderEmptyState, openModal, initTheme } from '../modules/ui.js';

let currentFilter = 'all';
let currentSort = 'newest';
let activeTag = null;
let searchQuery = '';
let allVideos = [];

function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

onReady(async () => {
  try {
    initTheme();
    initMobileMenu();
    initFilters();
    initSort();
    initSearch();
    initAddVideoBtn();
    initShortcutHelp();
    await loadVideos();
    console.log('✅ Homepage v2 initialized');
  } catch (err) {
    console.error('❌ Homepage init failed:', err);
    toast('Something went wrong. Check console.', 'error');
  }
});

// ===== LOAD & RENDER =====
async function loadVideos() {
  allVideos = await Videos.list();
  renderHeroStats(allVideos);
  renderContinueRail(allVideos);
  renderTagFilters(allVideos);
  renderVideos();
}

function renderVideos() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;

  let videos = [...allVideos];

  // Filter by tab
  if (currentFilter === 'inprogress') videos = videos.filter(v => !v.completed && v.progress > 0);
  else if (currentFilter === 'completed') videos = videos.filter(v => v.completed);

  // Filter by active tag
  if (activeTag) videos = videos.filter(v => (v.tags || []).includes(activeTag));

  // Filter by search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    videos = videos.filter(v =>
      (v.title || '').toLowerCase().includes(q) ||
      (v.description || '').toLowerCase().includes(q) ||
      (v.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (currentSort === 'oldest') videos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else if (currentSort === 'progress') videos.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  else if (currentSort === 'az') videos.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  // newest is default (already sorted by unshift)

  // Subtitle
  const sub = document.getElementById('librarySubtitle');
  if (sub) sub.textContent = videos.length === allVideos.length
    ? `${allVideos.length} video${allVideos.length !== 1 ? 's' : ''}`
    : `${videos.length} of ${allVideos.length} videos`;

  if (videos.length === 0) {
    if (allVideos.length === 0) {
      renderEmptyState(grid, {
        icon: '🎬',
        title: 'Your library is empty',
        message: 'Paste a YouTube link or search YouTube to add your first learning video.',
        actionText: '＋ Add Your First Video',
        onAction: showAddVideoModal
      });
    } else {
      renderEmptyState(grid, {
        icon: '🔍',
        title: 'No videos match',
        message: searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter or tag.'
      });
    }
    return;
  }

  grid.innerHTML = videos.map(videoCardHTML).join('');

  grid.querySelectorAll('[data-video-id]').forEach(card => {
    card.addEventListener('click', () => location.href = `video.html?id=${card.dataset.videoId}`);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
  });
}

// ===== HERO STATS =====
function renderHeroStats(videos) {
  const el = document.getElementById('heroStats');
  if (!el) return;
  const completed = videos.filter(v => v.completed).length;
  const inProgress = videos.filter(v => !v.completed && v.progress > 0).length;
  if (videos.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = [
    `<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span>${videos.length} videos saved</span>`,
    `<span class="text-slate-300 dark:text-slate-700">·</span>`,
    `<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>${completed} completed</span>`,
    inProgress > 0 ? `<span class="text-slate-300 dark:text-slate-700">·</span><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>${inProgress} in progress</span>` : ''
  ].join('');
}

// ===== CONTINUE WATCHING RAIL =====
function renderContinueRail(videos) {
  const section = document.getElementById('continueSection');
  const rail = document.getElementById('continueRail');
  if (!section || !rail) return;

  const inProgress = videos
    .filter(v => !v.completed && v.progress > 5)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 6);

  if (inProgress.length === 0) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  rail.innerHTML = inProgress.map(v => {
    const thumb = `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`;
    const pct = Math.round(v.progress || 0);
    return `
      <div class="continue-card" data-video-id="${v.id}">
        <div class="relative aspect-video bg-slate-900">
          <img src="${thumb}" alt="" loading="lazy" class="w-full h-full object-cover opacity-90">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div class="absolute bottom-0 inset-x-0 p-3">
            <div class="h-1 bg-white/20 rounded-full mb-2 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-indigo-400 to-pink-400 rounded-full" style="width:${pct}%"></div>
            </div>
            <p class="text-white text-xs font-medium line-clamp-2 leading-tight">${escapeHtml(v.title)}</p>
            <p class="text-white/60 text-xs mt-0.5">${pct}% watched</p>
          </div>
          <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
            <svg class="w-3 h-3 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
    `;
  }).join('');

  rail.querySelectorAll('[data-video-id]').forEach(card => {
    card.addEventListener('click', () => location.href = `video.html?id=${card.dataset.videoId}`);
  });
}

// ===== TAG FILTER CHIPS =====
function renderTagFilters(videos) {
  const container = document.getElementById('tagFilters');
  if (!container) return;

  const tagCounts = {};
  videos.forEach(v => (v.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  if (tags.length === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');

  container.innerHTML = tags.map(([tag, count]) => `
    <button class="tag-chip ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
      ${escapeHtml(tag)} <span class="ml-1 opacity-60">${count}</span>
    </button>
  `).join('');

  container.querySelectorAll('[data-tag]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeTag = activeTag === chip.dataset.tag ? null : chip.dataset.tag;
      renderTagFilters(allVideos);
      renderVideos();
    });
  });
}

// ===== SEARCH =====
function initSearch() {
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const onSearch = debounce(q => { searchQuery = q; renderVideos(); }, 250);

  ['navSearchInput', 'mobileSearchInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', e => onSearch(e.target.value));
  });
}

// ===== SORT =====
function initSort() {
  const sel = document.getElementById('sortSelect');
  if (sel) sel.addEventListener('change', e => { currentSort = e.target.value; renderVideos(); });
}

// ===== SHORTCUT HELP ===== 
function initShortcutHelp() {
  document.addEventListener('keydown', e => {
    if (e.key === '?' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      const existing = document.getElementById('shortcutOverlay');
      if (existing) { existing.remove(); return; }
      const el = document.createElement('div');
      el.id = 'shortcutOverlay';
      el.className = 'shortcut-overlay visible';
      el.innerHTML = `
        <div class="glass-card rounded-2xl p-6 max-w-sm w-full mx-4">
          <h3 class="font-display font-bold text-lg mb-4">Keyboard Shortcuts</h3>
          <ul class="space-y-3 text-sm">
            <li class="flex justify-between"><span>Open Add Video</span><kbd class="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">A</kbd></li>
            <li class="flex justify-between"><span>Search library</span><kbd class="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">/</kbd></li>
            <li class="flex justify-between"><span>This help</span><kbd class="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-mono text-xs">?</kbd></li>
          </ul>
          <p class="text-xs text-slate-400 mt-4">Press Esc or ? to close</p>
        </div>`;
      el.addEventListener('click', e => { if (e.target === el) el.remove(); });
      document.body.appendChild(el);
    }
    if (e.key === 'Escape') document.getElementById('shortcutOverlay')?.remove();
    if (e.key === 'a' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) showAddVideoModal();
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      document.getElementById('navSearchInput')?.focus();
    }
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 30) return new Date(dateStr).toLocaleDateString();
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

function videoCardHTML(v) {
  const thumb = `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`;
  const progress = Math.round(v.progress || 0);
  const tags = (v.tags || []).slice(0, 2);
  const ago = timeAgo(v.created_at);

  return `
    <article data-video-id="${v.id}" role="button" tabindex="0"
      class="card-lift group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
      aria-label="${escapeHtml(v.title)}">
      <div class="relative aspect-video overflow-hidden bg-slate-900">
        <img src="${thumb}" alt="" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
        <!-- Hover play overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div class="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <svg class="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <!-- Badges -->
        <div class="absolute top-2 left-2 flex gap-1">
          ${v.completed ? `<span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow">✓ Done</span>` : ''}
          ${!v.completed && progress > 0 ? `<span class="px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-sm">${progress}%</span>` : ''}
        </div>
        <!-- Progress bar -->
        <div class="absolute bottom-0 inset-x-0 h-1 bg-black/30">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500" style="width:${progress}%"></div>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-semibold text-sm leading-snug line-clamp-2 mb-2.5">${escapeHtml(v.title)}</h3>
        <div class="flex items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1">
            ${tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">${escapeHtml(t)}</span>`).join('')}
          </div>
          ${ago ? `<span class="text-xs text-slate-400 shrink-0">${ago}</span>` : ''}
        </div>
      </div>
    </article>
  `;
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
      renderVideos(); // instant, no storage re-read
    });
  });
}

function initAddVideoBtn() {
  // Event delegation handles all add video buttons (both fixed and empty states)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="add-video"]');
    if (btn) {
      e.preventDefault();
      showAddVideoModal();
    }
  });
}

function showAddVideoModal() {
  const { overlay, close } = openModal(`
    <div class="p-6 space-y-5">
      <h3 class="font-bold text-2xl">Add YouTube Video</h3>
      
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button id="tabUrl" class="px-4 py-2 font-medium text-sm border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400">Add via URL</button>
        <button id="tabSearch" class="px-4 py-2 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Search YouTube</button>
      </div>

      <!-- URL Form -->
      <form id="addVideoForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">YouTube URL *</label>
          <input name="url" type="url" required autofocus placeholder="https://youtube.com/watch?v=..."
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Title *</label>
          <input name="title" type="text" required
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Tags (optional, comma-separated)</label>
          <input name="tags" type="text" placeholder="math, algebra"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
        </div>
        <div class="flex gap-3 justify-end pt-2">
          <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
          <button type="submit" class="btn-primary">Add Video</button>
        </div>
      </form>

      <!-- Search Section -->
      <div id="searchSection" class="hidden space-y-4">
        <form id="searchForm" class="flex gap-2">
          <input name="query" type="text" required placeholder="Search YouTube..."
            class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
          <button type="submit" class="btn-primary px-5">Search</button>
        </form>
        <div id="searchResults" class="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          <div class="text-center py-6 text-slate-500 text-sm">Enter a search term above</div>
        </div>
        <div class="flex gap-3 justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
          <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
        </div>
      </div>
    </div>
  `);

  const tabUrl = overlay.querySelector('#tabUrl');
  const tabSearch = overlay.querySelector('#tabSearch');
  const formUrl = overlay.querySelector('#addVideoForm');
  const sectionSearch = overlay.querySelector('#searchSection');

  // Tab switching
  const switchTab = (toSearch) => {
    if (toSearch) {
      tabSearch.classList.replace('border-transparent', 'border-indigo-500');
      tabSearch.classList.replace('text-slate-500', 'text-indigo-600');
      tabSearch.classList.add('dark:text-indigo-400');
      tabUrl.classList.replace('border-indigo-500', 'border-transparent');
      tabUrl.classList.replace('text-indigo-600', 'text-slate-500');
      tabUrl.classList.remove('dark:text-indigo-400');
      formUrl.classList.add('hidden');
      sectionSearch.classList.remove('hidden');
      overlay.querySelector('input[name="query"]').focus();
    } else {
      tabUrl.classList.replace('border-transparent', 'border-indigo-500');
      tabUrl.classList.replace('text-slate-500', 'text-indigo-600');
      tabUrl.classList.add('dark:text-indigo-400');
      tabSearch.classList.replace('border-indigo-500', 'border-transparent');
      tabSearch.classList.replace('text-indigo-600', 'text-slate-500');
      tabSearch.classList.remove('dark:text-indigo-400');
      sectionSearch.classList.add('hidden');
      formUrl.classList.remove('hidden');
      overlay.querySelector('input[name="url"]').focus();
    }
  };

  tabUrl.onclick = () => switchTab(false);
  tabSearch.onclick = () => switchTab(true);

  // Close handlers
  overlay.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = close);

  // URL Form Logic
  formUrl.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(formUrl);
    const url = fd.get('url');
    if (!extractYouTubeId(url)) {
      toast('Invalid YouTube URL', 'error');
      return;
    }
    const btn = formUrl.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
      await Videos.add({
        url,
        title: fd.get('title'),
        tags: (fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
      });
      close();
      toast('Video added!', 'success');
      await loadVideos();
    } catch (err) {
      toast(err.message || 'Failed to add', 'error');
      btn.disabled = false;
      btn.textContent = 'Add Video';
    }
  };

  // Search Form Logic (using Invidious API)
  const searchForm = overlay.querySelector('#searchForm');
  const searchResults = overlay.querySelector('#searchResults');

  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    const query = new FormData(searchForm).get('query');
    const btn = searchForm.querySelector('button[type=submit]');
    
    btn.disabled = true;
    btn.textContent = '...';
    searchResults.innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Searching...</div>';

    try {
      // Fallback instances for reliability
      const instances = [
        'vid.puffyan.us',
        'invidious.slipfox.xyz',
        'inv.tux.pizza'
      ];
      
      let data = null;
      for (const instance of instances) {
        try {
          const res = await fetch(`https://${instance}/api/v1/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            data = await res.json();
            break; // Success, break out of loop
          }
        } catch (e) {
          console.warn(`Instance ${instance} failed, trying next...`);
        }
      }

      if (!data) throw new Error('All search instances failed');
      
      const videos = data.filter(item => item.type === 'video').slice(0, 8); // Top 8 results
      
      if (videos.length === 0) {
        searchResults.innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">No videos found.</div>';
      } else {
        searchResults.innerHTML = videos.map(v => `
          <div class="flex gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition items-center border border-transparent dark:border-slate-700/30">
            <img src="${v.videoThumbnails?.find(t => t.quality === 'medium')?.url || v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}" class="w-28 sm:w-32 aspect-video object-cover rounded-lg bg-slate-900 shadow-sm" alt="Thumbnail">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm line-clamp-2 leading-tight" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</div>
              <div class="text-xs text-slate-500 mt-1.5 truncate flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-7.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                ${escapeHtml(v.author)}
              </div>
            </div>
            <button type="button" data-add-vid="${v.videoId}" data-title="${escapeHtml(v.title)}" class="shrink-0 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 rounded-lg text-sm font-medium transition active:scale-95">Add</button>
          </div>
        `).join('');

        // Bind add buttons
        searchResults.querySelectorAll('[data-add-vid]').forEach(addBtn => {
          addBtn.onclick = async () => {
            const originalText = addBtn.textContent;
            addBtn.disabled = true;
            addBtn.textContent = '...';
            try {
              await Videos.add({
                url: `https://youtube.com/watch?v=${addBtn.dataset.addVid}`,
                title: addBtn.dataset.title,
                tags: []
              });
              addBtn.textContent = '✓ Added';
              addBtn.classList.replace('text-indigo-600', 'text-emerald-600');
              addBtn.classList.replace('dark:text-indigo-400', 'dark:text-emerald-400');
              addBtn.classList.replace('bg-indigo-50', 'bg-emerald-50');
              addBtn.classList.replace('dark:bg-indigo-500/10', 'dark:bg-emerald-500/10');
              
              // Only load videos in background, let user keep adding if they want
              loadVideos();
              toast('Video added to library!', 'success');
            } catch (err) {
              toast(err.message || 'Failed to add', 'error');
              addBtn.disabled = false;
              addBtn.textContent = originalText;
            }
          };
        });
      }
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = '<div class="text-center py-6 px-4"><div class="text-red-500 mb-2">Search service temporarily unavailable.</div><div class="text-slate-500 text-sm">Please use the "Add via URL" tab instead.</div></div>';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Search';
    }
  };
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

// ===== REACTIVE =====
window.addEventListener('videos:changed', loadVideos);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
