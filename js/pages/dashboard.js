// ============================================
// Dashboard Page
// Stats, goals, badges, activity, charts
// ============================================

import { Activity, Goals, Playlists, Videos } from '../modules/storage.js';
import {
  confirmDialog,
  escapeHTML,
  fieldValue,
  initTheme,
  openModal,
  renderEmptyState,
  toast
} from '../modules/ui.js';
import { requireAuth } from '../config/supabase.js';
import { initUserMenu } from '../modules/user-menu.js';
import { animateNumber, celebrateBadge } from '../modules/animations.js';

let videos = [];
let playlists = [];
let activity = [];
let goals = [];

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initMobileMenu();
  initUserMenu();

  const user = await requireAuth('auth.html');

  if (!user) return;

  document.getElementById('addGoalBtn')?.addEventListener('click', showAddGoalModal);

  await loadData();

  window.addEventListener('videos:changed', loadData);
  window.addEventListener('playlists:changed', loadData);
  window.addEventListener('goals:changed', loadData);
  window.addEventListener('activity:changed', loadData);
});

function initMobileMenu() {
  const button = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');

  button?.addEventListener('click', () => {
    menu?.classList.toggle('hidden');
  });
}

async function loadData() {
  [videos, playlists, activity, goals] = await Promise.all([
    Videos.list(),
    Playlists.list(),
    Activity.list(60),
    Goals.list()
  ]);

  renderStats();
  renderCharts();
  renderGoals();
  renderBadges();
  renderActivity();
}

function renderStats() {
  const completed = videos.filter((video) => video.completed).length;
  const inProgress = videos.filter(
    (video) => !video.completed && Number(video.progress || 0) > 0
  ).length;
  const streak = calculateStreak();

  animateNumber(document.getElementById('statVideos'), videos.length);
  animateNumber(document.getElementById('statCompleted'), completed);
  animateNumber(document.getElementById('statPlaylists'), playlists.length);
  animateNumber(document.getElementById('statStreak'), streak);

  const summary = document.getElementById('dashboardSummary');

  if (summary) {
    summary.textContent = videos.length
      ? `${completed} completed, ${inProgress} in progress, ${videos.length - completed - inProgress} not started.`
      : 'Add your first video to start tracking progress.';
  }
}

