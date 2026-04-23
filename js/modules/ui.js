// ============================================
// UI Utilities Module
// ============================================

/**
 * Show a premium toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info'
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger reflow for animation
    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Create a skeleton loader
 * @param {string} width 
 * @param {string} height 
 * @param {string} radius 
 * @returns {HTMLElement}
 */
export function createSkeleton(width = '100%', height = '1rem', radius = '0.5rem') {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.width = width;
    skeleton.style.height = height;
    skeleton.style.borderRadius = radius;
    return skeleton;
}

/**
 * Toggle Focus Mode
 */
export function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    const isFocus = document.body.classList.contains('focus-mode');
    localStorage.setItem('edulearn_focus_mode', isFocus);
    showToast(isFocus ? 'Focus Mode Enabled' : 'Focus Mode Disabled', 'info');
}

/**
 * Initialize Tooltips (using Bootstrap if present)
 */
export function initTooltips() {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}
