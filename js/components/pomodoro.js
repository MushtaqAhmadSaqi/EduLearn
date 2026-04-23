// ============================================
// Pomodoro Timer - Uses Page Visibility API
// Saves state to localStorage (survives refresh)
// ============================================

const STORAGE_KEY = 'edulearn:pomodoro';
const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export class Pomodoro {
  constructor({ displayEl, triggerEl, onPhaseChange }) {
    this.displayEl = displayEl;
    this.triggerEl = triggerEl;
    this.onPhaseChange = onPhaseChange || (() => {});

    const saved = this._load();
    this.remaining = saved?.remaining ?? WORK_DURATION;
    this.isBreak = saved?.isBreak ?? false;
    this.isRunning = false;
    this.tickInterval = null;
    this.lastTick = null;

    this.render();
    this.triggerEl?.addEventListener('click', () => this.toggle());

    // Resume accurate countdown when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isRunning && this.lastTick) {
        const elapsed = Math.floor((Date.now() - this.lastTick) / 1000);
        this.remaining = Math.max(0, this.remaining - elapsed);
        this.lastTick = Date.now();
        this.render();
      }
    });
  }

  toggle() {
    this.isRunning ? this.pause() : this.start();
  }

  start() {
    this.isRunning = true;
    this.lastTick = Date.now();
    this.triggerEl.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
    this.tickInterval = setInterval(() => this._tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    this.triggerEl.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
    clearInterval(this.tickInterval);
    this._save();
  }

  _tick() {
    this.remaining--;
    this.lastTick = Date.now();
    this.render();
    if (this.remaining <= 0) this._phaseComplete();
  }

  _phaseComplete() {
    this.pause();
    this.isBreak = !this.isBreak;
    this.remaining = this.isBreak ? BREAK_DURATION : WORK_DURATION;

    const message = this.isBreak
      ? 'Work session complete! Take a 5-minute break.'
      : 'Break over! Time to focus.';

    this._notify(message);
    this.onPhaseChange({ isBreak: this.isBreak, message });
    this.render();
  }

  _notify(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('EduLearn', { body: message, icon: '/favicon.ico' });
    }
    // Audio ping
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  render() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this.displayEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    this._save();
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      remaining: this.remaining,
      isBreak: this.isBreak
    }));
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }
}

// Request notification permission on first load
if ('Notification' in window && Notification.permission === 'default') {
  // Don't request immediately — wait for user interaction
  document.addEventListener('click', () => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, { once: true });
}
