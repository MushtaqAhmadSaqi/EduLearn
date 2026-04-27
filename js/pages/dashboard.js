// ============================================
// Dashboard - Animated stats, charts, gamification
// ============================================
import { Videos, Playlists, Activity, Goals } from '../modules/storage.js';
import { toast, openModal, confirmDialog, initTheme } from '../modules/ui.js';
import { requireAuth } from '../config/supabase.js';
import { animateNumber, celebrateBadge } from '../modules/animations.js';
import { initUserMenu } from '../modules/user-menu.js';

let videos = [], playlists = [], activityLog = [], goals = [];

// ===== INIT =====
(async function init() {
  initTheme();
  initMobileMenu();
  const user = await requireAuth('auth.html');
  if (!user) return;
  initUserMenu();

  await loadData();
  renderStats();
  renderGoals();
  renderBadges();
  renderActivity();

  // Wait for Chart.js to load, then render charts
  await waitForChartJs();
  renderActivityChart();
  renderCompletionChart();

  document.getElementById('addGoalBtn').addEventListener('click', showGoalModal);
})();

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

async function loadData() {
  [videos, playlists, activityLog, goals] = await Promise.all([
    Videos.list(),
    Playlists.list(),
    Activity.list(30),
    Goals.list()
  ]);
}

// ===== STATS =====
function renderStats() {
  const completed = videos.filter(v => v.completed).length;
  const streak = calculateStreak();

  animateNumber(document.getElementById('statVideos'), videos.length);
  animateNumber(document.getElementById('statCompleted'), completed);
  animateNumber(document.getElementById('statPlaylists'), playlists.length);
  animateNumber(document.getElementById('statStreak'), streak);
}

function calculateStreak() {
  if (activityLog.length === 0) return 0;
  // Group activity by date
  const dates = new Set();
  activityLog.forEach(a => {
    dates.add(new Date(a.created_at).toDateString());
  });

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (dates.has(check.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

// ===== CHARTS =====
function waitForChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) return resolve();
    const check = setInterval(() => {
      if (window.Chart) {
        clearInterval(check);
        resolve();
      }
    }, 50);
    setTimeout(resolve, 3000); // fail-safe
  });
}

function renderActivityChart() {
  if (!window.Chart) return;
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  const days = [];
  const counts = { added: [], completed: [] };

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStr = date.toLocaleDateString('en', { weekday: 'short' });
    const dateStr = date.toDateString();
    days.push(dayStr);

    counts.added.push(activityLog.filter(a =>
      a.action === 'added_video' && new Date(a.created_at).toDateString() === dateStr
    ).length);
    counts.completed.push(activityLog.filter(a =>
      a.action === 'completed_video' && new Date(a.created_at).toDateString() === dateStr
    ).length);
  }

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)';

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        { label: 'Added', data: counts.added, backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 8, borderSkipped: false },
        { label: 'Completed', data: counts.completed, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 8, borderSkipped: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: textColor, font: { size: 12, weight: '500' }, boxWidth: 12, boxHeight: 12 } },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#fff',
          titleColor: isDark ? '#f1f5f9' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}

function renderCompletionChart() {
  if (!window.Chart) return;
  const ctx = document.getElementById('completionChart');
  if (!ctx) return;

  const completed = videos.filter(v => v.completed).length;
  const inProgress = videos.filter(v => !v.completed && (v.progress || 0) > 0).length;
  const notStarted = videos.length - completed - inProgress;

  const isDark = document.documentElement.classList.contains('dark');

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress', 'Not Started'],
      datasets: [{
        data: [completed, inProgress, notStarted],
        backgroundColor: ['#10b981', '#f59e0b', isDark ? '#334155' : '#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: isDark ? '#cbd5e1' : '#64748b', font: { size: 12 }, padding: 12, boxWidth: 10, boxHeight: 10 }
        }
      }
    }
  });
}

