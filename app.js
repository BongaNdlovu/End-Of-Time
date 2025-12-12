// Academy Presentation App - Modular JavaScript
// All features with lazy loading, Web Workers, and theme support

// ===== GLOBAL STATE =====
let slides = [];
let currentSlide = 0;
let totalSlides = 0;
let currentBgIndex = 0;
let isOverviewMode = false;
let timerStartTime = null;
let timerInterval = null;
let isTimerActive = false;

// Global cleanup state
let cleanupFunctions = [];
let animationObserver = null;
let isUsingOfflineSlides = false;
let retryLoadInProgress = false;
let notificationHideTimeout = null;

// Quiz state
let quizMode = false;
let quizSlideIndices = [];
let quizProgress = {
    currentQuizSlide: null,
    selectedAnswer: null,
    correctAnswers: 0,
    totalQuizQuestions: 0,
    quizAttempts: {},
    completedQuestions: new Set()
};
let currentUser = null; // Firebase auth user
let comments = [];
const prefetchedContent = new Map();
const prefetchedAssets = new Set();
let idlePrefetchHandle = null;
const idleScheduler = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 15 }), 1);
const cancelIdleScheduler = typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout;
let cleanupCinematicEffects = null;
let cinematicBootstrapped = false;
let batterySaverEnabled = false;
let mobileHudElement = null;
let mobileHudHideTimeout = null;
let hudTimerValueEl = null;
const hudButtons = {};
let orientationOverlay = null;
let orientationPreference = { requireLandscape: false };
let orientationMediaQuery = null;
let slideViewportObserver = null;

const __APP_LOCAL_DEV__ = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const appDevLog = (...args) => {
    if (__APP_LOCAL_DEV__ && typeof window !== 'undefined' && window.console) {
        window.console.log(...args);
    }
};
const appDevWarn = (...args) => {
    if (__APP_LOCAL_DEV__ && typeof window !== 'undefined' && window.console) {
        window.console.warn(...args);
    }
};
const appDevDebug = (...args) => {
    if (__APP_LOCAL_DEV__ && typeof window !== 'undefined' && window.console) {
        window.console.debug(...args);
    }
};

const isMobileViewport = () => typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 768px)').matches
    : false;

function addCleanupFunction(fn) {
    cleanupFunctions.push(fn);
}

function cleanup() {
    cleanupFunctions.forEach(fn => {
        try {
            fn();
        } catch (error) {
            appDevWarn('Cleanup function failed:', error);
        }
    });
    cleanupFunctions = [];
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

addCleanupFunction(() => {
    if (idlePrefetchHandle) {
        cancelIdleScheduler(idlePrefetchHandle);
        idlePrefetchHandle = null;
    }
    if (slideViewportObserver) {
        slideViewportObserver.disconnect();
        slideViewportObserver = null;
    }
});

// Lazy Loading State
const loadedImages = new Set();
const imageCache = new Map();

function extractSlideHeading(slide) {
    if (!slide || !slide.content) return '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = slide.content;
    const headingEl = wrapper.querySelector('h1, h2, h3');
    return headingEl ? headingEl.textContent.trim().replace(/\s+/g, ' ') : '';
}

function hydrateSlideHeadings(collection = slides) {
    if (!Array.isArray(collection)) return;
    collection.forEach((slide, index) => {
        if (!slide) return;
        try {
            slide.headingText = extractSlideHeading(slide) || `Slide ${index + 1}`;
        } catch (error) {
            slide.headingText = `Slide ${index + 1}`;
        }
    });
}

// DOM Elements
let contentLayer, backgroundElements, contentArea, prevBtn, nextBtn, slideCounter, notification, progressBar, progressSegments, fontControls, autoadvanceToggle, autoadvanceInterval, annotationPanel, annotationModal, annotationModalBody, annotationModalClose;

// ===== FIREBASE INITIALIZATION =====
function initFirebase() {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        appDevWarn('Firebase SDK not loaded');
        return false;
    }

    try {
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            appDevLog('Firebase initialized successfully');
        }

        // Initialize Auth state listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                appDevLog('User signed in:', user.uid);
            } else {
                currentUser = null;
                appDevLog('User signed out');
            }
        });

        // Enable anonymous sign-in for comment posting
        firebase.auth().signInAnonymously().catch((error) => {
            appDevWarn('Anonymous sign-in failed:', error);
        });

        return true;
    } catch (error) {
        appDevWarn('Firebase initialization failed:', error);
        return false;
    }
}

// ===== INITIALIZATION =====
window.addEventListener('load', async () => {
    // Initialize DOM references
    initDOMReferences();

    // Initialize Firebase
    initFirebase();

    // Add timeout fallback for loading
    const loadingTimeout = setTimeout(() => {
        const skeletonLoader = document.querySelector('.skeleton-loader');
        if (skeletonLoader && skeletonLoader.style.opacity !== '0') {
            showNotification('Loading is taking longer than expected. Please refresh if this continues.', { variant: 'info', duration: 4000 });
            // Fallback to inline slides if JSON still loading
            if (slides.length === 0) {
                slides = getInlineSlides();
                totalSlides = slides.length;
                hydrateSlideHeadings(slides);
                updateQuizMetadata();
                startPresentation();
            }
        }
    }, 5000);

    // Load slides from JSON
    await loadSlides();
    clearTimeout(loadingTimeout);

    // Initialize all features
    loadProgress();
    loadQuizProgress();
	loadCheckpointState();
    loadFromURL();
    // Ensure we don't land on a locked slide on initial load
    clampCurrentSlideToUnlocked();
    initAccessibility();
    initDotNavigation();
    initTouchGestures();
    initShortcutsModal();
    if (document.getElementById('chat-widget') && document.getElementById('chat-toggle-button')) {
        initChatbot();
    }
    initKeyboardShortcuts();
    initBatterySaverToggle();
    initMobileHud();
    initOrientationHelpers();

    // Start presentation
    await startPresentation();
});

function initDOMReferences() {
    contentLayer = document.getElementById('content-layer');
    backgroundElements = document.querySelectorAll('.background-image');
    contentArea = document.getElementById('slide-content-area');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    slideCounter = document.getElementById('slide-counter');
    notification = document.getElementById('notification');
    progressBar = document.getElementById('progressBar');
    progressSegments = document.getElementById('progressSegments');
    fontControls = document.getElementById('font-controls');
    autoadvanceToggle = document.getElementById('autoadvance-toggle');
    autoadvanceInterval = document.getElementById('autoadvance-interval');
    annotationPanel = document.getElementById('annotation-panel');
    annotationModal = document.getElementById('annotation-modal');
    annotationModalBody = document.getElementById('annotation-modal-body');
    annotationModalClose = document.getElementById('annotation-modal-close');
    mobileHudElement = document.getElementById('mobile-hud');
    hudTimerValueEl = document.getElementById('hud-timer-value');
    orientationOverlay = document.getElementById('orientation-overlay');

    // Event listeners
    prevBtn.addEventListener('click', goToPrevSlide);
    nextBtn.addEventListener('click', goToNextSlide);
    contentLayer.addEventListener('submit', handleCommentSubmit);
    
    // Progress bar click to jump
    if (progressSegments) {
        progressSegments.addEventListener('click', (e) => {
            const rect = progressSegments.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const segmentWidth = rect.width / Math.max(totalSlides, 1);
            const targetSlide = Math.floor(clickX / Math.max(segmentWidth, 1));
            if (targetSlide >= 0 && targetSlide < totalSlides) {
                if (isSlideLocked(targetSlide)) {
                    showNotification('Locked. Answer the previous question to unlock this slide.', { duration: 2500, variant: 'info' });
                    return;
                }
                goToSlide(targetSlide);
            }
        });
    }

    // Font size controls
    initFontSizeControls();

    // Auto-advance controls
    initAutoAdvance();

    if (annotationModalClose) {
        annotationModalClose.addEventListener('click', closeAnnotationModal);
    }

    if (annotationModal) {
        annotationModal.addEventListener('click', (event) => {
            if (event.target === annotationModal) {
                closeAnnotationModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && annotationModal && annotationModal.classList.contains('open')) {
            closeAnnotationModal();
        }
    }, { passive: true });

    initSlideViewportObserver();
}

// ===== PROGRESS BAR =====
function initProgressBar() {
    if (!progressSegments) return;
    
    // Create segments for each slide
    progressSegments.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const segment = document.createElement('div');
        segment.classList.add('progress-segment');
        segment.setAttribute('aria-label', `Go to slide ${i + 1}`);
        segment.style.cursor = isSlideLocked(i) ? 'not-allowed' : 'pointer';
        if (isSlideLocked(i)) {
            segment.classList.add('locked');
            segment.setAttribute('aria-disabled', 'true');
        }
        progressSegments.appendChild(segment);
    }
    
    updateProgressBar();
}

function updateProgressBar() {
    if (!progressBar || !progressSegments) return;
    
    // Update main progress bar
    const progress = ((currentSlide + 1) / totalSlides) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update segments
    const segments = progressSegments.querySelectorAll('.progress-segment');
    segments.forEach((segment, index) => {
        segment.classList.remove('active', 'completed');
        if (index < currentSlide) {
            segment.classList.add('completed');
        } else if (index === currentSlide) {
            segment.classList.add('active');
        }
        // Update locked visual/ARIA state
        if (isSlideLocked(index)) {
            segment.classList.add('locked');
            segment.setAttribute('aria-disabled', 'true');
            segment.style.cursor = 'not-allowed';
        } else {
            segment.classList.remove('locked');
            segment.removeAttribute('aria-disabled');
            segment.style.cursor = 'pointer';
        }
    });
}

// ===== FONT SIZE CONTROLS =====
function initFontSizeControls() {
    if (!fontControls) return;

    const fontButtons = fontControls.querySelectorAll('.font-btn');
    
    // Load saved preference
    const savedSize = localStorage.getItem('genesis-font-size') || 'normal';
    setFontSize(savedSize);
    
    // Add event listeners
    fontButtons.forEach(button => {
        button.addEventListener('click', () => {
            const size = button.dataset.size;
            setFontSize(size);
            localStorage.setItem('genesis-font-size', size);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                cycleFontSize(1);
            } else if (e.key === '-') {
                e.preventDefault();
                cycleFontSize(-1);
            } else if (e.key === '0') {
                e.preventDefault();
                setFontSize('normal');
                localStorage.setItem('genesis-font-size', 'normal');
            }
        }
    });
}

function setFontSize(size) {
    const body = document.body;
    const buttons = document.querySelectorAll('.font-btn');
    
    // Remove all font size classes
    body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
    
    // Add the requested size class
    body.classList.add(`font-size-${size}`);
    
    // Update active button
    buttons.forEach(button => {
        button.classList.toggle('active', button.dataset.size === size);
    });
}

function cycleFontSize(direction) {
    const sizes = ['small', 'normal', 'large'];
    const currentSize = localStorage.getItem('genesis-font-size') || 'normal';
    const currentIndex = sizes.indexOf(currentSize);
    
    let newIndex;
    if (direction > 0) {
        newIndex = Math.min(currentIndex + 1, sizes.length - 1);
    } else {
        newIndex = Math.max(currentIndex - 1, 0);
    }
    
    const newSize = sizes[newIndex];
    setFontSize(newSize);
    localStorage.setItem('genesis-font-size', newSize);
}

// ===== AUTO-ADVANCE =====
let autoadvanceTimer = null;
let isAutoadvanceActive = false;

function initAutoAdvance() {
    if (!autoadvanceToggle || !autoadvanceInterval) return;

    // Event listeners
    autoadvanceToggle.addEventListener('click', toggleAutoAdvance);
    autoadvanceInterval.addEventListener('change', updateAutoAdvanceInterval);

    // Auto-stop on user interaction
    ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, () => {
            if (isAutoadvanceActive && !isLastSlide()) {
                toggleAutoAdvance();
            }
        }, { once: true });
    });
}

function toggleAutoAdvance() {
    isAutoadvanceActive = !isAutoadvanceActive;
    
    if (isAutoadvanceActive) {
        startAutoAdvance();
        autoadvanceToggle.textContent = 'Auto';
        autoadvanceToggle.classList.add('active');
        autoadvanceToggle.setAttribute('aria-pressed', 'true');
    } else {
        stopAutoAdvance();
        autoadvanceToggle.textContent = 'Auto';
        autoadvanceToggle.classList.remove('active');
        autoadvanceToggle.setAttribute('aria-pressed', 'false');
    }
}

function startAutoAdvance() {
    const interval = parseInt(autoadvanceInterval.value) * 1000;
    
    autoadvanceTimer = setTimeout(() => {
        if (!isLastSlide()) {
            goToNextSlide();
            if (isAutoadvanceActive) {
                startAutoAdvance(); // Start timer for next slide
            }
        } else {
            toggleAutoAdvance(); // Stop at last slide
        }
    }, interval);
}

function stopAutoAdvance() {
    if (autoadvanceTimer) {
        clearTimeout(autoadvanceTimer);
        autoadvanceTimer = null;
    }
}

function updateAutoAdvanceInterval() {
    if (isAutoadvanceActive) {
        stopAutoAdvance();
        startAutoAdvance();
    }
}

function isLastSlide() {
    return currentSlide === totalSlides - 1;
}

// Add to cleanup functions
addCleanupFunction(() => {
    stopAutoAdvance();
    isAutoadvanceActive = false;
});

// ===== BATTERY & MOBILE HUD =====
function initBatterySaverToggle() {
    const saved = localStorage.getItem('presentation-battery-saver') === '1';
    setBatterySaverState(saved, { skipEffects: true });

    const toggles = [
        document.getElementById('battery-saver-toggle'),
        document.getElementById('hud-battery')
    ];

    toggles.forEach((btn) => {
        if (!btn) return;
        btn.addEventListener('click', () => setBatterySaverState(!batterySaverEnabled));
    });

    updateBatteryToggleUI();
}

