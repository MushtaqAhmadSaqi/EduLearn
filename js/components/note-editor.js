// ============================================
// Note Editor Component
// ============================================

/**
 * Render a single note item
 * @param {object} note 
 * @param {function} onTimestampClick 
 * @param {function} onDelete 
 * @returns {string} HTML string
 */
export function createNoteItem(note, formattedTime) {
    return `
        <div class="note-item note-enter glass" data-id="${note.id}">
            <div class="note-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span class="note-timestamp" data-time="${note.timestamp}">
                    <i class="fas fa-play"></i> ${formattedTime}
                </span>
                <button class="btn-delete-note" data-id="${note.id}" style="background: none; border: none; color: var(--danger); cursor: pointer; opacity: 0.6; transition: opacity 0.2s;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <p class="note-text" style="margin-top: 0.5rem; font-size: var(--fs-sm);">${note.text}</p>
            <div class="note-footer" style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem;">
                ${new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    `;
}

/**
 * Handle note editing logic (optional, for future expansion)
 */
export const NoteEditor = {
    // Methods for inline editing, etc.
};
