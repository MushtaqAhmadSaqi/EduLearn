// ============================================
// Animations - GSAP used sparingly for wow moments
// CSS handles everything else for performance
// ============================================

let gsapLoaded = null;

// Lazy-load GSAP only when needed
export async function loadGSAP() {
  if (gsapLoaded) return gsapLoaded;
  gsapLoaded = import('https://esm.sh/gsap@3.12.5');
  return gsapLoaded;
}

// Check if user prefers reduced motion
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== HERO ENTRANCE =====
export async function animateHeroEntrance() {
  if (prefersReducedMotion()) return;
  const { gsap } = await loadGSAP();
  gsap.from('[data-anim="hero"]', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out'
  });
}

// ===== CARD STAGGER =====
export async function animateCardStagger(selector) {
  if (prefersReducedMotion()) return;
  const cards = document.querySelectorAll(selector);
  if (cards.length === 0 || cards.length > 30) return; // skip on large lists
  const { gsap } = await loadGSAP();
  gsap.from(cards, {
    y: 20,
    opacity: 0,
    duration: 0.4,
    stagger: 0.05,
    ease: 'power2.out',
    clearProps: 'all'
  });
}

// ===== BADGE UNLOCK (wow moment) =====
export async function celebrateBadge(element) {
  if (prefersReducedMotion()) return;
  const { gsap } = await loadGSAP();
  gsap.timeline()
    .to(element, { scale: 1.2, duration: 0.2, ease: 'back.out(2)' })
    .to(element, { scale: 1, duration: 0.3, ease: 'power2.out' });
}

// ===== NUMBER COUNTER =====
export async function animateNumber(element, target, duration = 1) {
  if (prefersReducedMotion()) {
    element.textContent = target;
    return;
  }
  const { gsap } = await loadGSAP();
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => { element.textContent = Math.round(obj.val); }
  });
}
