import { body, doc } from './globals.js';
import { focusElement } from './utils.js';

let mobileNavOpen = false;

const toggleAttributes = (drawer, overlay, isOpen) => {
  if (!drawer || !overlay) {
    return;
  }
  drawer.classList.toggle('open', isOpen);
  overlay.classList.toggle('open', isOpen);
  if (isOpen) {
    drawer.removeAttribute('hidden');
    overlay.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
  } else {
    drawer.setAttribute('hidden', '');
    overlay.setAttribute('hidden', '');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  }
};

export const initMobileNav = () => {
  const toggleBtn = doc.getElementById('mobileNavToggle');
  const drawer = doc.getElementById('mobileNavDrawer');
  const overlay = doc.getElementById('mobileNavOverlay');
  const closeBtn = doc.getElementById('mobileNavClose');
  const navLinks = doc.querySelectorAll('[data-mobile-nav-link]');

  if (!toggleBtn || !drawer || !overlay) {
    return;
  }

  const setState = (isOpen) => {
    mobileNavOpen = isOpen;
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggleAttributes(drawer, overlay, isOpen);
    if (body && body.classList) {
      body.classList.toggle('mobile-nav-open', isOpen);
    }
    if (isOpen) {
      const initialFocus = drawer.querySelector('[data-mobile-nav-link]') || closeBtn || drawer;
      focusElement(initialFocus);
    } else {
      focusElement(toggleBtn);
    }
  };

  toggleBtn.addEventListener('click', () => setState(!mobileNavOpen));
  overlay.addEventListener('click', () => setState(false));

  if (closeBtn) {
    closeBtn.addEventListener('click', () => setState(false));
  }

  navLinks.forEach((link) => link.addEventListener('click', () => setState(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setState(false);
    }
  });
};
