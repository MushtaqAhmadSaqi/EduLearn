// ===== PLAYLIST MANAGER =====
let currentPlaylist = null;

document.addEventListener('DOMContentLoaded', () => {
    loadPlaylists();
    setupPlaylistControls();
    checkSharedPlaylist();
});

function loadPlaylists() {
    const playlists = Storage.getPlaylists();
    const list = document.getElementById('playlistList');

    if (playlists.length === 0) {
        list.innerHTML = '<p class="text-muted text-center">No playlists yet. Create one!</p>';
        return;
    }

    list.innerHTML = playlists.map(p => `
        <div class="playlist-item" data-id="${p.id}">
            <h4>${p.name}</h4>
            <p>${p.videos.length} video${p.videos.length !== 1 ? 's' : ''}</p>
        </div>
    `).join('');

    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadPlaylistContent(item.dataset.id);
        });
    });
}

function loadPlaylistContent(id) {
    const playlist = Storage.getPlaylists().find(p => p.id === id);
    if (!playlist) return;
    currentPlaylist = playlist;

    const videos = playlist.videos
        .map(vid => Storage.getVideo(vid))
        .filter(Boolean);

    const completed = videos.filter(v => v.completed).length;
    const progress = videos.length > 0 ? (completed / videos.length * 100) : 0;

    const content = document.getElementById('playlistContent');
    content.innerHTML = `
        <div class="playlist-detail-header">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                    <h1>${playlist.name}</h1>
                    <p class="text-muted">${playlist.description || 'No description'}</p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline" onclick="sharePlaylist('${playlist.id}')">
                        <i class="fas fa-share"></i> Share
                    </button>
                    <button class="btn btn-outline" onclick="exportPlaylist('${playlist.id}')">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-outline" style="color:var(--danger)" onclick="removePlaylist('${playlist.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-progress mb-2">
                <div class="goal-progress-fill" style="width:${progress}%"></div>
            </div>
            <small class="text-muted">${completed} of ${videos.length} completed (${Math.round(progress)}%)</small>
        </div>
        <hr>
        <div class="video-grid mt-3">
            ${videos.length === 0 
                ? '<p class="text-muted">No videos in this playlist yet. Add videos from the homepage or video page.</p>' 
                : videos.map((v, idx) => createPlaylistVideoCard(v, idx, playlist.id)).join('')}
        </div>
    `;

    // Attach click handlers
    document.querySelectorAll('.pl-video-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.pl-remove-btn')) return;
            window.location.href = `video.html?id=${card.dataset.id}`;
        });
    });

    document.querySelectorAll('.pl-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = btn.dataset.videoId;
            if (confirm('Remove this video from the playlist?')) {
                Storage.removeVideoFromPlaylist(currentPlaylist.id, videoId);
                loadPlaylistContent(currentPlaylist.id);
                loadPlaylists();
            }
        });
    });
}

