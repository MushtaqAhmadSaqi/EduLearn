// ============================================
// EduLearn Storage Layer
// Local-first, schema-normalized, Supabase-ready
// ============================================

import { supabase, getUser, isCloudEnabled } from '../config/supabase.js';

const PREFIX = 'edulearn:';

const LEGACY_KEYS = {
  videos: 'edulearn_videos',
  playlists: 'edulearn_playlists',
  notes: 'edulearn_notes',
  activity: 'edulearn_activity',
  goals: 'edulearn_goals'
};

let migrated = false;

const local = {
  get(key, fallback = null) {
    migrateLegacyData();

    try {
      const value = localStorage.getItem(PREFIX + key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`Storage read failed for ${key}:`, error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Storage write failed for ${key}:`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  }
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  if (crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function extractYouTubeId(url) {
  if (!url) return null;

  const value = String(url).trim();

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function formatTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
  }

  if (!tags) return [];

  return [
    ...new Set(
      String(tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ];
}

function normalizeVideo(video = {}) {
  const youtubeId = video.youtube_id || video.youtubeId || extractYouTubeId(video.url);

  return {
    id: video.id || uid('video'),
    user_id: video.user_id || 'local-user',
    youtube_id: youtubeId,
    url: video.url || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : ''),
    title: String(video.title || 'Untitled video').trim(),
    description: String(video.description || '').trim(),
    tags: normalizeTags(video.tags),
    progress: Number(video.progress || 0),
    watch_time: Number(video.watch_time ?? video.watchTime ?? 0),
    completed: Boolean(video.completed),
    created_at: video.created_at || video.addedAt || nowIso(),
    updated_at: video.updated_at || nowIso()
  };
}

function normalizePlaylist(playlist = {}) {
  const videoIds = playlist.video_ids || playlist.videos || [];

  return {
    id: playlist.id || uid('playlist'),
    user_id: playlist.user_id || 'local-user',
    name: String(playlist.name || 'Untitled playlist').trim(),
    description: String(playlist.description || '').trim(),
    video_ids: Array.isArray(videoIds) ? [...new Set(videoIds)] : [],
    share_token: playlist.share_token || null,
    created_at: playlist.created_at || playlist.createdAt || nowIso(),
    updated_at: playlist.updated_at || nowIso()
  };
}

function normalizeNote(note = {}, videoId = null) {
  return {
    id: note.id || uid('note'),
    user_id: note.user_id || 'local-user',
    video_id: note.video_id || videoId,
    timestamp_sec: Number(note.timestamp_sec ?? note.timestamp ?? 0),
    content: String(note.content ?? note.text ?? '').trim(),
    created_at: note.created_at || nowIso(),
    updated_at: note.updated_at || nowIso()
  };
}

function normalizeActivity(item = {}) {
  return {
    id: item.id || uid('activity'),
    user_id: item.user_id || 'local-user',
    action: item.action || item.type || 'activity',
    label: item.label || item.title || item.details || '',
    metadata: item.metadata || {},
    created_at: item.created_at || item.timestamp || nowIso()
  };
}

function normalizeGoal(goal = {}) {
  return {
    id: goal.id || uid('goal'),
    user_id: goal.user_id || 'local-user',
    title: String(goal.title || 'Learning goal').trim(),
    target: Math.max(1, Number(goal.target || 1)),
    metric: goal.metric || 'completed_videos',
    deadline: goal.deadline || '',
    created_at: goal.created_at || nowIso(),
    updated_at: goal.updated_at || nowIso()
  };
}

function migrateLegacyData() {
  if (migrated) return;

  migrated = true;

  try {
    if (!localStorage.getItem(PREFIX + 'videos') && localStorage.getItem(LEGACY_KEYS.videos)) {
      const videos = JSON.parse(localStorage.getItem(LEGACY_KEYS.videos) || '[]').map(
        normalizeVideo
      );

      localStorage.setItem(PREFIX + 'videos', JSON.stringify(videos));
    }

    if (
      !localStorage.getItem(PREFIX + 'playlists') &&
      localStorage.getItem(LEGACY_KEYS.playlists)
    ) {
      const playlists = JSON.parse(localStorage.getItem(LEGACY_KEYS.playlists) || '[]').map(
        normalizePlaylist
      );

      localStorage.setItem(PREFIX + 'playlists', JSON.stringify(playlists));
    }

    if (!localStorage.getItem(PREFIX + 'notes') && localStorage.getItem(LEGACY_KEYS.notes)) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEYS.notes) || '{}');

      const notes = Object.fromEntries(
        Object.entries(legacy).map(([videoId, list]) => [
          videoId,
          Array.isArray(list) ? list.map((note) => normalizeNote(note, videoId)) : []
        ])
      );

      localStorage.setItem(PREFIX + 'notes', JSON.stringify(notes));
    }

    if (
      !localStorage.getItem(PREFIX + 'activity') &&
      localStorage.getItem(LEGACY_KEYS.activity)
    ) {
      const activity = JSON.parse(localStorage.getItem(LEGACY_KEYS.activity) || '[]').map(
        normalizeActivity
      );

      localStorage.setItem(PREFIX + 'activity', JSON.stringify(activity));
    }

    if (!localStorage.getItem(PREFIX + 'goals') && localStorage.getItem(LEGACY_KEYS.goals)) {
      const goals = JSON.parse(localStorage.getItem(LEGACY_KEYS.goals) || '[]').map(
        normalizeGoal
      );

      localStorage.setItem(PREFIX + 'goals', JSON.stringify(goals));
    }
  } catch (error) {
    console.warn('Legacy data migration skipped:', error);
  }
}

async function userId() {
  const user = await getUser();
  return user?.id || 'local-user';
}

async function tryCloud(operation, fallback = null) {
  if (!isCloudEnabled) return fallback;

  try {
    return await operation();
  } catch (error) {
    console.warn('Cloud operation failed; using local data:', error);
    return fallback;
  }
}

async function logActivity(action, label = '', metadata = {}) {
  const entry = normalizeActivity({
    action,
    label,
    metadata,
    user_id: await userId()
  });

  const list = [entry, ...local.get('activity', [])].slice(0, 300);

  local.set('activity', list);

  window.dispatchEvent(new CustomEvent('activity:changed'));

  tryCloud(() => supabase.from('activity').insert(entry));

  return entry;
}

export const Videos = {
  async list() {
    const uidValue = await userId();

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', uidValue)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(normalizeVideo) || [];
    });

    if (cloud) {
      local.set('videos', cloud);
      return cloud;
    }

    return local
      .get('videos', [])
      .map(normalizeVideo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async get(id) {
    const videos = await this.list();
    return videos.find((video) => video.id === id) || null;
  },

  async add({ url, title, description = '', tags = [] }) {
    const youtube_id = extractYouTubeId(url);

    if (!youtube_id) {
      throw new Error('Please enter a valid YouTube URL.');
    }

    if (!String(title || '').trim()) {
      throw new Error('Please add a clear video title.');
    }

    const existing = local
      .get('videos', [])
      .map(normalizeVideo)
      .find((video) => video.youtube_id === youtube_id);

    if (existing) {
      throw new Error('This video is already in your library.');
    }

    const video = normalizeVideo({
      id: uid('video'),
      user_id: await userId(),
      youtube_id,
      url: `https://www.youtube.com/watch?v=${youtube_id}`,
      title,
      description,
      tags
    });

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase.from('videos').insert(video).select().single();

      if (error) throw error;

      return normalizeVideo(data);
    });

    const saved = cloud || video;

    local.set('videos', [saved, ...local.get('videos', []).map(normalizeVideo)]);

    await logActivity('added_video', saved.title, {
      video_id: saved.id
    });

    window.dispatchEvent(new CustomEvent('videos:changed'));

    return saved;
  },

  async update(id, updates = {}) {
    updates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const videos = local.get('videos', []).map(normalizeVideo);
    const index = videos.findIndex((video) => video.id === id);

    if (index === -1) return null;

    videos[index] = normalizeVideo({
      ...videos[index],
      ...updates,
      updated_at: nowIso()
    });

    local.set('videos', videos);

    tryCloud(() => supabase.from('videos').update(updates).eq('id', id));

    window.dispatchEvent(new CustomEvent('videos:changed'));

    return videos[index];
  },

  async updateProgress(id, progress, watchTime) {
    const safeProgress = Math.min(100, Math.max(0, Number(progress || 0)));

    return this.update(id, {
      progress: safeProgress,
      watch_time: Math.max(0, Number(watchTime || 0)),
      completed: safeProgress >= 98 ? true : undefined
    });
  },

  async markComplete(id) {
    const video = await this.update(id, {
      progress: 100,
      completed: true
    });

    if (video) {
      await logActivity('completed_video', video.title, {
        video_id: video.id
      });
    }

    return video;
  },

  async remove(id) {
    local.set(
      'videos',
      local.get('videos', []).filter((video) => video.id !== id)
    );

    const playlists = local
      .get('playlists', [])
      .map(normalizePlaylist)
      .map((playlist) => ({
        ...playlist,
        video_ids: playlist.video_ids.filter((videoId) => videoId !== id)
      }));

    local.set('playlists', playlists);

    const notes = local.get('notes', {});
    delete notes[id];
    local.set('notes', notes);

    tryCloud(() => supabase.from('videos').delete().eq('id', id));

    window.dispatchEvent(new CustomEvent('videos:changed'));
  }
};

