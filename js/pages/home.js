// ============================================
// Home Page Logic
// ============================================
import { Videos } from '../modules/storage.js';
import { createVideoCard } from '../components/video-card.js';
import { toast, renderSkeletonGrid } from '../modules/ui.js';
import { animateIn, staggerIn } from '../modules/animations.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initial animations
    animateIn('.hero-content');
    
    const grid = document.getElementById('videoGrid');
    renderSkeletonGrid(grid, 6);
    
    await loadVideos();
    setupAddVideo();
    setupFilters();
    
    // Listen for cloud syncs
    window.addEventListener('videos:synced', () => loadVideos());
    window.addEventListener('videos:changed', () => loadVideos());
});

async function loadVideos(filter = 'all') {
    const videos = await Videos.list();
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
        const tags = document.getElementById('videoTags').value.split(',').map(t => t.trim());
        const description = document.getElementById('videoDescription').value;

        try {
            await Videos.add({
                url,
                title,
                tags,
                description
            });

            form.reset();
            toast('Video added to your library!', 'success');
        } catch (error) {
            toast(error.message, 'error');
        }
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