function setBatterySaverState(enabled, options = {}) {
    batterySaverEnabled = !!enabled;
    document.body.classList.toggle('battery-saver-mode', batterySaverEnabled);

    if (batterySaverEnabled) {
        localStorage.setItem('presentation-battery-saver', '1');
    } else {
        localStorage.removeItem('presentation-battery-saver');
    }

    updateBatteryToggleUI();
    updateMobileHudState();

    if (!options.skipEffects && cinematicBootstrapped) {
        initCinematicEffects();
    }
}

function updateBatteryToggleUI() {
    const toggles = [
        document.getElementById('battery-saver-toggle'),
        document.getElementById('hud-battery')
    ];
    toggles.forEach((btn) => {
        if (btn) {
            btn.setAttribute('aria-pressed', batterySaverEnabled ? 'true' : 'false');
        }
    });
}

function initMobileHud() {
    if (!mobileHudElement) return;

    const actionMap = {
        'hud-prev': () => goToPrevSlide(),
        'hud-next': () => goToNextSlide(),
        'hud-overview': () => toggleOverviewMode(),
        'hud-timer': () => toggleTimer(),
        'hud-battery': () => setBatterySaverState(!batterySaverEnabled),
        'hud-orientation': () => toggleOrientationPreference()
    };

    Object.entries(actionMap).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        hudButtons[id] = btn;
        btn.addEventListener('click', () => {
            handler();
            showMobileHud();
        });
    });

    const interactionHandler = () => handleMobileInteraction();
    ['pointerdown', 'pointermove', 'touchstart', 'scroll'].forEach((evt) => {
        document.addEventListener(evt, interactionHandler, { passive: true });
    });

    addCleanupFunction(() => {
        ['pointerdown', 'pointermove', 'touchstart', 'scroll'].forEach((evt) => {
            document.removeEventListener(evt, interactionHandler);
        });
    });

    updateMobileHudState();
    hideMobileHud();
}

function handleMobileInteraction() {
    if (!isMobileViewport()) return;
    showMobileHud();
}

function showMobileHud(force = false) {
    if (!mobileHudElement || !isMobileViewport()) return;
    mobileHudElement.classList.add('visible');
    mobileHudElement.setAttribute('aria-hidden', 'false');
    clearTimeout(mobileHudHideTimeout);
    const delay = force ? 5000 : 3500;
    mobileHudHideTimeout = setTimeout(() => hideMobileHud(), delay);
}

function hideMobileHud() {
    if (!mobileHudElement) return;
    mobileHudElement.classList.remove('visible');
    mobileHudElement.setAttribute('aria-hidden', 'true');
    if (mobileHudHideTimeout) {
        clearTimeout(mobileHudHideTimeout);
        mobileHudHideTimeout = null;
    }
}

function updateMobileHudState() {
    if (!mobileHudElement) return;
    const prevLocked = currentSlide === 0;
    const nextLocked = currentSlide === totalSlides - 1 || (quizMode && !quizProgress.completedQuestions.has(slides[currentSlide]?.id));

    const prevBtnHud = document.getElementById('hud-prev');
    if (prevBtnHud) prevBtnHud.disabled = prevLocked;

    const nextBtnHud = document.getElementById('hud-next');
    if (nextBtnHud) nextBtnHud.disabled = nextLocked;

    const overviewBtn = document.getElementById('hud-overview');
    if (overviewBtn) overviewBtn.setAttribute('aria-pressed', isOverviewMode ? 'true' : 'false');

    const timerBtn = document.getElementById('hud-timer');
    if (timerBtn) timerBtn.setAttribute('aria-pressed', isTimerActive ? 'true' : 'false');

    const orientationBtn = document.getElementById('hud-orientation');
    if (orientationBtn) orientationBtn.setAttribute('aria-pressed', orientationPreference.requireLandscape ? 'true' : 'false');

    updateBatteryToggleUI();
}

