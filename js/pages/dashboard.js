// ============================================
// Dashboard Page Logic
// ============================================
import { Videos, Playlists, Activity } from '../modules/storage.js';
import { animateNumber, animateCardStagger } from '../modules/animations.js';

document.addEventListener('DOMContentLoaded', async () => {
    await updateStats();
    await renderActivityLog();
    await renderBadges();
});

async function updateStats() {
    const videos = await Videos.list();
    const playlists = await Playlists.list();
    
    animateNumber(document.getElementById('totalVideos'), videos.length);
    animateNumber(document.getElementById('videosWatched'), videos.filter(v => v.completed).length);
    animateNumber(document.getElementById('totalPlaylists'), playlists.length);
    
    // Streaks logic could be added to Activity module
    // document.getElementById('currentStreak').textContent = '—';
}

async function renderActivityLog() {
    const activities = await Activity.list(10);
    const container = document.getElementById('activityLog');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-muted fs-sm">No recent activity</p>';
        return;
    }

    container.innerHTML = activities.map(act => `
        <div class="activity-item d-flex align-items-center gap-3 mb-3 p-2 glass rounded-3">
            <div class="activity-icon-sm fs-xs p-2 bg-primary bg-opacity-10 rounded-circle">
                <i class="fas ${getActivityIcon(act.action)}"></i>
            </div>
            <div>
                <p class="mb-0 fs-sm fw-medium">${formatAction(act.action)}: ${act.detail}</p>
                <span class="fs-xs text-muted">${new Date(act.created_at).toLocaleString()}</span>
            </div>
        </div>
    `).join('');

    animateCardStagger('.activity-item');
}

async function renderBadges() {
    // Placeholder for badges
    const container = document.getElementById('badgesList');
    if (!container) return;

    // Simulate some badges
    const badges = [
        { icon: 'fa-rocket', name: 'Fast Starter' },
        { icon: 'fa-brain', name: 'Deep Learner' },
        { icon: 'fa-fire', name: 'On Fire' }
    ];

    container.innerHTML = badges.map(b => `
        <div class="badge-item p-3 glass rounded-circle text-center" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;" title="${b.name}">
            <i class="fas ${b.icon} text-primary"></i>
        </div>
    `).join('');

    animateCardStagger('.badge-item');
}

function getActivityIcon(action) {
    switch(action) {
        case 'added_video': return 'fa-plus';
        case 'completed_video': return 'fa-check';
        case 'created_playlist': return 'fa-list';
        default: return 'fa-info-circle';
    }
}

function formatAction(action) {
    return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}
