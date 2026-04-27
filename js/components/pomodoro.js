// ============================================
// Pomodoro Timer Component
// Persists state and handles hidden tabs accurately.
// ============================================

const STORAGE_KEY = 'edulearn:pomodoro';
const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export class Pomodoro {
  constructor({ displayEl, triggerEl, onPhaseChange = () => {} } = {}) {
    this.displayEl = displayEl;
    this.triggerEl = triggerEl;
    this.onPhaseChange = onPhaseChange;

    const saved = this.load();

    this.remaining = saved.remaining ?? WORK_DURATION;
    this.isBreak = saved.isBreak ?? false;
    this.isRunning = false;
    this.lastTick = null;
    this.interval = null;

    this.render();

    this.triggerEl?.addEventListener('click', () => this.toggle());

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isRunning && this.lastTick) {
        const elapsed = Math.floor((Date.now() - this.lastTick) / 1000);

        this.remaining = Math.max(0, this.remaining - elapsed);
        this.lastTick = Date.now();

        this.handleCompletionIfNeeded();
        this.render();
        this.save();
      }
    });
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          remaining: this.remaining,
          isBreak: this.isBreak
        })
      );
    } catch {}
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.lastTick = Date.now();

    this.triggerEl?.classList.add(
      'ring-2',
      'ring-indigo-500',
      'ring-offset-2',
      'dark:ring-offset-slate-950'
    );

    this.interval = window.setInterval(() => this.tick(), 1000);
    this.render();
  }

  pause() {
    this.isRunning = false;
    this.lastTick = null;

    window.clearInterval(this.interval);

    this.triggerEl?.classList.remove(
      'ring-2',
      'ring-indigo-500',
      'ring-offset-2',
      'dark:ring-offset-slate-950'
    );

    this.render();
    this.save();
  }

  reset() {
    this.pause();

    this.isBreak = false;
    this.remaining = WORK_DURATION;

    this.render();
    this.save();
  }

  tick() {
    this.remaining = Math.max(0, this.remaining - 1);

    this.handleCompletionIfNeeded();
    this.render();
    this.save();
  }

  handleCompletionIfNeeded() {
    if (this.remaining > 0) return;

    this.isBreak = !this.isBreak;
    this.remaining = this.isBreak ? BREAK_DURATION : WORK_DURATION;

    this.onPhaseChange(this.isBreak ? 'break' : 'work');

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(this.isBreak ? 'Time for a break!' : 'Back to studying!', {
        body: this.isBreak
          ? 'Take five minutes to rest your eyes.'
          : 'Your break is done. Let’s keep learning.'
      });
    }
  }

  render() {
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;
    const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (this.displayEl) {
      this.displayEl.textContent = label;
    }

    if (this.triggerEl) {
      this.triggerEl.title = this.isBreak
        ? `Break timer: ${label}`
        : `Focus timer: ${label}`;

      this.triggerEl.setAttribute(
        'aria-label',
        this.isRunning
          ? `Pause ${this.isBreak ? 'break' : 'focus'} timer`
          : `Start ${this.isBreak ? 'break' : 'focus'} timer`
      );
    }
  }
}
