// ===== MAIN HOMEPAGE LOGIC =====
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    setupAddVideo();
    setupFilters();
    setupSearch();
    setupAccessibility();
});

function loadVideos(filter = 'all') {
    const videos = Storage.getVideos();
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

    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            window.location.href = `video.html?id=${id}`;
        });
    });
}

function createVideoCard(video) {
    const thumbnail = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
    const tags = video.tags ? video.tags.split(',').slice(0, 3).map(t => `<span class="tag">${t.trim()}</span>`).join('') : '';
    
    return `
        <div class="video-card" data-id="${video.id}">
            <div class="video-thumbnail">
                <img src="${thumbnail}" alt="${video.title}" loading="lazy">
                <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
                ${video.completed ? '<span class="video-completed-badge"><i class="fas fa-check"></i> Viewed</span>' : ''}
                <div class="video-progress-indicator" style="width: ${video.progress || 0}%"></div>
            </div>
            <div class="video-info-card">
                <h3>${video.title}</h3>
                <div class="tags">${tags}</div>
            </div>
        </div>
    `;
}

function setupAddVideo() {
    const form = document.getElementById('addVideoForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('videoUrl').value;
        const title = document.getElementById('videoTitle').value;
        const tags = document.getElementById('videoTags').value;
        const description = document.getElementById('videoDescription').value;

        const youtubeId = Storage.extractYouTubeID(url);
        if (!youtubeId) {
            alert('Invalid YouTube URL. Please check and try again.');
            return;
        }

        Storage.addVideo({
            url,
            youtubeId,
            title,
            tags,
            description
        });

        form.reset();
        loadVideos();
        showToast('Video added successfully!');
    });
}

function setupFilters() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadVideos(btn.dataset.filter);
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('heroSearch');
    const resultsDiv = document.getElementById('searchResults');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            resultsDiv.style.display = 'none';
        }
    });
}

function performSearch(query) {
    const resultsDiv = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const videos = Storage.getVideos();
    const results = SearchEngine.search(videos, query);

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">No results found</div>';
    } else {
        resultsDiv.innerHTML = results.map(v => `
            <div class="search-result-item" onclick="window.location.href='video.html?id=${v.id}'">
                <strong>${v.title}</strong>
                <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem">${v.tags || ''}</p>
            </div>
        `).join('');
    }
    resultsDiv.style.display = 'block';
}

function setupAccessibility() {
    const btn = document.getElementById('accessibilityBtn');
    const panel = document.getElementById('accessibilityPanel');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btn) {
            panel.classList.remove('open');
        }
    });

    // Text size
    document.querySelectorAll('[data-size]').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('[data-size]').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            document.body.className = document.body.className.replace(/text-\w+/g, '');
            document.body.classList.add(`text-${b.dataset.size}`);
            localStorage.setItem('edulearn_textsize', b.dataset.size);
        });
    });

    // High contrast
    const hc = document.getElementById('highContrast');
    if (hc) {
        hc.checked = localStorage.getItem('edulearn_contrast') === 'true';
        if (hc.checked) document.body.classList.add('high-contrast');
        hc.addEventListener('change', () => {
            document.body.classList.toggle('high-contrast', hc.checked);
            localStorage.setItem('edulearn_contrast', hc.checked);
        });
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: var(--primary); color: white;
        padding: 1rem 1.5rem; border-radius: var(--radius);
        box-shadow: var(--shadow-lg); z-index: 9999;
        animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
