import { doc, root } from './globals.js';

const scrollToTop = () => {
  try {
    root.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    root.scrollTo(0, 0);
  }
};

export const activateTab = (tabName, trigger) => {
  if (!tabName) {
    return;
  }

  doc.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  doc.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.remove('active');
  });

  const selectedContent = doc.getElementById(`${tabName}-content`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }

  const fallbackTrigger = doc.querySelector(`.tab-button[data-tab-target="${tabName}"]`);
  const targetBtn = trigger || fallbackTrigger;
  if (targetBtn) {
    targetBtn.classList.add('active');
  } else {
    console.warn('switchTab invoked without a matching tab button for', tabName);
  }

  scrollToTop();
};

export const handleTabClick = (event) => {
  const button = event.currentTarget;
  const { tabTarget } = button.dataset;
  activateTab(tabTarget, button);
};

export const initTabs = () => {
  const tabButtons = doc.querySelectorAll('[data-tab-target]');
  if (tabButtons.length === 0) {
    return;
  }
  tabButtons.forEach((button) => {
    button.addEventListener('click', handleTabClick);
  });
  // Ensure default active state (first button) stays synced
  const activeButton = Array.from(tabButtons).find((btn) => btn.classList.contains('active')) || tabButtons[0];
  if (activeButton) {
    activateTab(activeButton.dataset.tabTarget, activeButton);
  }
};

export const exposeLegacyAPI = () => {
  root.switchTab = (tabName) => activateTab(tabName);
};
