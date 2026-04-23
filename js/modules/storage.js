// ============================================
// Storage - LocalStorage FIRST, Supabase syncs
// Optimistic UI approach
// ============================================
import { supabase, getUser } from '../config/supabase.js';

const CACHE_PREFIX = 'edulearn:';

// ===== LOCAL CACHE =====
const local = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + key)); }
    catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); }
    catch (e) { console.warn('LocalStorage full:', e); }
  },
  remove(key) { localStorage.removeItem(CACHE_PREFIX + key); }
};

// ===== YOUTUBE ID EXTRACTOR =====
export function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ===== VIDEOS =====
export const Videos = {
  async list() {
    const cached = local.get('videos') || [];
    // Return cache instantly, fetch fresh in background
    this._syncFromCloud();
    return cached;
  },

  async _syncFromCloud() {
    const user = await getUser();
    if (!user) return;
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      local.set('videos', data);
      window.dispatchEvent(new CustomEvent('videos:synced', { detail: data }));
    }
  },

  async get(id) {
    const list = local.get('videos') || [];
    return list.find(v => v.id === id);
  },

  async add({ url, title, description = '', tags = [] }) {
    const youtube_id = extractYouTubeId(url);
    if (!youtube_id) throw new Error('Invalid YouTube URL');

    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    // Optimistic insert (temp ID)
    const tempVideo = {
      id: 'temp_' + Date.now(),
      user_id: user.id,
      youtube_id, title, description, tags,
      progress: 0, watch_time: 0, completed: false,
      created_at: new Date().toISOString(),
      _pending: true
    };

    const list = local.get('videos') || [];
    list.unshift(tempVideo);
    local.set('videos', list);
    window.dispatchEvent(new CustomEvent('videos:changed'));

    // Send to cloud
    const { data, error } = await supabase
      .from('videos')
      .insert({ user_id: user.id, youtube_id, title, description, tags })
      .select()
      .single();

    if (error) {
      // Rollback
      const updated = local.get('videos').filter(v => v.id !== tempVideo.id);
      local.set('videos', updated);
      window.dispatchEvent(new CustomEvent('videos:changed'));
      throw error;
    }

    // Replace temp with real
    const final = local.get('videos').map(v => v.id === tempVideo.id ? data : v);
    local.set('videos', final);
    Activity.log('added_video', title);
    window.dispatchEvent(new CustomEvent('videos:changed'));
    return data;
  },

  async updateProgress(id, progress, watchTime) {
    // Local first
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

    // Debounced cloud update
    clearTimeout(this._progressTimer);
    this._progressTimer = setTimeout(async () => {
      await supabase.from('videos')
        .update({
          progress: list[idx].progress,
          watch_time: list[idx].watch_time,
          completed: list[idx].completed
        })
        .eq('id', id);
    }, 2000);
  },

  async remove(id) {
    const list = (local.get('videos') || []).filter(v => v.id !== id);
    local.set('videos', list);
    window.dispatchEvent(new CustomEvent('videos:changed'));
    await supabase.from('videos').delete().eq('id', id);
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
    await supabase.from('videos').update({ completed: true, progress: 100 }).eq('id', id);
  }
};

// ===== NOTES =====
export const Notes = {
  async list(videoId) {
    const cached = local.get(`notes:${videoId}`) || [];
    this._sync(videoId);
    return cached;
  },

  async _sync(videoId) {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp_sec', { ascending: true });
    if (data) {
      local.set(`notes:${videoId}`, data);
      window.dispatchEvent(new CustomEvent('notes:synced', { detail: { videoId, data } }));
    }
  },

  async add(videoId, timestampSec, content) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    const tempNote = {
      id: 'temp_' + Date.now(),
      user_id: user.id,
      video_id: videoId,
      timestamp_sec: timestampSec,
      content,
      created_at: new Date().toISOString(),
      _pending: true
    };

    const list = local.get(`notes:${videoId}`) || [];
    list.push(tempNote);
    list.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    local.set(`notes:${videoId}`, list);
    window.dispatchEvent(new CustomEvent('notes:changed', { detail: videoId }));

    const { data, error } = await supabase.from('notes').insert({
      user_id: user.id, video_id: videoId,
      timestamp_sec: timestampSec, content
    }).select().single();

    if (!error && data) {
      const updated = local.get(`notes:${videoId}`).map(n => n.id === tempNote.id ? data : n);
      local.set(`notes:${videoId}`, updated);
      window.dispatchEvent(new CustomEvent('notes:changed', { detail: videoId }));
    }
    return data;
  },

  async remove(videoId, noteId) {
    const list = (local.get(`notes:${videoId}`) || []).filter(n => n.id !== noteId);
    local.set(`notes:${videoId}`, list);
    window.dispatchEvent(new CustomEvent('notes:changed', { detail: videoId }));
    await supabase.from('notes').delete().eq('id', noteId);
  }
};

// ===== PLAYLISTS =====
export const Playlists = {
  async list() {
    const cached = local.get('playlists') || [];
    this._sync();
    return cached;
  },

  async _sync() {
    const { data } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
    if (data) {
      local.set('playlists', data);
      window.dispatchEvent(new CustomEvent('playlists:synced'));
    }
  },

  async create({ name, description = '' }) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: user.id, name, description, video_ids: [] })
      .select().single();
    if (error) throw error;
    const list = local.get('playlists') || [];
    list.unshift(data);
    local.set('playlists', list);
    Activity.log('added_video', name);
    window.dispatchEvent(new CustomEvent('playlists:changed'));
    return data;
  },

  async addVideo(playlistId, videoId) {
    const list = local.get('playlists') || [];
    const p = list.find(x => x.id === playlistId);
    if (!p) return;
    if (!p.video_ids.includes(videoId)) {
      p.video_ids.push(videoId);
      local.set('playlists', list);
      await supabase.from('playlists').update({ video_ids: p.video_ids }).eq('id', playlistId);
      window.dispatchEvent(new CustomEvent('playlists:changed'));
    }
  },

  async remove(id) {
    const list = (local.get('playlists') || []).filter(p => p.id !== id);
    local.set('playlists', list);
    await supabase.from('playlists').delete().eq('id', id);
    window.dispatchEvent(new CustomEvent('playlists:changed'));
  }
};

// ===== ACTIVITY =====
export const Activity = {
  async log(action, detail) {
    const user = await getUser();
    if (!user) return;
    await supabase.from('activity').insert({ user_id: user.id, action, detail });
  },
  async list(limit = 20) {
    const { data } = await supabase
      .from('activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
};

// ===== GOALS =====
export const Goals = {
  async list() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async add(goal) {
    const user = await getUser();
    const { data } = await supabase.from('goals').insert({ ...goal, user_id: user.id }).select().single();
    return data;
  },
  async remove(id) {
    await supabase.from('goals').delete().eq('id', id);
  }
};

// ===== UTILS =====
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
