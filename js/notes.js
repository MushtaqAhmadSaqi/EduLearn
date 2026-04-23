// ===== NOTES MANAGER =====
function loadNotes() {
    const notes = Storage.getNotes(currentVideo.id);
    const list = document.getElementById('notesList');
    
    if (notes.length === 0) {
        list.innerHTML = '<p class="text-muted text-center">No notes yet. Take your first timestamped note!</p>';
        return;
    }

    list.innerHTML = notes.map(note => `
        <div class="note-item" data-id="${note.id}">
            <span class="note-timestamp" onclick="seekTo(${note.timestamp})">
                <i class="fas fa-clock"></i> ${Storage.formatTime(note.timestamp)}
            </span>
            <div class="note-text">${note.text}</div>
            <div class="note-actions">
                <button onclick="deleteNote('${note.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function seekTo(seconds) {
    if (player && player.seekTo) {
        player.seekTo(seconds, true);
        player.playVideo();
    }
}

function deleteNote(noteId) {
    if (confirm('Delete this note?')) {
        Storage.deleteNote(currentVideo.id, noteId);
        loadNotes();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addNoteBtn');
    const saveBtn = document.getElementById('saveNoteBtn');
    const input = document.getElementById('noteInput');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            input.focus();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveNote);
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveNote();
        });
    }
});

function saveNote() {
    const input = document.getElementById('noteInput');
    const text = input.value.trim();
    if (!text) return;

    const timestamp = player && player.getCurrentTime ? player.getCurrentTime() : 0;
    Storage.addNote(currentVideo.id, timestamp, text);
    input.value = '';
    loadNotes();
}
