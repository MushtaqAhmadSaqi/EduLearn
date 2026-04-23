// ============================================
// Note Editor Component — Premium Tailwind Design
// ============================================

/**
 * Render a single note item
 * @param {object} note 
 * @param {string} formattedTime 
 * @returns {string} HTML string
 */
export function createNoteItem(note, formattedTime) {
    const timestamp = note.timestamp_sec || note.timestamp;
    const content = note.content || note.text;
    
    return `
        <div class="group relative flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 transition hover:shadow-premium note-enter" data-id="${note.id}">
          <button class="note-timestamp shrink-0 h-9 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono text-sm flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition" data-time="${timestamp}">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            ${formattedTime}
          </button>
          
          <div class="flex-1 min-w-0">
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed break-words">${content}</p>
          </div>

          <button class="btn-delete-note opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition" data-id="${note.id}" aria-label="Delete note">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
    `;
}