function initOrientationHelpers() {
    if (!orientationOverlay) {
        orientationOverlay = document.getElementById('orientation-overlay');
    }
    if (!orientationOverlay) return;

    const dismissBtn = document.getElementById('orientation-dismiss');
    const disableBtn = document.getElementById('orientation-disable');
    orientationPreference.requireLandscape = localStorage.getItem('presentation-orientation-pref') === 'landscape';

    orientationMediaQuery = window.matchMedia('(orientation: landscape)');
    const handleOrientationChange = () => updateOrientationOverlayVisibility();
    orientationMediaQuery.addEventListener('change', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    addCleanupFunction(() => {
        orientationMediaQuery?.removeEventListener('change', handleOrientationChange);
        window.removeEventListener('resize', handleOrientationChange);
    });

    dismissBtn?.addEventListener('click', () => hideOrientationOverlay());
    disableBtn?.addEventListener('click', () => {
        orientationPreference.requireLandscape = false;
        localStorage.removeItem('presentation-orientation-pref');
        updateOrientationButtonState();
        hideOrientationOverlay();
    });

    updateOrientationButtonState();
    updateOrientationOverlayVisibility();
}

function toggleOrientationPreference() {
    orientationPreference.requireLandscape = !orientationPreference.requireLandscape;
    if (orientationPreference.requireLandscape) {
        localStorage.setItem('presentation-orientation-pref', 'landscape');
    } else {
        localStorage.removeItem('presentation-orientation-pref');
    }
    updateOrientationButtonState();
    updateOrientationOverlayVisibility();
}

function updateOrientationButtonState() {
    const orientationBtn = document.getElementById('hud-orientation');
    if (orientationBtn) {
        orientationBtn.setAttribute('aria-pressed', orientationPreference.requireLandscape ? 'true' : 'false');
    }
}

function updateOrientationOverlayVisibility() {
    if (!orientationOverlay) return;
    const shouldShow = orientationPreference.requireLandscape
        && isMobileViewport()
        && orientationMediaQuery
        && !orientationMediaQuery.matches;
    orientationOverlay.classList.toggle('visible', shouldShow);
    orientationOverlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
}

function hideOrientationOverlay() {
    if (!orientationOverlay) return;
    orientationOverlay.classList.remove('visible');
    orientationOverlay.setAttribute('aria-hidden', 'true');
}

// ===== LOAD SLIDES FROM JSON OR INLINE =====
async function loadSlides(options = {}) {
    const { forceNetwork = false, suppressRetryPrompt = false } = options;
    prefetchedContent.clear();
    prefetchedAssets.clear();
    loadedImages.clear();
    imageCache.clear();
    try {
        const fetchOptions = forceNetwork ? { cache: 'no-store' } : undefined;
        const response = await fetch('slides.json', fetchOptions);
        if (!response.ok) {
            throw new Error(`Failed to load slides: ${response.status}`);
        }

        const data = await response.json();
        slides = data.slides;
        totalSlides = slides.length;
        isUsingOfflineSlides = false;
        hydrateSlideHeadings(slides);
        updateQuizMetadata();
        return true;
    } catch (error) {
        console.error('Failed to load slides:', error);

        if (!isUsingOfflineSlides) {
            slides = getInlineSlides();
            totalSlides = slides.length;
            isUsingOfflineSlides = true;
            hydrateSlideHeadings(slides);
            updateQuizMetadata();
        }

        if (!suppressRetryPrompt) {
            showNotification('Network error. Using offline slides.', {
                actionLabel: 'Retry download',
                onAction: () => {
                    if (!retryLoadInProgress) {
                        retryLoadSlides();
                    }
                },
                duration: 6000,
                variant: 'error'
            });
        }

        return false;
    }
}

function updateQuizMetadata() {
    quizSlideIndices = slides
        .map((slide, index) => (slide.type === 'quiz' ? index : null))
        .filter((index) => index !== null);
    quizProgress.totalQuizQuestions = quizSlideIndices.length;

    const validQuizIds = new Set(
        slides.filter((slide) => slide.type === 'quiz').map((slide) => slide.id)
    );
    quizProgress.completedQuestions = new Set(
        Array.from(quizProgress.completedQuestions)
            .map((id) => Number(id))
            .filter((id) => validQuizIds.has(id))
    );
    if (quizProgress.quizAttempts && typeof quizProgress.quizAttempts === 'object') {
        quizProgress.quizAttempts = Object.fromEntries(
            Object.entries(quizProgress.quizAttempts).filter(([id]) => {
                const numericId = Number(id);
                return validQuizIds.has(numericId);
            })
        );
    }
}

async function retryLoadSlides() {
    retryLoadInProgress = true;
    showNotification('Attempting to download slides...', { persist: true, variant: 'info' });

    const networkSuccess = await loadSlides({ forceNetwork: true, suppressRetryPrompt: true });

    if (networkSuccess) {
        hideNotification();
        currentSlide = 0;
        totalSlides = slides.length;
        initProgressBar();
        initDotNavigation();
        renderSlide(currentSlide);
        updateProgressBar();
    showNotification('Slides updated from the network.', { duration: 4000, variant: 'success' });
} else {
    showNotification('Retry failed. Still using offline slides.', {
        actionLabel: 'Retry download',
        onAction: () => {
            if (!retryLoadInProgress) {
                retryLoadSlides();
            }
        },
        duration: 5000,
        variant: 'error'
    });
}

    retryLoadInProgress = false;
}

// ===== INLINE SLIDES DATA FOR OFFLINE MODE =====
function getInlineSlides() {
    return JSON.parse(String.raw`
[
    {
        "id":  1,
        "bgImage":  "../1.jpg",
        "bgVideo":  "../S-1.mp4",
        "content":  "\u003ch1 class=\"gradient-title title-glow text-4xl md:text-5xl lg:text-6xl\"\u003eGenesis 1: \u003cbr\u003eUnpacking the Deepest Ideas \u003cbr\u003ein the Bible\u0027s First Sentence\u003c/h1\u003e",
        "notes":  "Welcome! This presentation explores Genesis 1:1 as the instruction manual for reality itself. Set the tone for deep theological and philosophical exploration."
    },
    {
        "id":  2,
        "bgImage":  "../S1.jpg",
        "content":  "\u003ch2\u003eHave You Ever Read the First Sentence of the Bible?\u003c/h2\u003e\u003cp\u003e\u003ci\u003e\"In the beginning God created the heaven and the earth.\"\u003c/i\u003e - Genesis 1:1\u003c/p\u003e\u003cp\u003eIt seems pretty straightforward, right? It sounds like the start of a story, setting the scene for everything that comes next.\u003c/p\u003e\u003cp\u003eBut according to many thinkers, theologians, and philosophers, this single sentence is one of the most jam-packed, profound statements ever written. It is not just the start of a story; it is the \u003cb\u003einstruction manual for reality itself\u003c/b\u003e.\u003c/p\u003e",
        "notes":  "Introduction: Draw attention to the familiar verse. Frame it as more than narrative-it\u0027s foundational truth. Use the LEGO baseplate analogy if needed."
    },
    {
        "id":  3,
        "bgImage":  "../S2.jpeg",
        "content":  "\u003ch2\u003eThinking About What\u0027s Really Real (Metaphysics)\u003c/h2\u003e\u003cp\u003eBefore we dive in, we need to understand one big word: \u003cb\u003eMetaphysics\u003c/b\u003e.\u003c/p\u003e\u003cp\u003eMetaphysics asks the biggest questions of all:\u003c/p\u003e\u003cul\u003e\u003cli\u003eWhat is reality?\u003c/li\u003e\u003cli\u003eWhy does anything exist at all, instead of just... nothing?\u003c/li\u003e\u003cli\u003eWhat does it mean \"to be\"?\u003c/li\u003e\u003cli\u003eWhat causes things to happen?\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eGenesis 1:1 is a powerful metaphysical statement that divides all existence into two categories: \u003cb\u003eThe Creator\u003c/b\u003e (God) and \u003cb\u003eThe Creation\u003c/b\u003e (heaven and earth).\u003c/p\u003e",
        "notes":  "Introduce metaphysics as the philosophical foundation. Make it accessible-this is thinking about the most fundamental questions of reality."
    },
    {
        "id":  4,
        "bgImage":  "../S3.jpg",
        "content":  "\u003ch2\u003eTwo Kinds of Existence\u003c/h2\u003e\u003cp\u003ePhilosophers sort everything that exists into two buckets:\u003c/p\u003e\u003cdiv class=\"comparison-visual\"\u003e\u003cdiv class=\"comparison-column\"\u003e\u003cdiv class=\"comparison-title\"\u003eContingent Beings\u003c/div\u003e\u003cdiv class=\"comparison-item\"\u003eThings whose existence depends on something else\u003c/div\u003e\u003cdiv class=\"comparison-item\"\u003eThe \"needy\" stuff\u003c/div\u003e\u003c/div\u003e\u003cdiv class=\"comparison-column\"\u003e\u003cdiv class=\"comparison-title\"\u003eNecessary Being\u003c/div\u003e\u003cdiv class=\"comparison-item\"\u003eSomething that exists by its own power\u003c/div\u003e\u003cdiv class=\"comparison-item\"\u003eCompletely self-sufficient\u003c/div\u003e\u003c/div\u003e\u003c/div\u003e",
        "notes":  "Lay out the fundamental metaphysical distinction between contingent and necessary beings. This framework is essential for everything that follows."
    },
    {
        "id":  5,
        "bgImage":  "../5.jpg",
        "bgVideo":  "../S4.mp4",
        "content":  "\u003ch2\u003eBucket #1: Contingent Beings (The \"Needy\" Stuff)\u003c/h2\u003e\u003cp\u003eA \u003cb\u003econtingent being\u003c/b\u003e is anything whose existence depends on something else.\u003c/p\u003e\u003cp\u003e\u003cb\u003eA chair:\u003c/b\u003e It depends on wood from a tree, nails, glue, and the carpenter who built it. The chair did not pop into existence by itself.\u003c/p\u003e\u003cp\u003e\u003cb\u003eYou:\u003c/b\u003e You depend on your parents, food, water, and air to exist.\u003c/p\u003e\u003cp\u003e\u003cb\u003eThe Earth:\u003c/b\u003e It depends on the sun for heat and light, and gravity to stay in orbit.\u003c/p\u003e\u003cp\u003eThe entire observable universe-every star, planet, galaxy, and atom-is \u003cb\u003econtingent\u003c/b\u003e. Everything requires a cause or sustainer outside of itself.\u003c/p\u003e",
        "notes":  "Give concrete examples: chair, you, Earth. Make contingency tangible and relatable. Everything we see is in the \u0027needy\u0027 bucket."
    },
    {
        "id":  6,
        "bgImage":  "../6.jpg",
        "bgVideo":  "../S5.mp4",
        "content":  "\u003ch2\u003eBucket #2: The Necessary Being\u003c/h2\u003e\u003cp\u003eIf everything is dependent, what does it all depend on? You cannot have an endless chain of needy things.\u003c/p\u003e\u003cp\u003e\u003cb\u003eThe Domino Analogy:\u003c/b\u003e Each domino falls because the one before it fell. But what knocked over the first domino?\u003c/p\u003e\u003cp\u003eLogically, there must be something that \u003cb\u003eis not needy\u003c/b\u003e-something that does not depend on anything else. Something completely independent, uncaused, and self-sufficient.\u003c/p\u003e\u003cp\u003eThis is what philosophers call the \u003cb\u003eNecessary Being\u003c/b\u003e. The God of Genesis 1 is this Necessary Being.\u003c/p\u003e",
        "notes":  "Introduce necessary being with the domino analogy. Make it clear: the chain of dependency must end somewhere. That is God."
    },
    {
        "id":  7,
        "bgImage":  "../S6.jpg",
        "content":  "\u003ch2\u003eThe Rules of Reality: Four Foundational Axioms\u003c/h2\u003e\u003cp\u003eAn \u003cb\u003eaxiom\u003c/b\u003e is a starting point or basic rule-a self-evident truth you use as a foundation.\u003c/p\u003e\u003cp\u003eGenesis 1:1 presents four foundational axioms about reality. These are not just religious beliefs; they are logical principles that make sense of existence itself.\u003c/p\u003e\u003cp\u003eLet\u0027s examine each axiom carefully.\u003c/p\u003e",
        "notes":  "Transition to the four axioms. Define what an axiom is. Frame them as foundational truths that flow from Genesis 1:1."
    },
    {
        "id":  8,
        "bgImage":  "../S7.jpg",
        "content":  "\u003ch2\u003eAxiom 1: God is the Starting Point, Not the Conclusion\u003c/h2\u003e\u003cp\u003e\u003ci\u003e\"In the beginning God...\"\u003c/i\u003e\u003c/p\u003e\u003cp\u003eNotice: Genesis does not argue for God\u0027s existence. It does not open with \"Evidence for God\u0027s Existence.\" It simply states: \u003cb\u003e\"In the beginning, God...\"\u003c/b\u003e\u003c/p\u003e\u003cp\u003eThis is a massive philosophical move. It treats God\u0027s existence as the \u003cb\u003eultimate axiom\u003c/b\u003e - the starting rule for the whole game.\u003c/p\u003e\u003cp\u003eGod is not a conclusion we arrive at; He is the foundation we start from. He is the \"board\" upon which the entire game of reality is played.\u003c/p\u003e",
        "notes":  "Axiom 1: Emphasize that Scripture presupposes God rather than trying to prove Him at the outset."
    },
    {
        "id":  9,
        "bgImage":  "../S8.jpg",
        "content":  "\u003ch2\u003eAxiom 2: You Can\u0027t Get Something from Absolute Nothing\u003c/h2\u003e\u003cp\u003e\u003ci\u003eEx nihilo nihil fit\u003c/i\u003e - \"Out of nothing, nothing comes.\"\u003c/p\u003e\u003cp\u003eAbsolute nothingness has no matter, no energy, no laws, no potential. It cannot do anything because it \u003cb\u003eis not\u003c/b\u003e anything.\u003c/p\u003e\u003cp\u003eThree possibilities for the universe\u0027s origin:\u003c/p\u003e\u003cp\u003e1. \u003cb\u003eCreated itself?\u003c/b\u003e Impossible - it would need to exist before it existed.\u003cbr\u003e2. \u003cb\u003eAlways existed?\u003c/b\u003e Science says no (Second Law of Thermodynamics).\u003cbr\u003e3. \u003cb\u003eCreated by something outside itself?\u003c/b\u003e This is the only option left.\u003c/p\u003e",
        "notes":  "Axiom 2: Explain why absolute nothingness cannot produce anything. Highlight the logical options."
    },
    {
        "id":  10,
        "bgImage":  "../S9.jpg",
        "content":  "\u003ch2\u003eAxiom 3: The Universe Can\u0027t Hold Itself Together\u003c/h2\u003e\u003cp\u003eThe universe is clearly \u003cb\u003e\"needy\"\u003c/b\u003e (contingent), not self-sufficient. It needed a creator to start it \u003cb\u003eand\u003c/b\u003e needs a sustainer to keep it going.\u003c/p\u003e\u003cp\u003e\u003cb\u003eComposition:\u003c/b\u003e Made of parts (cells, atoms) that must be arranged correctly.\u003cbr\u003e\u003cb\u003eChange:\u003c/b\u003e Always changing, expanding, decaying - requires an outside force.\u003cbr\u003e\u003cb\u003eBeginning:\u003c/b\u003e Anything that begins to exist is dependent on its cause.\u003cbr\u003e\u003cb\u003eEntropy:\u003c/b\u003e The universe is \"running down\" like a wind-up toy, losing usable energy.\u003c/p\u003e\u003cp\u003eThe universe cannot pull itself up by its own bootstraps.\u003c/p\u003e",
        "notes":  "Axiom 3: Four reasons the universe is contingent - composition, change, beginning, entropy."
    },
    {
        "id":  11,
        "bgImage":  "../S10.jpg",
        "content":  "\u003ch2\u003eAxiom 4: The Universe Needs Constant Support\u003c/h2\u003e\u003cp\u003e\u003cb\u003eThe Doctrine of Divine Concurrence:\u003c/b\u003e God did not just create the universe and walk away. Without God\u0027s active, continuous power, it would instantly cease to exist.\u003c/p\u003e\u003cp\u003eThe universe is NOT like a building (built once, stands alone).\u003cbr\u003eThe universe IS like a song (only exists while the singer is singing).\u003c/p\u003e\u003cp\u003e\u003cb\u003eHebrews 1:3:\u003c/b\u003e \"...upholding all things by the word of his power.\"\u003cbr\u003e\u003cb\u003eColossians 1:17:\u003c/b\u003e \"...in him all things consist.\"\u003c/p\u003e\u003cp\u003eYour existence right now is a direct, moment-by-moment gift of God\u0027s sustaining power.\u003c/p\u003e",
        "notes":  "Axiom 4: Teach divine concurrence and the ongoing sustaining work of God."
    },
    {
        "id":  12,
        "bgImage":  "../S11.jpg",
        "content":  "\u003ch2\u003eTakeaway #1: Goodbye to the \"Clockmaker God\" (Rejection of Deism)\u003c/h2\u003e\n\u003cp\u003e\u003cb\u003eDeism\u003c/b\u003e says God is like a cosmic clockmaker\u0026mdash;He built the clock, wound it up, and stepped back. He is retired and uninvolved.\u003c/p\u003e\n\u003cp\u003eBut Genesis 1:1 and the four axioms show this cannot be true.\u003c/p\u003e\n\u003cp\u003eGod is not a distant, retired creator. He is an \u003cb\u003eever-present, active Sustainer\u003c/b\u003e intimately involved with every atom of His creation at every moment.\u003c/p\u003e\n\u003cdiv class=\"slide-annotations\" aria-label=\"Slide annotations\"\u003e\n  \u003cdiv class=\"annotation\" tabindex=\"0\"\u003e\n    \u003cdiv class=\"annotation-title\"\u003eDeism\u003c/div\u003e\n    \u003cdiv class=\"annotation-body\"\u003e\n      \u003cp\u003eDeism is a philosophical belief that posits a creator God who does not supernaturally intervene in the universe. It gained prominence during the 17th and 18th-century Enlightenment, which emphasized reason over divine revelation.\u003c/p\u003e\n      \u003cp\u003eDeists believe the creator can be understood through nature and human reason, not through miracles or scriptures.\u003c/p\u003e\n    \u003c/div\u003e\n  \u003c/div\u003e\n  \u003cdiv class=\"annotation\" tabindex=\"0\"\u003e\n    \u003cdiv class=\"annotation-title\"\u003e\"Clockmaker God\"\u003c/div\u003e\n    \u003cdiv class=\"annotation-body\"\u003e\n      \u003cp\u003eThis refers to the \"Clockmaker Analogy,\" a teleological argument for God\u0026#39;s existence. Famously articulated by theologian William Paley, the argument suggests that the universe\u0026#39;s complexity, like that of a watch, implies an intelligent designer.\u003c/p\u003e\n      \u003cp\u003eWhile Paley himself was not a Deist, the analogy was adopted to describe the Deist concept of a God who creates the universe (the clock), winds it up, and then lets it run on its own without further involvement.\u003c/p\u003e\n    \u003c/div\u003e\n  \u003c/div\u003e\n\u003c/div\u003e",
        "notes":  "Takeaway: Reject deism. God is not an absentee landlord; he is sustaining everything right now."
    },
    {
        "id":  13,
        "bgImage":  "../S12.jpg",
        "content":  "\u003ch2\u003eTakeaway #2: Hello to a Purposeful Universe (Evidence of Intelligent Design)\u003c/h2\u003e\u003cp\u003eIf the universe is a continuous thought in the mind of God (not a machine running on its own), what would we expect to find?\u003c/p\u003e\u003cp\u003eWe would expect \u003cb\u003eincredible order\u003c/b\u003e, deep mathematical patterns, and complex information - the hallmarks of a rational Mind.\u003c/p\u003e\u003cp\u003eFrom the laws of physics to the genetic code in DNA, the cosmos appears far less like a random accident and much more like a \u003cb\u003epurposeful, intelligent design\u003c/b\u003e.\u003c/p\u003e",
        "notes":  "Takeaway: Show how order, laws, and information point to a rational Creator."
    },
    {
        "id":  14,
        "bgImage":  "../S13.jpg",
        "content":  "\u003ch2\u003eWhat This Means for You\u003c/h2\u003e\u003cp\u003eGenesis 1:1 is not just an opening line. It is the key that unlocks the nature of reality - a world created by God and continuously held in existence by Him every single second.\u003c/p\u003e\u003cp\u003e\u003cb\u003eYour existence right now\u003c/b\u003e is not a leftover effect from a long-ago creation. It is a direct, continuous, moment-by-moment gift of God\u0027s sustaining power.\u003c/p\u003e\u003cp\u003eYou are held in being by the Necessary Being. Your life has purpose, meaning, and a foundation that transcends the material world.\u003c/p\u003e",
        "notes":  "Application: Make it personal. Emphasize that life is being sustained by God right now."
    },
    {
        "id":  15,
        "bgImage":  "../15.jpg",
        "content":  "\u003ch2\u003eReady to Test Your Understanding?\u003c/h2\u003e\u003cp\u003eYou have explored one of the most profound verses in Scripture. Before we move on, let\u0027s test how well the big ideas landed.\u003c/p\u003e\u003cp class=\"transition-message\"\u003ePrepare for a 7-question quiz covering metaphysics, the four axioms, and the key takeaways.\u003c/p\u003e",
        "notes":  "Transition into the quiz section."
    },
    {
        "id":  16,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "easy",
        "question":  {
                         "id":  "PRES1Q001",
                         "question":  "Genesis 1:1 divides all existence into which two fundamental categories?",
                         "options":  [
                                         "The Creator and the Creation",
                                         "Heaven and the Angels",
                                         "Light and Darkness",
                                         "Faith and Works"
                                     ],
                         "answer":  "The Creator and the Creation",
                         "explanation":  "The verse names God (the Creator) and \"the heaven and the earth\" (everything within creation)."
                     },
        "notes":  "Quiz question 1: recap of the central distinction."
    },
    {
        "id":  17,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "easy",
        "question":  {
                         "id":  "PRES1Q002",
                         "question":  "What does Axiom 1 highlight about God\u0027s existence?",
                         "options":  [
                                         "God is the logical conclusion of scientific inquiry",
                                         "God\u0027s existence is the starting axiom for reality",
                                         "God needs proof from nature to be believed",
                                         "God is one of many possible first causes"
                                     ],
                         "answer":  "God\u0027s existence is the starting axiom for reality",
                         "explanation":  "Axiom 1 treats God as the foundational premise rather than a conclusion we eventually reach."
                     },
        "notes":  "Quiz question 2: reinforces the presuppositional stance."
    },
    {
        "id":  18,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "medium",
        "question":  {
                         "id":  "PRES1Q003",
                         "question":  "Which statement best captures the meaning of \"ex nihilo nihil fit\"?",
                         "options":  [
                                         "The universe can recycle itself forever",
                                         "Nothing can produce something without an external cause",
                                         "Matter is eternal and has no beginning",
                                         "Energy naturally increases over time"
                                     ],
                         "answer":  "Nothing can produce something without an external cause",
                         "explanation":  "Absolute nothingness has no capacity to generate anything on its own."
                     },
        "notes":  "Quiz question 3: tests understanding of Axiom 2."
    },
    {
        "id":  19,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "medium",
        "question":  {
                         "id":  "PRES1Q004",
                         "question":  "Which of the following is an example of a contingent being?",
                         "options":  [
                                         "An eternally existing mathematical truth",
                                         "A galaxy that depends on gravity and matter",
                                         "A self-existent necessary being",
                                         "A timeless law of logic"
                                     ],
                         "answer":  "A galaxy that depends on gravity and matter",
                         "explanation":  "Galaxies rely on external factors such as gravity, matter, and initial conditions."
                     },
        "notes":  "Quiz question 4: applies the contingent versus necessary distinction."
    },
    {
        "id":  20,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "medium",
        "question":  {
                         "id":  "PRES1Q005",
                         "question":  "What does the domino analogy in the presentation illustrate?",
                         "options":  [
                                         "Why miracles cannot happen",
                                         "How the universe creates itself",
                                         "The need for a first cause that is not contingent",
                                         "That chance is enough to explain order"
                                     ],
                         "answer":  "The need for a first cause that is not contingent",
                         "explanation":  "The analogy shows that an endless series of dependent events needs an initial, independent starter."
                     },
        "notes":  "Quiz question 5: probes the logic of the necessary being."
    },
    {
        "id":  21,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "hard",
        "question":  {
                         "id":  "PRES1Q006",
                         "question":  "Which idea best summarizes the doctrine of Divine Concurrence?",
                         "options":  [
                                         "God created the universe and then withdrew completely",
                                         "God only intervenes during miracles",
                                         "God continuously upholds everything in existence at every moment",
                                         "God is identical with the created universe"
                                     ],
                         "answer":  "God continuously upholds everything in existence at every moment",
                         "explanation":  "Divine concurrence explains that creation persists because God actively sustains it."
                     },
        "notes":  "Quiz question 6: confirms understanding of ongoing divine support."
    },
    {
        "id":  22,
        "type":  "quiz",
        "bgImage":  "css-gradient",
        "difficulty":  "hard",
        "question":  {
                         "id":  "PRES1Q007",
                         "question":  "Why does the presentation argue that the universe points to intelligent design?",
                         "options":  [
                                         "Because randomness is impossible",
                                         "Because order, information, and fine-tuning mirror a rational Mind",
                                         "Because science has disproven natural processes",
                                         "Because believers need reassurance"
                                     ],
                         "answer":  "Because order, information, and fine-tuning mirror a rational Mind",
                         "explanation":  "The takeaways highlight that deep order and information align with a purposeful Creator."
                     },
        "notes":  "Quiz question 7: ties the final takeaway to intelligent design."
    },
    {
        "id":  23,
        "bgImage":  "../15.jpg",
        "content":  "\u003ch2\u003eReflection: The Personal Impact\u003c/h2\u003e\u003cp\u003eYou have just wrestled with Genesis 1:1 as the foundation of reality. Your existence right now is not a leftover effect from a distant event; it is a direct, continuous gift of God\u0027s sustaining power.\u003c/p\u003e\u003cp\u003eHow does this change your worship, your trust, and your purpose?\u003c/p\u003e\u003cp\u003e\u003ci\u003eTake a moment to jot down one personal response before moving on.\u003c/i\u003e\u003c/p\u003e",
        "notes":  "Reflection slide for checkpoint rewards and personal application."
    },
    {
        "id":  24,
        "type":  "comments",
        "bgImage":  "../15.jpg",
        "content":  "\u003ch2\u003eShare Your Thoughts\u003c/h2\u003e\u003cdiv id=\"quiz-score-display\" class=\"quiz-score-summary\"\u003e\u003c/div\u003e\u003cp class=\"comment-intro\"\u003eWhat did you learn from this presentation? How does understanding Genesis 1:1 reshape your perspective on God, the universe, and your place in it?\u003c/p\u003e\u003cform class=\"comment-section-form\" id=\"comment-form\" novalidate\u003e\u003cdiv class=\"comment-field\"\u003e\u003clabel class=\"comment-label\" for=\"comment-text\"\u003eYour reflection\u003c/label\u003e\u003ctextarea class=\"comment-textarea\" id=\"comment-text\" placeholder=\"Share your insight or question...\" rows=\"4\" required aria-describedby=\"comment-helper\"\u003e\u003c/textarea\u003e\u003cp class=\"comment-helper\" id=\"comment-helper\"\u003eShare at least one insight or question you want to explore next.\u003c/p\u003e\u003c/div\u003e\u003cdiv class=\"comment-row\"\u003e\u003cdiv class=\"comment-field\"\u003e\u003clabel class=\"comment-label\" for=\"comment-author\"\u003eName\u003c/label\u003e\u003cinput type=\"text\" class=\"comment-input\" id=\"comment-author\" placeholder=\"Your name\" required inputmode=\"text\" autocomplete=\"name\"\u003e\u003c/div\u003e\u003cbutton type=\"submit\" class=\"comment-submit-btn primary-button\" data-default-label=\"Post Comment\" data-loading-label=\"Posting...\"\u003ePost Comment\u003c/button\u003e\u003c/div\u003e\u003c/form\u003e\u003cdiv class=\"comments-display\" id=\"comments-container\"\u003e\u003cp class=\"loading-comments\"\u003eLoading comments...\u003c/p\u003e\u003c/div\u003e",
        "notes":  "Interactive comment slide that also displays quiz score."
    },
    {
        "id":  25,
        "bgImage":  "../14.jpg",
        "content":  "\u003cdiv class=\"quote-slide surface\" data-tone=\"strong\"\u003e\u003cdiv class=\"quote-header cluster\" data-gap=\"tight\"\u003e\u003cimg src=\"IMG_0700.JPG\" alt=\"Fanelesibonge Ndlovu\" class=\"quote-avatar\"\u003e\u003cdiv class=\"quote-meta stack\" data-gap=\"tight\"\u003e\u003cspan class=\"quote-name\"\u003eFanelesibonge Ndlovu\u003c/span\u003e\u003cspan class=\"quote-role text-muted\"\u003eReflection\u003c/span\u003e\u003c/div\u003e\u003c/div\u003e\u003cp class=\"quote-text\"\u003eTo know that God is the foundation of life itself is comforting because when we reach points of confusion in our journey, we know who we can speak to.\u003c/p\u003e\u003cdiv class=\"quote-divider\"\u003e\u003c/div\u003e\u003cdiv class=\"quote-actions\"\u003e\u003ca href=\"index2.html?continue=2\" class=\"cta-btn primary-button\" aria-label=\"Continue to Presentation 2\" onclick=\"try{localStorage.setItem(\u0027genesis-presentation-1-progress\u0027,\u0027100\u0027)}catch(e){}\"\u003e\u003cspan\u003eContinue to Presentation 2\u003c/span\u003e\u003csvg aria-hidden=\"true\" viewBox=\"0 0 24 24\" class=\"quote-icon\"\u003e\u003cpath d=\"M5 12h14M13 6l6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"\u003e\u003c/path\u003e\u003c/svg\u003e\u003c/a\u003e\u003c/div\u003e\u003c/div\u003e",
        "notes":  "Closing quote and call to action to proceed to Presentation 2."
    }
]
`);
}

// ===== LAZY IMAGE LOADING =====
async function lazyLoadImages(slideIndex) {
    // Load current slide + previous + next 2 slides
    const indicesToLoad = [
        slideIndex - 1,
        slideIndex,
        slideIndex + 1,
        slideIndex + 2
    ].filter(i => i >= 0 && i < totalSlides);

    const promises = indicesToLoad.map(index => {
        if (!loadedImages.has(index)) {
            return preloadSlideImage(index);
        }
        return Promise.resolve();
    });

    await Promise.all(promises);
}

async function preloadSlideImage(index) {
    if (loadedImages.has(index) || !slides[index]) return;

    const slide = slides[index];
    if (slide.type === 'quiz' || !slide.bgImage || slide.bgImage === 'css-gradient') {
        loadedImages.add(index);
        return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = slide.bgImage;

    try {
        if ('decode' in img) {
            await img.decode();
        } else {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        }

        loadedImages.add(index);
        imageCache.set(index, img);
        // Silent image loading - no need to clutter console
    } catch (error) {
        // Silently handle image loading errors - presentation continues with fallback background
        // This is not a critical error
    }
}

function pruneImageCache(anchorIndex) {
    loadedImages.forEach((idx) => {
        if (Math.abs(idx - anchorIndex) > 4) {
            loadedImages.delete(idx);
            imageCache.delete(idx);
        }
    });
}

function prefetchSlideContent(index) {
    if (prefetchedContent.has(index) || !slides[index]) return;
    const template = document.createElement('template');
    template.innerHTML = slides[index].content;
    prefetchedContent.set(index, template);
}

function prunePrefetchedContent(anchorIndex) {
    prefetchedContent.forEach((_, key) => {
        if (Math.abs(key - anchorIndex) > 4) {
            prefetchedContent.delete(key);
        }
    });
}

function prefetchAsset(url, asType = 'fetch') {
    if (!url || prefetchedAssets.has(url)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    if (asType) link.as = asType;
    link.fetchpriority = 'low';
    document.head.appendChild(link);
    prefetchedAssets.add(url);
}

function scheduleIdlePrefetch(anchorIndex) {
    if (idlePrefetchHandle) {
        cancelIdleScheduler(idlePrefetchHandle);
        idlePrefetchHandle = null;
    }

    idlePrefetchHandle = idleScheduler(() => {
        const targets = [anchorIndex + 1, anchorIndex + 2, anchorIndex + 3];
        targets.forEach((index) => {
            if (index >= 0 && index < totalSlides) {
                preloadSlideImage(index);
                prefetchSlideContent(index);
                const candidate = slides[index];
                if (candidate?.bgVideo) {
                    prefetchAsset(candidate.bgVideo, 'video');
                }
                if (candidate?.bgImage) {
                    prefetchAsset(candidate.bgImage, 'image');
                }
            }
        });
        idlePrefetchHandle = null;
    }, { timeout: 1500 });
}

function initSlideViewportObserver() {
    if (!('IntersectionObserver' in window) || slideViewportObserver || !contentLayer) {
        return;
    }

    slideViewportObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                scheduleIdlePrefetch(currentSlide);
            }
        });
    }, { root: contentLayer, threshold: 0.65 });
}

