// ===== STORAGE MANAGER =====
const Storage = {
    keys: {
        videos: 'edulearn_videos',
        playlists: 'edulearn_playlists',
        notes: 'edulearn_notes',
        activity: 'edulearn_activity',
        goals: 'edulearn_goals',
        badges: 'edulearn_badges',
        settings: 'edulearn_settings',
        streaks: 'edulearn_streaks'
    },

    get(key) {
        try {
            const data = localStorage.getItem(this.keys[key] || key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(this.keys[key] || key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    // ===== VIDEOS =====
    getVideos() { return this.get('videos') || []; },

    addVideo(video) {
        const videos = this.getVideos();
        video.id = 'v_' + Date.now();
        video.addedAt = new Date().toISOString();
        video.progress = 0;
        video.completed = false;
        video.watchTime = 0;
        videos.push(video);
        this.set('videos', videos);
        this.logActivity('added_video', video.title);
        this.updateStreak();
        return video;
    },

    getVideo(id) {
        return this.getVideos().find(v => v.id === id);
    },

    updateVideo(id, updates) {
        const videos = this.getVideos();
        const index = videos.findIndex(v => v.id === id);
        if (index !== -1) {
            videos[index] = { ...videos[index], ...updates };
            this.set('videos', videos);
            return videos[index];
        }
        return null;
    },

    deleteVideo(id) {
        const videos = this.getVideos().filter(v => v.id !== id);
        this.set('videos', videos);
    },

    markCompleted(id) {
        const video = this.updateVideo(id, { completed: true, progress: 100 });
        if (video) {
            this.logActivity('completed_video', video.title);
            this.checkBadges();
        }
        return video;
    },

    // ===== PLAYLISTS =====
    getPlaylists() { return this.get('playlists') || []; },

    createPlaylist(name, description = '') {
        const playlists = this.getPlaylists();
        const playlist = {
            id: 'p_' + Date.now(),
            name,
            description,
            videos: [],
            createdAt: new Date().toISOString(),
            shareId: Math.random().toString(36).substr(2, 9)
        };
        playlists.push(playlist);
        this.set('playlists', playlists);
        this.logActivity('created_playlist', name);
        return playlist;
    },

    addVideoToPlaylist(playlistId, videoId) {
        const playlists = this.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.videos.includes(videoId)) {
            playlist.videos.push(videoId);
            this.set('playlists', playlists);
            return true;
        }
        return false;
    },

    removeVideoFromPlaylist(playlistId, videoId) {
        const playlists = this.getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.videos = playlist.videos.filter(v => v !== videoId);
            this.set('playlists', playlists);
        }
    },

    deletePlaylist(id) {
        const playlists = this.getPlaylists().filter(p => p.id !== id);
        this.set('playlists', playlists);
    },

    // ===== NOTES =====
    getNotes(videoId) {
        const allNotes = this.get('notes') || {};
        return allNotes[videoId] || [];
    },

    addNote(videoId, timestamp, text) {
        const allNotes = this.get('notes') || {};
        if (!allNotes[videoId]) allNotes[videoId] = [];
        allNotes[videoId].push({
            id: 'n_' + Date.now(),
            timestamp,
            text,
            createdAt: new Date().toISOString()
        });
        allNotes[videoId].sort((a, b) => a.timestamp - b.timestamp);
        this.set('notes', allNotes);
    },

    deleteNote(videoId, noteId) {
        const allNotes = this.get('notes') || {};
        if (allNotes[videoId]) {
            allNotes[videoId] = allNotes[videoId].filter(n => n.id !== noteId);
            this.set('notes', allNotes);
        }
    },

    // ===== ACTIVITY =====
    logActivity(action, detail) {
        const activity = this.get('activity') || [];
        activity.unshift({
            action,
            detail,
            timestamp: new Date().toISOString()
        });
        // Keep only last 100 activities
        if (activity.length > 100) activity.length = 100;
        this.set('activity', activity);
    },

    getActivity() { return this.get('activity') || []; },

    // ===== GOALS =====
    getGoals() { return this.get('goals') || []; },

    addGoal(goal) {
        const goals = this.getGoals();
        goal.id = 'g_' + Date.now();
        goal.progress = 0;
        goal.createdAt = new Date().toISOString();
        goals.push(goal);
        this.set('goals', goals);
        return goal;
    },

    updateGoalProgress(id, progress) {
        const goals = this.getGoals();
        const goal = goals.find(g => g.id === id);
        if (goal) {
            goal.progress = progress;
            this.set('goals', goals);
        }
    },

    // ===== STREAKS =====
    updateStreak() {
        const streakData = this.get('streaks') || { count: 0, lastDate: null };
        const today = new Date().toDateString();
        const last = streakData.lastDate ? new Date(streakData.lastDate).toDateString() : null;
        
        if (last !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (last === yesterday.toDateString()) {
                streakData.count++;
            } else if (last !== today) {
                streakData.count = 1;
            }
            streakData.lastDate = new Date().toISOString();
            this.set('streaks', streakData);
        }
        return streakData.count;
    },

    getStreak() {
        const streak = this.get('streaks');
        return streak ? streak.count : 0;
    },

    // ===== BADGES =====
    getBadges() {
        return this.get('badges') || {
            firstVideo: false,
            tenVideos: false,
            firstPlaylist: false,
            weekStreak: false,
            firstComplete: false,
            tenComplete: false,
            noteMaker: false,
            goalSetter: false
        };
    },

    checkBadges() {
        const badges = this.getBadges();
        const videos = this.getVideos();
        const playlists = this.getPlaylists();
        const completed = videos.filter(v => v.completed).length;
        const streak = this.getStreak();

        if (videos.length >= 1) badges.firstVideo = true;
        if (videos.length >= 10) badges.tenVideos = true;
        if (playlists.length >= 1) badges.firstPlaylist = true;
        if (streak >= 7) badges.weekStreak = true;
        if (completed >= 1) badges.firstComplete = true;
        if (completed >= 10) badges.tenComplete = true;

        this.set('badges', badges);
        return badges;
    },

    // ===== UTILITIES =====
    extractYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    },

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    exportData() {
        const data = {
            videos: this.getVideos(),
            playlists: this.getPlaylists(),
            notes: this.get('notes'),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edulearn-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// ===== THEME MANAGER =====
const Theme = {
    init() {
        const saved = localStorage.getItem('edulearn_theme') || 'light';
        this.set(saved);

        const toggleBtns = document.querySelectorAll('#themeToggle');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggle());
        });
    },

    set(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('edulearn_theme', theme);
        const icons = document.querySelectorAll('#themeToggle i');
        icons.forEach(icon => {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    },

    toggle() {
        const current = document.body.getAttribute('data-theme');
        this.set(current === 'dark' ? 'light' : 'dark');
    }
};

document.addEventListener('DOMContentLoaded', () => Theme.init());