// ===== GOALS =====
function renderGoals() {
  const el = document.getElementById('goalsList');
  if (goals.length === 0) {
    el.innerHTML = `
      <div class="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
        <div class="text-3xl mb-2">🎯</div>
        <p class="text-sm font-medium mb-1">No goals yet</p>
        <p class="text-xs text-slate-500 max-w-xs mx-auto">Set a goal to watch X videos by a specific date.</p>
      </div>
    `;
    return;
  }

  const completedCount = videos.filter(v => v.completed).length;
  el.innerHTML = goals.map(g => {
    const progress = Math.min((completedCount / g.target) * 100, 100);
    const achieved = progress >= 100;
    const deadline = g.deadline ? new Date(g.deadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;

    return `
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-3 last:mb-0 group">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium">${escape(g.title)}</span>
              ${achieved ? '<span class="text-emerald-500">✓</span>' : ''}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">
              ${Math.min(completedCount, g.target)} / ${g.target} videos
              ${daysLeft !== null ? `· ${daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : daysLeft === 0 ? 'Due today' : 'Overdue'}` : ''}
            </div>
          </div>
          <button data-delete-goal="${g.id}"
            class="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition flex items-center justify-center"
            aria-label="Delete goal">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('[data-delete-goal]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Delete goal?',
        message: 'This goal will be removed.',
        confirmText: 'Delete',
        danger: true
      });
      if (!confirmed) return;
      await Goals.remove(btn.dataset.deleteGoal);
      goals = goals.filter(g => g.id !== btn.dataset.deleteGoal);
      renderGoals();
    });
  });
}

function showGoalModal() {
  const content = `
    <form id="goalForm" class="p-6 space-y-5">
      <h3 class="font-display font-bold text-xl">Set a Learning Goal</h3>
      <div>
        <label class="block text-sm font-medium mb-1.5">Goal Title *</label>
        <input name="title" required autofocus placeholder="e.g., Complete 5 math videos"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1.5">Videos to complete *</label>
          <input name="target" type="number" min="1" required placeholder="5"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">Deadline</label>
          <input name="deadline" type="date"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
        <button type="submit" class="btn-primary text-sm">Create Goal</button>
      </div>
    </form>
  `;
  const { overlay, close } = openModal(content);
  overlay.querySelector('[data-cancel]').onclick = close;
  overlay.querySelector('#goalForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const goal = await Goals.add({
        title: fd.get('title'),
        target: parseInt(fd.get('target')),
        deadline: fd.get('deadline') || null
      });
      goals.unshift(goal);
      close();
      renderGoals();
      renderBadges(); // triggers goal-setter badge
      toast('Goal created!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to create goal', 'error');
    }
  };
}

// ===== BADGES =====
function renderBadges() {
  const definitions = [
    { key: 'firstVideo', emoji: '🎬', name: 'First Step', desc: 'Add your first video', check: () => videos.length >= 1 },
    { key: 'tenVideos', emoji: '📚', name: 'Collector', desc: 'Add 10 videos', check: () => videos.length >= 10 },
    { key: 'firstComplete', emoji: '✅', name: 'Finisher', desc: 'Complete your first video', check: () => videos.filter(v => v.completed).length >= 1 },
    { key: 'tenComplete', emoji: '🏆', name: 'Champion', desc: 'Complete 10 videos', check: () => videos.filter(v => v.completed).length >= 10 },
    { key: 'firstPlaylist', emoji: '📋', name: 'Organizer', desc: 'Create a playlist', check: () => playlists.length >= 1 },
    { key: 'streak7', emoji: '🔥', name: 'On Fire', desc: '7-day streak', check: () => calculateStreak() >= 7 },
    { key: 'streak30', emoji: '💎', name: 'Dedicated', desc: '30-day streak', check: () => calculateStreak() >= 30 },
    { key: 'goalSetter', emoji: '🎯', name: 'Goal Setter', desc: 'Set a learning goal', check: () => goals.length >= 1 }
  ];

  const el = document.getElementById('badgesGrid');
  const earnedBefore = JSON.parse(localStorage.getItem('edulearn:badges') || '{}');
  const earnedNow = {};

  el.innerHTML = definitions.map(b => {
    const earned = b.check();
    earnedNow[b.key] = earned;
    return `
      <div class="badge-item group relative flex flex-col items-center gap-1 p-3 rounded-xl ${
        earned
          ? 'bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border border-indigo-300/50 dark:border-indigo-700/50'
          : 'bg-slate-100 dark:bg-slate-800/50 border border-transparent opacity-40'
      } transition" title="${b.desc}">
        <div class="text-3xl ${earned ? '' : 'grayscale'}" data-badge="${b.key}">${b.emoji}</div>
        <div class="text-xs font-semibold text-center leading-tight">${b.name}</div>
        ${earned ? '' : '<svg class="absolute top-1 right-1 w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>'}
      </div>
    `;
  }).join('');

  // Celebrate newly unlocked badges
  Object.keys(earnedNow).forEach(key => {
    if (earnedNow[key] && !earnedBefore[key]) {
      const badge = el.querySelector(`[data-badge="${key}"]`);
      if (badge) celebrateBadge(badge);
    }
  });

  localStorage.setItem('edulearn:badges', JSON.stringify(earnedNow));
}

// ===== ACTIVITY LOG =====
function renderActivity() {
  const el = document.getElementById('activityLog');
  if (activityLog.length === 0) {
    el.innerHTML = `
      <div class="py-8 text-center">
        <div class="text-3xl mb-2">📭</div>
        <p class="text-sm text-slate-500">No activity yet. Start learning!</p>
      </div>
    `;
    return;
  }

  const actionConfig = {
    added_video: { icon: '➕', label: 'Added video', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
    completed_video: { icon: '✅', label: 'Completed', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    created_playlist: { icon: '📋', label: 'Created playlist', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' }
  };

  el.innerHTML = activityLog.slice(0, 15).map(a => {
    const cfg = actionConfig[a.action] || { icon: '·', label: a.action, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' };
    return `
      <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
        <div class="shrink-0 w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center text-lg">${cfg.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm">
            <span class="font-medium">${cfg.label}:</span>
            <span class="text-slate-600 dark:text-slate-400">${escape(a.detail || '')}</span>
          </div>
        </div>
        <span class="shrink-0 text-xs text-slate-400">${timeAgo(a.created_at)}</span>
      </div>
    `;
  }).join('');
}

// ===== UTILS =====
function timeAgo(iso) {
  const secs = Math.floor((new Date() - new Date(iso)) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function escape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
