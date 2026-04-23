// ===== VIDEO PLAYER =====
let player;
let currentVideo;
let progressInterval;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('id');
    
    if (!videoId) {
        window.location.href = 'index.html';
        return;
    }

    currentVideo = Storage.getVideo(videoId);
    if (!currentVideo) {
        alert('Video not found!');
        window.location.href = 'index.html';
        return;
    }

    loadVideo();
    setupControls();
    loadNotes();
    loadRelatedVideos();
});

function loadVideo() {
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || 'No description provided.';
    
    const tagsEl = document.getElementById('videoTags');
    if (currentVideo.tags) {
        tagsEl.innerHTML = currentVideo.tags.split(',').map(t => 
            `<span class="tag">${t.trim()}</span>`
        ).join('');
    }

    // Use YouTube IFrame API for control
    const iframe = document.getElementById('videoFrame');
    const startTime = Math.floor(currentVideo.watchTime || 0);
    iframe.src = `https://www.youtube.com/embed/${currentVideo.youtubeId}?enablejsapi=1&start=${startTime}&rel=0`;

    document.title = `${currentVideo.title} - EduLearn`;
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('videoFrame', {
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    if (currentVideo.watchTime) {
        event.target.seekTo(currentVideo.watchTime, true);
    }
    startProgressTracking();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startProgressTracking();
    } else if (event.data === YT.PlayerState.ENDED) {
        Storage.markCompleted(currentVideo.id);
        showCompletionMessage();
    } else {
        stopProgressTracking();
    }
}

function startProgressTracking() {
    stopProgressTracking();
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime) {
            const current = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration > 0) {
                const progress = (current / duration) * 100;
                document.getElementById('videoProgress').style.width = progress + '%';
                Storage.updateVideo(currentVideo.id, {
                    progress: Math.min(progress, 100),
                    watchTime: current
                });
                if (progress >= 95 && !currentVideo.completed) {
                    Storage.markCompleted(currentVideo.id);
                    currentVideo.completed = true;
                }
            }
        }
    }, 1000);
}

function stopProgressTracking() {
    if (progressInterval) clearInterval(progressInterval);
}

function showCompletionMessage() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 100px; right: 20px;
        background: var(--success); color: white;
        padding: 1rem 1.5rem; border-radius: var(--radius);
        box-shadow: var(--shadow-lg); z-index: 9999;
    `;
    toast.innerHTML = '<i class="fas fa-check-circle"></i> Video completed! Moved to Viewed.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function setupControls() {
    // Focus Mode
    document.getElementById('focusModeBtn').addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
        const btn = document.getElementById('focusModeBtn');
        const isFocus = document.body.classList.contains('focus-mode');
        btn.innerHTML = isFocus ? '<i class="fas fa-eye-slash"></i> Exit Focus' : '<i class="fas fa-eye"></i> Focus Mode';
    });

    // Mark Complete
    document.getElementById('markComplete').addEventListener('click', () => {
        Storage.markCompleted(currentVideo.id);
        alert('Marked as viewed!');
    });

    // Share
    document.getElementById('shareBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('shareModal')).show();
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => share(btn.dataset.platform));
    });

    // Download
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const data = {
            title: currentVideo.title,
            url: currentVideo.url,
            description: currentVideo.description,
            tags: currentVideo.tags,
            notes: Storage.getNotes(currentVideo.id)
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentVideo.title.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
    });

    // Add to Playlist
    document.getElementById('addToPlaylist').addEventListener('click', () => {
        showPlaylistModal();
    });
}

function share(platform) {
    const url = window.location.href;
    const text = `Check out "${currentVideo.title}" on EduLearn`;
    
    switch(platform) {
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
            break;
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
            break;
        case 'copy':
            navigator.clipboard.writeText(url);
            alert('Link copied!');
            break;
    }
}

function showPlaylistModal() {
    const playlists = Storage.getPlaylists();
    const select = document.getElementById('playlistSelect');
    
    if (playlists.length === 0) {
        select.innerHTML = '<p class="text-muted">No playlists yet. Create one below:</p>';
    } else {
        select.innerHTML = playlists.map(p => `
            <div class="playlist-option" style="padding:0.75rem; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:0.5rem; cursor:pointer" data-id="${p.id}">
                <strong>${p.name}</strong> <span class="text-muted">(${p.videos.length} videos)</span>
            </div>
        `).join('');
        
        select.querySelectorAll('.playlist-option').forEach(opt => {
            opt.addEventListener('click', () => {
                Storage.addVideoToPlaylist(opt.dataset.id, currentVideo.id);
                alert('Added to playlist!');
                bootstrap.Modal.getInstance(document.getElementById('playlistModal')).hide();
            });
        });
    }

    document.getElementById('createPlaylistBtn').onclick = () => {
        const name = document.getElementById('newPlaylistName').value;
        if (name) {
            const p = Storage.createPlaylist(name);
            Storage.addVideoToPlaylist(p.id, currentVideo.id);
            alert('Playlist created and video added!');
            bootstrap.Modal.getInstance(document.getElementById('playlistModal')).hide();
        }
    };

    new bootstrap.Modal(document.getElementById('playlistModal')).show();
}

function loadRelatedVideos() {
    const videos = Storage.getVideos().filter(v => v.id !== currentVideo.id).slice(0, 5);
    const container = document.getElementById('relatedVideos');
    
    if (videos.length === 0) {
        container.innerHTML = '<p class="text-muted">No other videos yet.</p>';
        return;
    }

    container.innerHTML = videos.map(v => `
        <div class="related-video" onclick="window.location.href='video.html?id=${v.id}'">
            <img src="https://img.youtube.com/vi/${v.youtubeId}/default.jpg" alt="${v.title}">
            <div>
                <h4>${v.title}</h4>
                <small class="text-muted">${v.completed ? '✓ Viewed' : v.progress ? `${Math.round(v.progress)}% watched` : 'Not started'}</small>
            </div>
        </div>
    `).join('');
}
