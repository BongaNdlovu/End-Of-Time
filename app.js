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

function addCleanupFunction(fn) {
    cleanupFunctions.push(fn);
}

function cleanup() {
    cleanupFunctions.forEach(fn => {
        try {
            fn();
        } catch (error) {
            console.warn('Cleanup function failed:', error);
        }
    });
    cleanupFunctions = [];
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Lazy Loading State
const loadedImages = new Set();
const imageCache = new Map();

// DOM Elements
let contentLayer, backgroundElements, contentArea, prevBtn, nextBtn, slideCounter, notification, progressBar, progressSegments, fontControls, autoadvanceToggle, autoadvanceInterval;

// ===== INITIALIZATION =====
window.addEventListener('load', async () => {
    // Initialize DOM references
    initDOMReferences();

    // Load slides from JSON
    await loadSlides();

    // Initialize all features
    loadProgress();
    loadFromURL();
    initAccessibility();
    initDotNavigation();
    initTouchGestures();
    initShortcutsModal();
    initChatbot();
    initKeyboardShortcuts();

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

    // Event listeners
    prevBtn.addEventListener('click', goToPrevSlide);
    nextBtn.addEventListener('click', goToNextSlide);
    contentLayer.addEventListener('submit', handleCommentSubmit);
    
    // Progress bar click to jump
    if (progressSegments) {
        progressSegments.addEventListener('click', (e) => {
            const rect = progressSegments.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const segmentWidth = rect.width / totalSlides;
            const targetSlide = Math.floor(clickX / segmentWidth);
            if (targetSlide >= 0 && targetSlide < totalSlides) {
                goToSlide(targetSlide);
            }
        });
    }

    // Font size controls
    initFontSizeControls();

    // Auto-advance controls
    initAutoAdvance();
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
        segment.style.cursor = 'pointer';
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
        autoadvanceToggle.textContent = '⏸ Auto';
        autoadvanceToggle.classList.add('active');
        autoadvanceToggle.setAttribute('aria-pressed', 'true');
    } else {
        stopAutoAdvance();
        autoadvanceToggle.textContent = '▶ Auto';
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

// ===== LOAD SLIDES FROM JSON OR INLINE =====
async function loadSlides() {
    try {
        // Try to fetch from JSON file first (for development with server)
        const response = await fetch('slides.json');
        if (!response.ok) throw new Error('Failed to load slides');

        const data = await response.json();
        slides = data.slides;
        totalSlides = slides.length;

        // Clean console - no need for success messages in production
    } catch (error) {
        // v2.0 - Silently use offline slides when file:// protocol blocks JSON loading
        // Fallback to inline slides data for direct file opening
        slides = getInlineSlides();
        totalSlides = slides.length;
        
        showNotification('⭐ Presentation ready! Running in offline mode');
        console.log('🎓 Academy App v2.0 - Running clean offline mode');
    }
}

// ===== INLINE SLIDES DATA FOR OFFLINE MODE =====
function getInlineSlides() {
    return [
        {
            id: 1,
            bgImage: '../1.jpg',
            content: "<h1 class=\"gradient-title title-glow text-4xl md:text-5xl lg:text-6xl\">Genesis 1: <br>Unpacking the Deepest Ideas <br>in the Bible's First Sentence</h1>",
            notes: "2-3 minutes. Welcome! This presentation explores Genesis 1:1 as the **instruction manual for reality itself**. Set the tone for deep theological and philosophical exploration. *Emphasize the foundational nature* of this opening verse."
        },
        {
            id: 2,
            bgImage: '../2.jpg',
            content: "<h2>Have You Ever Read the First Sentence of the Bible?</h2><div class=\"verse-card\"><div class=\"verse-card-icon\">📖</div><div class=\"verse-card-content\">\"In the beginning God created the heaven and the earth.\"<span class=\"verse-card-reference\">— Genesis 1:1</span></div></div><p>It seems pretty straightforward, right? It sounds like the start of a story, setting the scene for everything that comes next.</p><p>But according to many thinkers, theologians, and philosophers, this single sentence is one of the most jam-packed, profound statements ever written. It's not just the start of a story; it's the <b>instruction manual for reality itself</b>.</p>",
            notes: "Introduction: Draw attention to the familiar verse. Frame it as more than narrative—it's foundational truth. Use the LEGO baseplate analogy if needed."
        },
        {
            id: 3,
            bgImage: '../3.jpg',
            content: "<h2>Thinking About What's Really Real (Metaphysics)</h2><p>Before we dive in, we need to understand one big word: <b>Metaphysics</b>.</p><p>Metaphysics asks the biggest questions of all:</p><ul><li>What is reality?</li><li>Why does anything exist at all, instead of just... nothing?</li><li>What does it mean \"to be\"?</li><li>What causes things to happen?</li></ul><p>Genesis 1:1 is a powerful metaphysical statement that divides all existence into two categories: <b>The Creator</b> (God) and <b>The Creation</b> (heaven and earth).</p>",
            notes: "Introduce metaphysics as the philosophical foundation. Make it accessible—this is thinking about the most fundamental questions of reality."
        },
        {
            id: 4,
            bgImage: '../4.jpg',
            content: "<h2>Two Kinds of Existence</h2><p>Philosophers sort everything that exists into two buckets:</p><div class=\"comparison-visual\"><div class=\"comparison-column\"><div class=\"comparison-title\">Contingent Beings</div><div class=\"comparison-item\">Things whose existence depends on something else</div><div class=\"comparison-item\">The \"needy\" stuff</div></div><div class=\"comparison-column\"><div class=\"comparison-title\">Necessary Being</div><div class=\"comparison-item\">Something that exists by its own power</div><div class=\"comparison-item\">Completely self-sufficient</div></div></div>",
            notes: "Lay out the fundamental metaphysical distinction between contingent and necessary beings. This framework is essential for everything that follows."
        },
        {
            id: 5,
            bgImage: '../5.jpg',
            content: "<h2>Bucket #1: Contingent Beings (The \"Needy\" Stuff)</h2><p>A <b>contingent being</b> is anything whose existence depends on something else.</p><p><b>A chair:</b> It depends on wood from a tree, nails, glue, and the carpenter who built it. The chair didn't pop into existence by itself.</p><p><b>You:</b> You depend on your parents, food, water, and air to exist.</p><p><b>The Earth:</b> It depends on the sun for heat and light, and gravity to stay in orbit.</p><p>The entire observable universe—every star, planet, galaxy, and atom—is <b>contingent</b>. Everything requires a cause or sustainer outside of itself.</p>",
            notes: "Give concrete examples: chair, you, Earth. Make contingency tangible and relatable. Everything we see is in the 'needy' bucket."
        },
        {
            id: 6,
            bgImage: '../6.jpg',
            content: "<h2>Bucket #2: The Necessary Being</h2><p>If everything is dependent, what does it all depend on? You can't have an endless chain of needy things.</p><p><b>The Domino Analogy:</b> Each domino falls because the one before it fell. But what knocked over the first domino?</p><p>Logically, there must be something that <b>isn't needy</b>—something that doesn't depend on anything else. Something completely independent, uncaused, and self-sufficient.</p><p>This is what philosophers call the <b>Necessary Being</b>. The God of Genesis 1 is this Necessary Being.</p>",
            notes: "Introduce necessary being with the domino analogy. Make it clear: the chain of dependency must end somewhere. That's God."
        },
        {
            id: 7,
            bgImage: '../7.jpg',
            content: "<h2>The Rules of Reality: Four Foundational Axioms</h2><p>An <b>axiom</b> is a starting point or basic rule—a self-evident truth you use as a foundation.</p><p>Genesis 1:1 presents four foundational axioms about reality. These aren't just religious beliefs; they're logical principles that make sense of existence itself.</p><p>Let's examine each axiom carefully.</p>",
            notes: "Transition to the four axioms. Define what an axiom is. Frame them as foundational truths that flow from Genesis 1:1."
        },
        {
            id: 8,
            bgImage: '../8.jpg',
            content: "<h2>Axiom 1: God is the Starting Point, Not the Conclusion</h2><p><i>\"In the beginning God...\"</i></p><p>Notice: Genesis doesn't <b>argue</b> for God's existence. It doesn't open with \"Evidence for God's Existence.\" It simply states: <b>\"In the beginning, God...\"</b></p><p>This is a massive philosophical move. It treats God's existence as the <b>ultimate axiom</b>—the starting rule for the whole game.</p><p>God isn't a conclusion we arrive at; He's the foundation we start from. He's the \"board\" upon which the entire game of reality is played.</p>",
            notes: "Axiom 1: God is presupposed, not proven. He's the precondition for all reasoning. This is presuppositional apologetics in biblical form."
        },
        {
            id: 9,
            bgImage: '../9.png',
            content: "<h2>Axiom 2: You Can't Get Something from Absolute Nothing</h2><p><i>Ex nihilo nihil fit</i> — \"Out of nothing, nothing comes.\"</p><p>Absolute nothingness has no matter, no energy, no laws, no potential. It's the complete absence of existence. It can't do anything because it <b>isn't</b> anything.</p><p>Three possibilities for the universe's origin:</p><p>1. <b>Created itself?</b> Impossible—it would need to exist before it existed.<br>2. <b>Always existed?</b> Science says no (Second Law of Thermodynamics).<br>3. <b>Created by something outside itself?</b> This is the only option left.</p>",
            notes: "Axiom 2: Ex nihilo nihil fit principle. Walk through the three logical options. Only external creation by a Necessary Being makes sense."
        },
        {
            id: 10,
            bgImage: '../10.jpg',
            content: "<h2>Axiom 3: The Universe Can't Hold Itself Together</h2><p>The universe is clearly <b>\"needy\"</b> (contingent), not self-sufficient. It needed a creator to start it <b>and</b> needs a sustainer to keep it going.</p><p><b>Composition:</b> Made of parts (cells, atoms) that must be arranged correctly.<br><b>Change:</b> Always changing, expanding, decaying—requires an outside force.<br><b>Beginning:</b> Anything that begins to exist is dependent on its cause.<br><b>Entropy:</b> The universe is \"running down\" like a wind-up toy, losing usable energy.</p><p>The universe can't pull itself up by its own bootstraps.</p>",
            notes: "Axiom 3: Four reasons the universe is contingent—composition, change, beginning, entropy. Each points to need for an external sustainer."
        },
        {
            id: 11,
            bgImage: '../11.jpg',
            content: "<h2>Axiom 4: The Universe Needs Constant Support</h2><p><b>The Doctrine of Divine Concurrence:</b> God didn't just create the universe and walk away. Without God's active, continuous power, it would instantly cease to exist.</p><p>The universe is NOT like a building (built once, stands alone).<br>The universe IS like a song (only exists while the singer is singing).</p><p><b>Hebrews 1:3:</b> \"...upholding all things by the word of his power.\"<br><b>Colossians 1:17:</b> \"...in him all things consist.\"</p><p>Your existence right now is a direct, moment-by-moment gift of God's sustaining power.</p>",
            notes: "Axiom 4: Divine concurrence—God's continuous sustaining activity. Use the song analogy. God is the cosmic glue holding everything together."
        },
        {
            id: 12,
            bgImage: '../12.jpg',
            content: "<h2>Takeaway #1: Goodbye to the \"Clockmaker God\" (Rejection of Deism)</h2><p><b>Deism</b> says God is like a cosmic clockmaker—He built the clock, wound it up, and stepped back. He's retired and uninvolved.</p><p>But Genesis 1:1 and the four axioms show this can't be true.</p><p>God isn't a distant, retired creator. He is an <b>ever-present, active Sustainer</b> intimately involved with every atom of His creation at every moment.</p>",
            notes: "Takeaway: Reject deism. God is not an absentee landlord. He's actively sustaining everything right now, this very second."
        },
        {
            id: 13,
            bgImage: '../13.jpg',
            content: "<h2>Takeaway #2: Hello to a Purposeful Universe (Evidence of Intelligent Design)</h2><p>If the universe is a continuous thought in the mind of God (not a machine running on its own), what would we expect to find?</p><p>We'd expect <b>incredible order</b>, deep mathematical patterns, and complex information—the hallmarks of a rational Mind.</p><p>From the laws of physics to the genetic code in DNA, the cosmos appears less like a random accident and more like a <b>purposeful, intelligent design</b>.</p>",
            notes: "Takeaway: Intelligent design flows from Genesis 1:1. Order, laws, information—all point to a rational, purposeful Creator, not blind chance."
        },
        {
            id: 14,
            bgImage: '../14.jpg',
            content: "<h2>What This Means for You</h2><p>Genesis 1:1 isn't just an opening line. It's the key that unlocks the nature of reality—a world not only created by God but continuously held in existence by Him every single second.</p><p><b>Your existence right now</b> is not a leftover effect from a long-ago creation. It is a direct, continuous, moment-by-moment gift of God's sustaining power.</p><p>You are held in being by the Necessary Being. Your life has purpose, meaning, and a foundation that transcends the material world.</p>",
            notes: "3-4 minutes. Application: Bring it personal. Your life right now is **sustained by God**. This isn't abstract—it's *deeply personal and immediate*. TRANSITION: Invite them to reflect and share their thoughts in the final activity."
        },
        {
            id: 15,
            bgImage: '../15.jpg',
            content: "<h2>Share Your Thoughts</h2><p>What did you learn from this presentation? How does understanding Genesis 1:1 change your perspective on God, the universe, and your place in it?</p><form class=\"comment-section-form\"><textarea class=\"comment-textarea\" placeholder=\"Write your comment here...\" rows=\"4\" required aria-label=\"Your comment\"></textarea><div class=\"comment-form-row\"><input type=\"text\" class=\"comment-input\" placeholder=\"Your Name\" required aria-label=\"Your name\"><button type=\"submit\" class=\"comment-submit-btn\">Post Comment</button></div></form><div class=\"comments-display\"><div class=\"comment\"><p class=\"comment-author\">David M.</p><p class=\"comment-text\">The domino analogy and the song analogy completely changed how I understand God's relationship to creation. Mind-blowing!</p></div><div class=\"comment\"><p class=\"comment-author\">Jennifer L.</p><p class=\"comment-text\">I never realized how much philosophy was packed into Genesis 1:1. This gives me so much to think about!</p></div></div>",
            notes: "Final slide: Interactive comment section. Encourage reflection, discussion, and personal response to the material."
        }
    ];
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

// ===== PRESENTATION STARTUP =====
async function startPresentation() {
    // Hide skeleton loader
    const skeletonLoader = document.querySelector('.skeleton-loader');

    // Initialize progress bar
    initProgressBar();

    // Load images for initial slides
    await lazyLoadImages(currentSlide);

    setTimeout(() => {
        if (skeletonLoader) {
            skeletonLoader.classList.add('hidden');
            setTimeout(() => skeletonLoader.remove(), 500);
        }

        renderSlide(currentSlide);

        // Initialize cinematic effects if reduced motion is not preferred
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!prefersReducedMotion.matches) {
            initCinematicEffects();
        }
    }, 300);
}

// ===== SLIDE RENDERING =====
async function renderSlide(slideIndex) {
    if (!slides[slideIndex]) return;

    const slide = slides[slideIndex];

    // Lazy load surrounding images
    lazyLoadImages(slideIndex);

    // Update background
    const nextBgIndex = (currentBgIndex + 1) % 2;
    backgroundElements[currentBgIndex].classList.remove('active');
    
    // Try to load image, fallback to gradient background if image fails
    const bgElement = backgroundElements[nextBgIndex];
    bgElement.style.backgroundImage = `url(${slide.bgImage})`;
    bgElement.style.backgroundColor = '#0b0b0c'; // Fallback background color
    
    bgElement.classList.add('active');
    currentBgIndex = nextBgIndex;

    // Transition content
    const oldContent = contentArea.querySelector('.slide-content');
    if (oldContent) oldContent.classList.remove('visible');

    setTimeout(() => {
        contentArea.innerHTML = `<div class="slide-content">${slide.content}</div>`;
        const newContent = contentArea.querySelector('.slide-content');
        void newContent.offsetWidth; // Force reflow
        newContent.classList.add('visible');
        contentLayer.scrollTop = 0;

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

    saveProgress();
}

// ===== NAVIGATION FUNCTIONS =====
function goToNextSlide() {
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

// ===== DOT NAVIGATION =====
function initDotNavigation() {
    const dotsContainer = document.querySelector('.slide-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';

    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.classList.add('dot');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
        if (i === currentSlide) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }
}

function updateDotNavigation(slideIndex) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index === slideIndex) {
            dot.classList.add('active');
            dot.setAttribute('aria-selected', 'true');
        } else {
            dot.classList.remove('active');
            dot.setAttribute('aria-selected', 'false');
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
                <span class="timing-indicator">⏱ ${timingText}</span>
            </div>
            <p>${processedNotes}</p>
        `;
    } else {
        notesContent.innerHTML = `
            <div class="speaker-note-meta">
                <span>Slide ${slideIndex + 1}</span>
                <span class="timing-indicator">⏱ Self-paced</span>
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
        thumb.addEventListener('click', () => exitOverviewToSlide(index));
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
}

// ===== LOCAL STORAGE =====
function saveProgress() {
    try {
        localStorage.setItem('academy-last-slide', currentSlide);
        localStorage.setItem('academy-timer-start', timerStartTime);
    } catch (e) {
        console.warn('Could not save progress:', e);
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
        console.warn('Could not load progress:', e);
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
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err);
            showNotification('Fullscreen mode not available');
        });
    } else {
        document.exitFullscreen();
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
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ===== COMMENT HANDLING =====
function handleCommentSubmit(e) {
    if (e.target.classList.contains('comment-section-form')) {
        e.preventDefault();
        const btn = e.target.querySelector('.comment-submit-btn');
        btn.textContent = 'Posted!';
        btn.disabled = true;

        showNotification('Thank you for your comment!');

        setTimeout(() => {
            btn.textContent = 'Post Comment';
            btn.disabled = false;
        }, 2000);

        e.target.reset();
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
        const particleCanvas = document.getElementById('particleCanvas');
        const waveCanvas = document.getElementById('waveCanvas');

        if (!particleCanvas || !waveCanvas) {
            console.warn('Canvas elements not found');
            return;
        }

        const pctx = particleCanvas.getContext('2d');
        const wctx = waveCanvas.getContext('2d');

        if (!pctx || !wctx) {
            console.warn('Canvas context not supported');
            return;
        }

        // Setup
        const cores = Math.min(navigator.hardwareConcurrency || 4, 8);
        const quality = cores >= 6 ? 'high' : cores >= 4 ? 'med' : 'low';
        const particleCount = quality === 'high' ? 60 : quality === 'med' ? 40 : 28;
        const waveLayers = quality === 'high' ? 5 : quality === 'med' ? 4 : 3;

        function clampedDpr() { return Math.min(window.devicePixelRatio || 1, 2); }

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

        // Cleanup function for animation
        function cleanupAnimation() {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (resizeRaf) {
                cancelAnimationFrame(resizeRaf);
                resizeRaf = null;
            }
            // Remove the resize event listener properly
            window.removeEventListener('resize', handleResize);
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
            t += 16;
        }

        function tick() {
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