function createPlaylistVideoCard(video, index, playlistId) {
    const thumbnail = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
    return `
        <div class="video-card pl-video-card" data-id="${video.id}" style="position:relative">
            <div class="video-thumbnail">
                <img src="${thumbnail}" alt="${video.title}" loading="lazy">
                <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
                <span style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);color:white;padding:0.25rem 0.6rem;border-radius:var(--radius-sm);font-size:0.8rem;font-weight:600">
                    #${index + 1}
                </span>
                ${video.completed ? '<span class="video-completed-badge"><i class="fas fa-check"></i> Viewed</span>' : ''}
                <div class="video-progress-indicator" style="width: ${video.progress || 0}%"></div>
            </div>
            <div class="video-info-card">
                <h3>${video.title}</h3>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">${video.completed ? '✓ Complete' : video.progress ? Math.round(video.progress) + '%' : 'Not started'}</small>
                    <button class="btn btn-icon pl-remove-btn" data-video-id="${video.id}" title="Remove" style="width:32px;height:32px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupPlaylistControls() {
    const newBtn = document.getElementById('newPlaylistBtn');
    const confirmBtn = document.getElementById('createPlaylistConfirm');

    if (newBtn) {
        newBtn.addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('newPlaylistModal')).show();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const name = document.getElementById('playlistNameInput').value.trim();
            const desc = document.getElementById('playlistDescInput').value.trim();
            
            if (!name) {
                alert('Please enter a playlist name');
                return;
            }

            Storage.createPlaylist(name, desc);
            document.getElementById('playlistNameInput').value = '';
            document.getElementById('playlistDescInput').value = '';
            bootstrap.Modal.getInstance(document.getElementById('newPlaylistModal')).hide();
            loadPlaylists();
            showToast('Playlist created!');
        });
    }
}

function sharePlaylist(id) {
    const playlist = Storage.getPlaylists().find(p => p.id === id);
    if (!playlist) return;

    // Create shareable URL with encoded data
    const shareData = {
        name: playlist.name,
        description: playlist.description,
        videos: playlist.videos.map(vid => {
            const v = Storage.getVideo(vid);
            return v ? { title: v.title, youtubeId: v.youtubeId, tags: v.tags } : null;
        }).filter(Boolean)
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;

    // Show share options
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Share Playlist</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Copy this link to share your playlist:</p>
                    <div class="input-group mb-3">
                        <input type="text" id="shareUrlInput" class="form-control" value="${shareUrl}" readonly>
                        <button class="btn btn-primary" onclick="copyShareUrl()">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="share-buttons">
                        <button class="share-btn whatsapp" onclick="sharePlatform('whatsapp','${encodeURIComponent(shareUrl)}','${encodeURIComponent(playlist.name)}')">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-btn twitter" onclick="sharePlatform('twitter','${encodeURIComponent(shareUrl)}','${encodeURIComponent(playlist.name)}')">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="share-btn facebook" onclick="sharePlatform('facebook','${encodeURIComponent(shareUrl)}','${encodeURIComponent(playlist.name)}')">
                            <i class="fab fa-facebook"></i> Facebook
                        </button>
                        <button class="share-btn copy" onclick="copyShareUrl()">
                            <i class="fas fa-link"></i> Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

function copyShareUrl() {
    const input = document.getElementById('shareUrlInput');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!');
}

function sharePlatform(platform, url, title) {
    const text = `Check out my playlist "${decodeURIComponent(title)}" on EduLearn`;
    let shareUrl = '';
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}%20${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
    }
    if (shareUrl) window.open(shareUrl, '_blank');
}

function checkSharedPlaylist() {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('share');
    if (!shared) return;

    try {
        const data = JSON.parse(decodeURIComponent(atob(shared)));
        if (confirm(`Import shared playlist "${data.name}" with ${data.videos.length} videos?`)) {
            // Import videos first
            const videoIds = [];
            data.videos.forEach(v => {
                const existing = Storage.getVideos().find(ev => ev.youtubeId === v.youtubeId);
                if (existing) {
                    videoIds.push(existing.id);
                } else {
                    const newVideo = Storage.addVideo({
                        url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
                        youtubeId: v.youtubeId,
                        title: v.title,
                        tags: v.tags || '',
                        description: 'Imported from shared playlist'
                    });
                    videoIds.push(newVideo.id);
                }
            });

            // Create the playlist
            const playlist = Storage.createPlaylist(data.name + ' (Shared)', data.description);
            videoIds.forEach(vid => Storage.addVideoToPlaylist(playlist.id, vid));
            
            showToast('Playlist imported successfully!');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            loadPlaylists();
        }
    } catch (e) {
        console.error('Invalid share link:', e);
    }
}

function exportPlaylist(id) {
    const playlist = Storage.getPlaylists().find(p => p.id === id);
    if (!playlist) return;

    const videos = playlist.videos
        .map(vid => Storage.getVideo(vid))
        .filter(Boolean)
        .map(v => ({
            title: v.title,
            url: v.url,
            youtubeId: v.youtubeId,
            tags: v.tags,
            description: v.description,
            completed: v.completed
        }));

    const data = {
        playlistName: playlist.name,
        description: playlist.description,
        exportedAt: new Date().toISOString(),
        totalVideos: videos.length,
        videos
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}_playlist.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Playlist exported!');
}

function removePlaylist(id) {
    if (!confirm('Delete this playlist? This will not delete the videos themselves.')) return;
    Storage.deletePlaylist(id);
    currentPlaylist = null;
    loadPlaylists();
    document.getElementById('playlistContent').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-list"></i>
            <h3>Select a playlist</h3>
            <p>Choose a playlist from the sidebar or create a new one.</p>
        </div>
    `;
    showToast('Playlist deleted');
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: var(--primary); color: white;
        padding: 1rem 1.5rem; border-radius: var(--radius);
        box-shadow: var(--shadow-lg); z-index: 9999;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
