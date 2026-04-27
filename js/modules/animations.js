// ============================================
// Lightweight Animations
// No heavy dependencies. Respects reduced motion.
// ============================================

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateNumber(element, target, duration = 900) {
  if (!element) return;

  const end = Number(target || 0);

  if (prefersReducedMotion()) {
    element.textContent = String(end);
    return;
  }

  const start = Number(element.textContent.replace(/\D/g, '') || 0);
  const startedAt = performance.now();

  function frame(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (end - start) * eased);

    element.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

export function animateHeroEntrance() {
  if (prefersReducedMotion()) return;

  const items = document.querySelectorAll('[data-anim="hero"]');

  items.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(18px)';

    window.setTimeout(() => {
      item.style.transition = 'opacity 500ms ease, transform 500ms ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, index * 80);
  });
}

export function animateCardStagger(selector = '[data-card]') {
  if (prefersReducedMotion()) return;

  const cards = [...document.querySelectorAll(selector)].slice(0, 30);

  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px)';

    window.setTimeout(() => {
      card.style.transition = 'opacity 420ms ease, transform 420ms ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 35);
  });
}

export function celebrateBadge(label = 'Badge unlocked') {
  if (prefersReducedMotion()) return;

  const burst = document.createElement('div');

  burst.className =
    'pointer-events-none fixed left-1/2 top-20 z-[9999] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-3 text-sm font-bold text-white shadow-floating';

  burst.textContent = `🏆 ${label}`;

  document.body.appendChild(burst);

  burst.animate(
    [
      {
        transform: 'translate(-50%, -12px) scale(.96)',
        opacity: 0
      },
      {
        transform: 'translate(-50%, 0) scale(1)',
        opacity: 1
      },
      {
        transform: 'translate(-50%, -8px) scale(1)',
        opacity: 1
      },
      {
        transform: 'translate(-50%, -24px) scale(.98)',
        opacity: 0
      }
    ],
    {
      duration: 2200,
      easing: 'cubic-bezier(.2,.8,.2,1)'
    }
  );

  window.setTimeout(() => burst.remove(), 2300);
}