export const Playlists = {
  async list() {
    const uidValue = await userId();

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', uidValue)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(normalizePlaylist) || [];
    });

    if (cloud) {
      local.set('playlists', cloud);
      return cloud;
    }

    return local
      .get('playlists', [])
      .map(normalizePlaylist)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async create({ name, description = '' }) {
    if (!String(name || '').trim()) {
      throw new Error('Playlist name is required.');
    }

    const playlist = normalizePlaylist({
      id: uid('playlist'),
      user_id: await userId(),
      name,
      description,
      share_token: uid('share').replace('share_', '')
    });

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase.from('playlists').insert(playlist).select().single();

      if (error) throw error;

      return normalizePlaylist(data);
    });

    const saved = cloud || playlist;

    local.set('playlists', [saved, ...local.get('playlists', []).map(normalizePlaylist)]);

    await logActivity('created_playlist', saved.name, {
      playlist_id: saved.id
    });

    window.dispatchEvent(new CustomEvent('playlists:changed'));

    return saved;
  },

  async update(id, updates = {}) {
    updates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    const playlists = local.get('playlists', []).map(normalizePlaylist);
    const index = playlists.findIndex((playlist) => playlist.id === id);

    if (index === -1) return null;

    playlists[index] = normalizePlaylist({
      ...playlists[index],
      ...updates,
      updated_at: nowIso()
    });

    local.set('playlists', playlists);

    tryCloud(() => supabase.from('playlists').update(updates).eq('id', id));

    window.dispatchEvent(new CustomEvent('playlists:changed'));

    return playlists[index];
  },

  async addVideo(playlistId, videoId) {
    const playlists = local.get('playlists', []).map(normalizePlaylist);
    const index = playlists.findIndex((playlist) => playlist.id === playlistId);

    if (index === -1) {
      throw new Error('Playlist not found.');
    }

    playlists[index].video_ids = [...new Set([...(playlists[index].video_ids || []), videoId])];
    playlists[index].updated_at = nowIso();

    local.set('playlists', playlists);

    tryCloud(() =>
      supabase
        .from('playlists')
        .update({
          video_ids: playlists[index].video_ids,
          updated_at: playlists[index].updated_at
        })
        .eq('id', playlistId)
    );

    window.dispatchEvent(new CustomEvent('playlists:changed'));

    return playlists[index];
  },

  async removeVideo(playlistId, videoId) {
    const playlists = local.get('playlists', []).map(normalizePlaylist);
    const index = playlists.findIndex((playlist) => playlist.id === playlistId);

    if (index === -1) return null;

    playlists[index].video_ids = playlists[index].video_ids.filter((id) => id !== videoId);
    playlists[index].updated_at = nowIso();

    local.set('playlists', playlists);

    tryCloud(() =>
      supabase
        .from('playlists')
        .update({
          video_ids: playlists[index].video_ids,
          updated_at: playlists[index].updated_at
        })
        .eq('id', playlistId)
    );

    window.dispatchEvent(new CustomEvent('playlists:changed'));

    return playlists[index];
  },

  async reorder(playlistId, videoIds) {
    return this.update(playlistId, {
      video_ids: videoIds
    });
  },

  async remove(id) {
    local.set(
      'playlists',
      local.get('playlists', []).filter((playlist) => playlist.id !== id)
    );

    tryCloud(() => supabase.from('playlists').delete().eq('id', id));

    window.dispatchEvent(new CustomEvent('playlists:changed'));
  }
};

