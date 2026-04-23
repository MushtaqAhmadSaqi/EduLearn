// ===== POMODORO TIMER =====
const Pomodoro = {
    duration: 25 * 60,
    breakDuration: 5 * 60,
    remaining: 25 * 60,
    isRunning: false,
    isBreak: false,
    interval: null,

    init() {
        const btn = document.getElementById('pomodoroBtn');
        if (!btn) return;

        btn.addEventListener('click', () => this.toggle());
        this.updateDisplay();
    },

    toggle() {
        if (this.isRunning) this.pause();
        else this.start();
    },

    start() {
        this.isRunning = true;
        this.interval = setInterval(() => this.tick(), 1000);
    },

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
    },

    tick() {
        this.remaining--;
        this.updateDisplay();

        if (this.remaining <= 0) {
            this.pause();
            if (!this.isBreak) {
                this.notify('Time for a break! Take 5 minutes.');
                this.isBreak = true;
                this.remaining = this.breakDuration;
            } else {
                this.notify('Break over! Back to studying.');
                this.isBreak = false;
                this.remaining = this.duration;
            }
            this.updateDisplay();
        }
    },

    updateDisplay() {
        const display = document.getElementById('pomodoroTime');
        if (!display) return;
        const m = Math.floor(this.remaining / 60);
        const s = this.remaining % 60;
        display.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    },

    notify(message) {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('EduLearn Pomodoro', { body: message });
        }
        // Play sound (optional)
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfgLAAA=');
            audio.play();
        } catch(e) {}
        alert(message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Pomodoro.init();
    if ('Notification' in window) Notification.requestPermission();
});
