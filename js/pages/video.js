// ============================================
// Video Player Page Logic
// ============================================
import { Storage } from '../modules/storage.js';
import { createNoteItem } from '../components/note-editor.js';
import { showToast, toggleFocusMode } from '../modules/ui.js';

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

    currentVideo = await Storage.getVideo(videoId);
    if (!currentVideo) {
        window.location.href = 'index.html';
        return;
    }

    renderVideoInfo();
    loadNotes();
    setupEventListeners();
});

// YouTube API Callback
window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('videoFrame', {
        videoId: currentVideo.youtubeId,
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
        tagsContainer.innerHTML = currentVideo.tags.split(',').map(tag => 
            `<span class="tag">${tag.trim()}</span>`
        ).join('');
    }
}

async function loadNotes() {
    const notes = await Storage.getNotes(videoId);
    const container = document.getElementById('notesList');
    container.innerHTML = notes.map(note => 
        createNoteItem(note, Storage.formatTime(note.timestamp))
    ).join('');

    // Re-attach delete listeners
    document.querySelectorAll('.btn-delete-note').forEach(btn => {
        btn.addEventListener('click', async () => {
            const noteId = btn.dataset.id;
            await Storage.deleteNote(videoId, noteId);
            loadNotes();
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
    // Player is ready
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
        
        document.getElementById('videoProgress').style.width = `${progress}%`;
        
        // Save progress every 10 seconds or so
        if (Math.floor(currentTime) % 10 === 0) {
            Storage.updateVideo(videoId, { progress: Math.floor(progress) });
        }
    }, 1000);
}

function stopProgressTracking() {
    clearInterval(progressInterval);
}

function setupEventListeners() {
    document.getElementById('focusModeBtn').addEventListener('click', toggleFocusMode);
    
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const text = document.getElementById('noteInput').value;
        if (!text) return;

        const timestamp = player.getCurrentTime();
        await Storage.addNote(videoId, timestamp, text);
        
        document.getElementById('noteInput').value = '';
        loadNotes();
        showToast('Note added!', 'success');
    });

    document.getElementById('markComplete').addEventListener('click', async () => {
        await Storage.markCompleted(videoId);
        showToast('Marked as completed!', 'success');
        document.getElementById('videoProgress').style.width = '100%';
    });
}
