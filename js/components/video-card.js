// ============================================
// Video Card Component
// ============================================

/**
 * Render a video card element
 * @param {object} video 
 * @returns {string} HTML string
 */
export function createVideoCard(video) {
    const thumbnail = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
    const tags = video.tags ? video.tags.split(',').slice(0, 3).map(t => `<span class="tag">${t.trim()}</span>`).join('') : '';
    const progress = video.progress || 0;
    
    return `
        <div class="video-card card-lift" data-id="${video.id}" data-aos="fade-up">
            <div class="video-thumbnail">
                <img src="${thumbnail}" alt="${video.title}" loading="lazy">
                <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
                ${video.completed ? '<span class="video-completed-badge"><i class="fas fa-check"></i> Viewed</span>' : ''}
                <div class="progress-track" style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; border-radius: 0;">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="video-info-card glass" style="border-top: none; border-radius: 0 0 var(--radius) var(--radius);">
                <h3 class="fs-sm font-display">${video.title}</h3>
                <div class="tags">${tags}</div>
                <div class="video-meta-info" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
                    <span><i class="far fa-clock"></i> ${new Date(video.addedAt).toLocaleDateString()}</span>
                    <span>${progress}% Complete</span>
                </div>
            </div>
        </div>
    `;
}