function getBackgroundVideoElement(container) {
    if (!container) return null;
    return container.querySelector('video.background-video');
}

function pauseBackgroundVideo(container) {
    const video = getBackgroundVideoElement(container);
    if (video && !video.paused) {
        try {
            video.pause();
        } catch (error) {
            // Silently ignore pause errors
        }
    }
}

function teardownBackgroundVideo(container) {
    const video = getBackgroundVideoElement(container);
    if (!video) return;

    try {
        video.pause();
    } catch (error) {
        // Ignore pause failures
    }

    try {
        video.removeAttribute('src');
        video.load();
    } catch (error) {
        // Ignore unload failures
    }

    video.remove();
}

function applyBackgroundMedia(container, slide) {
    if (!container || !slide) return;

    if (slide.bgVideo) {
        let video = getBackgroundVideoElement(container);
        if (!video) {
            video = document.createElement('video');
            video.className = 'background-video';
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            video.setAttribute('aria-hidden', 'true');
            container.appendChild(video);
        }

        if (video.dataset.src !== slide.bgVideo) {
            video.dataset.src = slide.bgVideo;
            if (video.src !== slide.bgVideo) {
                video.src = slide.bgVideo;
            }
            try {
                video.load();
            } catch (error) {
                // Ignore load failures; browser will attempt playback
            }
        }

        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
            playAttempt.catch(() => {
                // Autoplay might be blocked; keep muted video ready
            });
        }

        if (slide.bgImage) {
            container.style.backgroundImage = `url(${slide.bgImage})`;
        } else {
            container.style.backgroundImage = 'none';
        }
        container.style.backgroundColor = '#0b0b0c';
        return;
    }

    teardownBackgroundVideo(container);

    if (slide.bgImage) {
        container.style.backgroundImage = `url(${slide.bgImage})`;
    } else {
        container.style.backgroundImage = 'none';
    }
    container.style.backgroundColor = '#0b0b0c';
}

// ===== PRESENTATION STARTUP =====
async function startPresentation() {
    // Hide skeleton loader
    const skeletonLoader = document.querySelector('.skeleton-loader');

    // Initialize progress bar
    initProgressBar();

    // Load images for initial slides
    await lazyLoadImages(currentSlide);
    prefetchSlideContent(currentSlide);

    setTimeout(() => {
        if (skeletonLoader) {
            skeletonLoader.classList.add('hidden');
            setTimeout(() => skeletonLoader.remove(), 500);
        }

        renderSlide(currentSlide);
        scheduleIdlePrefetch(currentSlide);
        showMobileHud(true);

        // Initialize cinematic effects if reduced motion is not preferred
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!prefersReducedMotion.matches) {
            idleScheduler(() => {
                initCinematicEffects();
            });
        }
    }, 300);
}

