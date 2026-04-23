// ============================================
// Video Player Page Logic
// ============================================
import { Videos, Notes, formatTime } from '../modules/storage.js';
import { createNoteItem } from '../components/note-editor.js';
import { toast } from '../modules/ui.js';

let player;
let videoId;
let currentVideo;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    videoId = params.get('id');

    if (!videoId) {
        window.location.href = 'index.html';
        return;
    }

    currentVideo = await Videos.get(videoId);
    if (!currentVideo) {
        // If not in cache, try fetching from list (which handles cloud sync)
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
    player = new YT.Player('videoFrame', {
        videoId: currentVideo.youtube_id,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
};

function renderVideoInfo() {
    document.title = `${currentVideo.title} | EduLearn`;
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || '';
    
    const tagsContainer = document.getElementById('videoTags');
    if (currentVideo.tags) {
        const tags = Array.isArray(currentVideo.tags) ? currentVideo.tags : currentVideo.tags.split(',');
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="tag">${tag.trim()}</span>`
        ).join('');
    }
}

async function loadNotes() {
    const notes = await Notes.list(videoId);
    const container = document.getElementById('notesList');
    container.innerHTML = notes.map(note => 
        createNoteItem(note, formatTime(note.timestamp_sec))
    ).join('');

    // Re-attach delete listeners
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.addEventListener('click', async () => {
            const noteId = btn.dataset.id;
            await Notes.remove(videoId, noteId);
            toast('Note deleted', 'info');
        });
    });

    // Seek to timestamp on click
    document.querySelectorAll('.note-timestamp').forEach(span => {
        span.addEventListener('click', () => {
            const time = parseFloat(span.dataset.time);
            player.seekTo(time, true);
            player.playVideo();
        });
    });
}

function onPlayerReady(event) {
    // If we have previous progress, seek to it?
    // const startTime = (currentVideo.progress / 100) * player.getDuration();
    // player.seekTo(startTime, true);
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
        const progress = Math.floor((currentTime / duration) * 100);
        
        document.getElementById('videoProgress').style.width = `${progress}%`;
        
        // Update storage (debounced in storage.js)
        Videos.updateProgress(videoId, progress, Math.floor(currentTime));
    }, 1000);
}

function stopProgressTracking() {
    clearInterval(progressInterval);
}

function setupEventListeners() {
    // Focus mode logic needs to be added back to ui.js or handled here
    document.getElementById('focusModeBtn').addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
        toast('Focus Mode toggled');
    });
    
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const text = document.getElementById('noteInput').value;
        if (!text) return;

        const timestamp = player.getCurrentTime();
        await Notes.add(videoId, timestamp, text);
        
        document.getElementById('noteInput').value = '';
        toast('Note added!', 'success');
    });

    document.getElementById('markComplete').addEventListener('click', async () => {
        await Videos.markComplete(videoId);
        toast('Marked as completed!', 'success');
        document.getElementById('videoProgress').style.width = '100%';
    });
}
