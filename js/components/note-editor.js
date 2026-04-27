// ============================================
// Timestamped Note Editor
// Optimistic local-first notes with keyboard support.
// ============================================

import { Notes, formatTime } from '../modules/storage.js';
import { escapeHTML, toast } from '../modules/ui.js';

export class NoteEditor {
  constructor({
    videoId,
    getCurrentTime,
    seekTo,
    listEl,
    inputEl,
    saveBtnEl,
    timeDisplayEl
  }) {
    this.videoId = videoId;
    this.getCurrentTime = getCurrentTime;
    this.seekTo = seekTo;
    this.listEl = listEl;
    this.inputEl = inputEl;
    this.saveBtnEl = saveBtnEl;
    this.timeDisplayEl = timeDisplayEl;
    this.notes = [];

    this.draftKey = `edulearn:note-draft:${videoId}`;

    this.init();
  }

  init() {
    if (!this.listEl || !this.inputEl || !this.saveBtnEl) return;

    this.inputEl.value = localStorage.getItem(this.draftKey) || '';

    this.saveBtnEl.addEventListener('click', () => this.save());

    this.inputEl.addEventListener('input', () => {
      localStorage.setItem(this.draftKey, this.inputEl.value);
    });

    this.inputEl.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        this.save();
      }
    });

    window.addEventListener('notes:changed', (event) => {
      if (event.detail === this.videoId) {
        this.load();
      }
    });

    window.setInterval(() => this.updateCurrentTimeChip(), 500);

    this.load();
    this.updateCurrentTimeChip();
  }

  updateCurrentTimeChip() {
    if (!this.timeDisplayEl) return;

    const time = this.safeCurrentTime();

    this.timeDisplayEl.textContent = formatTime(time);
  }

  safeCurrentTime() {
    try {
      return Math.max(0, Number(this.getCurrentTime?.() || 0));
    } catch {
      return 0;
    }
  }

  async load() {
    this.notes = await Notes.list(this.videoId);
    this.render();
  }

  render() {
    if (!this.listEl) return;

    if (!this.notes.length) {
      this.listEl.innerHTML = `
        <div class="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl">📝</div>
          <h3 class="font-semibold text-slate-950 dark:text-white">No notes yet</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Capture ideas while watching. Use Ctrl/⌘ + Enter to save quickly.
          </p>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = this.notes
      .map(
        (note) => `
          <article class="group rounded-2xl border border-slate-200 bg-white p-4 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div class="mb-2 flex items-center justify-between gap-3">
              <button
                data-seek-note="${note.timestamp_sec}"
                class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                </svg>
                ${formatTime(note.timestamp_sec)}
              </button>

              <button
                data-delete-note="${note.id}"
                class="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-950/50"
              >
                Delete
              </button>
            </div>

            <p class="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">${escapeHTML(note.content)}</p>
          </article>
        `
      )
      .join('');

    this.listEl.querySelectorAll('[data-seek-note]').forEach((button) => {
      button.addEventListener('click', () => {
        const time = Number(button.dataset.seekNote || 0);

        this.seekTo?.(time);
      });
    });

    this.listEl.querySelectorAll('[data-delete-note]').forEach((button) => {
      button.addEventListener('click', async () => {
        await Notes.remove(this.videoId, button.dataset.deleteNote);
        toast('Note deleted.', 'success');
      });
    });
  }

  async save() {
    const content = this.inputEl.value.trim();

    if (!content) {
      toast('Write a note before saving.', 'warning');
      this.inputEl.focus();
      return;
    }

    try {
      this.saveBtnEl.disabled = true;

      await Notes.add(this.videoId, this.safeCurrentTime(), content);

      this.inputEl.value = '';
      localStorage.removeItem(this.draftKey);

      toast('Note saved.', 'success');
    } catch (error) {
      toast(error.message || 'Could not save note.', 'error');
    } finally {
      this.saveBtnEl.disabled = false;
      this.inputEl.focus();
    }
  }
}