function updateAnnotationPanel(sourceContent, headingText = 'Slide annotations') {
    if (!annotationPanel) return;

    annotationPanel.innerHTML = '';

    if (!sourceContent) {
        annotationPanel.setAttribute('aria-hidden', 'true');
        annotationPanel.setAttribute('aria-label', 'Slide annotations');
        return;
    }

    const slideAnnotations = sourceContent.querySelector('.slide-annotations');
    if (!slideAnnotations) {
        annotationPanel.setAttribute('aria-hidden', 'true');
        annotationPanel.setAttribute('aria-label', 'Slide annotations');
        return;
    }

    const inlineAnnotations = slideAnnotations.cloneNode(true);
    const modalAnnotations = slideAnnotations.cloneNode(true);

    slideAnnotations.remove();

    inlineAnnotations.setAttribute('role', 'list');
    inlineAnnotations.querySelectorAll('.annotation').forEach(item => {
        item.setAttribute('role', 'listitem');
    });

    modalAnnotations.setAttribute('role', 'list');
    modalAnnotations.querySelectorAll('.annotation').forEach(item => {
        item.setAttribute('role', 'listitem');
    });

    inlineAnnotations.classList.add('annotation-list');
    modalAnnotations.classList.add('annotation-list');

    const headingLabel = document.createElement('div');
    headingLabel.className = 'annotation-panel-heading';
    headingLabel.textContent = headingText;
    annotationPanel.appendChild(headingLabel);

    annotationPanel.appendChild(inlineAnnotations);
    annotationPanel.setAttribute('aria-hidden', 'false');
    annotationPanel.setAttribute('aria-label', `${headingText} annotations`);

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'annotation-expand-btn';
    expandBtn.textContent = 'View Full Notes';
    expandBtn.addEventListener('click', () => {
        openAnnotationModal(modalAnnotations.cloneNode(true), headingText);
    });
    annotationPanel.appendChild(expandBtn);
}

// ===== SLIDE RENDERING =====
async function renderSlide(slideIndex) {
    if (!slides[slideIndex]) return;

    const slide = slides[slideIndex];
    prefetchSlideContent(slideIndex);

    // Check if this is a quiz or comment slide
    if (slide.type === 'quiz') {
        quizMode = true;
        renderQuizSlide(slide, slideIndex);
        scheduleIdlePrefetch(slideIndex);
        updateMobileHudState();
        showMobileHud();
        return;
    } else if (slide.type === 'comments') {
        quizMode = false;
        renderCommentSlide(slide, slideIndex);
        scheduleIdlePrefetch(slideIndex);
        updateMobileHudState();
        showMobileHud();
        return;
    } else {
        quizMode = false;
    }

    // Lazy load surrounding images
    lazyLoadImages(slideIndex);

    // Update background
    const nextBgIndex = (currentBgIndex + 1) % 2;
    const currentBgElement = backgroundElements[currentBgIndex];
    pauseBackgroundVideo(currentBgElement);
    currentBgElement.classList.remove('active');

    // Apply background media (image or video)
    const bgElement = backgroundElements[nextBgIndex];
    applyBackgroundMedia(bgElement, slide);

    bgElement.classList.add('active');
    currentBgIndex = nextBgIndex;

    // Transition content
    const oldContent = contentArea.querySelector('.slide-content');
    if (oldContent) oldContent.classList.remove('visible');

    setTimeout(() => {
        // Enhanced content injection with slide classes
        const cachedTemplate = prefetchedContent.get(slideIndex);
        if (cachedTemplate) {
            contentArea.innerHTML = '';
            const newWrapper = document.createElement('div');
            newWrapper.className = 'slide-content';
            newWrapper.appendChild(cachedTemplate.content.cloneNode(true));
            contentArea.appendChild(newWrapper);
        } else {
            contentArea.innerHTML = `<div class="slide-content">${slide.content}</div>`;
        }

        const newContent = contentArea.querySelector('.slide-content');
        const modalAnnotationHeading = ((newContent.querySelector('h1, h2')?.textContent || 'Slide annotations').trim());
        updateAnnotationPanel(newContent, modalAnnotationHeading);

        // Apply slide-inspired classes to headings
        const headings = newContent.querySelectorAll('h1, h2');
        headings.forEach(heading => {
            heading.classList.add('gradient-title', 'title-glow');
        });
        
        // Add presentation theme class to body
        document.body.classList.add('presentation-mode');
        document.body.classList.remove('quiz-mode');
        document.body.classList.remove('comments-mode');
        
        void newContent.offsetWidth; // Force reflow
        newContent.classList.add('visible');
        contentLayer.scrollTop = 0;

        if (slideViewportObserver) {
            slideViewportObserver.disconnect();
            slideViewportObserver.observe(newContent);
        }

        // Animate day-creation elements on slide 10
        if (slideIndex === 9) {
            const days = newContent.querySelectorAll('.day-creation');
            days.forEach((day, index) => {
                setTimeout(() => day.classList.add('visible'), 500 * (index + 1));
            });
        }

        // Focus management
        setTimeout(() => {
            const heading = contentArea.querySelector('h1, h2');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus();
            }

            // Update ARIA announcer
            const slideAnnouncer = document.getElementById('slide-announcer');
            if (slideAnnouncer && heading) {
                slideAnnouncer.textContent = `Slide ${slideIndex + 1} of ${totalSlides}: ${heading.textContent}`;
            }
        }, 600);
    }, 500);

    // Update UI
    slideCounter.textContent = `${slideIndex + 1} / ${totalSlides}`;
    prevBtn.disabled = slideIndex === 0;
    nextBtn.disabled = slideIndex === totalSlides - 1;

    updateDotNavigation(slideIndex);
    updateProgressBar();

    // Update speaker notes if visible
    if (!document.getElementById('speaker-notes').hidden) {
        updateSpeakerNotes(slideIndex);
    }

    pruneImageCache(slideIndex);
    prunePrefetchedContent(slideIndex);
    scheduleIdlePrefetch(slideIndex);
    updateMobileHudState();
    showMobileHud();

	saveProgress();

	// Check for slide checkpoint rewards (only for non-quiz/comment slides)
	try { checkSlideCheckpoint(slide); } catch (_) {}
}

// ===== NAVIGATION FUNCTIONS =====
function goToNextSlide() {
    // Block navigation if in quiz mode and answer not correct
    if (quizMode && !quizProgress.completedQuestions.has(slides[currentSlide].id)) {
        showNotification('Please answer the question correctly to continue', { duration: 3000, variant: 'info' });
        return;
    }

    if (currentSlide < totalSlides - 1) {
        currentSlide++;
        renderSlide(currentSlide);
        updateURL();
    }
}

function goToPrevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        renderSlide(currentSlide);
        updateURL();
    }
}

function goToFirstSlide() {
    currentSlide = 0;
    renderSlide(currentSlide);
    updateURL();
}

function goToLastSlide() {
    currentSlide = totalSlides - 1;
    renderSlide(currentSlide);
    updateURL();
}

function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
        if (isSlideLocked(index)) {
            showNotification('Locked. Answer the previous question to unlock this slide.', { duration: 2500, variant: 'info' });
            return;
        }
        currentSlide = index;
        renderSlide(currentSlide);
        updateURL();
    }
}

// ===== URL HASH NAVIGATION =====
function updateURL() {
    window.location.hash = `slide-${currentSlide + 1}`;
}

function loadFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/slide-(\d+)/);
    if (match) {
        const slideNum = parseInt(match[1]) - 1;
        if (slideNum >= 0 && slideNum < totalSlides) {
            currentSlide = slideNum;
        }
    }
}

// ===== UNLOCK/LOCK LOGIC FOR PRESENTATION 1 =====
function getFirstQuizIndex() {
    if (quizSlideIndices && quizSlideIndices.length > 0) {
        return quizSlideIndices[0];
    }
    return null;
}

function computeHighestUnlockedSlideIndex() {
    // Only enforce locking for Presentation 1 quiz sequence
    const firstQuizIndex = getFirstQuizIndex();
    if (firstQuizIndex === null || typeof firstQuizIndex !== 'number') {
        // No quiz slides; everything unlocked
        return totalSlides > 0 ? totalSlides - 1 : 0;
    }

    // Start with the first quiz slide unlocked
    let highest = firstQuizIndex;

    // Walk through quiz slides sequentially; unlock the next only if previous is completed
    for (let i = 0; i < quizSlideIndices.length - 1; i++) {
        const quizSlideId = slides[quizSlideIndices[i]]?.id;
        if (quizProgress.completedQuestions.has(quizSlideId)) {
            highest = quizSlideIndices[i + 1];
        } else {
            break;
        }
    }

    // If all quiz slides are completed, unlock everything to the end
    const lastQuizId = slides[quizSlideIndices[quizSlideIndices.length - 1]]?.id;
    if (quizProgress.completedQuestions.has(lastQuizId)) {
        highest = totalSlides - 1;
    }

    return highest;
}

function isSlideLocked(targetIndex) {
    // Slides before the first quiz are never locked
    const firstQuizIndex = getFirstQuizIndex();
    if (firstQuizIndex === null || typeof firstQuizIndex !== 'number') return false;
    if (targetIndex < firstQuizIndex) return false;

    // Lock applies to slides 16â€“23 in Presentation 1 (1-based): indices >= firstQuizIndex + 1
    const highestUnlocked = computeHighestUnlockedSlideIndex();
    return targetIndex > highestUnlocked;
}

function clampCurrentSlideToUnlocked() {
    const highestUnlocked = computeHighestUnlockedSlideIndex();
    if (typeof highestUnlocked === 'number' && currentSlide > highestUnlocked) {
        currentSlide = highestUnlocked;
    }
}

// ===== DOT NAVIGATION =====
function initDotNavigation() {
    const dotsContainer = document.querySelector('.slide-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';

    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        dot.setAttribute('role', 'tab');
        const heading = slides[i]?.headingText || `Slide ${i + 1}`;
        dot.setAttribute('aria-label', `Go to ${heading}`);
        dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
        dot.setAttribute('aria-current', i === currentSlide ? 'page' : 'false');
        if (heading) {
            dot.title = heading;
        }
        if (i === currentSlide) dot.classList.add('active');
        if (isSlideLocked(i)) {
            dot.classList.add('locked');
            dot.setAttribute('aria-disabled', 'true');
            dot.disabled = true;
        }
        dot.addEventListener('click', () => {
            if (isSlideLocked(i)) {
                showNotification('Locked. Answer the previous question to unlock this slide.', { duration: 2500, variant: 'info' });
                return;
            }
            goToSlide(i);
        });
        dotsContainer.appendChild(dot);
    }
}

function updateDotNavigation(slideIndex) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index === slideIndex) {
            dot.classList.add('active');
            dot.setAttribute('aria-selected', 'true');
            dot.setAttribute('aria-current', 'page');
        } else {
            dot.classList.remove('active');
            dot.setAttribute('aria-selected', 'false');
            dot.setAttribute('aria-current', 'false');
        }
        if (isSlideLocked(index)) {
            dot.classList.add('locked');
            dot.setAttribute('aria-disabled', 'true');
            dot.disabled = true;
        } else {
            dot.classList.remove('locked');
            dot.removeAttribute('aria-disabled');
            dot.disabled = false;
        }
        const heading = slides[index]?.headingText;
        if (heading) {
            dot.setAttribute('aria-label', `Go to ${heading}`);
            dot.title = heading;
        }
    });
}

// ===== SPEAKER NOTES =====
function toggleSpeakerNotes() {
    const notesPanel = document.getElementById('speaker-notes');
    notesPanel.hidden = !notesPanel.hidden;
    if (!notesPanel.hidden) {
        updateSpeakerNotes(currentSlide);
    }
}

function updateSpeakerNotes(slideIndex) {
    const notesContent = document.getElementById('notes-content');
    const slide = slides[slideIndex];

    if (slide && slide.notes) {
        const noteText = slide.notes;
        
        // Extract timing information
        const timingMatch = noteText.match(/(\d+)-?(\d*)\s*minutes?/i);
        const timingText = timingMatch ? 
            `${timingMatch[1]}${timingMatch[2] ? '-' + timingMatch[2] : ''} min` : 
            'Self-paced';
        
        // Process the notes with emphasis
        let processedNotes = noteText
            .replace(/\*\*(.*?)\*\*/g, '<span class="emphasis-bold">$1</span>')
            .replace(/\*(.*?)\*/g, '<span class="emphasis-italic">$1</span>')
            .replace(/TRANSITION:(.*)/g, '<div class="transition-note">Transition: $1</div>');
        
        // Remove timing from main content (extracted above)
        processedNotes = processedNotes.replace(/\d+-?\d*\s*minutes?/gi, '').trim();
        
        notesContent.innerHTML = `
            <div class="speaker-note-meta">
                <span>Slide ${slideIndex + 1}</span>
                <span class="timing-indicator">${timingText}</span>
            </div>
            <p>${processedNotes}</p>
        `;
    } else {
        notesContent.innerHTML = `
            <div class="speaker-note-meta">
                <span>Slide ${slideIndex + 1}</span>
                <span class="timing-indicator">Self-paced</span>
            </div>
            <p>No notes available for this slide.</p>
        `;
    }
}

// ===== OVERVIEW MODE =====
function toggleOverviewMode() {
    const viewer = document.getElementById('pptx-viewer');
    isOverviewMode = !isOverviewMode;

    if (isOverviewMode) {
        viewer.classList.add('overview-mode');
        renderOverview();
    } else {
        viewer.classList.remove('overview-mode');
        renderSlide(currentSlide);
    }
    const overviewBtn = document.getElementById('hud-overview');
    if (overviewBtn) {
        overviewBtn.setAttribute('aria-pressed', isOverviewMode ? 'true' : 'false');
    }
}

function renderOverview() {
    let html = '';

    slides.forEach((slide, index) => {
        const isCurrent = index === currentSlide ? 'current' : '';
        html += `
            <div class="slide-thumbnail ${isCurrent}" data-slide="${index}">
                <span class="slide-number">${index + 1}</span>
                <div class="slide-content visible">
                    ${slide.content}
                </div>
            </div>
        `;
    });

    contentArea.innerHTML = html;

    // Add click listeners
    document.querySelectorAll('.slide-thumbnail').forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            if (isSlideLocked(index)) {
                showNotification('Locked. Answer the previous question to unlock this slide.', { duration: 2500, variant: 'info' });
                return;
            }
            exitOverviewToSlide(index);
        });
    });
}

function exitOverviewToSlide(slideIndex) {
    if (isOverviewMode) {
        currentSlide = slideIndex;
        toggleOverviewMode();
        updateURL();
    }
}

