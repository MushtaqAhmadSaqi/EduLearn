// ============================================
// Dashboard — Stats, Charts, Goals, Badges
// ============================================
import { Videos, Playlists, Activity, Goals } from '../modules/storage.js';
import { toast, openModal, confirmDialog, initTheme } from '../modules/ui.js';
import { animateNumber, animateCardStagger, celebrateBadge } from '../modules/animations.js';
import { requireAuth, supabase } from '../config/supabase.js';
import { mountProfileMenu } from '../modules/profile.js';

(async function init() {
  initTheme();
  const user = await requireAuth('auth.html');
  if (!user) return;
  
  if (typeof mountProfileMenu === 'function') {
    mountProfileMenu(document.getElementById('profileSlot'));
  }

  // Wait for Chart.js to load (it's deferred in HTML)
  await waitForChart();

  await Promise.all([
    loadStats(),
    loadCharts(),
    loadGoals(),
    loadBadges(),
    loadActivityLog()
  ]);

  document.getElementById('addGoalBtn').addEventListener('click', showGoalModal);
  
  // Refresh on visibility change to keep streak/activity fresh
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadStats();
  });
})();

function waitForChart() {
  return new Promise(resolve => {
    if (window.Chart) return resolve();
    const interval = setInterval(() => {
      if (window.Chart) { clearInterval(interval); resolve(); }
    }, 50);
  });
}

// ===== STATS =====
async function loadStats() {
  const [videos, playlists, activities] = await Promise.all([
    Videos.list(),
    Playlists.list(),
    Activity.list(100)
  ]);
  
  const completed = videos.filter(v => v.completed).length;
  const streak = calculateStreak(activities);

  animateNumber(document.getElementById('stat-videos'), videos.length);
  animateNumber(document.getElementById('stat-completed'), completed);
  animateNumber(document.getElementById('stat-playlists'), playlists.length);
  animateNumber(document.getElementById('stat-streak'), streak);
}

function calculateStreak(activities) {
  if (!activities.length) return 0;
  
  // Get unique days of activity
  const days = new Set(activities.map(a => new Date(a.created_at).toDateString()));
  let streak = 0;
  let cursor = new Date();
  
  // Check today or yesterday first (streak could still be alive if last activity was yesterday)
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ===== CHARTS =====
async function loadCharts() {
  const videos = await Videos.list();
  const activities = await Activity.list(50);
  
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // 1. Completion Doughnut
  const completed = videos.filter(v => v.completed).length;
  const inProgress = videos.filter(v => !v.completed && v.progress > 0).length;
  const notStarted = videos.length - completed - inProgress;

  new Chart(document.getElementById('completionChart'), {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress', 'Not Started'],
      datasets: [{
        data: [completed, inProgress, notStarted],
        backgroundColor: ['#10b981', '#6366f1', '#94a3b8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 } } }
      }
    }
  });

  // 2. Weekly Activity Bar
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const activityCounts = last7Days.map(day => 
    activities.filter(a => new Date(a.created_at).toDateString() === day).length
  );

  new Chart(document.getElementById('activityChart'), {
    type: 'bar',
    data: {
      labels: last7Days.map(d => d.split(' ')[0]), // Short day name
      datasets: [{
        label: 'Actions',
        data: activityCounts,
        backgroundColor: '#6366f1',
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
        x: { grid: { display: false }, ticks: { color: textColor } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ===== GOALS =====
async function loadGoals() {
  const goals = await Goals.list();
  const el = document.getElementById('goalsList');
  
  if (goals.length === 0) {
    el.innerHTML = `
      <div class="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
        <p class="text-sm text-slate-500">No goals set. Target a video count or study streak!</p>
      </div>
    `;
    return;
  }

  el.innerHTML = goals.map(g => {
    const progress = Math.min((g.current / g.target) * 100, 100);
    return `
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-medium text-sm">${escape(g.title)}</h4>
            <p class="text-xs text-slate-500">${g.current} of ${g.target} ${g.unit || 'units'}</p>
          </div>
          ${progress === 100 ? '<span class="text-xs font-bold text-emerald-500">COMPLETE</span>' : ''}
        </div>
        <div class="progress-track h-2">
          <div class="progress-fill ${progress === 100 ? 'bg-emerald-500' : ''}" style="width:${progress}%"></div>
        </div>
      </div>
    `;
  }).join('');
  
  animateCardStagger('#goalsList > div');
}

// ===== BADGES =====
async function loadBadges() {
  const videos = await Videos.list();
  const completed = videos.filter(v => v.completed).length;
  const el = document.getElementById('badgesList');

  const badges = [
    { id: 'first-video', icon: '🐣', name: 'First Steps', req: videos.length >= 1 },
    { id: 'deep-diver', icon: '🤿', name: 'Deep Diver', req: completed >= 5 },
    { id: 'playlist-pro', icon: '📚', name: 'Curator', req: (await Playlists.list()).length >= 3 },
    { id: 'streak-3', icon: '🔥', name: '3 Day Streak', req: calculateStreak(await Activity.list(50)) >= 3 }
  ];

  el.innerHTML = badges.map(b => `
    <div class="flex flex-col items-center gap-1 opacity-${b.req ? '100' : '30 grayscale'}">
      <div class="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border-2 ${b.req ? 'border-indigo-400' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-center text-2xl shadow-sm">
        ${b.icon}
      </div>
      <span class="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">${b.name}</span>
    </div>
  `).join('');
}

// ===== ACTIVITY LOG =====
async function loadActivityLog() {
  const activities = await Activity.list(20);
  const el = document.getElementById('activityLog');

  if (activities.length === 0) {
    el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No recent activity found.</p>';
    return;
  }

  el.innerHTML = activities.map(a => `
    <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
      <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-slate-700 dark:text-slate-300 truncate">${escape(a.action)}: ${escape(a.detail)}</p>
        <p class="text-[10px] text-slate-500">${new Date(a.created_at).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

// ===== MODALS =====
function showGoalModal() {
  const { overlay, close } = openModal(`
    <form id="goalForm" class="p-6 space-y-4">
      <h3 class="font-display font-bold text-xl">Set New Goal</h3>
      <div>
        <label class="block text-sm font-medium mb-1">Goal Title</label>
        <input name="title" required placeholder="e.g., Complete 10 React videos"
          class="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Target Number</label>
          <input name="target" type="number" required min="1"
            class="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Unit</label>
          <input name="unit" placeholder="e.g., videos"
            class="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500">
        </div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" data-cancel class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
        <button type="submit" class="btn-primary">Create Goal</button>
      </div>
    </form>
  `);

  const form = overlay.querySelector('#goalForm');
  form.querySelector('[data-cancel]').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await Goals.create({
        title: fd.get('title'),
        target: parseInt(fd.get('target')),
        unit: fd.get('unit'),
        current: 0
      });
      close();
      toast('Goal added!', 'success');
      loadGoals();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

// ===== UTIL =====
function escape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
