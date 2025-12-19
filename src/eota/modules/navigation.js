import { body, doc, root } from './globals.js';
import { debounce, detectPassiveSupport } from './utils.js';

const NAV_SCROLL_THRESHOLD = 100;

export const initFloatingNav = () => {
  const nav = doc.getElementById('mainNav');
  if (!nav) {
    return;
  }
  const supportsPassive = detectPassiveSupport();
  const onScrollNav = debounce(() => {
    if (root.scrollY > NAV_SCROLL_THRESHOLD) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, 50);
  root.addEventListener('scroll', onScrollNav, supportsPassive ? { passive: true } : false);
};

export const initFadeInObserver = () => {
  const fadeElements = doc.querySelectorAll('.fade-in');
  if (fadeElements.length === 0) {
    return;
  }
  if ('IntersectionObserver' in root) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    fadeElements.forEach((element) => observer.observe(element));
  } else {
    fadeElements.forEach((element) => element.classList.add('visible'));
  }
};

export const initScriptureCarousel = () => {
  const verses = doc.querySelectorAll('.verse');
  if (verses.length <= 1) {
    return;
  }
  let currentVerse = 0;
  root.setInterval(() => {
    verses[currentVerse].classList.remove('active');
    currentVerse = (currentVerse + 1) % verses.length;
    verses[currentVerse].classList.add('active');
  }, 6000);
};

export const initParallax = () => {
  const reduceMotion = (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
  const coarsePointer = (root.matchMedia && root.matchMedia('(pointer: coarse)').matches) || false;
  if (reduceMotion || coarsePointer) {
    return;
  }
  const elements = doc.querySelectorAll('.parallax');
  if (elements.length === 0) {
    return;
  }
  const supportsPassive = detectPassiveSupport();
  let pointerX = 0;
  let pointerY = 0;
  let raf = null;
  const applyParallax = () => {
    raf = null;
    const offsetX = (pointerX / root.innerWidth - 0.5) * 20;
    const offsetY = (pointerY / root.innerHeight - 0.5) * 20;
    elements.forEach((element, index) => {
      const depth = (index + 1) * 0.5;
      element.style.transform = `translate(${offsetX * depth}px, ${offsetY * depth}px)`;
    });
  };
  root.addEventListener('mousemove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (raf === null) {
      raf = root.requestAnimationFrame(applyParallax);
    }
  }, supportsPassive ? { passive: true } : false);
};

export const initPageTransition = () => {
  const overlay = doc.getElementById('pageTransition');
  if (!overlay) {
    return;
  }
  const transitionLinks = doc.querySelectorAll('a[href*=".html"]:not([href="#"]):not([href*="#"]), a[href="menu.html"]');
  transitionLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetUrl = link.getAttribute('href');
      if (!targetUrl) {
        return;
      }
      event.preventDefault();
      overlay.classList.add('active');
      root.setTimeout(() => {
        root.location.href = targetUrl;
      }, 300);
    });
  });
};

export const initBodyLoadedState = () => {
  if (!body) {
    return;
  }
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', () => body.classList.add('loaded'), { once: true });
  } else {
    body.classList.add('loaded');
  }
};

export const initSkeletonObserver = () => {
  const skeletonSections = doc.querySelectorAll('[data-skeleton]');
  if (skeletonSections.length === 0) {
    return;
  }
  if (!('IntersectionObserver' in root)) {
    skeletonSections.forEach((section) => {
      section.classList.add('skeleton-loaded');
    });
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add('skeleton-loaded');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -100px 0px', threshold: 0.1 });
  skeletonSections.forEach((section) => observer.observe(section));
};
