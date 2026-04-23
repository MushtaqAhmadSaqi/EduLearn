// ============================================
// Playlist Page Logic
// ============================================
import { Playlists, Videos } from '../modules/storage.js';
import { createVideoCard } from '../components/video-card.js';
import { toast } from '../modules/ui.js';
import { animateIn, staggerIn } from '../modules/animations.js';

let currentPlaylistId = null;

document.addEventListener('DOMContentLoaded', async () => {
    animateIn('.playlist-sidebar');
    await loadPlaylists();
    setupEventListeners();

    window.addEventListener('playlists:synced', () => loadPlaylists());
    window.addEventListener('playlists:changed', () => loadPlaylists());
});

async function loadPlaylists() {
    const playlists = await Playlists.list();
    const container = document.getElementById('playlistList');
    
    if (playlists.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3 fs-xs">No playlists yet</p>';
        return;
    }

    container.innerHTML = playlists.map(p => `
        <div class="playlist-item glass mb-2 p-3 card-lift ${currentPlaylistId === p.id ? 'active' : ''}" data-id="${p.id}">
            <h4 class="fs-sm font-display mb-1">${p.name}</h4>
            <p class="fs-xs text-muted mb-0">${(p.video_ids || []).length} videos</p>
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
    const playlists = await Playlists.list();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const contentArea = document.getElementById('playlistContent');
    const allVideos = await Videos.list();
    const video_ids = playlist.video_ids || [];
    const playlistVideos = allVideos.filter(v => video_ids.includes(v.id));

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

        try {
            await Playlists.create({ name, description: desc });
            document.getElementById('playlistNameInput').value = '';
            document.getElementById('playlistDescInput').value = '';
            modal.hide();
            toast('Playlist created!', 'success');
        } catch (error) {
            toast(error.message, 'error');
        }
    });
}
