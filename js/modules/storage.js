// ============================================
// Hybrid Storage Module (Local + Supabase)
// ============================================
import { supabase, getUser } from '../config/supabase.js';

export const Storage = {
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

    // ===== CORE METHODS =====
    
    async get(key) {
        const user = await getUser();
        if (user) {
            // Try fetching from Supabase first
            const { data, error } = await supabase
                .from(key)
                .select('*')
                .eq('user_id', user.id);
            
            if (!error && data) return data;
        }

        // Fallback to localStorage
        try {
            const data = localStorage.getItem(this.keys[key] || key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    async set(key, value) {
        const user = await getUser();
        if (user) {
            // Sync with Supabase
            // Note: This is simplified. In a real app, you'd handle upserts correctly.
            await supabase.from(key).upsert(
                value.map(item => ({ ...item, user_id: user.id }))
            );
        }

        // Always update localStorage as well
        try {
            localStorage.setItem(this.keys[key] || key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    // ===== VIDEOS =====
    async getVideos() { 
        return await this.get('videos') || []; 
    },

    async addVideo(video) {
        const videos = await this.getVideos();
        video.id = 'v_' + Date.now();
        video.addedAt = new Date().toISOString();
        video.progress = 0;
        video.completed = false;
        video.watchTime = 0;
        
        videos.push(video);
        await this.set('videos', videos);
        this.logActivity('added_video', video.title);
        this.updateStreak();
        return video;
    },

    async getVideo(id) {
        const videos = await this.getVideos();
        return videos.find(v => v.id === id);
    },

    async updateVideo(id, updates) {
        const videos = await this.getVideos();
        const index = videos.findIndex(v => v.id === id);
        if (index !== -1) {
            videos[index] = { ...videos[index], ...updates };
            await this.set('videos', videos);
            return videos[index];
        }
        return null;
    },

    // ===== NOTES =====
    async getNotes(videoId) {
        const user = await getUser();
        if (user) {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', user.id)
                .eq('video_id', videoId);
            if (!error) return data;
        }

        const allNotes = await this.get('notes') || {};
        return allNotes[videoId] || [];
    },

    async addNote(videoId, timestamp, text) {
        const user = await getUser();
        const note = {
            id: 'n_' + Date.now(),
            video_id: videoId,
            timestamp,
            text,
            createdAt: new Date().toISOString()
        };

        if (user) {
            await supabase.from('notes').insert({ ...note, user_id: user.id });
        }

        const allNotes = await this.get('notes') || {};
        if (!allNotes[videoId]) allNotes[videoId] = [];
        allNotes[videoId].push(note);
        allNotes[videoId].sort((a, b) => a.timestamp - b.timestamp);
        await this.set('notes', allNotes);
        return note;
    },

    // ===== UTILITIES =====
    extractYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    },

    logActivity(action, detail) {
        // Implementation for activity logging...
        console.log(`Activity: ${action} - ${detail}`);
    },

    updateStreak() {
        // Implementation for streaks...
    }
};