// ===== PRESENTATION TIMER =====
function toggleTimer() {
    const timerElement = document.getElementById('timer');
    isTimerActive = !isTimerActive;

    if (isTimerActive) {
        timerElement.classList.add('active');
        if (!timerStartTime) {
            timerStartTime = Date.now();
        }
        startTimer();
    } else {
        timerElement.classList.remove('active');
        stopTimer();
    }
    const hudTimerBtn = document.getElementById('hud-timer');
    if (hudTimerBtn) {
        hudTimerBtn.setAttribute('aria-pressed', isTimerActive ? 'true' : 'false');
    }
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function cleanupTimer() {
    stopTimer();
    timerStartTime = null;
    isTimerActive = false;
}

// Add timer cleanup to global cleanup
addCleanupFunction(cleanupTimer);

function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('elapsed-time').textContent = display;
    if (hudTimerValueEl) {
        hudTimerValueEl.textContent = display;
    }
}

// ===== LOCAL STORAGE =====
function saveProgress() {
    try {
        // Save presentation-specific progress
        const slideProgress = currentSlide >= 0 && totalSlides > 0 ? Math.round((currentSlide / totalSlides) * 100) : 0;
        localStorage.setItem('genesis-presentation-1-progress', slideProgress.toString());
        localStorage.setItem('academy-last-slide', currentSlide);
        localStorage.setItem('academy-timer-start', timerStartTime);
    } catch (e) {
        appDevWarn('Could not save progress:', e);
    }
}

function loadProgress() {
    try {
        const saved = localStorage.getItem('academy-last-slide');
        const savedTimer = localStorage.getItem('academy-timer-start');

        if (saved !== null) {
            const slideNum = parseInt(saved);
            if (slideNum >= 0 && slideNum < totalSlides) {
                currentSlide = slideNum;
            }
        }

        if (savedTimer !== null) {
            timerStartTime = parseInt(savedTimer);
        }
    } catch (e) {
        appDevWarn('Could not load progress:', e);
    }
}

// ===== KEYBOARD SHORTCUTS =====
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore shortcuts when typing
        if (e.target.matches('input, textarea')) {
            if (e.key === 'Escape' && document.getElementById('chat-widget').classList.contains('visible')) {
                document.getElementById('chat-widget').classList.remove('visible');
                document.getElementById('chat-widget').setAttribute('aria-hidden', 'true');
                document.getElementById('chat-toggle-button').focus();
            }
            return;
        }

        // Navigation shortcuts
        if (e.key === 'ArrowRight' || e.key === 'PageDown') goToNextSlide();
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToPrevSlide();
        else if (e.key === 'Home') goToFirstSlide();
        else if (e.key === 'End') goToLastSlide();
        else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        else if (e.key === 'n' || e.key === 'N') toggleSpeakerNotes();
        else if (e.key === 'o' || e.key === 'O') toggleOverviewMode();
        else if (e.key === 't' || e.key === 'T') toggleTimer();
        else if (e.key === '?') toggleShortcutsModal();
        else if (e.key === 'Escape') {
            if (document.getElementById('chat-widget').classList.contains('visible')) {
                document.getElementById('chat-widget').classList.remove('visible');
                document.getElementById('chat-widget').setAttribute('aria-hidden', 'true');
                document.getElementById('chat-toggle-button').focus();
            } else if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (document.getElementById('shortcuts-modal') && !document.getElementById('shortcuts-modal').hidden) {
                toggleShortcutsModal();
            }
        }
    });
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
    const doc = document;
    const docEl = document.documentElement;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
    if (!isFs) {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (typeof req === 'function') {
            try {
                const p = req.call(docEl);
                if (p && typeof p.catch === 'function') {
                    p.catch(err => {
                        appDevWarn('Fullscreen request failed:', err);
                        showNotification('Fullscreen mode not available', { duration: 2500, variant: 'error' });
                    });
                }
            } catch (err) {
                appDevWarn('Fullscreen request threw:', err);
                showNotification('Fullscreen mode not available', { duration: 2500, variant: 'error' });
            }
        } else {
            showNotification('Fullscreen mode not available', { duration: 2500, variant: 'error' });
        }
    } else {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (typeof exit === 'function') {
            try { exit.call(doc); } catch (_) {}
        }
    }
}

// ===== SHORTCUTS MODAL =====
function initShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    const closeBtn = modal.querySelector('.modal-close');

    closeBtn.addEventListener('click', () => {
        modal.hidden = true;
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.hidden = true;
        }
    });
}

function toggleShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    const closeBtn = modal.querySelector('.modal-close');

    if (modal.hidden) {
        modal.hidden = false;
        closeBtn.focus();
        trapFocus(modal);
    } else {
        modal.hidden = true;
    }
}

// ===== FOCUS TRAP =====
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    element.addEventListener('keydown', handleKeyDown);
}

// ===== TOUCH GESTURES =====
let touchStartX = 0;
let touchEndX = 0;

function initTouchGestures() {
    contentLayer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    contentLayer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        goToNextSlide();
    } else if (touchEndX > touchStartX + swipeThreshold) {
        goToPrevSlide();
    }
}

// ===== ACCESSIBILITY =====
function initAccessibility() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        document.body.classList.add('reduce-motion');
    }

    prefersReducedMotion.addEventListener('change', () => {
        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    });
}

// ===== NOTIFICATIONS =====
function showNotification(message, options = {}) {
    if (!notification) return;

    const { actionLabel, onAction, duration = 3000, persist = false, variant = 'info' } = options;

    hideNotification();

    notification.setAttribute('data-variant', variant);

    const messageSpan = document.createElement('span');
    messageSpan.className = 'notification__message';
    messageSpan.textContent = message;

    notification.innerHTML = '';
    notification.appendChild(messageSpan);

    if (actionLabel && typeof onAction === 'function') {
        const actionButton = document.createElement('button');
        actionButton.type = 'button';
        actionButton.className = 'notification__action';
        actionButton.textContent = actionLabel;
        actionButton.addEventListener('click', () => {
            onAction();
            if (!persist) {
                hideNotification();
            }
        });
        notification.appendChild(actionButton);
    }

    notification.classList.add('show');

    if (!persist) {
        clearTimeout(notificationHideTimeout);
        notificationHideTimeout = setTimeout(() => {
            hideNotification();
        }, duration);
    }
}

function hideNotification() {
    if (!notification) return;
    clearTimeout(notificationHideTimeout);
    notification.classList.remove('show');
    notification.removeAttribute('data-variant');
}

// ===== CHECKPOINTS & CONFETTI REWARDS =====
const checkpointConfig = {
	// Slide IDs that grant micro-rewards when first viewed
	slideIds: [3, 7, 14, 23],
	// Quiz correct answer counts that grant milestones
	quizMilestones: [1, 3, 7]
};

let checkpointProgress = {
	reachedSlides: new Set(),
	reachedMilestones: new Set()
};

function loadCheckpointState() {
	try {
		const saved = localStorage.getItem('presentation1_checkpoints');
		if (saved) {
			const data = JSON.parse(saved);
			checkpointProgress = {
				reachedSlides: new Set(data.reachedSlides || []),
				reachedMilestones: new Set(data.reachedMilestones || [])
			};
		}
	} catch (e) {
		appDevWarn('Could not load checkpoint state:', e);
	}
}

function saveCheckpointState() {
	try {
		const data = {
			reachedSlides: Array.from(checkpointProgress.reachedSlides),
			reachedMilestones: Array.from(checkpointProgress.reachedMilestones)
		};
		localStorage.setItem('presentation1_checkpoints', JSON.stringify(data));
	} catch (e) {
		appDevWarn('Could not save checkpoint state:', e);
	}
}

function checkSlideCheckpoint(slide) {
	if (!slide || typeof slide.id !== 'number') return;
	if (!checkpointConfig.slideIds.includes(slide.id)) return;
	if (checkpointProgress.reachedSlides.has(slide.id)) return; // already rewarded

	checkpointProgress.reachedSlides.add(slide.id);
	saveCheckpointState();

	const badgeBySlide = {
		3: 'Metaphysics Explorer',
		7: 'Axiom Apprentice',
		14: 'Quiz Ready',
		23: 'Reflection Achieved'
	};
	const label = badgeBySlide[slide.id] || 'Checkpoint reached';
	showNotification(`Checkpoint unlocked: ${label}!`, { duration: 3000, variant: 'success' });
	launchConfetti({ intensity: 60 });
}

function checkQuizMilestones(correctCount) {
	if (!Number.isFinite(correctCount)) return;
	for (const m of checkpointConfig.quizMilestones) {
		if (correctCount === m && !checkpointProgress.reachedMilestones.has(m)) {
			checkpointProgress.reachedMilestones.add(m);
			saveCheckpointState();
			const milestoneNames = { 1: 'First Step', 3: 'On a Roll', 7: 'Perfect Score!' };
			const label = milestoneNames[m] || `Milestone: ${m}`;
			showNotification(`${label}`, { duration: 2500, variant: 'success' });
			launchConfetti({ intensity: m >= 7 ? 140 : 90 });
		}
	}
}

let confettiLayer = null;

function ensureConfettiLayer() {
	if (confettiLayer && document.body.contains(confettiLayer)) return confettiLayer;
	confettiLayer = document.createElement('div');
	confettiLayer.id = 'confetti-layer';
	confettiLayer.setAttribute('aria-hidden', 'true');
	confettiLayer.style.position = 'fixed';
	confettiLayer.style.inset = '0';
	confettiLayer.style.pointerEvents = 'none';
	confettiLayer.style.overflow = 'hidden';
	confettiLayer.style.zIndex = '2000';
	document.body.appendChild(confettiLayer);
	return confettiLayer;
}

function launchConfetti(options = {}) {
	const prefersReduced = document.body.classList.contains('reduce-motion');
	if (prefersReduced) return; // respect reduced motion

	const { intensity = 80 } = options;
	const count = Math.max(20, Math.min(200, intensity));
	const layer = ensureConfettiLayer();
	const colors = ['#f2c94c', '#b10f1a', '#ffffff', '#d32f2f', '#f59e0b'];

	for (let i = 0; i < count; i++) {
		const piece = document.createElement('span');
		piece.style.position = 'absolute';
		piece.style.top = '-16px';
		piece.style.left = `${Math.random() * 100}%`;
		const w = 6 + Math.random() * 6;
		const h = 10 + Math.random() * 8;
		piece.style.width = `${w}px`;
		piece.style.height = `${h}px`;
		piece.style.background = colors[Math.floor(Math.random() * colors.length)];
		piece.style.opacity = '0.9';
		piece.style.borderRadius = '2px';
		piece.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
		piece.style.transition = `transform ${900 + Math.random() * 700}ms cubic-bezier(0.2, 0.6, 0.2, 1), opacity 1200ms linear`;
		layer.appendChild(piece);

		// animate on next frame
		requestAnimationFrame(() => {
			const driftX = (Math.random() - 0.5) * 200; // px
			const fallY = window.innerHeight + 60;
			const rotate = 200 + Math.random() * 520;
			piece.style.transform = `translate3d(${driftX}px, ${fallY}px, 0) rotate(${rotate}deg)`;
			piece.style.opacity = '0.8';
		});

		// cleanup
		setTimeout(() => {
			if (piece && piece.parentNode) piece.parentNode.removeChild(piece);
		}, 1800 + Math.random() * 400);
	}

	// remove empty layer after a while
	setTimeout(() => {
		if (confettiLayer && confettiLayer.childElementCount === 0) {
			try { confettiLayer.remove(); } catch (_) {}
			confettiLayer = null;
		}
	}, 2600);
}