export const Notes = {
  async list(videoId) {
    const uidValue = await userId();

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', uidValue)
        .eq('video_id', videoId)
        .order('timestamp_sec', { ascending: true });

      if (error) throw error;

      return data?.map((note) => normalizeNote(note, videoId)) || [];
    });

    if (cloud) {
      const notes = local.get('notes', {});
      notes[videoId] = cloud;
      local.set('notes', notes);
      return cloud;
    }

    const notes = local.get('notes', {});

    return (notes[videoId] || [])
      .map((note) => normalizeNote(note, videoId))
      .sort((a, b) => a.timestamp_sec - b.timestamp_sec);
  },

  async add(videoId, timestampSec, content) {
    if (!String(content || '').trim()) {
      throw new Error('Note cannot be empty.');
    }

    const note = normalizeNote(
      {
        id: uid('note'),
        user_id: await userId(),
        video_id: videoId,
        timestamp_sec: timestampSec,
        content
      },
      videoId
    );

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase.from('notes').insert(note).select().single();

      if (error) throw error;

      return normalizeNote(data, videoId);
    });

    const saved = cloud || note;

    const notes = local.get('notes', {});

    notes[videoId] = [...(notes[videoId] || []).map((item) => normalizeNote(item, videoId)), saved].sort(
      (a, b) => a.timestamp_sec - b.timestamp_sec
    );

    local.set('notes', notes);

    await logActivity('added_note', 'Timestamped note', {
      video_id: videoId,
      note_id: saved.id
    });

    window.dispatchEvent(
      new CustomEvent('notes:changed', {
        detail: videoId
      })
    );

    return saved;
  },

  async remove(videoId, noteId) {
    const notes = local.get('notes', {});

    notes[videoId] = (notes[videoId] || []).filter((note) => note.id !== noteId);

    local.set('notes', notes);

    tryCloud(() => supabase.from('notes').delete().eq('id', noteId));

    window.dispatchEvent(
      new CustomEvent('notes:changed', {
        detail: videoId
      })
    );
  }
};

