// ============================================
// GSAP Animations Module
// ============================================

// Helper to load GSAP if not already present
async function ensureGSAP() {
    if (window.gsap) return window.gsap;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        script.onload = () => resolve(window.gsap);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Animate elements on scroll or load
 * @param {string|HTMLElement} target 
 * @param {object} vars 
 */
export async function animateIn(target, vars = {}) {
    const gsap = await ensureGSAP();
    return gsap.from(target, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
        ...vars
    });
}

/**
 * Staggered animation for list items or cards
 * @param {string|HTMLElement[]} targets 
 */
export async function staggerIn(targets, vars = {}) {
    const gsap = await ensureGSAP();
    return gsap.from(targets, {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.8,
        ease: 'back.out(1.7)',
        ...vars
    });
}

/**
 * Pulse animation for attention
 * @param {string|HTMLElement} target 
 */
export async function pulse(target) {
    const gsap = await ensureGSAP();
    return gsap.to(target, {
        scale: 1.05,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
    });
}

/**
 * Page transition (fade out)
 */
export async function fadeOutPage() {
    const gsap = await ensureGSAP();
    return gsap.to('body', {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut'
    });
}
