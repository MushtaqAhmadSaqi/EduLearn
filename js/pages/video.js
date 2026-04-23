// ============================================
// Video Player Page Logic
// ============================================
import { Videos, Notes, formatTime } from '../modules/storage.js';
import { createNoteItem } from '../components/note-editor.js';
import { toast, initTheme } from '../modules/ui.js';

let player;
let videoId;
let currentVideo;
let pomodoroInterval;
let pomodoroTime = 25 * 60;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    const params = new URLSearchParams(window.location.search);
    videoId = params.get('id');

    if (!videoId) {
        window.location.href = 'index.html';
        return;
    }

    currentVideo = await Videos.get(videoId);
    if (!currentVideo) {
        const list = await Videos.list();
        currentVideo = list.find(v => v.id === videoId);
        if (!currentVideo) {
            window.location.href = 'index.html';
            return;
        }
    }

    renderVideoInfo();
    loadNotes();
    setupEventListeners();

    // Listen for syncs
    window.addEventListener('notes:synced', (e) => {
        if (e.detail.videoId === videoId) loadNotes();
    });
    window.addEventListener('notes:changed', (e) => {
        if (e.detail === videoId) loadNotes();
    });
});

// YouTube API Callback
window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('player', {
        videoId: currentVideo.youtube_id,
        playerVars: {
            'autoplay': 0,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
};

function renderVideoInfo() {
    document.title = `${currentVideo.title} — EduLearn`;
    const infoContainer = document.getElementById('videoInfo');
    infoContainer.innerHTML = `
      <h1 class="font-display font-bold text-2xl sm:text-3xl leading-tight">${currentVideo.title}</h1>
      <p class="text-slate-600 dark:text-slate-400 leading-relaxed">${currentVideo.description || 'No description available.'}</p>
      ${currentVideo.tags ? `
        <div class="flex flex-wrap gap-2 mt-2">
          ${(Array.isArray(currentVideo.tags) ? currentVideo.tags : currentVideo.tags.split(',')).map(tag => `
            <span class="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
              ${tag.trim()}
            </span>
          `).join('')}
        </div>
      ` : ''}
    `;
}

async function loadNotes() {
    const notes = await Notes.list(videoId);
    const container = document.getElementById('notesList');
    container.innerHTML = notes.map(note => 
        createNoteItem(note, formatTime(note.timestamp_sec))
    ).join('');

    // Re-attach delete listeners
    container.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const noteId = btn.dataset.id;
            await Notes.remove(videoId, noteId);
            toast('Note deleted', 'info');
        };
    });

    // Seek to timestamp on click
    container.querySelectorAll('.note-timestamp').forEach(btn => {
        btn.onclick = () => {
            const time = parseFloat(btn.dataset.time);
            player.seekTo(time, true);
            player.playVideo();
        };
    });
}

function onPlayerReady(event) {
    if (currentVideo.last_position) {
        player.seekTo(currentVideo.last_position, true);
    }
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        startProgressTracking();
    } else {
        stopProgressTracking();
    }
}

let progressInterval;
function startProgressTracking() {
    progressInterval = setInterval(() => {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progress = (currentTime / duration) * 100;
        
        document.getElementById('videoProgressFill').style.width = `${progress}%`;
        document.getElementById('currentTimeDisplay').textContent = formatTime(Math.floor(currentTime));
        
        // Update storage
        Videos.updateProgress(videoId, Math.floor(progress), Math.floor(currentTime));
    }, 1000);
}

function stopProgressTracking() {
    clearInterval(progressInterval);
}

function setupEventListeners() {
    // Focus mode
    document.getElementById('focusBtn').addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
        const isFocus = document.body.classList.contains('focus-mode');
        toast(isFocus ? 'Focus Mode Active' : 'Focus Mode Disabled', 'info');
    });
    
    // Save Note
    const saveNote = async () => {
        const input = document.getElementById('noteInput');
        const text = input.value.trim();
        if (!text) return;

        const timestamp = player.getCurrentTime();
        await Notes.add(videoId, timestamp, text);
        
        input.value = '';
        toast('Note added!', 'success');
        loadNotes();
    };

    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    document.getElementById('noteInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveNote();
    });

    // Actions
    document.getElementById('markCompleteBtn').addEventListener('click', async () => {
        await Videos.markComplete(videoId);
        toast('Marked as completed!', 'success');
        document.getElementById('videoProgressFill').style.width = '100%';
    });

    // Pomodoro
    initPomodoro();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            const state = player.getPlayerState();
            state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
        }
        if (e.key.toLowerCase() === 'n') {
            e.preventDefault();
            document.getElementById('noteInput').focus();
        }
        if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            document.getElementById('focusBtn').click();
        }
        if (e.key === 'ArrowLeft') player.seekTo(player.getCurrentTime() - 10, true);
        if (e.key === 'ArrowRight') player.seekTo(player.getCurrentTime() + 10, true);
    });
}

function initPomodoro() {
    const btn = document.getElementById('pomodoroBtn');
    const display = document.getElementById('pomodoroTime');
    let running = false;

    btn.addEventListener('click', () => {
        if (running) {
            clearInterval(pomodoroInterval);
            running = false;
            btn.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-950/30');
            toast('Timer paused', 'info');
        } else {
            running = true;
            btn.classList.add('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-950/30');
            toast('Focus timer started', 'success');
            pomodoroInterval = setInterval(() => {
                pomodoroTime--;
                const mins = Math.floor(pomodoroTime / 60);
                const secs = pomodoroTime % 60;
                display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                
                if (pomodoroTime <= 0) {
                    clearInterval(pomodoroInterval);
                    running = false;
                    btn.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-950/30');
                    toast('Time for a break!', 'success');
                    // Notification sound (optional)
                }
            }, 1000);
        }
    });
}