export const Activity = {
  async list(limit = 50) {
    const uidValue = await userId();

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', uidValue)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(normalizeActivity) || [];
    });

    if (cloud) {
      local.set('activity', cloud);
      return cloud.slice(0, limit);
    }

    return local
      .get('activity', [])
      .map(normalizeActivity)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  add: logActivity
};

export const Goals = {
  async list() {
    const uidValue = await userId();

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', uidValue)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(normalizeGoal) || [];
    });

    if (cloud) {
      local.set('goals', cloud);
      return cloud;
    }

    return local
      .get('goals', [])
      .map(normalizeGoal)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async create({ title, target, metric = 'completed_videos', deadline = '' }) {
    if (!String(title || '').trim()) {
      throw new Error('Goal title is required.');
    }

    const goal = normalizeGoal({
      id: uid('goal'),
      user_id: await userId(),
      title,
      target,
      metric,
      deadline
    });

    const cloud = await tryCloud(async () => {
      const { data, error } = await supabase.from('goals').insert(goal).select().single();

      if (error) throw error;

      return normalizeGoal(data);
    });

    const saved = cloud || goal;

    local.set('goals', [saved, ...local.get('goals', []).map(normalizeGoal)]);

    await logActivity('created_goal', saved.title, {
      goal_id: saved.id
    });

    window.dispatchEvent(new CustomEvent('goals:changed'));

    return saved;
  },

  async remove(id) {
    local.set(
      'goals',
      local.get('goals', []).filter((goal) => goal.id !== id)
    );

    tryCloud(() => supabase.from('goals').delete().eq('id', id));

    window.dispatchEvent(new CustomEvent('goals:changed'));
  }
};

export function exportAllData() {
  return {
    videos: local.get('videos', []),
    playlists: local.get('playlists', []),
    notes: local.get('notes', {}),
    goals: local.get('goals', []),
    activity: local.get('activity', []),
    exported_at: nowIso(),
    version: 2
  };
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], {
    type: 'application/json'
  });

  const anchor = document.createElement('a');

  anchor.href = URL.createObjectURL(blob);
  anchor.download = `edulearn-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();

  URL.revokeObjectURL(anchor.href);
}
