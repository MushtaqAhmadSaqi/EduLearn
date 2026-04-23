// ============================================
// Dashboard Page Logic
// ============================================
import { Storage } from '../modules/storage.js';
import { animateIn, staggerIn } from '../modules/animations.js';

document.addEventListener('DOMContentLoaded', async () => {
    animateIn('.dashboard-header');
    await updateStats();
    await renderCharts();
    await renderBadges();
});

async function updateStats() {
    const videos = await Storage.getVideos();
    const playlists = await Storage.getPlaylists();
    
    document.getElementById('totalVideos').textContent = videos.length;
    document.getElementById('videosWatched').textContent = videos.filter(v => v.completed).length;
    document.getElementById('totalPlaylists').textContent = playlists.length;
    document.getElementById('currentStreak').textContent = Storage.getStreak ? Storage.getStreak() : 0;
}

async function renderCharts() {
    // Chart.js implementation...
}

async function renderBadges() {
    const badges = Storage.getBadges ? await Storage.getBadges() : {};
    const container = document.getElementById('badgesList');
    
    // Badge mapping...
}