// ===== QUIZ RENDERING AND LOGIC =====
function renderQuizSlide(slide, slideIndex) {
    // Update background to solid black for quiz
    const nextBgIndex = (currentBgIndex + 1) % 2;
    const currentBgElement = backgroundElements[currentBgIndex];
    pauseBackgroundVideo(currentBgElement);
    currentBgElement.classList.remove('active');

    const bgElement = backgroundElements[nextBgIndex];
    teardownBackgroundVideo(bgElement);
    bgElement.style.backgroundImage = 'none';
    bgElement.style.backgroundColor = '#000000';

    bgElement.classList.add('active');
    currentBgIndex = nextBgIndex;

    // Determine quiz question numbering dynamically
    const questionIndex = quizSlideIndices.indexOf(slideIndex);
    const totalQuestions = quizProgress.totalQuizQuestions || quizSlideIndices.length || 1;
    const questionNumber = questionIndex === -1 ? 1 : questionIndex + 1;
    const isAnswered = quizProgress.completedQuestions.has(slide.id);

    // Transition content
    const oldContent = contentArea.querySelector('.slide-content, .quiz-container');
    if (oldContent) oldContent.classList.remove('visible');

    updateAnnotationPanel(null);

    setTimeout(() => {
        contentArea.innerHTML = `
            <div class="quiz-container" role="form" aria-label="Quiz question ${questionNumber} of ${totalQuestions}">
                <div class="quiz-difficulty-badge" aria-label="Difficulty: ${slide.difficulty}">
                    ${slide.difficulty.toUpperCase()}
                </div>
                <div class="quiz-progress-indicator">Question ${questionNumber} of ${totalQuestions}</div>
                <h2 class="quiz-question gradient-title title-glow" id="quiz-question-${slide.id}">
                    ${slide.question.question}
                </h2>
                <div class="quiz-options" role="radiogroup" aria-labelledby="quiz-question-${slide.id}" id="quiz-options-${slide.id}">
                    ${slide.question.options.map((option, index) => `
                        <button
                            class="quiz-option ${isAnswered && option === slide.question.answer ? 'correct answered' : ''}"
                            role="radio"
                            aria-checked="false"
                            data-option="${escapeHtml(option)}"
                            tabindex="${index === 0 ? 0 : -1}"
                            ${isAnswered ? 'disabled' : ''}>
                            ${option}
                        </button>
                    `).join('')}
                </div>
                <div class="quiz-button-container">
                    <button class="quiz-submit-btn" id="quiz-submit-${slide.id}" ${isAnswered ? 'style="display:none"' : 'disabled'} aria-label="Submit your answer">
                        Submit Answer
                    </button>
                    ${isAnswered ? '<button class="quiz-continue-btn" id="quiz-continue">Continue</button>' : ''}
                </div>
                <div class="quiz-explanation" id="quiz-explanation-${slide.id}" style="${isAnswered ? 'display:block' : 'display:none'}">
                    <div class="quiz-explanation-title">&#10003; Correct!</div>
                    <p>${slide.question.explanation}</p>
                </div>
            </div>
        `;

        const newContent = contentArea.querySelector('.quiz-container');
        void newContent.offsetWidth; // Force reflow
        newContent.classList.add('visible');
        contentLayer.scrollTop = 0;
        document.body.classList.add('quiz-mode');
        document.body.classList.remove('presentation-mode');
        document.body.classList.remove('comments-mode');

        // Add event listeners to quiz options
        const options = contentArea.querySelectorAll('.quiz-option');
        options.forEach((option, index) => {
            option.addEventListener('click', () => selectQuizOption(option, options, slide));
            option.addEventListener('keydown', (e) => handleQuizKeyboardNav(e, options, index));
        });

        // Add event listener to submit button
        const submitBtn = document.getElementById(`quiz-submit-${slide.id}`);
        if (submitBtn) {
            submitBtn.addEventListener('click', () => submitQuizAnswer(slide, slideIndex));
        }

        // Add event listener to continue button
        const continueBtn = document.getElementById('quiz-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', goToNextSlide);
        }

        // Focus management
        setTimeout(() => {
            const question = document.getElementById(`quiz-question-${slide.id}`);
            if (question) {
                question.setAttribute('tabindex', '-1');
                question.focus();
            }

            // Update ARIA announcer
            const slideAnnouncer = document.getElementById('slide-announcer');
            if (slideAnnouncer) {
                slideAnnouncer.textContent = `Quiz Question ${questionNumber} of ${totalQuestions}: ${slide.question.question}`;
            }
        }, 600);
    }, 500);

    // Update UI
    slideCounter.textContent = `${slideIndex + 1} / ${totalSlides}`;
    prevBtn.disabled = slideIndex === 0;
    nextBtn.disabled = !isAnswered; // Disable next button until answered correctly

    updateDotNavigation(slideIndex);
    updateProgressBar();
	saveProgress();
	// Final slide checkpoint (e.g., reflection/comments)
	try { checkSlideCheckpoint(slide); } catch (_) {}
}

function selectQuizOption(selectedOption, allOptions, slide) {
    // Remove selected class from all options
    allOptions.forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-checked', 'false');
    });

    // Add selected class to clicked option
    selectedOption.classList.add('selected');
    selectedOption.setAttribute('aria-checked', 'true');

    // Store selected answer
    quizProgress.selectedAnswer = selectedOption.dataset.option;

    // Enable submit button
    const submitBtn = document.getElementById(`quiz-submit-${slide.id}`);
    if (submitBtn) {
        submitBtn.disabled = false;
    }

    // Announce selection to screen readers
    announceToScreenReader(`Selected: ${selectedOption.textContent}`);
}

function submitQuizAnswer(slide, slideIndex) {
    const selectedAnswer = quizProgress.selectedAnswer;
    const correctAnswer = slide.question.answer;

    if (!selectedAnswer) {
        showNotification('Please select an answer', { duration: 2000, variant: 'info' });
        return;
    }

    const allOptions = document.querySelectorAll('.quiz-option');

    if (selectedAnswer === correctAnswer) {
        // Correct answer
        allOptions.forEach(opt => {
            if (opt.dataset.option === correctAnswer) {
                opt.classList.add('correct');
                opt.classList.remove('selected');
            } else {
                opt.disabled = true;
                opt.style.opacity = '0.5';
            }
        });

        // Update quiz progress
        quizProgress.correctAnswers++;
        quizProgress.completedQuestions.add(slide.id);

        // Show explanation
        const explanation = document.getElementById(`quiz-explanation-${slide.id}`);
        if (explanation) {
            explanation.style.display = 'block';
        }

        // Hide submit button and show continue button
        const submitBtn = document.getElementById(`quiz-submit-${slide.id}`);
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }

        // Create and show continue button
        const buttonContainer = document.querySelector('.quiz-button-container');
        if (buttonContainer && !document.getElementById('quiz-continue')) {
            const continueBtn = document.createElement('button');
            continueBtn.className = 'quiz-continue-btn';
            continueBtn.id = 'quiz-continue';
            continueBtn.textContent = 'Continue';
            continueBtn.addEventListener('click', goToNextSlide);
            buttonContainer.appendChild(continueBtn);
        }

        // Enable next button
        nextBtn.disabled = false;

        // Announce success
        announceToScreenReader('Correct! You may continue to the next question.');
        showNotification('Correct! Well done!', { duration: 2000, variant: 'success' });

        // Save progress
        saveQuizProgress();
        // Refresh locked/unlocked UI state
        updateProgressBar();
        updateDotNavigation(currentSlide);
		// Trigger quiz milestone rewards
		try { checkQuizMilestones(quizProgress.correctAnswers); } catch (_) {}

    } else {
        // Incorrect answer
        allOptions.forEach(opt => {
            if (opt.dataset.option === selectedAnswer) {
                opt.classList.add('incorrect');
                opt.classList.remove('selected');

                // Shake animation
                setTimeout(() => {
                    opt.classList.remove('incorrect');
                }, 500);
            }
        });

        // Reset selected answer to allow retry
        quizProgress.selectedAnswer = null;

        // Announce incorrect
        announceToScreenReader('Incorrect. Please try again.');
        showNotification('Incorrect. Please try again.', { duration: 2000, variant: 'error' });

        // Disable submit button again
        const submitBtn = document.getElementById(`quiz-submit-${slide.id}`);
        if (submitBtn) {
            submitBtn.disabled = true;
        }
    }
}

function handleQuizKeyboardNav(e, options, currentIndex) {
    let newIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        newIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        newIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        options[currentIndex].click();
        return;
    } else {
        return;
    }

    // Update tabindex and focus
    options.forEach((opt, idx) => {
        opt.tabIndex = idx === newIndex ? 0 : -1;
    });
    options[newIndex].focus();
}

function saveQuizProgress() {
    // Recording quiz progress has been disabled (no-op)
    return;
}

function loadQuizProgress() {
    // Loading saved quiz progress is disabled
    return;
}

// ===== COMMENT SLIDE RENDERING =====
function renderCommentSlide(slide, slideIndex) {
    // Standard background rendering
    const nextBgIndex = (currentBgIndex + 1) % 2;
    const currentBgElement = backgroundElements[currentBgIndex];
    pauseBackgroundVideo(currentBgElement);
    currentBgElement.classList.remove('active');

    const bgElement = backgroundElements[nextBgIndex];
    applyBackgroundMedia(bgElement, slide);

    bgElement.classList.add('active');
    currentBgIndex = nextBgIndex;

    updateAnnotationPanel(null);

    // Transition content
    const oldContent = contentArea.querySelector('.slide-content, .quiz-container');
    if (oldContent) oldContent.classList.remove('visible');

    setTimeout(() => {
        // Inject quiz score before rendering content
        let contentHTML = slide.content;

        // Add quiz score display
        const scoreMessage = quizProgress.correctAnswers === quizProgress.totalQuizQuestions
            ? ''
            : (quizProgress.correctAnswers >= 5
                ? 'Great job! You understood most concepts.'
                : 'Good effort! Feel free to retake the quiz.');
        const scoreHTML = `
            <div class="quiz-score-summary">
                <h3>Quiz Complete!</h3>
                <div class="score-number">
                    ${quizProgress.correctAnswers} / ${quizProgress.totalQuizQuestions}
                </div>
                <p class="score-message">${scoreMessage}</p>
                <button class="retake-quiz-btn" onclick="retakeQuiz()">
                    Retake Quiz
                </button>
            </div>
        `;

        contentHTML = contentHTML.replace('<div id="quiz-score-display" class="quiz-score-summary"></div>', scoreHTML);

        // Enhanced quiz content injection with slide classes
        contentArea.innerHTML = `<div class="slide-content">${contentHTML}</div>`;
        const newContent = contentArea.querySelector('.slide-content');
        const commentsList = document.getElementById('comments-container');
        if (commentsList) {
            commentsList.scrollTop = 0;
        }
        // Apply slide-inspired classes to quiz headings
        const headings = newContent.querySelectorAll('h1, h2');
        headings.forEach(heading => {
            heading.classList.add('gradient-title', 'title-glow');
        });
        
        // Add quiz theme class to body
        document.body.classList.remove('quiz-mode');
        document.body.classList.remove('presentation-mode');
        document.body.classList.add('comments-mode');
        
        void newContent.offsetWidth; // Force reflow
        newContent.classList.add('visible');
        contentLayer.scrollTop = 0;

        // Load and display comments
        loadComments();

        // Add form submit listener
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', handleCommentFormSubmit);

            // Enter submits, Shift+Enter makes a newline; Ctrl/Cmd+Enter also submits
            const commentTextarea = document.getElementById('comment-text');
            if (commentTextarea) {
                commentTextarea.addEventListener('keydown', (ev) => {
                    const isEnter = ev.key === 'Enter';
                    const wantsSubmit = isEnter && ((ev.ctrlKey || ev.metaKey) || !ev.shiftKey);
                    if (wantsSubmit) {
                        ev.preventDefault();
                        commentForm.requestSubmit();
                    }
                });
            }
        }

        // Focus management
        setTimeout(() => {
            const heading = contentArea.querySelector('h2');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus();
            }

            // Update ARIA announcer
            const slideAnnouncer = document.getElementById('slide-announcer');
            if (slideAnnouncer && heading) {
                slideAnnouncer.textContent = `Slide ${slideIndex + 1} of ${totalSlides}: ${heading.textContent}`;
            }
        }, 600);
    }, 500);

    // Update UI
    slideCounter.textContent = `${slideIndex + 1} / ${totalSlides}`;
    prevBtn.disabled = slideIndex === 0;
    nextBtn.disabled = slideIndex === totalSlides - 1;

    updateDotNavigation(slideIndex);
    updateProgressBar();
    saveProgress();
}

function openAnnotationModal(contentNode, headingText = 'Slide annotations') {
    if (!annotationModal || !annotationModalBody) return;
    const headingEl = document.getElementById('annotation-modal-heading');
    if (headingEl) {
        headingEl.textContent = headingText;
    }
    annotationModalBody.innerHTML = '';
    annotationModalBody.appendChild(contentNode);
    annotationModal.removeAttribute('hidden');
    annotationModal.classList.add('open');
    document.body.classList.add('modal-open');

    if (annotationModalClose) {
        annotationModalClose.focus();
    }
}

function closeAnnotationModal() {
    if (!annotationModal || !annotationModalBody) return;
    annotationModal.classList.remove('open');
    annotationModal.setAttribute('hidden', '');
    annotationModalBody.innerHTML = '';
    const headingEl = document.getElementById('annotation-modal-heading');
    if (headingEl) {
        headingEl.textContent = 'Slide annotations';
    }
    document.body.classList.remove('modal-open');
}

// Make retakeQuiz globally accessible
window.retakeQuiz = function() {
    // Reset quiz progress
    const totalQuestions = quizSlideIndices.length;
    quizProgress = {
        currentQuizSlide: null,
        selectedAnswer: null,
        correctAnswers: 0,
        totalQuizQuestions: totalQuestions,
        quizAttempts: {},
        completedQuestions: new Set()
    };

    // Clear saved progress
    localStorage.removeItem('presentation1_quiz_progress');

    // Jump to first quiz slide
    const firstQuizSlide = quizSlideIndices[0];
    if (typeof firstQuizSlide === 'number') {
        currentSlide = firstQuizSlide;
    }
    renderSlide(currentSlide);
    updateURL();

    showNotification('Quiz restarted. Good luck!', { duration: 2000, variant: 'info' });
};

// ===== COMMENT HANDLING =====
function handleCommentSubmit(e) {
    if (e.target.classList.contains('comment-section-form')) {
        e.preventDefault();
        const btn = e.target.querySelector('.comment-submit-btn');
        if (!btn) return;

        const defaultLabel = btn.dataset.defaultLabel || btn.textContent?.trim() || 'Post Comment';
        const successLabel = btn.dataset.successLabel || 'Posted!';

        btn.dataset.defaultLabel = defaultLabel;
        btn.textContent = successLabel;
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');

        showNotification('Thank you for your comment!', { duration: 2200, variant: 'success' });

        setTimeout(() => {
            btn.textContent = defaultLabel;
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
        }, 2200);

        e.target.reset();
    }
}

