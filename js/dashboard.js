// ===== DASHBOARD MANAGER =====
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadCharts();
    loadGoals();
    loadBadges();
    loadActivity();
    setupGoalControls();
});

function loadStats() {
    const videos = Storage.getVideos();
    const playlists = Storage.getPlaylists();
    const completed = videos.filter(v => v.completed).length;
    const streak = Storage.getStreak();

    animateCount('totalVideos', videos.length);
    animateCount('videosWatched', completed);
    animateCount('totalPlaylists', playlists.length);
    animateCount('currentStreak', streak);
}

function animateCount(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current = Math.min(Math.round(increment * step), target);
        el.textContent = current;
        if (step >= steps) {
            clearInterval(timer);
            el.textContent = target;
        }
    }, duration / steps);
}

function loadCharts() {
    loadActivityChart();
    loadCompletionChart();
}

function loadActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Build data for last 7 days
    const days = [];
    const counts = [];
    const activity = Storage.getActivity();

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString('en', { weekday: 'short' });
        const dateStr = date.toDateString();
        days.push(dayStr);
        
        const count = activity.filter(a => 
            new Date(a.timestamp).toDateString() === dateStr
        ).length;
        counts.push(count);
    }

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f1f5f9' : '#1f2937';
    const gridColor = isDark ? '#334155' : '#e5e7eb';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Activities',
                data: counts,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: '#6366f1',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor, stepSize: 1 },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function loadCompletionChart() {
    const ctx = document.getElementById('completionChart');
    if (!ctx) return;

    const videos = Storage.getVideos();
    const completed = videos.filter(v => v.completed).length;
    const inProgress = videos.filter(v => !v.completed && v.progress > 0).length;
    const notStarted = videos.length - completed - inProgress;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'In Progress', 'Not Started'],
            datasets: [{
                data: [completed, inProgress, notStarted],
                backgroundColor: ['#10b981', '#f59e0b', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1f2937',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function loadGoals() {
    const goals = Storage.getGoals();
    const list = document.getElementById('goalsList');
    if (!list) return;

    if (goals.length === 0) {
        list.innerHTML = '<p class="text-muted">No goals yet. Set one to track your progress!</p>';
        return;
    }

    const completedCount = Storage.getVideos().filter(v => v.completed).length;

    list.innerHTML = goals.map(goal => {
        const progress = Math.min((completedCount / goal.target) * 100, 100);
        const isComplete = progress >= 100;
        const deadline = goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline';
        
        return `
            <div class="goal-item">
                <div class="goal-header">
                    <strong>${goal.title} ${isComplete ? '✅' : ''}</strong>
                    <span class="text-muted">${Math.min(completedCount, goal.target)}/${goal.target}</span>
                </div>
                <div class="goal-progress">
                    <div class="goal-progress-fill" style="width:${progress}%"></div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <small class="text-muted"><i class="fas fa-calendar"></i> ${deadline}</small>
                    <button class="btn-icon" style="width:24px;height:24px;font-size:0.8rem;border:none;background:transparent;color:var(--danger);cursor:pointer" onclick="deleteGoal('${goal.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    const goals = Storage.getGoals().filter(g => g.id !== id);
    Storage.set('goals', goals);
    loadGoals();
}

function loadBadges() {
    const badges = Storage.checkBadges();
    const list = document.getElementById('badgesList');
    if (!list) return;

    const badgeDefinitions = [
        { key: 'firstVideo', icon: '🎬', name: 'First Step', desc: 'Add your first video' },
        { key: 'tenVideos', icon: '📚', name: 'Collector', desc: 'Add 10 videos' },
        { key: 'firstPlaylist', icon: '📋', name: 'Organizer', desc: 'Create a playlist' },
        { key: 'firstComplete', icon: '✅', name: 'Finisher', desc: 'Complete a video' },
        { key: 'tenComplete', icon: '🏆', name: 'Champion', desc: 'Complete 10 videos' },
        { key: 'weekStreak', icon: '🔥', name: 'On Fire', desc: '7-day streak' },
        { key: 'noteMaker', icon: '📝', name: 'Note Taker', desc: 'Take your first note' },
        { key: 'goalSetter', icon: '🎯', name: 'Goal Setter', desc: 'Set a learning goal' }
    ];

    // Check note maker and goal setter dynamically
    const allNotes = Storage.get('notes') || {};
    badges.noteMaker = Object.values(allNotes).some(notes => notes.length > 0);
    badges.goalSetter = Storage.getGoals().length > 0;

    list.innerHTML = badgeDefinitions.map(b => {
        const earned = badges[b.key];
        return `
            <div class="badge-item ${earned ? 'earned' : 'locked'}" title="${b.desc}">
                <div class="badge-icon">${b.icon}</div>
                <h4>${b.name}</h4>
                <p>${earned ? 'Earned!' : 'Locked'}</p>
            </div>
        `;
    }).join('');
}

function loadActivity() {
    const activity = Storage.getActivity().slice(0, 15);
    const log = document.getElementById('activityLog');
    if (!log) return;

    if (activity.length === 0) {
        log.innerHTML = '<p class="text-muted text-center">No activity yet. Start learning!</p>';
        return;
    }

    const actionIcons = {
        added_video: 'fa-plus-circle',
        completed_video: 'fa-check-circle',
        created_playlist: 'fa-list'
    };

    const actionLabels = {
        added_video: 'Added video',
        completed_video: 'Completed video',
        created_playlist: 'Created playlist'
    };

    log.innerHTML = activity.map(a => {
        const timeAgo = getTimeAgo(new Date(a.timestamp));
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${actionIcons[a.action] || 'fa-circle'}"></i>
                </div>
                <div style="flex:1">
                    <strong>${actionLabels[a.action] || a.action}:</strong> ${a.detail}
                    <div><small class="text-muted">${timeAgo}</small></div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

function setupGoalControls() {
    const addBtn = document.getElementById('addGoalBtn');
    const saveBtn = document.getElementById('saveGoalBtn');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('goalModal')).show();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = document.getElementById('goalTitle').value.trim();
            const target = parseInt(document.getElementById('goalTarget').value);
            const deadline = document.getElementById('goalDeadline').value;

            if (!title || !target || target < 1) {
                alert('Please fill in valid goal details');
                return;
            }

            Storage.addGoal({ title, target, deadline });
            document.getElementById('goalTitle').value = '';
            document.getElementById('goalTarget').value = '';
            document.getElementById('goalDeadline').value = '';
            bootstrap.Modal.getInstance(document.getElementById('goalModal')).hide();
            loadGoals();
            loadBadges();
        });
    }
}
