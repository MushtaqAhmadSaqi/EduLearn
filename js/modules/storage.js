// ============================================
// Storage — LocalStorage-first, crash-proof
// Works fully offline. Syncs to cloud if configured.
// ============================================
import { supabase, getUser, isCloudEnabled } from '../config/supabase.js';

const PREFIX = 'edulearn:';

const local = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)); }
    catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('Storage failed:', e); return false; }
  }
};

export function extractYouTubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ===== VIDEOS =====
export const Videos = {
  async list() {
    return local.get('videos') || [];
  },

  async get(id) {
    const list = local.get('videos') || [];
    return list.find(v => v.id === id);
  },

  async add({ url, title, description = '', tags = [] }) {
    const youtube_id = extractYouTubeId(url);
    if (!youtube_id) throw new Error('Invalid YouTube URL');

    const video = {
      id: uid(),
      user_id: 'local-user',
      youtube_id,
      title,
      description,
      tags: Array.isArray(tags) ? tags : [],
      progress: 0,
      watch_time: 0,
      completed: false,
      created_at: new Date().toISOString()
    };

    const list = local.get('videos') || [];
    list.unshift(video);
    local.set('videos', list);
    Activity.log('added_video', title);
    window.dispatchEvent(new CustomEvent('videos:changed'));

    // Optional cloud sync
    if (isCloudEnabled) {
      try {
        const user = await getUser();
        await supabase.from('videos').insert({
          user_id: user.id, youtube_id, title, description, tags
        });
      } catch (e) { console.warn('Cloud sync failed:', e); }
    }
    return video;
  },

  async updateProgress(id, progress, watchTime) {
    const list = local.get('videos') || [];
    const idx = list.findIndex(v => v.id === id);
    if (idx === -1) return;
    list[idx].progress = progress;
    list[idx].watch_time = watchTime;
    if (progress >= 95 && !list[idx].completed) {
      list[idx].completed = true;
      Activity.log('completed_video', list[idx].title);
    }
    local.set('videos', list);
  },

  async markComplete(id) {
    const list = local.get('videos') || [];
    const v = list.find(x => x.id === id);
    if (v) {
      v.completed = true;
      v.progress = 100;
      local.set('videos', list);
      Activity.log('completed_video', v.title);
      window.dispatchEvent(new CustomEvent('videos:changed'));
    }
  },

  async remove(id) {
    const list = (local.get('videos') || []).filter(v => v.id !== id);
    local.set('videos', list);
    window.dispatchEvent(new CustomEvent('videos:changed'));
  }
};

// ===== NOTES =====
export const Notes = {
  async list(videoId) {
    return local.get(`notes:${videoId}`) || [];
  },

  async add(videoId, timestampSec, content) {
    const note = {
      id: uid(),
      video_id: videoId,
      timestamp_sec: timestampSec,
      content,
      created_at: new Date().toISOString()
    };
    const list = local.get(`notes:${videoId}`) || [];
    list.push(note);
    list.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    local.set(`notes:${videoId}`, list);
    window.dispatchEvent(new CustomEvent('notes:changed', { detail: videoId }));
    return note;
  },

  async remove(videoId, noteId) {
    const list = (local.get(`notes:${videoId}`) || []).filter(n => n.id !== noteId);
    local.set(`notes:${videoId}`, list);
    window.dispatchEvent(new CustomEvent('notes:changed', { detail: videoId }));
  }
};

// ===== PLAYLISTS =====
export const Playlists = {
  async list() {
    return local.get('playlists') || [];
  },

  async create({ name, description = '' }) {
    const playlist = {
      id: uid(),
      name,
      description,
      video_ids: [],
      share_token: Math.random().toString(36).slice(2, 14),
      created_at: new Date().toISOString()
    };
    const list = local.get('playlists') || [];
    list.unshift(playlist);
    local.set('playlists', list);
    Activity.log('created_playlist', name);
    window.dispatchEvent(new CustomEvent('playlists:changed'));
    return playlist;
  },

  async addVideo(playlistId, videoId) {
    const list = local.get('playlists') || [];
    const p = list.find(x => x.id === playlistId);
    if (!p) return;
    if (!p.video_ids.includes(videoId)) {
      p.video_ids.push(videoId);
      local.set('playlists', list);
      window.dispatchEvent(new CustomEvent('playlists:changed'));
    }
  },

  async remove(id) {
    const list = (local.get('playlists') || []).filter(p => p.id !== id);
    local.set('playlists', list);
    window.dispatchEvent(new CustomEvent('playlists:changed'));
  }
};

// ===== ACTIVITY =====
export const Activity = {
  log(action, detail) {
    const list = local.get('activity') || [];
    list.unshift({
      id: uid(),
      action,
      detail,
      created_at: new Date().toISOString()
    });
    // Keep last 200
    if (list.length > 200) list.length = 200;
    local.set('activity', list);
  },
  async list(limit = 30) {
    return (local.get('activity') || []).slice(0, limit);
  }
};

// ===== GOALS =====
export const Goals = {
  async list() {
    return local.get('goals') || [];
  },
  async add(goal) {
    const entry = { id: uid(), ...goal, created_at: new Date().toISOString() };
    const list = local.get('goals') || [];
    list.unshift(entry);
    local.set('goals', list);
    return entry;
  },
  async remove(id) {
    const list = (local.get('goals') || []).filter(g => g.id !== id);
    local.set('goals', list);
  }
};

// ===== UTIL =====
export function formatTime(seconds) {
  seconds = Math.max(0, seconds || 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
