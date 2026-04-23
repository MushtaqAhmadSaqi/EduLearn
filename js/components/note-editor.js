// ============================================
// Note Editor Component
// Timestamped notes with optimistic UI
// ============================================
import { Notes, formatTime } from '../modules/storage.js';
import { toast } from '../modules/ui.js';

export class NoteEditor {
  constructor({ videoId, getCurrentTime, seekTo, listEl, inputEl, saveBtnEl, timeDisplayEl }) {
    this.videoId = videoId;
    this.getCurrentTime = getCurrentTime;
    this.seekTo = seekTo;
    this.listEl = listEl;
    this.inputEl = inputEl;
    this.saveBtnEl = saveBtnEl;
    this.timeDisplayEl = timeDisplayEl;
    this.notes = [];

    this._bindEvents();
    this._startTimeDisplayLoop();
    this.load();

    // Autosave draft to localStorage
    this.draftKey = `edulearn:note-draft:${videoId}`;
    this.inputEl.value = localStorage.getItem(this.draftKey) || '';
    this.inputEl.addEventListener('input', () => {
      localStorage.setItem(this.draftKey, this.inputEl.value);
    });
  }

  _bindEvents() {
    this.saveBtnEl.addEventListener('click', () => this.save());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.save();
      }
    });
    window.addEventListener('notes:changed', (e) => {
      if (e.detail === this.videoId) this.load();
    });
  }

  _startTimeDisplayLoop() {
    // Update "current timestamp" chip every 500ms
    setInterval(() => {
      const t = this.getCurrentTime();
      this.timeDisplayEl.textContent = formatTime(t);
    }, 500);
  }

  async load() {
    this.notes = await Notes.list(this.videoId);
    this.render();
  }

  render() {
    if (this.notes.length === 0) {
      this.listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <div class="w-16 h-16 mb-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 flex items-center justify-center text-3xl">📝</div>
          <p class="font-medium mb-1">No notes yet</p>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            Start typing above at any moment — notes are saved with the exact timestamp.
          </p>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = this.notes.map(n => this._noteHTML(n)).join('');

    // Attach handlers
    this.listEl.querySelectorAll('[data-seek]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.seekTo(parseFloat(btn.dataset.seek));
      });
    });
    this.listEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.delete(btn.dataset.delete));
    });
  }

  _noteHTML(note) {
    return `
      <div class="note-enter group flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 transition" data-note-id="${note.id}">
        <button data-seek="${note.timestamp_sec}"
          class="shrink-0 h-fit px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-xs font-mono font-semibold hover:bg-indigo-600 transition"
          aria-label="Seek to ${formatTime(note.timestamp_sec)}">
          ${formatTime(note.timestamp_sec)}
        </button>
        <p class="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300 min-w-0 break-words">${escape(note.content)}</p>
        <button data-delete="${note.id}"
          class="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition flex items-center justify-center"
          aria-label="Delete note">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 4a1 1 0 011-1h2a1 1 0 011 1v3H9V4z"/></svg>
        </button>
      </div>
    `;
  }

  async save() {
    const content = this.inputEl.value.trim();
    if (!content) return;

    const timestamp = this.getCurrentTime();
    this.inputEl.value = '';
    localStorage.removeItem(this.draftKey);

    try {
      await Notes.add(this.videoId, timestamp, content);
      // List reloads via event listener
    } catch (err) {
      toast('Failed to save note', 'error');
      this.inputEl.value = content;
    }
  }

  async delete(noteId) {
    // Optimistic remove
    const el = this.listEl.querySelector(`[data-note-id="${noteId}"]`);
    if (el) {
      el.style.transition = 'opacity 0.2s, transform 0.2s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 200);
    }
    await Notes.remove(this.videoId, noteId);
  }

  focusInput() {
    this.inputEl.focus();
  }
}

function escape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