// ===== FIREBASE COMMENT SYSTEM =====
async function handleCommentFormSubmit(e) {
    e.preventDefault();

    const commentText = document.getElementById('comment-text')?.value;
    const commentAuthor = document.getElementById('comment-author')?.value;

    if (!commentText || !commentAuthor) {
        showNotification('Please fill in all fields', { duration: 2000, variant: 'error' });
        return;
    }

    const submitBtn = e.target.querySelector('.comment-submit-btn');
    let restoreTimer = null;
    let restoreScheduled = false;

    const scheduleRestore = (delay = 0) => {
        if (!submitBtn) return;
        if (restoreTimer) {
            clearTimeout(restoreTimer);
            restoreTimer = null;
        }
        restoreScheduled = true;
        restoreTimer = setTimeout(() => {
            if (!submitBtn) return;
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.defaultLabel || 'Post Comment';
            submitBtn.removeAttribute('aria-busy');
            restoreScheduled = false;
            restoreTimer = null;
        }, delay);
    };

    if (submitBtn) {
        const defaultLabel = submitBtn.dataset.defaultLabel || submitBtn.textContent?.trim() || 'Post Comment';
        const loadingLabel = submitBtn.dataset.loadingLabel || 'Posting...';
        submitBtn.dataset.defaultLabel = defaultLabel;
        submitBtn.disabled = true;
        submitBtn.textContent = loadingLabel;
        submitBtn.setAttribute('aria-busy', 'true');
    }

    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        const commentData = {
            text: commentText.trim(),
            author: commentAuthor.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            presentationId: 'presentation-1',
            userId: currentUser?.uid || 'anonymous'
        };

        await firebase.firestore()
            .collection('comments')
            .add(commentData);

        showNotification('Comment posted successfully!', { duration: 2200, variant: 'success' });

        if (submitBtn) {
            const successLabel = submitBtn.dataset.successLabel || 'Posted!';
            submitBtn.textContent = successLabel;
            scheduleRestore(800);
        }

        // Reset form
        e.target.reset();

        // Reload comments
        setTimeout(() => loadComments(), 500);

    } catch (error) {
        appDevWarn('Failed to post comment:', error);
        showNotification('Failed to post comment. Please try again.', { duration: 3000, variant: 'error' });
        scheduleRestore(0);
    } finally {
        if (!restoreScheduled) {
            scheduleRestore(0);
        }
    }
}

async function loadComments() {
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;

    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            commentsContainer.innerHTML = '<p class="no-comments">Comments are currently unavailable.</p>';
            return;
        }

        // Avoid composite index requirement by not combining where + orderBy on different fields
        const snapshot = await firebase.firestore()
            .collection('comments')
            .where('presentationId', '==', 'presentation-1')
            .limit(50)
            .get();

        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort client-side by timestamp desc, tolerate missing timestamps
        comments = docs.sort((a, b) => {
            const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
            const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
            return tb - ta;
        });

        if (!comments.length) {
            commentsContainer.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        renderComments();

    } catch (error) {
        appDevWarn('Failed to load comments:', error);
        commentsContainer.innerHTML = '<p class="no-comments">Unable to load comments at this time.</p>';
    }
}

function renderComments() {
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;

    commentsContainer.innerHTML = comments.map(comment => `
        <div class="comment" role="article">
            <div class="comment-header">
                <p class="comment-author">${escapeHtml(comment.author)}</p>
                <span class="comment-score">Score: ${comment.quizScore || 'â€”'}</span>
            </div>
            <p class="comment-text">${escapeHtml(comment.text)}</p>
            <p class="comment-timestamp">${formatTimestamp(comment.timestamp)}</p>
        </div>
    `).join('');
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';

    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

        return date.toLocaleDateString();
    } catch (error) {
        return 'Recently';
    }
}

function announceToScreenReader(message) {
    const announcer = document.getElementById('slide-announcer');
    if (announcer) {
        announcer.textContent = message;
        setTimeout(() => announcer.textContent = '', 1000);
    }
}

// ===== CHATBOT =====
function initChatbot() {
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const chatWidget = document.getElementById('chat-widget');
    const closeChatButton = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    // Gracefully no-op if any required elements are missing
    if (!chatToggleButton || !chatWidget || !closeChatButton || !chatForm || !chatInput || !messagesContainer) {
        return;
    }

    chatToggleButton.addEventListener('click', () => {
        chatWidget.classList.toggle('visible');
        chatWidget.setAttribute('aria-hidden', !chatWidget.classList.contains('visible'));
        if (chatWidget.classList.contains('visible')) {
            chatInput.focus();
            trapFocus(chatWidget);
        }
    });

    closeChatButton.addEventListener('click', () => {
        chatWidget.classList.remove('visible');
        chatWidget.setAttribute('aria-hidden', 'true');
        chatToggleButton.focus();
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (userInput) {
            displayMessage(userInput, 'user');
            askAI(userInput);
            chatInput.value = '';
        }
    });

    function displayMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (sender === 'ai-loading') {
            messageElement.innerHTML = `<span></span><span></span><span></span>`;
        } else {
            messageElement.textContent = text;
        }

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageElement;
    }

    async function askAI(prompt) {
        const loadingElement = displayMessage('', 'ai-loading');

        // Simulate AI response
        await new Promise(resolve => setTimeout(resolve, 1500));

        let responseText = "That's an interesting question about creation ex nihilo. ";

        if (prompt.toLowerCase().includes('genesis')) {
            responseText = "Genesis 1 establishes God's absolute power in creation. Unlike pagan myths that depict gods working with pre-existing materials, the biblical account shows God creating everything from nothing by His word alone.";
        } else if (prompt.toLowerCase().includes('god')) {
            responseText = "The biblical concept of God as the Necessary Being is foundational. Unlike limited pagan gods, the God of Scripture is all-powerful, sovereign, and creates by His command rather than through conflict.";
        } else if (prompt.toLowerCase().includes('creation')) {
            responseText = "Creation ex nihilo (creation from nothing) was a revolutionary concept in the ancient world. It established God's complete authority over all reality and distinguished the biblical worldview from all others.";
        } else if (prompt.toLowerCase().includes('pagan')) {
            responseText = "Pagan creation myths typically involved multiple gods working with pre-existing chaos or matter. The biblical account of one God creating everything from nothing was a radical departure from these ancient worldviews.";
        } else {
            responseText += "The presentation emphasizes how the biblical concept of creation from nothing establishes God's absolute authority and distinguishes it from all other ancient creation stories.";
        }

        loadingElement.classList.remove('ai-loading');
        loadingElement.textContent = responseText;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// ===== CINEMATIC EFFECTS WITH WEB WORKER =====
let canvasWorker = null;
let particles = [];

function initCinematicEffects() {
    try {
        if (typeof cleanupCinematicEffects === 'function') {
            cleanupCinematicEffects();
            cleanupCinematicEffects = null;
        }
        const particleCanvas = document.getElementById('particleCanvas');
        const waveCanvas = document.getElementById('waveCanvas');

        if (!particleCanvas || !waveCanvas) {
            appDevWarn('Canvas elements not found');
            return;
        }

        const pctx = particleCanvas.getContext('2d');
        const wctx = waveCanvas.getContext('2d');

        if (!pctx || !wctx) {
            appDevWarn('Canvas context not supported');
            return;
        }

        // Setup
        const cores = Math.min(navigator.hardwareConcurrency || 4, 8);
        const baseQuality = cores >= 6 ? 'high' : cores >= 4 ? 'med' : 'low';
        const onMobileViewport = isMobileViewport();
        const quality = batterySaverEnabled ? 'low' : baseQuality;
        const baseParticleCount = quality === 'high' ? 60 : quality === 'med' ? 40 : 28;
        const particleCount = batterySaverEnabled ? Math.max(18, Math.round(baseParticleCount * 0.6)) : baseParticleCount;
        const waveLayers = batterySaverEnabled ? Math.max(3, (quality === 'high' ? 4 : 3)) : (quality === 'high' ? 5 : quality === 'med' ? 4 : 3);
        const targetFps = (batterySaverEnabled || (navigator.connection && navigator.connection.saveData) || onMobileViewport) ? 30 : 60;
        const frameInterval = 1000 / targetFps;
        let lastFrameTime = 0;

        function clampedDpr() {
            const limit = batterySaverEnabled ? 1.2 : (onMobileViewport ? 1.5 : 2);
            return Math.min(window.devicePixelRatio || 1, limit);
        }

        function sizeCanvases() {
            const dpr = clampedDpr();
            [particleCanvas, waveCanvas].forEach(canvas => {
                canvas.width = Math.floor(canvas.clientWidth * dpr);
                canvas.height = Math.floor(canvas.clientHeight * dpr);
            });
            pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Try to use Web Worker for particles
        try {
            // Only try to create Worker if we're on HTTP/HTTPS, not file://
            const isFileProtocol = window.location.protocol === 'file:';
            const useWorker = !isFileProtocol && typeof Worker !== 'undefined';
            
            if (useWorker) {
                canvasWorker = new Worker('canvas-worker.js');
            } else {
                throw new Error('Worker not available in file:// protocol');
            }

            canvasWorker.onmessage = function(e) {
                if (e.data.type === 'initialized' || e.data.type === 'updated') {
                    particles = e.data.particles;
                }
            };

            sizeCanvases();
            canvasWorker.postMessage({
                type: 'init',
                data: {
                    width: particleCanvas.clientWidth || 800,
                    height: particleCanvas.clientHeight || 600,
                    particleCount
                }
            });
        } catch (workerError) {
            // Silent fallback when Worker isn't available (common in file:// protocol)
            // Main thread particle animation works perfectly as fallback
            // Fallback: initialize particles on main thread
            const safeWidth = particleCanvas.clientWidth || 800;
            const safeHeight = particleCanvas.clientHeight || 600;
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * safeWidth,
                    y: Math.random() * safeHeight,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                    size: Math.random() * 1.5 + 0.5,
                    alpha: Math.random() * 0.5 + 0.2
                });
            }
        }

        let t = 0;
        let animationId;
        let running = true;

        function lerp(a, b, n) { return a + (b - a) * n; }

        // Pause cinematic canvas when it is off-screen or the tab is hidden
        const backgroundLayer = document.getElementById('background-layer');

        const resumeAnimation = () => {
            if (!running) {
                running = true;
                tick();
            }
        };

        const pauseAnimation = () => {
            if (running && animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
                running = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resumeAnimation();
            } else {
                pauseAnimation();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if ('IntersectionObserver' in window && backgroundLayer) {
            animationObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && document.visibilityState === 'visible') {
                        resumeAnimation();
                    } else {
                        pauseAnimation();
                    }
                });
            });

            animationObserver.observe(backgroundLayer);
        } else {
            // Fallback: always run the animation if IntersectionObserver is not available
            resumeAnimation();
        }

        // Cleanup function for animation
        function cleanupAnimation() {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (resizeRaf) {
                cancelAnimationFrame(resizeRaf);
                resizeRaf = null;
            }
            // Remove the resize event listener properly
            window.removeEventListener('resize', handleResize);

            if (animationObserver) {
                animationObserver.disconnect();
                animationObserver = null;
            }
        }

        // Fix resize handler to reference proper function
        function handleResize() {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                sizeCanvases();
                if (canvasWorker) {
                    canvasWorker.postMessage({
                        type: 'resize',
                        data: {
                            width: particleCanvas.clientWidth || 800,
                            height: particleCanvas.clientHeight || 600
                        }
                    });
                }
            });
        }

        // Add to global cleanup
        addCleanupFunction(cleanupAnimation);
        cleanupCinematicEffects = cleanupAnimation;
        cinematicBootstrapped = true;

        function drawParticles() {
            pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
            particles.forEach(p => {
                pctx.fillStyle = `rgba(177, 15, 26, ${p.alpha})`;
                pctx.beginPath();
                pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                pctx.fill();
            });
        }

        function updateParticlesMainThread() {
            const safeWidth = particleCanvas.clientWidth || 800;
            const safeHeight = particleCanvas.clientHeight || 600;
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > safeWidth || p.y < 0 || p.y > safeHeight) {
                    p.x = Math.random() * safeWidth;
                    p.y = Math.random() * safeHeight;
                }
            });
        }

        function drawWaves() {
            const w = waveCanvas.clientWidth;
            const h = waveCanvas.clientHeight;
            wctx.clearRect(0, 0, w, h);

            for (let i = 0; i < waveLayers; i++) {
                const amp = lerp(20, 80, i / (waveLayers - 1));
                const yBase = lerp(h * 0.4, h * 0.7, i / (waveLayers - 1));
                const speed = 0.0007 + i * 0.00015;
                const k = 0.002 + i * 0.0006;
                const cPhase = (Math.sin(t * 0.0008 + i) * 0.5 + 0.5);
                const r = Math.floor(lerp(255, 127, cPhase));
                const g = Math.floor(lerp(255, 10, cPhase));
                const b = Math.floor(lerp(255, 10, cPhase));

                wctx.beginPath();
                wctx.moveTo(0, yBase);
                for (let x = 0; x <= w; x += 5) {
                    const y = yBase + Math.sin(x * k + t * speed) * amp * Math.sin(t * 0.0005 + i);
                    wctx.lineTo(x, y);
                }
                wctx.lineTo(w, h);
                wctx.lineTo(0, h);
                wctx.closePath();
                wctx.fillStyle = `rgba(${r},${g},${b},${lerp(0.02, 0.1, i / (waveLayers - 1))})`;
                wctx.fill();
            }
            t += targetFps === 30 ? 20 : 16;
        }

        function tick(timestamp = 0) {
            if (targetFps < 60 && lastFrameTime && timestamp - lastFrameTime < frameInterval) {
                animationId = requestAnimationFrame(tick);
                return;
            }
            lastFrameTime = timestamp;
            // Update particles
            if (canvasWorker) {
                canvasWorker.postMessage({ type: 'update' });
            } else {
                updateParticlesMainThread();
            }

            drawParticles();
            drawWaves();
            animationId = requestAnimationFrame(tick);
        }

        function onVisibilityChange() {
            const visible = document.visibilityState === 'visible';
            if (!visible && running) {
                cancelAnimationFrame(animationId);
                running = false;
            } else if (visible && !running) {
                running = true;
                animationId = requestAnimationFrame(tick);
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange);

        let resizeRaf;
        window.addEventListener('resize', handleResize);

        sizeCanvases();
        animationId = requestAnimationFrame(tick);

    } catch (error) {
        console.error('Error initializing cinematic effects:', error);
    }
}












