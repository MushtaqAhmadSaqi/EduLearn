// ============================================
// Home Page Logic
// ============================================
import { Storage } from '../modules/storage.js';
import { createVideoCard } from '../components/video-card.js';
import { showToast } from '../modules/ui.js';
import { animateIn, staggerIn } from '../modules/animations.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initial animations
    animateIn('.hero-content');
    
    await loadVideos();
    setupAddVideo();
    setupFilters();
    setupSearch();
});

async function loadVideos(filter = 'all') {
    const videos = await Storage.getVideos();
    const grid = document.getElementById('videoGrid');
    const emptyState = document.getElementById('emptyState');

    let filtered = videos;
    if (filter === 'inprogress') filtered = videos.filter(v => !v.completed && v.progress > 0);
    else if (filter === 'viewed') filtered = videos.filter(v => v.completed);

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(video => createVideoCard(video)).join('');

    // Animate cards in
    staggerIn('.video-card');

    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            window.location.href = `video.html?id=${id}`;
        });
    });
}

function setupAddVideo() {
    const form = document.getElementById('addVideoForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('videoUrl').value;
        const title = document.getElementById('videoTitle').value;
        const tags = document.getElementById('videoTags').value;
        const description = document.getElementById('videoDescription').value;

        const youtubeId = Storage.extractYouTubeID(url);
        if (!youtubeId) {
            showToast('Invalid YouTube URL', 'error');
            return;
        }

        await Storage.addVideo({
            url,
            youtubeId,
            title,
            tags,
            description
        });

        form.reset();
        await loadVideos();
        showToast('Video added to your library!', 'success');
    });
}

function setupFilters() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await loadVideos(btn.dataset.filter);
        });
    });
}

function setupSearch() {
    // Search implementation...
    // (Can be improved with a dedicated search module later)
}