function calculateStreak() {
  const dates = new Set(
    activity.map((item) => new Date(item.created_at).toDateString())
  );

  if (!dates.size) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const check = new Date(today);

    check.setDate(today.getDate() - i);

    const dateString = check.toDateString();

    if (dates.has(dateString)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

function renderCharts() {
  renderActivityChart();
  renderCompletionChart();
}

function renderActivityChart() {
  const canvas = document.getElementById('activityChart');

  if (!canvas || !window.Chart) return;

  const labels = [];
  const added = [];
  const completed = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();

    date.setDate(date.getDate() - i);

    const dateString = date.toDateString();

    labels.push(date.toLocaleDateString('en', { weekday: 'short' }));

    added.push(
      activity.filter(
        (item) =>
          item.action === 'added_video' &&
          new Date(item.created_at).toDateString() === dateString
      ).length
    );

    completed.push(
      activity.filter(
        (item) =>
          item.action === 'completed_video' &&
          new Date(item.created_at).toDateString() === dateString
      ).length
    );
  }

  destroyChart(canvas);

  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Added',
          data: added,
          borderWidth: 3,
          tension: 0.35
        },
        {
          label: 'Completed',
          data: completed,
          borderWidth: 3,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function renderCompletionChart() {
  const canvas = document.getElementById('completionChart');

  if (!canvas || !window.Chart) return;

  const completed = videos.filter((video) => video.completed).length;
  const inProgress = videos.filter(
    (video) => !video.completed && Number(video.progress || 0) > 0
  ).length;
  const notStarted = Math.max(0, videos.length - completed - inProgress);

  destroyChart(canvas);

  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In progress', 'Not started'],
      datasets: [
        {
          data: [completed, inProgress, notStarted],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function destroyChart(canvas) {
  if (canvas._chart) {
    canvas._chart.destroy();
    canvas._chart = null;
  }
}

function renderGoals() {
  const container = document.getElementById('goalsList');

  if (!container) return;

  if (!goals.length) {
    renderEmptyState(container, {
      icon: '🎯',
      title: 'No goals yet',
      message: 'Set a small weekly goal to stay consistent.',
      actionText: 'Add goal',
      onAction: showAddGoalModal
    });
    return;
  }

  container.innerHTML = goals
    .map((goal) => {
      const progress = goalProgress(goal);
      const percent = Math.min(100, Math.round((progress / goal.target) * 100));

      return `
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-bold text-slate-950 dark:text-white">${escapeHTML(goal.title)}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                ${metricLabel(goal.metric)} · ${progress}/${goal.target}
                ${goal.deadline ? ` · Due ${escapeHTML(goal.deadline)}` : ''}
              </p>
            </div>
            <button
              data-delete-goal="${escapeHTML(goal.id)}"
              class="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-950/40"
              aria-label="Delete goal"
            >
              ✕
            </button>
          </div>

          <div class="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
            <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500" style="width:${percent}%"></div>
          </div>

          <p class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">${percent}% complete</p>
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('[data-delete-goal]').forEach((button) => {
    button.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Delete goal?',
        message: 'This removes the goal from your dashboard.',
        confirmText: 'Delete',
        danger: true
      });

      if (!confirmed) return;

      await Goals.remove(button.dataset.deleteGoal);

      toast('Goal deleted.', 'success');

      await loadData();
    });
  });
}

function goalProgress(goal) {
  if (goal.metric === 'saved_videos') return videos.length;
  if (goal.metric === 'playlists') return playlists.length;
  if (goal.metric === 'study_days') return calculateStreak();

  return videos.filter((video) => video.completed).length;
}

function metricLabel(metric) {
  const labels = {
    completed_videos: 'Completed videos',
    saved_videos: 'Saved videos',
    playlists: 'Playlists',
    study_days: 'Study streak'
  };

  return labels[metric] || 'Progress';
}

function renderBadges() {
  const container = document.getElementById('badgesList');

  if (!container) return;

  const completed = videos.filter((video) => video.completed).length;
  const streak = calculateStreak();
  const notesCountText = activity.filter((item) => item.action === 'added_note').length;

  const badges = [
    {
      label: 'First Save',
      description: 'Save your first learning video',
      unlocked: videos.length >= 1,
      icon: '🎬'
    },
    {
      label: 'Finisher',
      description: 'Complete your first video',
      unlocked: completed >= 1,
      icon: '✅'
    },
    {
      label: 'Playlist Builder',
      description: 'Create three playlists',
      unlocked: playlists.length >= 3,
      icon: '📋'
    },
    {
      label: 'Note Taker',
      description: 'Write ten timestamped notes',
      unlocked: notesCountText >= 10,
      icon: '📝'
    },
    {
      label: 'Consistency',
      description: 'Reach a 3-day learning streak',
      unlocked: streak >= 3,
      icon: '🔥'
    },
    {
      label: 'Scholar',
      description: 'Complete ten videos',
      unlocked: completed >= 10,
      icon: '🏆'
    }
  ];

  const newlyUnlocked = badges.find(
    (badge) =>
      badge.unlocked &&
      !localStorage.getItem(`edulearn:badge:${badge.label}`)
  );

  if (newlyUnlocked) {
    localStorage.setItem(`edulearn:badge:${newlyUnlocked.label}`, 'true');
    celebrateBadge(newlyUnlocked.label);
  }

  container.innerHTML = badges
    .map(
      (badge) => `
        <article class="rounded-3xl border p-5 shadow-soft transition ${
          badge.unlocked
            ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40'
            : 'border-slate-200 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-900'
        }">
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-subtle dark:bg-slate-800">
              ${badge.icon}
            </div>
            <div>
              <h3 class="font-bold text-slate-950 dark:text-white">${escapeHTML(badge.label)}</h3>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">${escapeHTML(badge.description)}</p>
              <p class="mt-2 text-xs font-bold ${
                badge.unlocked
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-slate-400'
              }">
                ${badge.unlocked ? 'Unlocked' : 'Locked'}
              </p>
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function renderActivity() {
  const container = document.getElementById('activityList');

  if (!container) return;

  if (!activity.length) {
    renderEmptyState(container, {
      icon: '⚡',
      title: 'No activity yet',
      message: 'Your learning actions will appear here.'
    });
    return;
  }

  container.innerHTML = activity
    .slice(0, 12)
    .map(
      (item) => `
        <article class="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-subtle dark:border-slate-800 dark:bg-slate-900">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg dark:bg-slate-800">
            ${activityIcon(item.action)}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-950 dark:text-white">${escapeHTML(activityLabel(item))}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${formatRelativeDate(item.created_at)}</p>
          </div>
        </article>
      `
    )
    .join('');
}

function activityIcon(action) {
  const icons = {
    added_video: '🎬',
    completed_video: '✅',
    created_playlist: '📋',
    created_goal: '🎯',
    added_note: '📝'
  };

  return icons[action] || '⚡';
}

function activityLabel(item) {
  const labels = {
    added_video: `Added “${item.label || 'a video'}”`,
    completed_video: `Completed “${item.label || 'a video'}”`,
    created_playlist: `Created playlist “${item.label || 'Untitled'}”`,
    created_goal: `Created goal “${item.label || 'Learning goal'}”`,
    added_note: 'Added a timestamped note'
  };

  return labels[item.action] || item.label || 'Learning activity';
}

function formatRelativeDate(dateValue) {
  const date = new Date(dateValue);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

function showAddGoalModal() {
  openModal({
    title: 'Add learning goal',
    description: 'Pick one measurable goal. Small goals are easier to finish.',
    confirmText: 'Save goal',
    content: `
      <label class="block">
        <span class="form-label">Goal title</span>
        <input id="goalTitleInput" class="form-input" placeholder="Example: Complete 5 math videos" />
      </label>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="form-label">Metric</span>
          <select id="goalMetricInput" class="form-input">
            <option value="completed_videos">Completed videos</option>
            <option value="saved_videos">Saved videos</option>
            <option value="playlists">Playlists</option>
            <option value="study_days">Study streak</option>
          </select>
        </label>

        <label class="block">
          <span class="form-label">Target</span>
          <input id="goalTargetInput" class="form-input" type="number" min="1" value="3" />
        </label>
      </div>

      <label class="mt-4 block">
        <span class="form-label">Deadline</span>
        <input id="goalDeadlineInput" class="form-input" type="date" />
      </label>
    `,
    onConfirm: async (modal) => {
      const title = fieldValue(modal, '#goalTitleInput');
      const metric = fieldValue(modal, '#goalMetricInput');
      const target = Number(fieldValue(modal, '#goalTargetInput'));
      const deadline = fieldValue(modal, '#goalDeadlineInput');

      if (!title) {
        toast('Goal title is required.', 'error');
        return false;
      }

      if (!target || target < 1) {
        toast('Target must be at least 1.', 'error');
        return false;
      }

      await Goals.create({
        title,
        metric,
        target,
        deadline
      });

      toast('Goal created.', 'success');

      await loadData();

      return true;
    }
  });
}
