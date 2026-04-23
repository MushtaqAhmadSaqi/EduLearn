// ============================================
// Playlist Page Logic
// ============================================
import { Storage } from '../modules/storage.js';
import { createVideoCard } from '../components/video-card.js';
import { showToast } from '../modules/ui.js';
import { animateIn, staggerIn } from '../modules/animations.js';

let currentPlaylistId = null;

document.addEventListener('DOMContentLoaded', async () => {
    animateIn('.playlist-sidebar');
    await loadPlaylists();
    setupEventListeners();
});

async function loadPlaylists() {
    const playlists = await Storage.getPlaylists();
    const container = document.getElementById('playlistList');
    
    if (playlists.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3 fs-xs">No playlists yet</p>';
        return;
    }

    container.innerHTML = playlists.map(p => `
        <div class="playlist-item glass mb-2 p-3 card-lift ${currentPlaylistId === p.id ? 'active' : ''}" data-id="${p.id}">
            <h4 class="fs-sm font-display mb-1">${p.name}</h4>
            <p class="fs-xs text-muted mb-0">${p.videos.length} videos</p>
        </div>
    `).join('');

    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            currentPlaylistId = item.dataset.id;
            loadPlaylistVideos(currentPlaylistId);
            loadPlaylists(); // Refresh active state
        });
    });
}

async function loadPlaylistVideos(playlistId) {
    const playlists = await Storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const contentArea = document.getElementById('playlistContent');
    const allVideos = await Storage.getVideos();
    const playlistVideos = allVideos.filter(v => playlist.videos.includes(v.id));

    contentArea.innerHTML = `
        <div class="playlist-header mb-4" data-aos="fade-down">
            <h2 class="font-display fs-xl gradient-text">${playlist.name}</h2>
            <p class="text-muted">${playlist.description || 'No description'}</p>
        </div>
        <div class="video-grid" id="playlistGrid">
            ${playlistVideos.length > 0 ? 
                playlistVideos.map(v => createVideoCard(v)).join('') : 
                '<div class="text-center p-5 glass w-100"><h3>This playlist is empty</h3><p>Add videos from the Home page.</p></div>'}
        </div>
    `;

    if (playlistVideos.length > 0) {
        staggerIn('.video-card');
        
        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `video.html?id=${card.dataset.id}`;
            });
        });
    }
}

function setupEventListeners() {
    const modal = new bootstrap.Modal(document.getElementById('newPlaylistModal'));
    
    document.getElementById('newPlaylistBtn').addEventListener('click', () => modal.show());
    
    document.getElementById('createPlaylistConfirm').addEventListener('click', async () => {
        const name = document.getElementById('playlistNameInput').value;
        const desc = document.getElementById('playlistDescInput').value;
        
        if (!name) return;

        await Storage.createPlaylist(name, desc);
        document.getElementById('playlistNameInput').value = '';
        document.getElementById('playlistDescInput').value = '';
        modal.hide();
        await loadPlaylists();
        showToast('Playlist created!', 'success');
    });
}
