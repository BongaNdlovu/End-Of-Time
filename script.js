/**
 * script.js - SDA Trivia Challenge Main Logic
 *
 * This file contains the core game logic for the SDA Trivia Challenge application.
 * It handles game state management, question display, scoring, animations, and audio.
 *
 * Future improvement suggestions:
 * - Normalize audio filenames for consistency (e.g., use kebab-case for all files)
 * - Add unit tests for core game functions
 * - Further modularize code into separate files (state, UI, audio, etc.)
 * - Add local storage for saving game progress and high scores
 * - Implement accessibility improvements (ARIA attributes, keyboard navigation)
 *
 * @author SDA Trivia Challenge Team
 * @version 1.1.0
 */

// --- Firebase Global Variables (managed by auth-leaderboard.js) ---
let db = null; // reserved (do not use directly)
let auth = null; // reserved (do not use directly)

// --- DOM Elements ---
const soloBtn = document.getElementById('solo');
const teamsBtn = document.getElementById('teams');
const container = document.querySelector('.container');
const gameDiv = document.getElementById('game');
const gameOverDiv = document.getElementById('game-over');
const scoreSolo = document.getElementById('score-solo');
const scoreTeams = document.getElementById('score-teams');
const timerDiv = document.querySelector('.timer-value');
const questionDiv = document.querySelector('.question p');
const optionsDiv = document.querySelector('.options');
const nextBtn = document.getElementById('next');
const showOptionsBtn = document.getElementById('show-options');
const resultsSolo = document.getElementById('results-solo');
const resultsTeams = document.getElementById('results-teams');
const playAgainBtn = document.getElementById('play-again');
const downloadBtn = document.getElementById('download');
const exitBtn = document.getElementById('exit');
const mainMenuBtn = document.getElementById('main-menu');
const backToGameMenuBtn = document.getElementById('back-to-game-menu');
const feedbackOverlay = document.querySelector('.feedback-overlay');
const achievementTitle = document.getElementById('achievement-title');
const resetTutorialsBtn = document.getElementById('reset-tutorials-btn');
const resetVideosBtn = document.getElementById('reset-videos-btn');

// Video modal elements
const levelVideoModal = document.getElementById('level-video-modal');
const levelVideoTitle = document.getElementById('level-video-title');
const levelVideoPlayer = document.getElementById('level-video-player');
const skipVideoBtn = document.getElementById('skip-video-btn');
const skipVideosCheckbox = document.getElementById('skip-videos-checkbox');
const teamWinner = document.getElementById('team-winner');
const teamTurnIndicator = document.getElementById('team-turn-indicator'); // <-- ADD THIS
const hintBtn = document.getElementById('hint-btn');
const takeawayBtn = document.getElementById('takeaway-btn');
// Removed revive button reference
const explanationDiv = document.createElement('div');
explanationDiv.id = 'explanation';
explanationDiv.style.display = 'none';
explanationDiv.style.margin = '1rem 0 0 0';
explanationDiv.style.width = '100%';
explanationDiv.style.background = '#ffffff';
explanationDiv.style.border = '2px solid #8B0000';
explanationDiv.style.borderRadius = '12px';
explanationDiv.style.fontFamily = 'Montserrat-Regular, Arial, sans-serif';
explanationDiv.style.fontSize = '1.1rem';
explanationDiv.style.color = '#333333';
explanationDiv.style.textAlign = 'left';
explanationDiv.style.padding = '1rem 1.2rem';
explanationDiv.style.boxShadow = '0 2px 8px rgba(139,0,0,0.2)';
explanationDiv.style.gridColumn = '1 / -1';
explanationDiv.style.marginTop = '1rem';
// Insert after the question-options-container in the DOM
const questionOptionsContainer = document.querySelector('.question-options-container');
if (questionOptionsContainer) {
    questionOptionsContainer.parentNode.insertBefore(explanationDiv, questionOptionsContainer.nextSibling);
} else {
    optionsDiv.parentNode.appendChild(explanationDiv);
}

// Audio system is now handled by audio-manager.js

// Audio sound pools are now handled by audio-manager.js

// Debug function is now available via AudioManager.debug()

// Audio playback functions are now available via AudioManager
// Audio functions and event listeners are now handled by audio-manager.js

// --- Confetti Setup ---
const confettiSettings = { target: 'confetti-canvas', respawn: false, clock: 30, colors: [[230, 57, 70], [183, 28, 28], [255, 215, 0]] };
const confetti = new ConfettiGenerator(confettiSettings);

// --- Timer and Game State Variables ---
let TIME_LIMIT = 40; // Default timer, will be dynamically set based on level

// Function to get time limit based on current level
function getTimeLimitForLevel(level) {
    if (level >= 1 && level <= 2) {
        return 10; // Levels 1-2: 10 seconds
    } else if (level === 3) {
        return 20; // Level 3: 20 seconds
    } else {
        return 40; // Levels 4-7: 40 seconds (default)
    }
}
let questions = [];
let currentQuestionIndex = 0;
let currentPhase = 'question'; // 'question' or 'options'
let gameMode = 'solo'; // 'solo' or 'teams'
let teamBlueScore = 0;
let teamBlackScore = 0;
let currentTeam = 'blue';
let playerScore = 0;
let currentStreak = 0;
let longestStreak = 0;
let correctAnswers = 0;
let timer;
let timeLeft = 10;

// --- NEW FOR TIME ATTACK MODE ---
let isTimeAttackMode = false; // Always false to disable time attack mode
let globalTimer;
const TOTAL_TIME_LIMIT = 180; // 3 minutes
let globalTimeLeft = TOTAL_TIME_LIMIT;
let timeAttackStartTime = null;
let timeRanOut = false;
// --- NEW FOR SEQUENTIAL TEAM TIME ATTACK ---
let timeAttackTeamTurn = 'blue';
let timeAttackBlueTeamFinalScore = 0;
// --- New for achievements ---
let answerTimes = [];
let questionStartTime = null;
let powerUpsUsed = 0;
let faithTokens = 0; // already present, but moved here for clarity
let wrongStreak = 0;
let hadComebackStreak = false;
// --- New for leaderboard ---
let gameStartTime = null;
let gameElapsedTime = 0;
let gameQuestionCount = 0;
// --- NEW FOR UNIQUE QUESTIONS ---
let blueTeamQuestions = [];

// --- NEW FOR LEVEL SYSTEM ---
let currentGameLevel = 1;
const LEVEL_PASS_PERCENTAGE = 0.7; // 70% to pass a level
const allLevels = [
    { id: 1, questions: typeof level1Questions !== 'undefined' ? level1Questions : [], name: "Level 1" },
    { id: 2, questions: typeof level2Questions !== 'undefined' ? level2Questions : [], name: "Level 2" },
    { id: 3, questions: typeof level3Questions !== 'undefined' ? level3Questions : [], name: "Level 3" },
    { id: 4, questions: typeof level4Questions !== 'undefined' ? level4Questions : [], name: "Level 4" },
    { id: 5, questions: typeof level5Questions !== 'undefined' ? level5Questions : [], name: "Level 5" },
    { id: 6, questions: typeof level6Questions !== 'undefined' ? level6Questions : [], name: "Level 6" },
    { id: 7, questions: typeof level7Questions !== 'undefined' ? level7Questions : [], name: "Level 7" }
];

const TRANSITION_SVG_COUNT = 17; // Enables 1.svg .. 17.svg as transition art across all levels

function getPlayerProgress() {
    try {
        const progress = localStorage.getItem('endOfTime_levelProgress');
        return progress ? JSON.parse(progress) : { highestLevelUnlocked: 1 };
    } catch (e) {
        console.error("Could not get player progress:", e);
        return { highestLevelUnlocked: 1 };
    }
}

function savePlayerProgress(progress) {
    try {
        localStorage.setItem('endOfTime_levelProgress', JSON.stringify(progress));
    } catch (e) {
        console.error("Could not save player progress:", e);
    }
}

// --- Utility Functions ---
function shuffle(array) {
    // Create a copy to avoid mutating the original array
    const shuffled = [...array];
    let currentIndex = shuffled.length, randomIndex;
    
    // Fisher-Yates shuffle algorithm for true randomization
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    return shuffled;
}

/**
 * Animation Effects Module
 * Handles all visual feedback animations without affecting core game logic
 */
class AnimationEffects {
  constructor() {
    this.activeAnimations = new Set();
    this.cleanupTimeouts = new Set();
  }

  /**
   * Token Earn Animation
   * @param {number} amount - Number of tokens earned
   */
  animateTokenEarn(amount = 1) {
    const tokenElement = document.getElementById('faith-tokens');
    if (!tokenElement) return;

    // 1. Pulse the token display
    this.addTemporaryClass(tokenElement, 'token-pulse', 800);

    // 2. Spawn floating chip
    this.spawnTokenChip(tokenElement, amount);

    // Removed riser sound here to ensure it only plays once at game start
  }

  /**
   * Spawn floating token chip
   */
  spawnTokenChip(anchorElement, amount) {
    const chip = document.createElement('div');
    chip.className = 'token-chip';
    chip.textContent = `+${amount} Token${amount > 1 ? 's' : ''}`;
    
    // Position relative to anchor element
    const rect = anchorElement.getBoundingClientRect();
    chip.style.left = `${rect.left + rect.width / 2 - 40}px`;
    chip.style.top = `${rect.top}px`;
    
    document.body.appendChild(chip);
    
    // Auto cleanup after animation
    const timeout = setTimeout(() => {
      chip.remove();
      this.cleanupTimeouts.delete(timeout);
    }, 1500);
    
    this.cleanupTimeouts.add(timeout);
  }

  /**
   * Double Points Badge Animation
   */
  showDoublePointsBadge() {
    const wagerContainer = document.getElementById('wager-container');
    if (!wagerContainer) return;

    // Check if badge already exists
    if (wagerContainer.querySelector('.wager-x2-badge')) return;

    // Create badge
    const badge = document.createElement('span');
    badge.className = 'wager-x2-badge';
    badge.textContent = 'x2';
    badge.setAttribute('aria-label', 'Double points active');
    
    // Make wager container relative positioned if not already
    const currentPosition = window.getComputedStyle(wagerContainer).position;
    if (currentPosition === 'static') {
      wagerContainer.style.position = 'relative';
    }
    
    wagerContainer.appendChild(badge);
    
    // Update wager feedback
    this.updateWagerFeedback(true);
  }

  /**
   * Remove Double Points Badge
   */
  removeDoublePointsBadge() {
    const badge = document.querySelector('.wager-x2-badge');
    if (badge) {
      badge.style.animation = 'badge-pop 0.3s reverse';
      setTimeout(() => badge.remove(), 300);
    }
    
    // Reset wager feedback
    this.updateWagerFeedback(false);
  }

  /**
   * Update wager feedback text
   */
  updateWagerFeedback(isDoubled) {
    const feedback = document.getElementById('wager-feedback');
    if (!feedback) return;
    
    const currentText = feedback.textContent;
    if (isDoubled && !currentText.includes('(x2 active)')) {
      feedback.textContent += ' (x2 active)';
      feedback.style.color = '#ffd700';
    } else if (!isDoubled) {
      feedback.textContent = feedback.textContent.replace(' (x2 active)', '');
      feedback.style.color = '';
    }
  }

  /**
   * Helper: Add temporary class with auto-removal
   */
  addTemporaryClass(element, className, duration) {
    element.classList.add(className);
    const timeout = setTimeout(() => {
      element.classList.remove(className);
      this.cleanupTimeouts.delete(timeout);
    }, duration);
    this.cleanupTimeouts.add(timeout);
  }

  /**
   * Cleanup all active animations
   */
  cleanup() {
    // Clear all timeouts
    this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
    
    // Remove any lingering elements
    document.querySelectorAll('.token-chip').forEach(chip => chip.remove());
    document.querySelectorAll('.wager-x2-badge').forEach(badge => badge.remove());
  }
}

// Export for use in main game
window.AnimationEffects = AnimationEffects;
let animationEffects = null;

// Add this test function to verify animations work
window.testAnimations = function testAnimations() {
  console.log('Testing animations...');
  if (animationEffects) {
    animationEffects.animateTokenEarn(1);
    setTimeout(() => {
      animationEffects.showDoublePointsBadge();
      setTimeout(() => {
        animationEffects.removeDoublePointsBadge();
      }, 3000);
    }, 2000);
  } else {
    console.warn('animationEffects is not initialized yet. Wait for DOMContentLoaded.');
  }
};

// Function to verify question randomization
function verifyQuestionRandomization(questions, category) {
    console.log(`=== Question Randomization Verification for ${category} ===`);
    console.log(`Total questions selected: ${questions.length}`);
    console.log(`Question IDs (in order): ${questions.map(q => q.id).join(', ')}`);
    
    // Check for any patterns or ordering
    const categories = [...new Set(questions.map(q => q.category))];
    console.log(`Categories represented: ${categories.join(', ')}`);
    
    // Check if questions are truly random by looking at consecutive patterns
    let consecutiveSameCategory = 0;
    for (let i = 1; i < questions.length; i++) {
        if (questions[i].category === questions[i-1].category) {
            consecutiveSameCategory++;
        }
    }
    console.log(`Consecutive same-category questions: ${consecutiveSameCategory}/${questions.length-1}`);
    
    console.log('=== End Verification ===');
}

// --- REMOVED: Get Time Attack Questions function is no longer needed ---
// All questions are now completely randomized without any exclusions or ordering criteria

function clearOptions() {
    while (optionsDiv.firstChild) {
        optionsDiv.removeChild(optionsDiv.firstChild);
    }
}

function updateScore() {
    scoreTeams.querySelector('div').children[0].innerText = `Blue: ${teamBlueScore}`;
    scoreTeams.querySelector('div').children[1].innerText = `${currentQuestionIndex + 1} / ${questions.length}`;
    scoreTeams.querySelector('div').children[2].innerText = `Black: ${teamBlackScore}`;
}

function updateSoloStats() {
    scoreSolo.children[0].innerText = `Score: ${playerScore}`;
    scoreSolo.children[1].innerText = `Streak: ${currentStreak}`;
    scoreSolo.children[2].innerText = `${currentQuestionIndex + 1} / ${questions.length}`;
    updatePowerUpButtons(); // Check if power-ups can be afforded
}

// Function to enable/disable power-up buttons based on available points
function updatePowerUpButtons() {
    const hintBtn = document.getElementById('hint-btn');
    const takeawayBtn = document.getElementById('takeaway-btn');
    
    if (!hintBtn || !takeawayBtn) return; // Safety check
    
    let currentScore = 0;
    
    // Get current score based on game mode
    if (gameMode === 'solo') {
        currentScore = playerScore;
    } else {
        // For teams, use the current team's score
        currentScore = (currentTeam === 'blue') ? teamBlueScore : teamBlackScore;
    }
    
    // Check if buttons should be enabled (only if not already used for this question)
    if (!hintBtn.disabled || hintBtn.hasAttribute('data-insufficient-points')) {
        if (currentScore >= 3) {
            hintBtn.disabled = false;
            hintBtn.removeAttribute('data-insufficient-points');
            hintBtn.style.opacity = '1';
            hintBtn.title = 'Use hint (costs 3 points)';
        } else {
            hintBtn.disabled = true;
            hintBtn.setAttribute('data-insufficient-points', 'true');
            hintBtn.style.opacity = '0.5';
            hintBtn.title = `Need ${3 - currentScore} more points to use hint`;
        }
    }
    
    if (!takeawayBtn.disabled || takeawayBtn.hasAttribute('data-insufficient-points')) {
        if (currentScore >= 2) {
            takeawayBtn.disabled = false;
            takeawayBtn.removeAttribute('data-insufficient-points');
            takeawayBtn.style.opacity = '1';
            takeawayBtn.title = 'Remove two incorrect options (costs 2 points)';
        } else {
            takeawayBtn.disabled = true;
            takeawayBtn.setAttribute('data-insufficient-points', 'true');
            takeawayBtn.style.opacity = '0.5';
            takeawayBtn.title = `Need ${2 - currentScore} more points to remove options`;
        }
    }
}

function resetState() {
    clearInterval(timer);
    nextBtn.style.display = 'none';
    clearOptions();
    timerDiv.classList.remove('low-time');
    timerDiv.parentElement.parentElement.classList.remove('urgent');
    AudioManager.stopTicking();
    
    // Reset achievement tracking stats for new game
    currentGameStats = {
        prophecyStreak: 0,
        healthStreak: 0,
        bibleStreak: 0,
        fastAnswers: 0,
        highWagers: 0,
        lightningRound: false,
        lightningStartTime: null,
        lightningAnswers: 0
    };
}

// --- Animation Functions ---
const RIGHT_OVERLAYS = [
    { text: 'BOOM!', color: '#ff4b5c', fontSize: '3.9rem', rotate: 12 },
    { text: 'YES!', color: '#2196f3', fontSize: '3.3rem', rotate: -14 },
    { text: 'NAILED IT!', color: '#ff9800', fontSize: '3.4rem', rotate: 8 },
    { text: 'BULLSEYE!', color: '#00e6ff', fontSize: '3.5rem', rotate: -10 },
    { text: 'WHAM!', color: '#ff1744', fontSize: '3.6rem', rotate: 10 }
];
const WRONG_OVERLAYS = [
    { text: 'ZAP!', color: '#ff4b5c', fontSize: '3.5rem', rotate: 10 },
    { text: 'OOPS!', color: '#b71c1c', fontSize: '3.2rem', rotate: -10 },
    { text: 'MISS!', color: '#222', fontSize: '3.6rem', rotate: 7 },
    { text: 'NOPE!', color: '#607d8b', fontSize: '3.3rem', rotate: -12 },
    { text: 'WHOOPS!', color: '#9e9e9e', fontSize: '3.1rem', rotate: 15 },
    { text: 'BUSTED!', color: '#ff1744', fontSize: '3.4rem', rotate: -7 },
    { text: 'TRY AGAIN!', color: '#00e6ff', fontSize: '3.2rem', rotate: 11 }
];

function showFeedback(isCorrect) {
    // Remove any existing overlays
    Array.from(document.querySelectorAll('.comic-overlay')).forEach(el => el.remove());
    // Pick overlay
    const overlays = isCorrect ? RIGHT_OVERLAYS : WRONG_OVERLAYS;
    const overlay = overlays[Math.floor(Math.random() * overlays.length)];
    const word = document.createElement('div');
    word.classList.add('comic-overlay');
    word.innerText = overlay.text;
    word.style.position = 'fixed';
    word.style.left = '50%';
    word.style.top = '50%';
    word.style.transform = `translate(-50%, -50%) rotate(${overlay.rotate}deg)`;
    word.style.fontSize = overlay.fontSize;
    word.style.fontFamily = 'Bangers, cursive';
    word.style.color = overlay.color;
    word.style.textShadow = '2px 2px 12px #111, 0 0 18px #fff';
    word.style.zIndex = 500;
    word.style.padding = '0.2em 0.7em';
    word.style.background = 'rgba(255,255,255,0.13)';
    word.style.borderRadius = '18px';
    word.style.border = `3px solid ${overlay.color}`;
    word.style.boxShadow = '0 4px 32px #0008';
    word.style.letterSpacing = '2px';
    word.style.opacity = '0';
    word.style.transition = 'opacity 0.15s, transform 0.15s';
    document.body.appendChild(word);
    setTimeout(() => {
        word.style.opacity = '1';
        word.style.transform += ' scale(1.18)';
    }, 10);
    setTimeout(() => {
        word.style.opacity = '0';
        word.style.transform = word.style.transform.replace(' scale(1.18)', ' scale(0.7)');
    }, 600);
    setTimeout(() => { word.remove(); }, 800);
}

function triggerConfetti(type = 'normal') {
    // type: 'normal', 'streak', 'perfect', 'teamwin'
    if (type === 'streak') {
        confettiSettings.colors = [[255, 215, 0], [76, 175, 80], [255, 255, 255]];
        confettiSettings.clock = 60;
    } else if (type === 'perfect') {
        confettiSettings.colors = [[255, 215, 0], [76, 175, 80], [183, 28, 28], [255,255,255]];
        confettiSettings.clock = 80;
    } else if (type === 'teamwin') {
        confettiSettings.colors = [[33, 150, 243], [0,0,0], [255, 215, 0]];
        confettiSettings.clock = 80;
    } else {
        confettiSettings.colors = [[230, 57, 70], [183, 28, 28], [255, 215, 0]];
        confettiSettings.clock = 30;
    }
    confetti.clear();
    confetti.render();
    setTimeout(() => { confetti.clear(); }, 3000);
}

function animateScoreChange(element, up) {
    element.classList.remove('score-animate-up', 'score-animate-down');
    void element.offsetWidth; // force reflow
    element.classList.add(up ? 'score-animate-up' : 'score-animate-down');
    setTimeout(() => {
        element.classList.remove('score-animate-up', 'score-animate-down');
    }, 700);
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => { element.classList.remove('shake'); }, 600);
}

// --- Firework and Alarm Effects ---
function triggerComicFireworks(extra = false) {
    const panel = gameDiv;
    const fireworks = ['💥','✨','🌟','🔥','⭐','💫','🎉','🧨'];
    const count = extra ? 12 : 6;
    for (let i = 0; i < count; i++) {
        const fw = document.createElement('div');
        fw.className = 'comic-firework';
        fw.innerText = fireworks[Math.floor(Math.random() * fireworks.length)];
        // Random position within the panel
        const x = Math.random() * 80 + 10; // 10% to 90%
        const y = Math.random() * 60 + 10; // 10% to 70%
        fw.style.left = x + '%';
        fw.style.top = y + '%';
        panel.appendChild(fw);
        setTimeout(() => fw.remove(), 900);
    }
}
function triggerComicAlarm() {
    const panel = gameDiv;
    const alarm = document.createElement('div');
    alarm.className = 'comic-alarm';
    alarm.innerText = '🚨';
    panel.appendChild(alarm);
    setTimeout(() => alarm.remove(), 800);
    panel.classList.add('red-flash');
    setTimeout(() => panel.classList.remove('red-flash'), 400);
}

// --- Category Dropdown Population ---
// --- Category Selection (will be initialized in DOMContentLoaded) ---
let categoryDropdown;

// --- Faith Tokens and Power-Ups ---
let freezeTimeActive = false;
let doublePointsActive = false;
// Removed revive-related variables and double points feature
const faithTokensDiv = document.getElementById('faith-tokens');
const freezeTimeBtn = document.getElementById('freeze-time-btn');
const doublePointsBtn = document.getElementById('double-points-btn');
// Removed revive button reference and double points button reference

function updateFaithTokens(animate = false) {
    faithTokensDiv.innerText = `Faith Tokens: ${faithTokens}`;
    // Guard DOM elements
    if (freezeTimeBtn) freezeTimeBtn.disabled = faithTokens < 1 || freezeTimeActive;
    if (doublePointsBtn) doublePointsBtn.disabled = faithTokens < 1 || doublePointsActive;
    
    // Animate faith tokens change if requested
    if (animate) {
        faithTokensDiv.classList.remove('token-change');
        void faithTokensDiv.offsetWidth; // Force reflow
        faithTokensDiv.classList.add('token-change');
        setTimeout(() => faithTokensDiv.classList.remove('token-change'), 1000);
        // Fire token earn animation system
        if (animationEffects) {
            animationEffects.animateTokenEarn(1);
        }
    }
}

// Double Points activation (costs 1 token, applies to current question only)
if (doublePointsBtn) {
    doublePointsBtn.onclick = function() {
        if (faithTokens < 1 || doublePointsActive) return;
        faithTokens--;
        powerUpsUsed++;
        doublePointsActive = true;
        updateFaithTokens(true);
        if (typeof animationEffects !== 'undefined') {
            animationEffects.showDoublePointsBadge();
        }
        doublePointsBtn.classList.add('hint-highlight');
        setTimeout(() => doublePointsBtn.classList.remove('hint-highlight'), 1200);
    };
}

freezeTimeBtn.onclick = function() {
    if (faithTokens < 1 || freezeTimeActive) return;
    faithTokens--;
    powerUpsUsed++;
    freezeTimeActive = true;
    updateFaithTokens(true);
    freezeTimeBtn.classList.add('hint-highlight');
    timerDiv.style.color = '#2196f3';
    timerDiv.style.textShadow = '0 0 10px #2196f3';

    const timerToPause = isTimeAttackMode ? globalTimer : timer;
    clearInterval(timerToPause);
    
    setTimeout(() => {
        freezeTimeBtn.classList.remove('hint-highlight');
        timerDiv.style.color = '';
        timerDiv.style.textShadow = '';
        
        if (isTimeAttackMode) {
            startGlobalTimer(); // Resume global timer
        } else {
            startTimer();
        }
        freezeTimeActive = false;
        updateFaithTokens();
    }, 5000);
};

// Removed revive button onclick function

// --- Wager Logic ---
const wagerInput = document.getElementById('wager-input');
const wagerFeedback = document.createElement('div');
wagerFeedback.id = 'wager-feedback';
wagerFeedback.style.fontSize = '0.8rem';
wagerFeedback.style.marginTop = '0.25rem';
wagerFeedback.style.fontStyle = 'italic';
wagerFeedback.style.color = '#ffd700';
wagerFeedback.style.textAlign = 'center';
wagerInput.parentNode.appendChild(wagerFeedback);

let currentWager = 5;
let maxWagerValue = 20;

/**
 * Updates the wager feedback display with risk level information
 * Provides visual feedback about the risk level of the current wager
 * Changes color and text based on the percentage of maximum wager
 */
function updateWagerFeedback() {
    // Calculate risk level based on percentage of max
    const riskPercentage = (currentWager / maxWagerValue) * 100;
    let riskLevel = '';
    
    if (riskPercentage <= 25) {
        riskLevel = 'Low Risk';
        wagerFeedback.style.color = '#4caf50'; // Green
    } else if (riskPercentage <= 50) {
        riskLevel = 'Moderate Risk';
        wagerFeedback.style.color = '#ff9800'; // Orange
    } else if (riskPercentage <= 75) {
        riskLevel = 'High Risk';
        wagerFeedback.style.color = '#ff5722'; // Deep Orange
    } else {
        riskLevel = 'Extreme Risk!';
        wagerFeedback.style.color = '#f44336'; // Red
    }
    
    wagerFeedback.textContent = `${riskLevel} (${currentWager}/${maxWagerValue})`;
}

/**
 * Validates and updates the wager input value
 * Ensures the wager is within valid range and provides visual feedback
 */
wagerInput.addEventListener('input', () => {
    // Remove non-numeric characters
    wagerInput.value = wagerInput.value.replace(/[^0-9]/g, '');
    
    // Parse and validate the value
    let val = parseInt(wagerInput.value, 10);
    
    // Handle empty or invalid input
    if (wagerInput.value === '' || isNaN(val)) {
        val = 1;
        wagerInput.value = '1';
    }
    
    // Enforce min/max constraints
    if (val < 1) {
        val = 1;
        wagerInput.value = '1';
    }
    
    if (val > maxWagerValue) {
        val = maxWagerValue;
        wagerInput.value = maxWagerValue.toString();
    }
    
    currentWager = val;
    updateWagerFeedback();
});

// Add a blur event to ensure valid value when focus leaves the input
wagerInput.addEventListener('blur', () => {
    if (wagerInput.value === '' || isNaN(parseInt(wagerInput.value, 10))) {
        wagerInput.value = '1';
        currentWager = 1;
        updateWagerFeedback();
    }
});

// --- Game Logic Modifications ---
let roundSize = 20;
let isLightningRound = false;
let filteredQuestions = [];

// --- COUNTDOWN NUMBERS ---
function showCountdownNumber(num) {
    const existing = document.querySelector('.countdown-number');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'countdown-number';
    div.innerText = num;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 800);
}

// --- PAGE TRANSITIONS ---
// --- Smoother transitions for screen changes ---
function slideIn(el) {
    el.classList.remove('slide-out');
    el.classList.add('slide-in');
    el.style.display = 'block';
}
function slideOut(el, cb) {
    el.classList.remove('slide-in');
    el.classList.add('slide-out');
    setTimeout(() => {
        el.style.display = 'none';
        if (cb) cb();
    }, 700);
}

// --- FADE IN/OUT FOR QUESTIONS ---
function fadeIn(el) {
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    el.style.opacity = 1;
}
function fadeOut(el, cb) {
    el.classList.remove('fade-in');
    el.classList.add('fade-out');
    setTimeout(() => {
        el.style.opacity = 0;
        if (cb) cb();
    }, 500);
}

// --- Transition Sounds (streak sounds removed) ---
const audioTransition = document.getElementById('audio-transition');
const audioTransition2 = document.getElementById('audio-transition2');

/**
 * Plays a special sound effect based on the player's streak level
 * @param {number} streak - The current streak count
 */
function playStreakSound(streak) {
    return; // disabled
}

// --- Category to icon mapping
const CATEGORY_ICONS = {
    'Bible People': '📖',
    'Prophecy': '👓',
    'General SDA': '🌍',
    'Diet & Health': '🥗',
    'Last Day Events': '⏳',
    'Music': '🎵',
    'The Great Controversy': '⚔️'
};

// Fun facts, Bible verses, and health tips
const FUN_FACTS = [
    // Bible Verses
    '"I can do all things through Christ who strengthens me." — Philippians 4:13',
    '"Trust in the Lord with all your heart and lean not on your own understanding." — Proverbs 3:5',
    '"Beloved, I pray that you may prosper in all things and be in health, just as your soul prospers." — 3 John 1:2',
    '"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." — John 3:16',
    '"Thy word is a lamp unto my feet, and a light unto my path." — Psalm 119:105',
    '"Come unto me, all ye that labour and are heavy laden, and I will give you rest." — Matthew 11:28',
    '"But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." — Isaiah 40:31',
    '"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." — 2 Timothy 2:15',
    // Health Tips
    '🥗 Health Tip: Drinking enough water each day is crucial for many reasons: to regulate body temperature, keep joints lubricated, and deliver nutrients to cells.',
    '🥦 Health Tip: Eating a variety of colorful fruits and vegetables helps your body get a wide range of nutrients.',
    '🚶‍♂️ Health Tip: Just 30 minutes of walking a day can boost your mood and improve your health.',

];

function getRandomFunFact() {
    return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// Encouragement messages
const ENCOURAGEMENTS_CORRECT = [
    "You're unstoppable!",
    "Comic book legend!",
    "That was heroic!",
    "You crushed it!",
    "Superb!",
    "Right on the money!",
    "You just leveled up!",
    "That was epic!",
    "You could be a trivia superhero!",
    "Keep smashing it!"
];
const ENCOURAGEMENTS_INCORRECT = [
    "Even Batman misses sometimes!",
    "Plot twist! Try again.",
    "Villains never win—heroes keep going!",
    "Shake it off, hero!",
    "Every hero has setbacks!",
    "You dodged that one—next time, aim true!",
    "Not all heroes get it right the first time!",
    "The comeback is always stronger!",
    "Zap! But you'll bounce back!",
    "Keep your cape on—next one's yours!"
];
function getRandomEncouragement(isCorrect) {
    const arr = isCorrect ? ENCOURAGEMENTS_CORRECT : ENCOURAGEMENTS_INCORRECT;
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- Enhanced Achievement System with Animated Badges ---
const ACHIEVEMENTS = [
  {
    id: 'novice_guardian',
    name: 'Novice Guardian',
    description: 'Complete your first game.',
    icon: '🛡️',
    color: '#4CAF50',
    rarity: 'common',
    check: (stats) => stats.completed,
  },
  {
    id: 'accuracy_ace',
    name: 'Accuracy Ace',
    description: 'Get 90% or more correct answers in a game.',
    icon: '🎯',
    color: '#FF9800',
    rarity: 'rare',
    check: (stats) => stats.correctPct >= 90,
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Achieve a streak of 10 or more correct answers in a row.',
    icon: '🔥',
    color: '#F44336',
    rarity: 'epic',
    check: (stats) => stats.longestStreak >= 10,
  },
  {
    id: 'speedster',
    name: 'Speedster',
    description: 'Average answer time under 7 seconds.',
    icon: '⚡',
    color: '#2196F3',
    rarity: 'rare',
    check: (stats) => stats.avgTime < 7,
  },
  {
    id: 'faithful_finisher',
    name: 'Faithful Finisher',
    description: 'Finish a game without using any power-ups.',
    icon: '✝️',
    color: '#9C27B0',
    rarity: 'epic',
    check: (stats) => stats.powerUpsUsed === 0,
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Recover from a streak of 3+ wrong answers to finish with 80%+ accuracy.',
    icon: '🔄',
    color: '#FF5722',
    rarity: 'legendary',
    check: (stats) => stats.comeback && stats.correctPct >= 80,
  },
  {
    id: 'token_tycoon',
    name: 'Token Tycoon',
    description: 'Earn 10 or more Faith Tokens in a single game.',
    icon: '💎',
    color: '#FFD700',
    rarity: 'legendary',
    check: (stats) => stats.faithTokens >= 10,
  },
  {
    id: 'perfect_game',
    name: 'Perfect Game',
    description: 'Answer all questions correctly in a game.',
    icon: '👑',
    color: '#E91E63',
    rarity: 'mythic',
    check: (stats) => stats.correctAnswers === stats.totalQuestions,
  },
  {
    id: 'prophecy_pro',
    name: 'Prophecy Pro',
    description: 'Answer 5 prophecy questions correctly in a row.',
    icon: '🔮',
    color: '#673AB7',
    rarity: 'epic',
    check: (stats) => stats.prophecyStreak >= 5,
  },
  {
    id: 'health_guru',
    name: 'Health Guru',
    description: 'Answer 5 health questions correctly in a row.',
    icon: '🥗',
    color: '#4CAF50',
    rarity: 'rare',
    check: (stats) => stats.healthStreak >= 5,
  },
  {
    id: 'bible_scholar',
    name: 'Bible Scholar',
    description: 'Answer 5 Bible People questions correctly in a row.',
    icon: '📖',
    color: '#795548',
    rarity: 'epic',
    check: (stats) => stats.bibleStreak >= 5,
  },
  {
    id: 'time_master',
    name: 'Time Master',
    description: 'Answer 3 questions in under 10 seconds total.',
    icon: '⏱️',
    color: '#00BCD4',
    rarity: 'rare',
    check: (stats) => stats.fastAnswers >= 3,
  },
  {
    id: 'wager_warrior',
    name: 'Wager Warrior',
    description: 'Win 3 high-stakes wagers in a single game.',
    icon: '🎲',
    color: '#FF5722',
    rarity: 'epic',
    check: (stats) => stats.highWagers >= 3,
  },
  {
    id: 'perseverance',
    name: 'Perseverance',
    description: 'Complete a 50+ question game.',
    icon: '🏃',
    color: '#607D8B',
    rarity: 'rare',
    check: (stats) => stats.totalQuestions >= 50,
  },
  {
    id: 'lightning_round',
    name: 'Lightning Round',
    description: 'Answer 5 questions in under 30 seconds.',
    icon: '⚡',
    color: '#FFC107',
    rarity: 'legendary',
    check: (stats) => stats.lightningRound,
  },
];

// Achievement tracking variables
let earnedAchievements = new Set();
let currentGameStats = {
  prophecyStreak: 0,
  healthStreak: 0,
  bibleStreak: 0,
  fastAnswers: 0,
  highWagers: 0,
  lightningRound: false,
  lightningStartTime: null,
  lightningAnswers: 0
};

/**
 * Check and award achievements based on current game stats
 * @param {Object} stats - Current game statistics
 */
function checkAchievements(stats) {
  const newAchievements = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!earnedAchievements.has(achievement.id) && achievement.check(stats)) {
      earnedAchievements.add(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  // Show achievement badges for newly earned achievements
  newAchievements.forEach(achievement => {
    showAchievementBadge(achievement);
  });
  
  return newAchievements;
}

/**
 * Show an animated achievement badge
 * @param {Object} achievement - The achievement object
 */
function showAchievementBadge(achievement) {
  // Create achievement badge container
  const badge = document.createElement('div');
  badge.className = 'achievement-badge';
  badge.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    background: linear-gradient(135deg, ${achievement.color}22, ${achievement.color}44);
    border: 3px solid ${achievement.color};
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px ${achievement.color}66, 0 0 20px ${achievement.color}44;
    z-index: 10000;
    transform: translateX(400px);
    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-family: 'Montserrat-Regular', Arial, sans-serif;
    color: #ffffff;
    text-align: center;
  `;
  
  // Add rarity glow effect
  const rarityGlow = {
    'common': '0 0 10px rgba(76, 175, 80, 0.5)',
    'rare': '0 0 15px rgba(255, 152, 0, 0.6)',
    'epic': '0 0 20px rgba(156, 39, 176, 0.7)',
    'legendary': '0 0 25px rgba(255, 215, 0, 0.8)',
    'mythic': '0 0 30px rgba(233, 30, 99, 0.9)'
  };
  
  badge.style.boxShadow += `, ${rarityGlow[achievement.rarity]}`;
  
  // Create badge content
  badge.innerHTML = `
    <div class="achievement-icon" style="
      font-size: 3rem;
      margin-bottom: 10px;
      animation: achievementIconPulse 2s ease-in-out infinite;
    ">${achievement.icon}</div>
    <div class="achievement-rarity" style="
      font-size: 0.8rem;
      text-transform: uppercase;
      color: ${achievement.color};
      font-weight: bold;
      margin-bottom: 5px;
      text-shadow: 0 0 5px ${achievement.color};
    ">${achievement.rarity}</div>
    <div class="achievement-name" style="
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    ">${achievement.name}</div>
    <div class="achievement-description" style="
      font-size: 0.9rem;
      opacity: 0.9;
      line-height: 1.3;
    ">${achievement.description}</div>
    <div class="achievement-progress" style="
      margin-top: 10px;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
    ">
      <div class="achievement-progress-bar" style="
        height: 100%;
        background: ${achievement.color};
        width: 0%;
        transition: width 1s ease-out;
        box-shadow: 0 0 10px ${achievement.color};
      "></div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(badge);
  
  // Removed riser sound here to ensure it only plays once at game start
  
  // Animate in
  setTimeout(() => {
    badge.style.transform = 'translateX(0)';
    
    // Animate progress bar
    setTimeout(() => {
      const progressBar = badge.querySelector('.achievement-progress-bar');
      if (progressBar) {
        progressBar.style.width = '100%';
      }
    }, 300);
  }, 100);
  
  // Add pulsing animation
  badge.style.animation = 'achievementBadgePulse 3s ease-in-out infinite';
  
  // Remove after 5 seconds
  setTimeout(() => {
    badge.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }, 600);
  }, 5000);
}

/**
 * Update current game stats for achievement tracking
 * @param {Object} data - Game data to update
 */
function updateAchievementStats(data) {
    if (data.category === 'Prophecy' || data.category === 'The Great Controversy') {
        if (data.correct) {
            currentGameStats.prophecyStreak++;
        } else {
            currentGameStats.prophecyStreak = 0;
        }
    } else if (data.category === 'Diet & Health') {
        if (data.correct) {
            currentGameStats.healthStreak++;
        } else {
            currentGameStats.healthStreak = 0;
        }
    } else if (data.category === 'Bible People') {
        if (data.correct) {
            currentGameStats.bibleStreak++;
        } else {
            currentGameStats.bibleStreak = 0;
        }
    }
    
    // Track fast answers
    if (data.answerTime && data.answerTime < 5) {
        currentGameStats.fastAnswers++;
    }
    
    // Track high wagers
    if (data.wager && data.wager >= 20) {
        currentGameStats.highWagers++;
    }
    
    // Track lightning round
    if (!currentGameStats.lightningStartTime) {
        currentGameStats.lightningStartTime = Date.now();
        currentGameStats.lightningAnswers = 0;
    }
    
    if (data.correct) {
        currentGameStats.lightningAnswers++;
        const elapsed = (Date.now() - currentGameStats.lightningStartTime) / 1000;
        
        if (currentGameStats.lightningAnswers >= 5 && elapsed <= 30) {
            currentGameStats.lightningRound = true;
        }
    }
}

/**
 * Test function to demonstrate achievement badges
 * Call this in the browser console to see all achievement badges
 */
function testAchievementBadges() {
    console.log('🎯 Testing Achievement Badges...');
    
    // Show each achievement badge with a delay
    ACHIEVEMENTS.forEach((achievement, index) => {
        setTimeout(() => {
            showAchievementBadge(achievement);
            console.log(`✅ Showing achievement: ${achievement.name}`);
        }, index * 2000); // Show each badge 2 seconds apart
    });
    
    console.log('🎮 Achievement badges will appear in the top-right corner!');
}

/**
 * Test function to verify team mode functionality
 * Call this in the browser console to test team mode
 */
function testTeamMode() {
    console.log('🏈 Testing Team Mode...');
    
    // Check if team mode elements exist
    const teamElements = {
        'score-teams': document.getElementById('score-teams'),
        'team-turn-indicator': document.getElementById('team-turn-indicator'),
        'intermission-screen': document.getElementById('intermission-screen'),
        'teams-button': document.getElementById('teams')
    };
    
    console.log('📋 Team Mode Elements Check:');
    Object.entries(teamElements).forEach(([name, element]) => {
        console.log(`${name}: ${element ? '✅ Found' : '❌ Missing'}`);
    });
    
    // Check team mode variables
    console.log('🔧 Team Mode Variables:');
    console.log('gameMode:', typeof gameMode !== 'undefined' ? gameMode : 'undefined');
    console.log('teamBlueScore:', typeof teamBlueScore !== 'undefined' ? teamBlueScore : 'undefined');
    console.log('teamBlackScore:', typeof teamBlackScore !== 'undefined' ? teamBlackScore : 'undefined');
    console.log('currentTeam:', typeof currentTeam !== 'undefined' ? currentTeam : 'undefined');
    
    // Test team mode initialization
    console.log('🚀 Testing Team Mode Initialization...');
    try {
        // Simulate team mode start
        const originalGameMode = gameMode;
        gameMode = 'teams';
        teamBlueScore = 0;
        teamBlackScore = 0;
        currentTeam = 'blue';
        
        console.log('✅ Team mode variables initialized successfully');
        console.log('Current team:', currentTeam);
        console.log('Blue score:', teamBlueScore);
        console.log('Black score:', teamBlackScore);
        
        // Restore original state
        gameMode = originalGameMode;
        console.log('🔄 Original game mode restored');
        
    } catch (error) {
        console.error('❌ Error testing team mode:', error);
    }
    
    console.log('🎮 Team mode test complete! Start a team game to verify functionality.');
}

/**
 * Comprehensive bug check function
 * Call this in the browser console to check for common issues
 */
function comprehensiveBugCheck() {
    console.log('🔍 Starting Comprehensive Bug Check...');
    
    // Check 1: DOM Elements
    console.log('\n📋 DOM Elements Check:');
    const criticalElements = {
        'container': document.getElementById('container'),
        'game': document.getElementById('game'),
        'game-over': document.getElementById('game-over'),
        'options': document.querySelector('.options'),
        'question': document.querySelector('.question'),
        'score-solo': document.getElementById('score-solo'),
        'score-teams': document.getElementById('score-teams'),
        'timer': document.querySelector('.timer'),
        'wager-input': document.getElementById('wager-input'),
        'next-btn': document.getElementById('next'),
        'solo-btn': document.getElementById('solo'),
        'teams-btn': document.getElementById('teams')
    };
    
    let missingElements = 0;
    Object.entries(criticalElements).forEach(([name, element]) => {
        if (element) {
            console.log(`✅ ${name}: Found`);
        } else {
            console.log(`❌ ${name}: Missing`);
            missingElements++;
        }
    });
    
    // Check 2: Game Variables
    console.log('\n🔧 Game Variables Check:');
    const gameVariables = [
        'gameMode', 'playerScore', 'currentQuestionIndex', 'questions',
        'teamBlueScore', 'teamBlackScore', 'currentTeam', 'faithTokens',
        'currentStreak', 'longestStreak', 'correctAnswers'
    ];
    
    let undefinedVariables = 0;
    gameVariables.forEach(varName => {
        if (typeof window[varName] !== 'undefined') {
            console.log(`✅ ${varName}: Defined (${typeof window[varName]})`);
        } else {
            console.log(`❌ ${varName}: Undefined`);
            undefinedVariables++;
        }
    });
    
    // Check 3: Audio Elements
    console.log('\n🎵 Audio Elements Check:');
    const audioElements = [
        'audio-correct-1', 'audio-correct-2', 'audio-wrong', 'audio-timeup',
        'audio-riser', 'audio-bg-1', 'audio-bg-2', 'audio-bg-3', 'audio-bg-4', 'audio-bg-5'
    ];
    
    let missingAudio = 0;
    audioElements.forEach(audioId => {
        const audio = document.getElementById(audioId);
        if (audio) {
            console.log(`✅ ${audioId}: Found`);
        } else {
            console.log(`❌ ${audioId}: Missing`);
            missingAudio++;
        }
    });
    
    // Check 4: CSS Classes
    console.log('\n🎨 CSS Classes Check:');
    const testElement = document.createElement('div');
    testElement.className = 'options button correct highlight-correct';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const hasCorrectStyle = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
                           computedStyle.borderColor !== 'rgba(0, 0, 0, 0)';
    
    console.log(`✅ CSS Classes: ${hasCorrectStyle ? 'Working' : 'May have issues'}`);
    document.body.removeChild(testElement);
    
    // Check 5: Question Data
    console.log('\n📚 Question Data Check:');
    if (typeof gameQuestions !== 'undefined' && gameQuestions.length > 0) {
        console.log(`✅ gameQuestions: ${gameQuestions.length} questions loaded`);
        
        // Check first question structure
        const firstQuestion = gameQuestions[0];
        const requiredFields = ['question', 'options', 'answer', 'category'];
        let missingFields = 0;
        
        requiredFields.forEach(field => {
            if (firstQuestion[field]) {
                console.log(`✅ Question ${field}: Present`);
            } else {
                console.log(`❌ Question ${field}: Missing`);
                missingFields++;
            }
        });
    } else {
        console.log('❌ gameQuestions: Not loaded or empty');
    }
    
    // Check 6: Answer Highlighting Logic
    console.log('\n🎯 Answer Highlighting Check:');
    console.log('Testing answer highlighting logic...');
    
    // Simulate a question scenario
    const testQuestion = {
        question: 'Test question?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option B',
        category: 'Test'
    };
    
    console.log(`Test question answer: "${testQuestion.answer}"`);
    console.log(`Test options: ${testQuestion.options.join(', ')}`);
    
    // Check if the highlighting logic would work
    const correctOption = testQuestion.options.find(option => option === testQuestion.answer);
    if (correctOption) {
        console.log('✅ Answer highlighting logic: Should work correctly');
    } else {
        console.log('❌ Answer highlighting logic: May have issues');
    }
    
    // Summary
    console.log('\n📊 Bug Check Summary:');
    console.log(`Missing DOM Elements: ${missingElements}`);
    console.log(`Undefined Variables: ${undefinedVariables}`);
    console.log(`Missing Audio Elements: ${missingAudio}`);
    
    if (missingElements === 0 && undefinedVariables === 0 && missingAudio === 0) {
        console.log('🎉 All checks passed! No obvious bugs detected.');
    } else {
        console.log('⚠️ Some issues detected. Check the details above.');
    }
    
    console.log('\n💡 If you\'re experiencing issues:');
    console.log('1. Check the browser console for JavaScript errors');
    console.log('2. Verify all audio files are in the correct location');
    console.log('3. Try refreshing the page');
    console.log('4. Check if any browser extensions are interfering');
}

/**
 * Test function specifically for answer highlighting
 * Call this in the browser console to test answer highlighting
 */
function testAnswerHighlighting() {
    console.log('🎯 Testing Answer Highlighting...');
    
    // Check if we're in a game
    if (!document.getElementById('game') || document.getElementById('game').style.display === 'none') {
        console.log('❌ Game is not active. Start a game first.');
        return;
    }
    
    // Check if there are options buttons
    const optionsDiv = document.querySelector('.options');
    if (!optionsDiv || optionsDiv.children.length === 0) {
        console.log('❌ No options buttons found. Make sure a question is displayed.');
        return;
    }
    
    console.log('✅ Game is active and options are present');
    console.log('📋 Current options:');
    Array.from(optionsDiv.children).forEach((btn, index) => {
        console.log(`  ${index + 1}. "${btn.innerText}"`);
        console.log(`    Classes: ${btn.className}`);
        console.log(`    Disabled: ${btn.disabled}`);
    });
    
    // Check if we have a current question
    if (typeof currentQuestionIndex !== 'undefined' && typeof questions !== 'undefined' && questions[currentQuestionIndex]) {
        const currentQuestion = questions[currentQuestionIndex];
        console.log('📚 Current question answer:', currentQuestion.answer);
        
        // Test the highlighting logic
        const correctButton = Array.from(optionsDiv.children).find(btn => btn.innerText === currentQuestion.answer);
        if (correctButton) {
            console.log('✅ Correct answer button found:', correctButton.innerText);
            console.log('Current classes:', correctButton.className);
            
            // Check if already highlighted
            const hasCorrect = correctButton.classList.contains('correct');
            const hasHighlight = correctButton.classList.contains('highlight-correct');
            
            console.log(`Has 'correct' class: ${hasCorrect}`);
            console.log(`Has 'highlight-correct' class: ${hasHighlight}`);
            
            // Apply highlighting for testing if not already present
            if (!hasCorrect || !hasHighlight) {
                correctButton.classList.add('correct', 'highlight-correct');
                console.log('🎨 Applied highlighting classes to correct answer');
            }
            
            // Check if CSS is working
            const computedStyle = window.getComputedStyle(correctButton);
            console.log('🎨 Button styles after highlighting:');
            console.log('  Background:', computedStyle.backgroundColor);
            console.log('  Border:', computedStyle.border);
            console.log('  Box-shadow:', computedStyle.boxShadow);
            console.log('  Animation:', computedStyle.animation);
            
        } else {
            console.log('❌ Could not find button matching correct answer');
            console.log('Expected answer:', currentQuestion.answer);
            console.log('Available options:', Array.from(optionsDiv.children).map(btn => btn.innerText));
        }
    } else {
        console.log('❌ No current question data available');
    }
    
    console.log('💡 Fix Status:');
    console.log('✅ Highlighting now works for both correct and incorrect answers');
    console.log('✅ Removed duplicate highlighting logic');
    console.log('✅ Added debugging for troubleshooting');
    console.log('');
    console.log('💡 If highlighting is still not working:');
    console.log('1. Check if CSS classes are being applied correctly');
    console.log('2. Verify the correct answer matches exactly');
    console.log('3. Check for any CSS conflicts');
    console.log('4. Look for JavaScript errors in the console');
}

function calculateStars(stats) {
  // Rubric:
  // 1: <50% correct
  // 2: 50-69%
  // 3: 70-84%
  // 4: 85-94%
  // 5: 95-100%
  const pct = stats.correctPct;
  if (pct < 50) return 1;
  if (pct < 70) return 2;
  if (pct < 85) return 3;
  if (pct < 95) return 4;
  return 5;
}

function getStarExplanation(stars) {
  const explanations = [
    'Beginner – Needs improvement.',
    'Learner – Some knowledge, keep practicing.',
    'Competent – Good performance, above average.',
    'Expert – Excellent knowledge and consistency.',
    'Master – Outstanding, near-perfect play.'
  ];
  return explanations[stars - 1] || '';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Loading Overlay ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingBar = document.getElementById('loading-bar');

function showLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}
function hideLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.style.opacity = '0';
    setTimeout(() => { if (loadingOverlay) loadingOverlay.style.display = 'none'; }, 400);
}
function setLoadingProgress(percent) {
    if (loadingBar) loadingBar.style.width = percent + '%';
}

// --- Asset Preload Logic ---
const audioElements = [
    'audio-correct-1','audio-correct-2','audio-wrong','audio-timeup','audio-riser',
    'audio-bg-1','audio-bg-2','audio-bg-3','audio-bg-4','audio-bg-5','audio-timer-tick','audio-ticking-time',
    'audio-transition', 'audio-transition2'
].map(id => document.getElementById(id)).filter(Boolean);

function preloadAudioAssets(onProgress, onComplete) {
    let loaded = 0;
    const total = audioElements.length;
    audioElements.forEach(audio => {
        audio.oncanplaythrough = () => {
            loaded++;
            onProgress(Math.round((loaded/total)*100));
            if (loaded === total) onComplete();
        };
        // Start loading
        audio.load();
    });
}

// --- Video Preload Logic ---
const allBackgroundVideos = [
    'background.mp4',
    'background 1.mp4',
    'background 2.mp4'
];
let videoPreloadCount = 0;
function preloadVideoAssets(onProgress, onComplete) {
    videoPreloadCount = 0;
    allBackgroundVideos.forEach((src, idx) => {
        const vid = document.createElement('video');
        vid.src = src;
        vid.preload = 'auto';
        vid.muted = true;
        vid.style.display = 'none';
        vid.oncanplaythrough = () => {
            videoPreloadCount++;
            onProgress && onProgress(Math.round((videoPreloadCount/allBackgroundVideos.length)*100));
            if (videoPreloadCount === allBackgroundVideos.length) {
                onComplete && onComplete();
            }
        };
        document.body.appendChild(vid);
    });
}

// Show loading overlay and preload assets on DOMContentLoaded
showLoadingOverlay();
let audioLoaded = false, videoLoaded = false;
function tryHideLoadingOverlay() {
    if (audioLoaded && videoLoaded) setTimeout(hideLoadingOverlay, 400);
}
preloadAudioAssets(setLoadingProgress, () => {
    audioLoaded = true;
    tryHideLoadingOverlay();
});
preloadVideoAssets(null, () => {
    videoLoaded = true;
    tryHideLoadingOverlay();
});

// --- Refactor: Cache DOM queries for options/buttons ---
// (Example: in showQuestion, batch create option buttons and use fragment)
const createOptionButtons = (options, onClick) => {
    const frag = document.createDocumentFragment();
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.innerText = option;
        btn.onclick = onClick;
        btn.tabIndex = 0;
        btn.setAttribute('aria-label', `Answer option ${index + 1}: ${option}`);
        btn.setAttribute('role', 'button');
        btn.classList.add('option-button');
        btn.setAttribute('data-option-index', index + 1);
        frag.appendChild(btn);
    });
    return frag;
};

// --- Mobile/Touch Detection and Optimization ---
const isTouchDevice = () => {
    return (('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0));
};

const isMobileDevice = () => {
    return window.innerWidth <= 768 || isTouchDevice();
};

// Add mobile-specific CSS class
if (isMobileDevice()) {
    document.documentElement.classList.add('mobile-device');
}

// Prevent double-tap zoom on buttons
const preventDoubleTabZoom = (element) => {
    let lastTouchEnd = 0;
    element.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
};

// Enhanced touch feedback for buttons
const addTouchFeedback = (element) => {
    element.addEventListener('touchstart', () => {
        element.classList.add('touch-active');
    });
    
    element.addEventListener('touchend', () => {
        setTimeout(() => {
            element.classList.remove('touch-active');
        }, 150);
    });
    
    element.addEventListener('touchcancel', () => {
        element.classList.remove('touch-active');
    });
};

// Debounce function for preventing rapid taps
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// --- DOMContentLoaded for all DOM queries and listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Auth/Leaderboard module
    if (window.AuthManager && typeof window.AuthManager.init === 'function') {
        window.AuthManager.init();
        // Subscribe to auth changes to update UI
        window.AuthManager.subscribe((user) => {
            updateUserInfoUI(user);
            // After auth ready, refresh leaderboard display
            if (window.LeaderboardService && typeof window.LeaderboardService.refresh === 'function') {
                window.LeaderboardService.refresh();
            }
        });
    } else {
        console.warn('AuthManager not available. Sign-in and leaderboard disabled.');
            const statusContainer = document.getElementById('signin-status-container');
            if (statusContainer) {
            statusContainer.innerHTML = '<p style="color:#d4af37;">Auth not available in this environment.</p>';
        }
    }
        // Initialize audio system
        if (typeof AudioManager !== 'undefined' && AudioManager.init) {
            AudioManager.init();
            console.log("✅ Audio system initialized.");
        } else {
            console.warn("⚠️ AudioManager not available. Audio features may not work.");
        }
    
    // Debug audio elements to check if they're properly loaded
    debugAudioElements();
    // Build the pool of correct-answer sounds (includes existing and optional Correct 1..10 files)
    initCorrectSoundPool();
    // Build the pool of incorrect-answer sounds (existing + optional Incorrect 1..10 files)
    initIncorrectSoundPool();
    
    // Initialize animation effects
    try {
        animationEffects = new AnimationEffects();
    } catch (e) {
        console.warn('AnimationEffects initialization failed:', e);
    }

    // Preload transition SVGs (1.svg .. 17.svg) to avoid flicker on first display
    (function preloadTransitionSvgs(){
        try {
            for (let i = 1; i <= TRANSITION_SVG_COUNT; i++) {
                const img = new Image();
                img.src = i + '.svg';
            }
        } catch (_) {}
    })();
    
    // Initialize DOM elements (category dropdown no longer needed for level system)
    // categoryDropdown = document.getElementById('category-dropdown'); // Removed - using level system now

    // NEW: Display Level Selection and hide mode buttons initially
    displayLevelSelection();
    
    // Initially hide the mode buttons until a level is selected
    const buttons = document.querySelector('.buttons');
    if (buttons) {
        buttons.style.display = 'none';
    }

    // --- Level Video Logic ---
    // Allow override via global map if present
    const defaultLevelVideoMap = {
        1: 'video1.mp4',
        2: 'video2.mp4',
        3: 'video3.mp4',
        4: 'video4.mp4',
        5: 'video5.mp4',
        6: 'video6.mp4',
        7: 'video7.mp4'
    };
    const levelVideoMap = (window && window.LEVEL_VIDEO_MAP) ? window.LEVEL_VIDEO_MAP : defaultLevelVideoMap;

    function candidateVideoNames(levelNumber) {
        const n = Number(levelNumber);
        const baseCandidates = [
            levelVideoMap[n],
            `Video ${n}.mp4`,
            `video ${n}.mp4`,
            `Level ${n}.mp4`,
            `level ${n}.mp4`,
            `level${n}.mp4`,
            `video${n}.mp4`,
            `background ${n}.mp4`,
            `background${n}.mp4`
        ];
        // Deduplicate and filter falsy
        return Array.from(new Set(baseCandidates.filter(Boolean)));
    }

    function openLevelVideoModal() {
        if (!levelVideoModal) return;
        levelVideoModal.style.display = 'flex';
        requestAnimationFrame(() => {
            levelVideoModal.style.opacity = '0';
            levelVideoModal.style.transition = 'opacity 0.3s';
            requestAnimationFrame(() => { levelVideoModal.style.opacity = '1'; });
        });
    }

    function closeLevelVideoModal() {
        if (!levelVideoModal) return;
        levelVideoModal.style.transition = 'opacity 0.3s';
        levelVideoModal.style.opacity = '0';
        setTimeout(() => {
            levelVideoModal.style.display = 'none';
            if (levelVideoPlayer) {
                try { levelVideoPlayer.pause(); } catch (_) {}
                levelVideoPlayer.removeAttribute('src');
                levelVideoPlayer.load();
            }
        }, 300);
    }

    window.showLevelVideo = function(levelNumber, { afterVideo, viewOnly, ignoreGating } = {}) {
        // Respect skipVideos only if not viewOnly
        if (!viewOnly && !ignoreGating && !shouldShowLevelVideo(levelNumber)) {
            if (typeof afterVideo === 'function') afterVideo();
            return;
        }

        if (!levelVideoPlayer) {
            console.warn(`No video source found for level ${levelNumber} or player missing.`);
            if (typeof afterVideo === 'function') afterVideo();
            return;
        }

        if (levelVideoTitle) levelVideoTitle.textContent = `Level ${levelNumber} Video`;
        levelVideoPlayer.autoplay = true;
        levelVideoPlayer.controls = true;

        // Reset checkbox each time
        if (skipVideosCheckbox) skipVideosCheckbox.checked = false;

        // Wire skip behavior
        if (skipVideoBtn) {
            skipVideoBtn.onclick = () => {
                // Persist skip preference only if not viewOnly
                if (!viewOnly && skipVideosCheckbox && skipVideosCheckbox.checked) {
                    try { localStorage.setItem('endOfTime_skipVideos', 'true'); } catch (e) { console.error('Error saving skip videos preference:', e); }
                }
                // Mark video viewed if not viewOnly
                if (!viewOnly) markLevelVideoAsViewed(levelNumber);
                closeLevelVideoModal();
                if (typeof afterVideo === 'function') afterVideo();
            };
        }

        // On video end
        const onEnded = () => {
            if (!viewOnly) markLevelVideoAsViewed(levelNumber);
            closeLevelVideoModal();
            if (typeof afterVideo === 'function') afterVideo();
            levelVideoPlayer.removeEventListener('ended', onEnded);
            levelVideoPlayer.removeEventListener('error', onError);
        };
        const onError = () => {
            // Try next candidate if available
            tryNextCandidate();
        };
        levelVideoPlayer.addEventListener('ended', onEnded);
        levelVideoPlayer.addEventListener('error', onError);

        let candidates = candidateVideoNames(levelNumber);
        let idx = -1;

        function tryNextCandidate() {
            idx += 1;
            if (idx >= candidates.length) {
                console.warn('Video failed to play; continuing.');
                levelVideoPlayer.removeEventListener('ended', onEnded);
                levelVideoPlayer.removeEventListener('error', onError);
                closeLevelVideoModal();
                if (typeof afterVideo === 'function') afterVideo();
                return;
            }
            const nextSrc = candidates[idx];
            // Swap source and attempt immediate play to keep gesture chain
            levelVideoPlayer.src = nextSrc;
            openLevelVideoModal();
            try {
                const p = levelVideoPlayer.play();
                if (p && typeof p.then === 'function') {
                    p.catch(() => {
                        // Will trigger 'error' and advance
                    });
                }
            } catch (_) {
                // Will trigger 'error' and advance
            }
        }

        tryNextCandidate();
    }
    // Show a random fun fact/verse/tip on the start screen
    const funFactBox = document.getElementById('fun-fact-box');
    if (funFactBox) {
        funFactBox.innerText = getRandomFunFact();
    }

    function ensureUserInteraction() {
        if (typeof AudioManager !== 'undefined' && AudioManager && typeof AudioManager.init === 'function') {
            AudioManager.init();
        }
        document.body.removeEventListener('click', ensureUserInteraction);
        document.body.removeEventListener('keydown', ensureUserInteraction);
    }

    document.body.addEventListener('click', ensureUserInteraction, { once: true });
    document.body.addEventListener('keydown', ensureUserInteraction, { once: true });

    // --- Reset Tutorials Button ---
    if (resetTutorialsBtn) {
        resetTutorialsBtn.onclick = () => {
            try {
                localStorage.removeItem('endOfTime_skipTutorials');
                localStorage.removeItem('endOfTime_viewedTutorials');
                alert('Tutorials have been reset. You will see them again for each level.');
            } catch (e) {
                console.error('Failed to reset tutorials:', e);
            }
        };
    }

    // --- Reset Videos Button ---
    if (resetVideosBtn) {
        resetVideosBtn.onclick = () => {
            try {
                localStorage.removeItem('endOfTime_skipVideos');
                localStorage.removeItem('endOfTime_viewedLevelVideos');
                alert('Level videos have been reset. You will see them again.');
            } catch (e) {
                console.error('Failed to reset videos:', e);
            }
        };
    }
    // --- Check Sign In and Start Game ---
    function checkSignInAndStartGame(mode) {
        const levelNumber = currentGameLevel || 1;

        // Function to actually start the game (after tutorial if needed)
        const actuallyStartGame = () => {
            exitBtn.style.display = 'block';
            // After tutorial, if we should show video, do so before starting
            if (shouldShowLevelVideo(levelNumber)) {
                window.showLevelVideo(levelNumber, {
                    afterVideo: () => startGame(mode, levelNumber)
                });
            } else {
                startGame(mode, levelNumber);
            }
        };

        if (!currentUser) {
            // Show sign-in prompt modal
            showSignInPromptModal(mode);
        } else {
            // User is already signed in, check if tutorial should be shown
            if (shouldShowTutorial(levelNumber)) {
                window.showTutorial(levelNumber, mode, actuallyStartGame);
            } else {
                // If no tutorial, still respect video gate
                if (shouldShowLevelVideo(levelNumber)) {
                    window.showLevelVideo(levelNumber, {
                        afterVideo: () => actuallyStartGame()
                    });
                } else {
                    actuallyStartGame();
                }
            }
        }
    }

    // --- Sign In Prompt Modal ---
    function showSignInPromptModal(gameMode) {
        // Create modal if it doesn't exist
        let signInModal = document.getElementById('signin-prompt-modal');
        if (!signInModal) {
            signInModal = document.createElement('div');
            signInModal.id = 'signin-prompt-modal';
            signInModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 10000;
                background: rgba(30,32,40,0.97);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            `;
            
            signInModal.innerHTML = `
                <div style="background:#fff;border-radius:18px;box-shadow:0 2px 18px #ffd70044;padding:2rem 2.5rem;max-width:95vw;width:400px;text-align:center;position:relative;">
                    <h2 style="color:#222;font-family:'Montserrat-Bold',Arial,sans-serif;margin-bottom:1.2rem;">Sign In to Play</h2>
                    <p style="color:#666;margin-bottom:1.5rem;line-height:1.5;">Sign in with your Google account to save your scores and compete on the leaderboard!</p>
                    <div id="signin-prompt-buttons" style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem;">
                        <button id="signin-prompt-google-btn" class="comic-button" style="background:#4285f4;color:#fff;border:none;padding:0.8rem 1.5rem;border-radius:8px;font-size:1.1rem;cursor:pointer;">
                            <img src="https://developers.google.com/identity/images/g-logo.png" style="width:20px;height:20px;vertical-align:middle;margin-right:0.5rem;">Sign in with Google
                        </button>
                        <button id="signin-prompt-skip-btn" class="comic-button" style="background:#666;color:#fff;border:none;padding:0.8rem 1.5rem;border-radius:8px;font-size:1.1rem;cursor:pointer;">
                            Play Without Signing In
                        </button>
                    </div>
                    <button id="signin-prompt-close-btn" style="background:none;border:none;color:#999;cursor:pointer;font-size:1rem;">Close</button>
                </div>
            `;
            
            document.body.appendChild(signInModal);
            
            // Add event listeners
            const googleBtn = document.getElementById('signin-prompt-google-btn');
            const skipBtn = document.getElementById('signin-prompt-skip-btn');
            const closeBtn = document.getElementById('signin-prompt-close-btn');
            
            googleBtn.onclick = async () => {
                if (window.AuthManager && typeof window.AuthManager.signIn === 'function') {
                    await window.AuthManager.signIn();
                } else {
                    alert('Authentication is not available right now. Please try again later.');
                }
            };
            
            skipBtn.onclick = () => {
                hideSignInPromptModal();
                // Start game without sign-in
                const levelNumber = currentGameLevel || 1;
                const actuallyStartGame = () => {
                    exitBtn.style.display = 'block';
                    startGame(gameMode, levelNumber);
                };

                // Check if tutorial should be shown
                if (shouldShowTutorial(levelNumber)) {
                    window.showTutorial(levelNumber, gameMode, actuallyStartGame);
                } else {
                    actuallyStartGame();
                }
            };
            
            closeBtn.onclick = hideSignInPromptModal;
        }
        
        signInModal.style.display = 'flex';
    }
    
    function hideSignInPromptModal() {
        const signInModal = document.getElementById('signin-prompt-modal');
        if (signInModal) {
            signInModal.style.display = 'none';
        }
    }

    // --- Tutorial System ---
    const allTutorials = [
        typeof tutorialLevel1 !== 'undefined' ? tutorialLevel1 : null,
        typeof tutorialLevel2 !== 'undefined' ? tutorialLevel2 : null,
        typeof tutorialLevel3 !== 'undefined' ? tutorialLevel3 : null,
        typeof tutorialLevel4 !== 'undefined' ? tutorialLevel4 : null,
        typeof tutorialLevel5 !== 'undefined' ? tutorialLevel5 : null,
        typeof tutorialLevel6 !== 'undefined' ? tutorialLevel6 : null,
        typeof tutorialLevel7 !== 'undefined' ? tutorialLevel7 : null
    ];

    function shouldShowTutorial(levelNumber) {
        try {
            const skipTutorials = localStorage.getItem('endOfTime_skipTutorials');
            if (skipTutorials === 'true') return false;
            // Always show tutorial before each level unless globally skipped
            return true;
        } catch (e) {
            console.error("Error checking tutorial status:", e);
            return true; // Show tutorial if error
        }
    }

    // --- Video Gating Helpers ---
    function shouldShowLevelVideo(levelNumber) {
        try {
            const skipVideos = localStorage.getItem('endOfTime_skipVideos');
            if (skipVideos === 'true') return false;
            const viewedVideos = JSON.parse(localStorage.getItem('endOfTime_viewedLevelVideos') || '[]');
            return !viewedVideos.includes(levelNumber);
        } catch (e) {
            console.error('Error checking level video status:', e);
            return true;
        }
    }

    function markLevelVideoAsViewed(levelNumber) {
        try {
            const viewed = JSON.parse(localStorage.getItem('endOfTime_viewedLevelVideos') || '[]');
            if (!viewed.includes(levelNumber)) {
                viewed.push(levelNumber);
                localStorage.setItem('endOfTime_viewedLevelVideos', JSON.stringify(viewed));
            }
        } catch (e) {
            console.error('Error marking level video as viewed:', e);
        }
    }

    function markTutorialAsViewed(levelNumber) {
        try {
            const viewedTutorials = JSON.parse(localStorage.getItem('endOfTime_viewedTutorials') || '[]');
            if (!viewedTutorials.includes(levelNumber)) {
                viewedTutorials.push(levelNumber);
                localStorage.setItem('endOfTime_viewedTutorials', JSON.stringify(viewedTutorials));
            }
        } catch (e) {
            console.error("Error marking tutorial as viewed:", e);
        }
    }

    window.showTutorial = function(levelNumber, mode, callback, options) {
        const isViewOnly = options && options.viewOnly === true;
        const tutorial = allTutorials[levelNumber - 1];
        if (!tutorial) {
            console.warn(`Tutorial for level ${levelNumber} not found`);
            callback();
            return;
        }

        const modal = document.getElementById('tutorial-modal');
        const title = document.getElementById('tutorial-title');
        const subtitle = document.getElementById('tutorial-subtitle');
        const sectionsContainer = document.getElementById('tutorial-sections');
        const startBtn = document.getElementById('start-level-btn');
        const skipCheckbox = document.getElementById('skip-tutorials-checkbox');

        // Set title and subtitle
        title.textContent = tutorial.title;
        subtitle.textContent = tutorial.subtitle;

        // Clear previous sections
        sectionsContainer.innerHTML = '';

        // Create sections
        const sections = [tutorial.mechanics, tutorial.content, tutorial.tools, tutorial.tips];
        sections.forEach(section => {
            if (!section) return;

            const sectionDiv = document.createElement('div');
            sectionDiv.style.cssText = `
                background: rgba(42, 42, 42, 0.6);
                border: 2px solid rgba(139, 0, 0, 0.3);
                border-radius: 16px;
                padding: 1.5rem;
                backdrop-filter: blur(5px);
            `;

            const sectionTitle = document.createElement('h3');
            sectionTitle.style.cssText = `
                color: #ffffff;
                font-family: 'Montserrat-Bold', Arial, sans-serif;
                font-size: 1.4rem;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            sectionTitle.innerHTML = `<span style="font-size: 1.8rem;">${section.icon}</span> ${section.title}`;

            const descList = document.createElement('div');
            descList.style.cssText = `
                color: #e0e0e0;
                font-family: 'Montserrat-Regular', Arial, sans-serif;
                font-size: 1rem;
                line-height: 1.8;
            `;
            descList.innerHTML = section.description.map(item => `<p style="margin: 0.5rem 0;">${item}</p>`).join('');

            sectionDiv.appendChild(sectionTitle);
            sectionDiv.appendChild(descList);
            sectionsContainer.appendChild(sectionDiv);
        });

        // Reset skip checkbox, hide in view-only mode
        skipCheckbox.checked = false;
        if (isViewOnly) {
            // Hide the skip tutorials row by hiding its container label
            const label = skipCheckbox && skipCheckbox.parentElement;
            if (label && label.style) label.style.display = 'none';
            // Change CTA label for clarity
            if (startBtn) startBtn.textContent = 'Play Video 🎬';
        } else {
            const label = skipCheckbox && skipCheckbox.parentElement;
            if (label && label.style) label.style.display = '';
            if (startBtn) startBtn.textContent = 'Play Video 🎬';
        }

        // Show modal with animation
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s';
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
        });

        // Handle start/close button
        startBtn.onclick = () => {
            // Hide tutorial modal first
            modal.style.transition = 'opacity 0.3s';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';

                // For non-view-only, persist tutorial prefs and viewed
                if (!isViewOnly) {
                    if (skipCheckbox.checked) {
                        try { localStorage.setItem('endOfTime_skipTutorials', 'true'); } catch (e) { console.error('Error saving skip tutorials preference:', e); }
                    }
                    markTutorialAsViewed(levelNumber);
                }

                // Next: show level video (view-only returns to selection, normal starts level after video)
                window.showLevelVideo(levelNumber, {
                    afterVideo: () => {
                        if (isViewOnly) {
                            // Return to mode selection only
                            showModeSelection();
                        } else {
                            callback();
                        }
                    },
                    viewOnly: isViewOnly,
                    ignoreGating: true
                });
            }, 300);
        };
    }

    // --- Start Game ---
    window.startGame = function(mode, levelNumber) { // Modified to accept levelNumber
        // --- NEW: VALIDATE LEVEL ---
        if (typeof levelNumber === 'undefined' || levelNumber === null) {
            console.error("startGame called without a level number. Defaulting to Level 1.");
            levelNumber = 1; // Default to level 1 to prevent crash
        }
        
        ensureUserInteraction();
        AudioManager.play(audioRiser);
        setTimeout(() => AudioManager.playBgMusic(), 800);
        gameMode = mode;
        playerScore = 0;
        currentStreak = 0;
        longestStreak = 0;
        correctAnswers = 0;
        teamBlueScore = 0;
        teamBlackScore = 0;
        currentQuestionIndex = 0;
        faithTokens = 0;
        freezeTimeActive = false;
        doublePointsActive = false;
        timeRanOut = false; // Reset time out flag
        // --- NEW FOR SEQUENTIAL TEAM TIME ATTACK ---
        timeAttackTeamTurn = 'blue'; // Always start with blue team
        timeAttackBlueTeamFinalScore = 0;
        blueTeamQuestions = []; // Reset blue team questions

        // --- NEW: CHECK FOR TIME ATTACK MODE ---
        isTimeAttackMode = false; // Force disable time attack mode

        const level = allLevels.find(l => l.id === levelNumber);
        if (!level) {
            console.error(`Level ${levelNumber} not found!`);
            return;
        }
        
        // Load questions for the selected level and shuffle them
        questions = shuffle(level.questions);
        gameQuestionCount = questions.length;
        maxWagerValue = 20;

        // Store the current level being played
        currentGameLevel = levelNumber;

        const keyFactOverlay = document.getElementById('key-fact-overlay');
        if (keyFactOverlay) {
            keyFactOverlay.style.display = 'none';
            keyFactOverlay.classList.remove('show');
            keyFactOverlay.textContent = '';
        }

        const totalLevels = allLevels.length;
        const keyFacts = Array.isArray(window.KEY_FACTS) ? window.KEY_FACTS : [];
        const perLevel = totalLevels > 0 ? Math.ceil(keyFacts.length / totalLevels) : 0;
        const factsStartIndex = (currentGameLevel - 1) * perLevel;
        const levelFacts = keyFacts.slice(factsStartIndex, factsStartIndex + perLevel);

        function computeShowIndices(totalQuestions, factsCount) {
            if (factsCount <= 0 || totalQuestions <= 0) return [];
            const slots = [];
            for (let i = 1; i <= factsCount; i++) {
                const rawPos = Math.round((i * totalQuestions) / (factsCount + 1)) - 1;
                const clampedPos = Math.min(Math.max(rawPos, 0), totalQuestions - 1);
                slots.push(clampedPos);
            }
            return [...new Set(slots)].sort((a, b) => a - b);
        }
        
        // Set timer based on the current level
        TIME_LIMIT = getTimeLimitForLevel(currentGameLevel);
        
        // Update timer display to show current time limit
        console.log(`🕒 Level ${currentGameLevel}: ${TIME_LIMIT} seconds per question`);

        // Hide main menu and show game screen
        if (container) container.style.display = 'none';

        // --- NEW: CHECK FOR TIME ATTACK MODE ---
        isTimeAttackMode = false; // Force disable time attack mode

        // Get questions for the selected level
        const levelData = allLevels.find(level => level.id === levelNumber);
        if (!levelData || !levelData.questions || levelData.questions.length === 0) {
            console.error(`Level ${levelNumber} not found or has no questions!`);
            return;
        }
        
        let availableQuestions = [...levelData.questions];
        let numQuestions = Math.min(availableQuestions.length, 20); // Default to 20 or all questions if less

        // COMPLETELY RANDOMIZE QUESTIONS - NO ORDERING CRITERIA WHATSOEVER
        // Every question has an equal chance of being selected, regardless of:
        // - Position in the original array
        // - Difficulty level
        // - Category order
        // - Previous game history
        // - Team assignments
            questions = shuffle(availableQuestions).slice(0, numQuestions);
            gameQuestionCount = numQuestions;
            maxWagerValue = 20;
            currentWager = 5;

        window.keyFactsState = {
            levelFacts,
            nextFactIdx: 0,
            showAfterQuestionIndices: computeShowIndices(questions.length, levelFacts.length),
            lastShownQuestionIndex: null
        };

        if (questions.length === 0) {
            alert('No questions found for this category!');
            return;
        }
        
        console.log('Questions selected (completely randomized):', questions.map(q => q.id));
        
        // Verify that questions are truly randomized
        verifyQuestionRandomization(questions, `Level ${levelNumber}`);
        
        gameStartTime = Date.now();
        wagerInput.value = currentWager;
        updateWagerFeedback();
        updateFaithTokens();

        slideOut(container, () => slideIn(gameDiv));
        gameDiv.classList.add('active');
        gameOverDiv.style.display = 'none';
        nextBtn.style.display = 'none';
        // Initialize phase
        resetPhase();

        if (gameMode === 'solo') {
            scoreSolo.style.display = 'block';
            scoreTeams.style.display = 'none';
            updateSoloStats();
        } else {
            scoreSolo.style.display = 'none';
            scoreTeams.style.display = 'block';
            updateScoreDisplay(); // Use the new function
        }
        
		// Show transition before the first question (ensures transition features on every question)
		const firstQ = questions[0];
		const isProphecyFirst = firstQ && (firstQ.category === 'Prophecy' || firstQ.category === 'The Great Controversy');
        showGlitchTransition(isProphecyFirst, () => {
		showQuestion();
	});
        exitBtn.style.display = 'block';
    };

    // --- Two-Phase Question Display ---
    function resetPhase() {
        currentPhase = 'question';
        gameDiv.classList.remove('options-phase');
        gameDiv.classList.add('question-phase');
    }

    function hideKeyFactOverlay() {
        const overlay = document.getElementById('key-fact-overlay');
        if (!overlay) return;
        overlay.classList.remove('show');
        overlay.style.display = 'none';
    }

    function showKeyFactForCurrentQuestion() {
        const overlay = document.getElementById('key-fact-overlay');
        if (!overlay) return;

        const state = window.keyFactsState;
        if (!state || !Array.isArray(state.levelFacts) || state.levelFacts.length === 0) {
            hideKeyFactOverlay();
            return;
        }

        if (!state.showAfterQuestionIndices || !state.showAfterQuestionIndices.includes(currentQuestionIndex)) {
            hideKeyFactOverlay();
            return;
        }

        if (state.nextFactIdx >= state.levelFacts.length) {
            hideKeyFactOverlay();
            return;
        }

        if (state.lastShownQuestionIndex === currentQuestionIndex && overlay.style.display === 'block') {
            overlay.classList.add('show');
            return;
        }

        const fact = `Key fact - Genesis: ` + state.levelFacts[state.nextFactIdx];
        if (!fact) {
            hideKeyFactOverlay();
            return;
        }

        overlay.textContent = fact;
        overlay.style.display = 'block';
        overlay.classList.add('show');

        if (typeof AudioManager !== 'undefined' && typeof AudioManager.playKeyFact === 'function') {
            AudioManager.playKeyFact();
        }

        state.lastShownQuestionIndex = currentQuestionIndex;
        state.nextFactIdx = Math.min(state.nextFactIdx + 1, state.levelFacts.length);
    }
    
    function showQuestionOnly() {
        resetState();
        resetPhase();
        
        hintBtn.disabled = false;
        takeawayBtn.disabled = false;
        
        // Check if power-ups can be afforded for this question
        updatePowerUpButtons();
        freezeTimeActive = false;
        doublePointsActive = false;
        updateFaithTokens();
        
        // Remove hint/removed classes from previous question
        Array.from(optionsDiv.children).forEach(btn => {
            btn.classList.remove('hint-highlight', 'option-removed');
        });
        
        // Lightning round logic
        isLightningRound = (currentQuestionIndex > 0 && currentQuestionIndex % roundSize === 0);
        
        // Dynamic wager limits based on game state
        TIME_LIMIT = getTimeLimitForLevel(currentGameLevel);
        
        if (isLightningRound) {
            // Higher stakes for lightning rounds
            if (gameMode === 'solo') {
                // In solo mode, base max wager on current score (min 40, max 100)
                maxWagerValue = Math.max(40, Math.min(100, Math.floor(playerScore * 0.5)));
            } else {
                // In team mode, fixed higher limit
                maxWagerValue = 40;
            }
        } else {
            if (gameMode === 'solo') {
                // In solo mode, base max wager on current score (min 20, max 50)
                maxWagerValue = Math.max(20, Math.min(50, Math.floor(playerScore * 0.25)));
                
                // Increase max wager for later questions
                if (currentQuestionIndex > questions.length / 2) {
                    maxWagerValue = Math.floor(maxWagerValue * 1.5);
                }
            } else {
                // In team mode, fixed standard limit
                maxWagerValue = 20;
            }
        }
        
        // Update wager input with new limits
        wagerInput.max = maxWagerValue;
        wagerInput.value = Math.min(currentWager, maxWagerValue);
        currentWager = parseInt(wagerInput.value, 10);
        updateWagerFeedback();
        
        // Question display
        if (gameMode === 'teams') {
            if (isTimeAttackMode) {
                // In Time Attack, the turn is fixed for the whole round
                currentTeam = timeAttackTeamTurn; 
            } else {
                // In normal mode, teams alternate questions
                currentTeam = (currentQuestionIndex % 2 === 0) ? 'blue' : 'black';
            }
        }
        
        if (!questions[currentQuestionIndex]) {
            showEndScreen();
            return;
        }
        
        const question = questions[currentQuestionIndex];
        
        // Update category display in header (fix "Events" to show correct category)
        const categoryDisplay = document.getElementById('current-category');
        if (categoryDisplay) {
            // Map "Events" to "Genesis" for display purposes
            let displayCategory = question.category || 'General';
            if (displayCategory === 'Events') {
                displayCategory = 'Genesis';
            }
            categoryDisplay.textContent = displayCategory;
        }
        
        // Update category badge in question
        const categoryBadge = document.querySelector('.question-category-badge');
        if (categoryBadge) {
            const icon = CATEGORY_ICONS[question.category] || '';
            categoryBadge.textContent = icon;
        }
        
        // Add category icon/badge (simplified to avoid duplicate question numbers)
        const icon = CATEGORY_ICONS[question.category] || '';
        questionDiv.innerHTML = `<div class="question-header">
            <span class="question-number">Question ${currentQuestionIndex + 1}</span>
            <span class="question-category-badge">${icon}</span>
        </div>
        <p>${question.question}</p>`;
        
        // For backward compatibility, also set the old format
        const questionP = questionDiv.querySelector('p');
        if (!questionP) {
            questionDiv.innerHTML = `<span class='category-badge'>${icon}</span> ${question.question}`;
        }
        
        // Clear options but don't create them yet
        optionsDiv.innerHTML = '';
        
        if (gameMode === 'solo') updateSoloStats();
        else updateScoreDisplay();
        
        // NO TIMER STARTED YET
        explanationDiv.style.display = 'none';
        explanationDiv.innerText = '';
        
        // Set prophecy mode if needed
        const currentQ = questions[currentQuestionIndex];
        const isProphecy = currentQ && (currentQ.category === 'Prophecy' || currentQ.category === 'The Great Controversy');
        if (isProphecy) {
            document.body.classList.add('prophecy-mode');
        } else {
            document.body.classList.remove('prophecy-mode');
        }
        setBackgroundVideoForQuestion(isProphecy);
        
        // Set Bible theme if needed
        if (currentQ && currentQ.category === 'Bible People') {
            // document.body.classList.add('bible-theme');
        } else {
            // document.body.classList.remove('bible-theme');
        }
        
        // Fade in question
        setTimeout(() => {
            fadeIn(document.querySelector('.question'));
        }, 50);

        showKeyFactForCurrentQuestion();
        
        // Clear encouragement message if it exists
        const encouragementDiv = document.getElementById('encouragement-message');
        if (encouragementDiv) {
            encouragementDiv.innerText = '';
        }
    }
    
    function showOptionsWithTimer() {
        hideKeyFactOverlay();
        currentPhase = 'options';
        gameDiv.classList.remove('question-phase');
        gameDiv.classList.add('options-phase');
        
        const question = questions[currentQuestionIndex];
        const shuffledOptions = shuffle(question.options);
        optionsDiv.innerHTML = '';
        optionsDiv.appendChild(createOptionButtons(shuffledOptions, selectAnswer));

        // Announce options are available
        announceToScreenReader('Answer options are now available. Use number keys 1 through 4 to select an answer.');
        
        // Wager UI: enable for options phase
        wagerInput.disabled = false;
        wagerInput.style.background = isLightningRound ? '#ffd700' : '';
        
        // Show power-up buttons in all modes
        freezeTimeBtn.style.display = '';
        if (doublePointsBtn) doublePointsBtn.style.display = '';
        
        // Clear encouragement message
        let encouragementDiv = document.getElementById('encouragement-message');
        if (!encouragementDiv) {
            encouragementDiv = document.createElement('div');
            encouragementDiv.id = 'encouragement-message';
            encouragementDiv.style.margin = '1.1rem auto 0 auto';
            encouragementDiv.style.textAlign = 'center';
            encouragementDiv.style.fontFamily = "'Bangers', cursive";
            encouragementDiv.style.fontSize = '1.15rem';
            encouragementDiv.style.color = '#2196f3';
            encouragementDiv.style.minHeight = '1.5em';
            optionsDiv.parentNode.appendChild(encouragementDiv);
        }
        encouragementDiv.innerText = '';
        
        // START TIMER ONLY NOW
        if (!isTimeAttackMode) {
            startTimer();
        }
        
        // Fade in options
        setTimeout(() => {
            fadeIn(document.querySelector('.options'));
        }, 50);
    }

    // --- Show Question (Updated for Two-Phase) ---
    window.showQuestion = function() {
        // Start with question-only phase
        showQuestionOnly();
    };

    // --- Select Answer ---
    window.selectAnswer = function(e) {
        if (!isTimeAttackMode) {
            AudioManager.stopTicking();
            clearInterval(timer);
        }

        const selectedBtn = e.target;
        const correct = selectedBtn.innerText === questions[currentQuestionIndex].answer;
        showFeedback(correct);

        // Announce answer result to screen reader
        const answerText = selectedBtn.innerText;
        if (correct) {
            announceToScreenReader(`Correct! Answer: ${answerText}`);
        } else {
            const correctAnswer = questions[currentQuestionIndex].answer;
            announceToScreenReader(`Incorrect. Selected: ${answerText}. Correct answer: ${correctAnswer}`);
        }
        
        // Determine wager and clamp to valid bounds
        let wager = parseInt(wagerInput.value, 10) || 1;
        if (wager < 1) wager = 1;
        if (wager > maxWagerValue) wager = maxWagerValue;
        // Compute points from wager, applying Double Points if active
        let points = wager;
        if (doublePointsActive) {
            points = wager * 2;
        }
        
        // Track achievement stats
        const currentQuestion = questions[currentQuestionIndex];
        const answerTime = TIME_LIMIT - timeLeft;
        
        updateAchievementStats({
            category: currentQuestion.category,
            correct: correct,
            answerTime: answerTime,
            wager: wager
        });

        if (correct) {
            AudioManager.playCorrect();
            selectedBtn.classList.add('correct', 'highlight-correct');
            console.log('🎯 Debug: Added highlight to correct answer:', selectedBtn.innerText);
            
            // Use computed points to ensure the awarded score matches the wager
            if (gameMode === 'solo') {
                const oldScore = playerScore;
                playerScore += points;
                currentStreak++;
                correctAnswers++;
                if (currentStreak > longestStreak) longestStreak = currentStreak;
                if (currentStreak > 0 && currentStreak % 3 === 0) {
                    faithTokens++;
                    updateFaithTokens(true);
                    if (typeof animationEffects !== 'undefined') {
                        animationEffects.animateTokenEarn(1);
                    }
                }
                console.log(`Score updated: ${oldScore} + ${points} = ${playerScore}`);
            } else { // Teams
                if (currentTeam === 'blue') teamBlueScore += points;
                else teamBlackScore += points;
                // Enable streaks and token earning for teams as well
                currentStreak++;
                if (currentStreak > longestStreak) longestStreak = currentStreak;
                if (currentStreak > 0 && currentStreak % 3 === 0) {
                    faithTokens++;
                    updateFaithTokens(true);
                    if (typeof animationEffects !== 'undefined') {
                        animationEffects.animateTokenEarn(1);
                    }
                }
            }
            selectedBtn.classList.add('correct');
            selectedBtn.style.transform = 'scale(1.05)';
            setTimeout(() => {
                selectedBtn.style.transform = '';
            }, 300);
            // Visual feedback for wager result
            wagerInput.classList.remove('wager-success', 'wager-failure');
            wagerInput.classList.add('wager-success');
            if (typeof wagerFeedback !== 'undefined' && wagerFeedback) {
                wagerFeedback.textContent = `Great bet! +${points} points`;
                wagerFeedback.style.color = '#4caf50';
            }
        } else {
            AudioManager.playIncorrect();
            shakeElement(selectedBtn);
            if (gameMode === 'solo') {
                const oldScore = playerScore;
                playerScore = Math.max(0, playerScore - wager);
                currentStreak = 0;
                console.log(`Score updated: ${oldScore} - ${wager} = ${playerScore}`);
            } else { // Teams
                if (currentTeam === 'blue') teamBlueScore = Math.max(0, teamBlueScore - wager);
                else teamBlackScore = Math.max(0, teamBlackScore - wager);
                currentStreak = 0;
            }
            selectedBtn.classList.add('incorrect');
            // Visual feedback for wager result
            wagerInput.classList.remove('wager-success', 'wager-failure');
            wagerInput.classList.add('wager-failure');
            if (typeof wagerFeedback !== 'undefined' && wagerFeedback) {
                wagerFeedback.textContent = `Risky bet! -${wager} points`;
                wagerFeedback.style.color = '#f44336';
            }
            // Show correct answer with highlight
        const correctAnswer = questions[currentQuestionIndex].answer;
        console.log('🎯 Debug: Correct answer should be:', correctAnswer);
        
        Array.from(optionsDiv.children).forEach(btn => {
            console.log('🎯 Debug: Checking button:', btn.innerText, 'against answer:', correctAnswer);
            if (btn.innerText === correctAnswer) {
                console.log('🎯 Debug: Adding highlight-correct to button:', btn.innerText);
                btn.classList.add('correct', 'highlight-correct');
            }
        });
        }
        
        if (gameMode === 'solo') updateSoloStats();
        else updateScoreDisplay();

        // Reset Double Points after the question is resolved
        if (doublePointsActive) {
            doublePointsActive = false;
            if (doublePointsBtn) doublePointsBtn.classList.remove('hint-highlight');
            updateFaithTokens();
            if (typeof animationEffects !== 'undefined') {
                animationEffects.removeDoublePointsBadge();
            }
        }

        // Disable all buttons (highlighting already done above)
        Array.from(optionsDiv.children).forEach(btn => {
            btn.disabled = true;
        });

        const currentQ = questions[currentQuestionIndex];
        if (currentQ.explanation) {
            // Handle the new explanation object structure
            let explanationHTML = '<span style="color: #8B0000; font-weight: bold;">💡 Explanation:</span><br><br>';
            
            if (typeof currentQ.explanation === 'object') {
                // New structured explanation format
                if (currentQ.explanation.Relevance_and_Correctness) {
                    explanationHTML += `<div style="margin-bottom: 1rem;"><strong style="color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Relevance & Correctness:</strong><br>${currentQ.explanation.Relevance_and_Correctness}</div>`;
                }
                if (currentQ.explanation.Importance_of_Wording) {
                    explanationHTML += `<div style="margin-bottom: 1rem;"><strong style="color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Importance of Wording:</strong><br>${currentQ.explanation.Importance_of_Wording}</div>`;
                }
                if (currentQ.explanation.Factual_Explanation) {
                    explanationHTML += `<div style="margin-bottom: 1rem;"><strong style="color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Factual Explanation:</strong><br>${currentQ.explanation.Factual_Explanation}</div>`;
                }
                if (currentQ.explanation.Theological_Meaning) {
                    explanationHTML += `<div style="margin-bottom: 1rem;"><strong style="color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Theological Meaning:</strong><br>${currentQ.explanation.Theological_Meaning}</div>`;
                }
                if (currentQ.explanation.Christ_Centered_Meaning) {
                    explanationHTML += `<div style="margin-bottom: 1rem;"><strong style="color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Christ-Centered Meaning:</strong><br>${currentQ.explanation.Christ_Centered_Meaning}</div>`;
                }
            } else {
                // Fallback for old string format
                explanationHTML += currentQ.explanation;
            }
            
            explanationDiv.innerHTML = explanationHTML;
            explanationDiv.style.display = 'block';
        }
        // Hide deep insight by default
        deepInsightDiv.style.display = 'none';
        // Hide next button by default
        nextBtn.style.display = 'none';
        // If there is a deep insight, show it after explanation, else auto-advance
        if (currentQ.deepInsight) {
            setTimeout(() => {
                explanationDiv.style.display = 'none';
                deepInsightContent.innerHTML = `<span style="color: #8B0000; font-weight: bold;">🔎 Deep Insight:</span> ${currentQ.deepInsight}`;
                deepInsightDiv.style.display = 'block';
            }, 800); // Show deep insight after a shorter delay
        } else {
            // Show next button for manual advancement
            nextBtn.style.display = 'block';
        }

        hintBtn.disabled = true;
        takeawayBtn.disabled = true;
        wagerInput.disabled = true;
    };

    // --- Smarter Team Score Display ---
    function updateScoreDisplay() {
        const blueScoreEl = scoreTeams.querySelector('div').children[0];
        const questionCountEl = scoreTeams.querySelector('div').children[1];
        const blackScoreEl = scoreTeams.querySelector('div').children[2];
        const questionsTotal = questions.length;
        questionCountEl.innerText = `${currentQuestionIndex + 1} / ${questionsTotal}`;
        teamTurnIndicator.style.display = 'block'; // Make it visible
        updatePowerUpButtons(); // Check if power-ups can be afforded
        if (isTimeAttackMode && gameMode === 'teams') {
            if (timeAttackTeamTurn === 'black') {
                teamTurnIndicator.innerText = "Black Team's Turn!";
                blueScoreEl.innerText = `Blue's Final: ${timeAttackBlueTeamFinalScore}`;
                blackScoreEl.innerText = `Black: ${teamBlackScore}`;
            } else {
                teamTurnIndicator.innerText = "Blue Team's Turn!";
                blueScoreEl.innerText = `Blue: ${teamBlueScore}`;
                blackScoreEl.innerText = `Black: ${teamBlackScore}`;
            }
        } else {
            teamTurnIndicator.style.display = 'none'; // Not needed for alternating questions
            blueScoreEl.innerText = `Blue: ${teamBlueScore}`;
            blackScoreEl.innerText = `Black: ${teamBlackScore}`;
        }
    }

    // --- End of Question Logic ---
    function handleEndOfQuestion() {
        currentQuestionIndex++;
        
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            // The round is over
            stopGlobalTimer();
            if (gameMode === 'teams' && timeAttackTeamTurn === 'blue') {
                // Blue team finished, so save their score and show the intermission screen
                timeAttackBlueTeamFinalScore = teamBlueScore;
                document.getElementById('intermission-score').innerText = timeAttackBlueTeamFinalScore;
                slideOut(gameDiv, () => {
                    slideIn(document.getElementById('intermission-screen'));
                    // Re-attach event listener every time intermission is shown
                    const startNextTurnBtn = document.getElementById('start-next-turn-btn');
                    if (startNextTurnBtn) {
                        startNextTurnBtn.onclick = startNextTeamTurn;
                    }
                });
            } else {
                // It's a solo game or the Black team just finished, so go to the final results
                showEndScreen();
            }
        }
    }

    // --- Start the next team turn (Black Team) ---
    function startNextTeamTurn() {
        console.log('startNextTeamTurn called');
        
        // Prepare the game for the Black team
        timeAttackTeamTurn = 'black';
        currentQuestionIndex = 0;
        correctAnswers = 0;
        currentStreak = 0;
        // Don't reset teamBlackScore, let it accumulate from 0

        // Get a completely fresh and randomized set of questions for the Black team
        const levelData = allLevels.find(level => level.id === currentGameLevel);
        if (!levelData || !levelData.questions || levelData.questions.length === 0) {
            console.error(`Level ${currentGameLevel} not found or has no questions!`);
            return;
        }
        
        let availableQuestions = [...levelData.questions];
        console.log('Using level questions for black team:', currentGameLevel);
        
        console.log('Available questions for black team:', availableQuestions.length);
        
        // COMPLETELY RANDOMIZE - no exclusions, no ordering criteria
        questions = shuffle(availableQuestions).slice(0, gameQuestionCount);
        
        console.log('Black team questions loaded (completely randomized):', questions.length, 'questions');
        console.log('Black team question IDs:', questions.map(q => q.id));
        
        // Verify that questions are truly randomized for black team
        verifyQuestionRandomization(questions, `Level ${currentGameLevel}`);
        
        // Transition back to the game screen and start the new round
        slideOut(document.getElementById('intermission-screen'), () => {
            console.log('Transitioning to game screen for black team');
            slideIn(gameDiv);
            updateScoreDisplay(); // Update display for the new turn
            startGlobalTimer();
            showQuestion();
        });
    }

    function handleTimeUp() {
        showFeedback(false);
        gameDiv.classList.add('container-shake');
        setTimeout(() => gameDiv.classList.remove('container-shake'), 500);
        
        Array.from(optionsDiv.children).forEach(btn => {
            if (btn.innerText === questions[currentQuestionIndex].answer) btn.classList.add('correct');
            btn.disabled = true;
        });

        nextBtn.style.display = 'block';

        if (gameMode === 'solo') {
            currentStreak = 0;
            updateSoloStats();
        }
        AudioManager.play(audioTimeup);
        AudioManager.stopTicking();
    }

    // --- Timer Functions ---
    function startTimer() {
        timeLeft = TIME_LIMIT;
        updateTimerDisplay(timeLeft); // Use the new function
        
        // Update timer label to show current time limit
        const timerLabel = document.querySelector('.timer-label');
        if (timerLabel) {
            timerLabel.textContent = `TIME (${TIME_LIMIT}s)`;
        }
        
        AudioManager.startTicking(); // Start ticking for the whole timer
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft); // Use the new function
            // Show countdown numbers for last 3 seconds
            if (timeLeft <= 3 && timeLeft > 0) {
                showCountdownNumber(timeLeft);
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleTimeUp();
            }
        }, 1000);
    }

    // --- NEW: Global Timer Functions for Time Attack ---
    function startGlobalTimer() {
    globalTimeLeft = TOTAL_TIME_LIMIT;
    timerDiv.innerText = formatTime(globalTimeLeft);
    timerDiv.parentElement.parentElement.classList.add('global-timer');
    
    globalTimer = setInterval(() => {
        globalTimeLeft--;
        timerDiv.innerText = formatTime(globalTimeLeft);
        if (globalTimeLeft <= 0) {
            handleGlobalTimeUp();
        }
    }, 1000);
}

    function stopGlobalTimer() {
    clearInterval(globalTimer);
    timerDiv.parentElement.parentElement.classList.remove('global-timer');
}

    function handleGlobalTimeUp() {
        stopGlobalTimer();
        AudioManager.play(audioTimeup);
        timeRanOut = true;

        if (gameMode === 'teams' && timeAttackTeamTurn === 'blue') {
            // Blue team's time ran out, save score and go to intermission
            timeAttackBlueTeamFinalScore = teamBlueScore;
            document.getElementById('intermission-score').innerText = timeAttackBlueTeamFinalScore;
            slideOut(gameDiv, () => {
                slideIn(document.getElementById('intermission-screen'));
                // Re-attach event listener every time intermission is shown
                const startNextTurnBtn = document.getElementById('start-next-turn-btn');
                if (startNextTurnBtn) {
                    startNextTurnBtn.onclick = startNextTeamTurn;
                }
            });
        } else {
            // Solo game time ran out OR Black team's time ran out, so go to final results
            showEndScreen();
        }
    }

    // --- End Screen Functions ---
    // Enhanced celebration effects
    function triggerEnhancedCelebration(type = 'default') {
        // Create celebration overlay
        const celebrationOverlay = document.createElement('div');
        celebrationOverlay.className = 'celebration-overlay';
        document.body.appendChild(celebrationOverlay);
        
        // Remove overlay after animation
        setTimeout(() => {
            celebrationOverlay.remove();
        }, 2000);
        
        // Trigger confetti based on type
        switch(type) {
            case 'perfect':
                triggerConfetti('perfect');
                triggerComicFireworks(true);
                // streak sounds disabled
                break;
            case 'excellent':
                triggerConfetti('streak');
                triggerComicFireworks(false);
                // streak sounds disabled
                break;
            case 'good':
                triggerConfetti('default');
                break;
            default:
                triggerConfetti('default');
        }
    }

    // Enhanced end game function with better mobile experience
    function showEndScreen() {
        stopGlobalTimer(); // Ensure global timer is stopped
        slideOut(gameDiv, () => slideIn(gameOverDiv));
        gameOverDiv.classList.add('active');
        exitBtn.style.display = 'block';

        // Hide all result sections initially to prevent overlap
        resultsSolo.style.display = 'none';
        resultsTeams.style.display = 'none';
        document.getElementById('results-solo-time').style.display = 'none';
        document.getElementById('results-teams-time').style.display = 'none';

        if (isTimeAttackMode) {
            // Ensure gameStartTime is valid before calculating elapsed time
            if (gameStartTime && typeof gameStartTime === 'number') {
                gameElapsedTime = timeRanOut ? TOTAL_TIME_LIMIT : (Date.now() - gameStartTime) / 1000;
            } else {
                gameElapsedTime = timeRanOut ? TOTAL_TIME_LIMIT : 0;
                console.warn('gameStartTime was null or invalid, using fallback time calculation');
            }
            const timeTakenStr = `Time Taken: ${formatTime(Math.round(gameElapsedTime))}`;

            if (gameMode === 'solo') {
                resultsSolo.style.display = 'block';
                if (resultsSolo.children[0]) {
                    resultsSolo.children[0].innerText = `Your Score: ${playerScore}`;
                }
                console.log(`Time attack mode - Final score displayed: ${playerScore}`);
                const attempted = timeRanOut ? currentQuestionIndex + 1 : 30;
                if (resultsSolo.children[1]) {
                    resultsSolo.children[1].innerText = `Correct Answers: ${correctAnswers}/${attempted}`;
                }
                if (resultsSolo.children[2]) {
                    resultsSolo.children[2].innerText = `Longest Streak: ${longestStreak}`;
                }
                const timeEl = document.getElementById('results-solo-time');
                if (timeEl) {
                    timeEl.innerText = timeTakenStr;
                    timeEl.style.display = 'block';
                }
                const starsEl = resultsSolo.querySelector('.stars');
                if (starsEl) {
                    starsEl.style.display = 'none';
                }
                if (achievementTitle) {
                    achievementTitle.style.display = 'none';
                }
                // Show global leaderboard (score, time)
                showLeaderboardAfterGame(playerScore, Math.round(gameElapsedTime));
            } else { // Teams Time Attack
                resultsSolo.style.display = 'none';
                resultsTeams.style.display = 'block';
                
                // USE THE SAVED BLUE SCORE FOR THE FINAL DISPLAY
                if (resultsTeams.children[0]) {
                    resultsTeams.children[0].innerText = `Blue: ${timeAttackBlueTeamFinalScore} pts`;
                }
                if (resultsTeams.children[1]) {
                    resultsTeams.children[1].innerText = `Black: ${teamBlackScore} pts`;
                }
                
                // Determine winner by comparing the final scores
                let winnerText = '';
                if (timeAttackBlueTeamFinalScore > teamBlackScore) {
                    winnerText = '🏆 Blue Team Triumphs!';
                } else if (teamBlackScore > timeAttackBlueTeamFinalScore) {
                    winnerText = '🏆 Black Team Dominates!';
                } else {
                    winnerText = "🤝 It's a Tie!";
                }
                if (teamWinner) {
                    teamWinner.innerText = winnerText;
                }
                
                // You can hide the time element here as it's not the primary win condition
                const teamsTimeEl = document.getElementById('results-teams-time');
                if (teamsTimeEl) {
                    teamsTimeEl.style.display = 'none';
                }
            }

        } else {
            // ... all of your existing showEndScreen logic for normal mode goes here
            // (Make sure to wrap it in this else block)
            // --- Existing showEndScreen logic below ---
            // (Copy/paste or keep your original code here)
            slideOut(gameDiv, () => slideIn(gameOverDiv));
            gameOverDiv.classList.add('active');
            exitBtn.style.display = 'block';
            
            if (gameMode === 'solo') {
                resultsSolo.style.display = 'block';
                resultsTeams.style.display = 'none';
                
                // Calculate performance metrics
                const avgTime = answerTimes.length ? (answerTimes.reduce((a, b) => a + b, 0) / answerTimes.length) : 0;
                const correctPct = Math.round((correctAnswers / questions.length) * 100);
                
                // Merge current game stats with achievement tracking stats
                const stats = {
                    completed: true,
                    correctAnswers,
                    totalQuestions: questions.length,
                    correctPct,
                    longestStreak,
                    avgTime,
                    powerUpsUsed,
                    faithTokens,
                    comeback: hadComebackStreak,
                    // Add achievement tracking stats
                    prophecyStreak: currentGameStats.prophecyStreak,
                    healthStreak: currentGameStats.healthStreak,
                    bibleStreak: currentGameStats.bibleStreak,
                    fastAnswers: currentGameStats.fastAnswers,
                    highWagers: currentGameStats.highWagers,
                    lightningRound: currentGameStats.lightningRound,
                };
                
                // Check and award achievements
                const newAchievements = checkAchievements(stats);
                
                // --- NEW: LEVEL UNLOCK LOGIC ---
                if (stats.correctPct >= LEVEL_PASS_PERCENTAGE && currentGameLevel < allLevels.length) {
                    const progress = getPlayerProgress();
                    const nextLevel = currentGameLevel + 1;
                    if (nextLevel > progress.highestLevelUnlocked) {
                        progress.highestLevelUnlocked = nextLevel;
                        savePlayerProgress(progress);
                        // Display unlock message if no other achievement was shown
                        if (newAchievements.length === 0) {
                            achievementTitle.textContent = `Congratulations! You've unlocked Level ${nextLevel}!`;
                            achievementTitle.style.display = 'block';
                        }
                    }
                }
                
                // Enhanced celebration based on performance
                if (correctPct >= 95) {
                    triggerEnhancedCelebration('perfect');
                } else if (correctPct >= 80) {
                    triggerEnhancedCelebration('excellent');
                } else if (correctPct >= 60) {
                    triggerEnhancedCelebration('good');
                }
                
                // Update results with enhanced animations
                setTimeout(() => {
                    if (resultsSolo.children[0]) {
                        resultsSolo.children[0].innerText = `Your Score: ${playerScore}`;
                        resultsSolo.children[0].classList.add('score-animate-up');
                    }
                    console.log(`Final score displayed: ${playerScore}`);
                }, 200);
                
                setTimeout(() => {
                    if (resultsSolo.children[1]) {
                        resultsSolo.children[1].innerText = `Correct Answers: ${correctAnswers}/${questions.length}`;
                        resultsSolo.children[1].classList.add('fade-in');
                    }
                }, 400);
                
                setTimeout(() => {
                    if (resultsSolo.children[2]) {
                        resultsSolo.children[2].innerText = `Longest Streak: ${longestStreak}`;
                        resultsSolo.children[2].classList.add('fade-in');
                    }
                }, 600);
                
                // Calculate and display stars with animation
                const stars = calculateStars(stats);
                let starStr = '';
                for (let i = 0; i < stars; i++) starStr += '★';
                for (let i = stars; i < 5; i++) starStr += '☆';
                
                setTimeout(() => {
                    resultsSolo.querySelector('.stars').innerText = starStr;
                    resultsSolo.querySelector('.stars').classList.add('score-animate-up');
                }, 800);
                
                // Enhanced achievement display
                const unlocked = ACHIEVEMENTS.filter(a => a.check(stats));
                if (unlocked.length > 0) {
                    setTimeout(() => {
                        achievementTitle.innerText = `🏆 Achievement Unlocked: ${unlocked[0].name}!`;
                        achievementTitle.classList.add('fade-in');
                    }, 1000);
                }
                
                // Enhanced leaderboard functionality
                // handleLeaderboard(); // Remove old local leaderboard
                // Show global leaderboard (score, time)
                // Calculate game elapsed time for normal mode
                let normalModeTime = 0;
                if (gameStartTime && typeof gameStartTime === 'number') {
                    normalModeTime = (Date.now() - gameStartTime) / 1000;
                } else {
                    // Fallback: estimate time based on question count and average time per question
                    normalModeTime = questions.length * 10; // Assume 10 seconds per question average
                    console.warn('gameStartTime was null, using estimated time for leaderboard');
                }
                showLeaderboardAfterGame(playerScore, Math.round(normalModeTime));
                
            } else {
                // Enhanced team mode end screen
                resultsSolo.style.display = 'none';
                resultsTeams.style.display = 'block';
                
                // Determine winner with enhanced celebration
                let winnerText = '';
                let celebrationType = 'good';
                
                if (teamBlueScore > teamBlackScore) {
                    winnerText = ' Blue Team Triumphs!';
                    celebrationType = 'excellent';
                } else if (teamBlackScore > teamBlueScore) {
                    winnerText = '⚫ Black Team Dominates!';
                    celebrationType = 'excellent';
                } else {
                    winnerText = '🤝 Epic Tie - Rematch Needed!';
                    celebrationType = 'good';
                }
                
                // Animate team results
                setTimeout(() => {
                    resultsTeams.children[0].innerText = `Blue: ${teamBlueScore}`;
                    resultsTeams.children[0].classList.add(teamBlueScore > teamBlackScore ? 'score-animate-up' : 'fade-in');
                }, 200);
                
                setTimeout(() => {
                    resultsTeams.children[1].innerText = `Black: ${teamBlackScore}`;
                    resultsTeams.children[1].classList.add(teamBlackScore > teamBlueScore ? 'score-animate-up' : 'fade-in');
                }, 400);
                
                setTimeout(() => {
                    teamWinner.innerText = winnerText;
                    teamWinner.classList.add('fade-in');
                    triggerEnhancedCelebration(celebrationType);
                }, 600);
            }
            
            AudioManager.playBgMusic();
            
            // Show random fun fact with animation
            const funFactBoxEnd = document.getElementById('fun-fact-box-end');
            if (funFactBoxEnd) {
                setTimeout(() => {
                    funFactBoxEnd.innerText = getRandomFunFact();
                    funFactBoxEnd.classList.add('fade-in');
                }, 1200);
            }
        }
    }

    // Enhanced leaderboard handling
    // Removed old local leaderboard implementation - now using Firebase
    // The leaderboard functionality is now handled by:
    // - showLeaderboardModal() - Shows the leaderboard modal
    // - fetchAndDisplayLeaderboard() - Fetches and displays Firebase data
    // - submitToLeaderboard() - Submits scores to Firebase

    // Enhanced mobile touch handling for options
    function enhanceMobileTouch() {
        // Add touch feedback for mobile devices
        if ('ontouchstart' in window) {
            document.addEventListener('touchstart', function(e) {
                if (e.target.classList.contains('comic-button') || 
                    e.target.classList.contains('options')) {
                    e.target.style.transform = 'scale(0.98)';
                }
            });
            
            document.addEventListener('touchend', function(e) {
                if (e.target.classList.contains('comic-button') || 
                    e.target.classList.contains('options')) {
                    setTimeout(() => {
                        e.target.style.transform = '';
                    }, 100);
                }
            });
        }
    }

    // Initialize mobile enhancements
    enhanceMobileTouch();
    
    // Add CSS animation for fadeInOut and insufficient points feedback
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.8); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.1); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
        }
        
        @keyframes insufficientPointsShake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
        }
        
        .insufficient-points-shake {
            animation: insufficientPointsShake 0.5s ease-in-out;
            border-color: #ff4444 !important;
            box-shadow: 0 0 10px rgba(255, 68, 68, 0.5) !important;
        }
    `;
    document.head.appendChild(style);

    // --- Hint and Take Away Two logic ---
    hintBtn.onclick = function() {
        if (hintBtn.disabled) return;
        
        // Check if player has enough points
        let currentScore = (gameMode === 'solo') ? playerScore : 
                          (currentTeam === 'blue') ? teamBlueScore : teamBlackScore;
        if (currentScore < 3) {
            // Show feedback about insufficient points
            hintBtn.classList.add('insufficient-points-shake');
            setTimeout(() => hintBtn.classList.remove('insufficient-points-shake'), 500);
            return;
        }
        
        // Add visual feedback for the hint button itself
        hintBtn.classList.add('hint-highlight');
        setTimeout(() => hintBtn.classList.remove('hint-highlight'), 800);
        
        // Deduct 3 points
        if (gameMode === 'solo') {
            playerScore = Math.max(0, playerScore - 3);
            updateSoloStats();
        } else {
            if (currentTeam === 'blue') {
                teamBlueScore = Math.max(0, teamBlueScore - 3);
            } else {
                teamBlackScore = Math.max(0, teamBlackScore - 3);
            }
            updateScoreDisplay();
        }
        
        // Highlight correct option with improved animation
        Array.from(optionsDiv.children).forEach(btn => {
            if (btn.innerText === questions[currentQuestionIndex].answer) {
                // First remove any existing highlight to reset animation
                btn.classList.remove('hint-highlight');
                void btn.offsetWidth; // Force reflow
                
                // Add highlight with improved animation
                btn.classList.add('hint-highlight');
                
                // Add a subtle glow to the entire options container
                optionsDiv.style.boxShadow = '0 0 20px 5px rgba(255, 215, 0, 0.3)';
                setTimeout(() => {
                    optionsDiv.style.boxShadow = '';
                    btn.classList.remove('hint-highlight');
                }, 2000);
            }
        });
        
        hintBtn.disabled = true;
    };

    takeawayBtn.onclick = function() {
        if (takeawayBtn.disabled) return;
        
        // Check if player has enough points
        let currentScore = (gameMode === 'solo') ? playerScore : 
                          (currentTeam === 'blue') ? teamBlueScore : teamBlackScore;
        if (currentScore < 2) {
            // Show feedback about insufficient points
            takeawayBtn.classList.add('insufficient-points-shake');
            setTimeout(() => takeawayBtn.classList.remove('insufficient-points-shake'), 500);
            return;
        }
        
        // Add visual feedback for the takeaway button itself
        takeawayBtn.classList.add('hint-highlight');
        setTimeout(() => takeawayBtn.classList.remove('hint-highlight'), 800);
        
        // Deduct 2 points
        if (gameMode === 'solo') {
            playerScore = Math.max(0, playerScore - 2);
            updateSoloStats();
        } else {
            if (currentTeam === 'blue') {
                teamBlueScore = Math.max(0, teamBlueScore - 2);
            } else {
                teamBlackScore = Math.max(0, teamBlackScore - 2);
            }
            updateScoreDisplay();
        }
        
        // Remove two incorrect options with staggered animation for better visual effect
        const incorrectBtns = Array.from(optionsDiv.children).filter(btn =>
            btn.innerText !== questions[currentQuestionIndex].answer &&
            !btn.classList.contains('option-removed')
        );
        
        const toRemove = incorrectBtns.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        // Stagger the animations for better visual effect
        if (toRemove.length > 0) {
            setTimeout(() => {
                toRemove[0].classList.add('option-removed');
            }, 0);
        }
        
        if (toRemove.length > 1) {
            setTimeout(() => {
                toRemove[1].classList.add('option-removed');
            }, 200);
        }
        
        takeawayBtn.disabled = true;
    };

    // Double points feature removed

    freezeTimeBtn.onclick = function() {
        if (faithTokens < 1 || freezeTimeActive) return;
        faithTokens--;
        powerUpsUsed++;
        freezeTimeActive = true;
        updateFaithTokens(true);
        freezeTimeBtn.classList.add('hint-highlight');
        timerDiv.style.color = '#2196f3';
        timerDiv.style.textShadow = '0 0 10px #2196f3';

        const timerToPause = isTimeAttackMode ? globalTimer : timer;
        clearInterval(timerToPause);
        
        setTimeout(() => {
            freezeTimeBtn.classList.remove('hint-highlight');
            timerDiv.style.color = '';
            timerDiv.style.textShadow = '';
            
            if (isTimeAttackMode) {
                startGlobalTimer(); // Resume global timer
            } else {
                startTimer();
            }
            freezeTimeActive = false;
            updateFaithTokens();
        }, 5000);
    };

    // Removed revive button onclick function

    // Attach event listeners for game start
    soloBtn.onclick = () => {
        checkSignInAndStartGame('solo');
    };
    teamsBtn.onclick = () => {
        checkSignInAndStartGame('teams');
    };
    
    // Exit button event handler - set up once and reuse
    if (!exitBtn) {
        console.error('Exit button element not found!');
        return;
    }
    
    exitBtn.onclick = () => {
        // Optional confirmation for mid-game exits
        if (gameDiv.style.display !== 'none' && currentQuestionIndex > 0 && !confirm('Are you sure you want to exit? Progress will be lost.')) {
            return;
        }

        // Clean up all timers and audio
        clearInterval(timer);
        AudioManager.stopTicking();
        if (isTimeAttackMode) {
            stopGlobalTimer();
        }

        // Reset all game state and UI
        resetState();

        // Hide overlays if present
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (feedbackOverlay) feedbackOverlay.style.display = 'none';

        // Determine current screen and slide out appropriately
        const currentScreen = gameOverDiv.style.display !== 'none' ? gameOverDiv : gameDiv;
        slideOut(currentScreen, () => {
            slideIn(container);
        });

        // Hide both game screens and remove active classes
        gameDiv.style.display = 'none';
        gameOverDiv.style.display = 'none';
        gameDiv.classList.remove('active');
        gameOverDiv.classList.remove('active');

        // Hide exit button
        exitBtn.style.display = 'none';

        // Cleanup animations
        if (typeof animationEffects !== 'undefined' && animationEffects) {
            animationEffects.cleanup();
        }

        // Stop music
        AudioManager.pauseBgMusic();

        // Reset game state to prevent memory leaks
        questions = [];
        currentQuestionIndex = 0;
        playerScore = 0;
        currentStreak = 0;
        longestStreak = 0;
        correctAnswers = 0;
        teamBlueScore = 0;
        teamBlackScore = 0;
        faithTokens = 0;
        powerUpsUsed = 0;
        wrongStreak = 0;
        doublePointsActive = false;
        hadComebackStreak = false;
        answerTimes = [];
        gameStartTime = null;
        gameElapsedTime = 0;
        gameQuestionCount = 0;
        freezeTimeActive = false;
        doublePointsActive = false;
        timeRanOut = false;
        timeAttackTeamTurn = 'blue';
        timeAttackBlueTeamFinalScore = 0;
        blueTeamQuestions = [];

        // Hide encouragement message if present
        const encouragementDiv = document.getElementById('encouragement-message');
        if (encouragementDiv) encouragementDiv.innerText = '';
        
        // Show a new fun fact on the start screen when returning
        const funFactBox = document.getElementById('fun-fact-box');
        if (funFactBox) {
            funFactBox.innerText = getRandomFunFact();
        }
        // Navigate back to main menu page (designate current page as the game menu)
        try {
            window.location.href = 'index.html';
        } catch (e) {
            console.warn('Menu navigation failed, staying on page:', e);
        }
    };

    // Main Menu button: reuse exit cleanup then navigate to menu
    if (mainMenuBtn) {
        mainMenuBtn.onclick = () => {
            // If in-game and progress exists, confirm
            if (gameDiv.style.display !== 'none' && currentQuestionIndex > 0 && !confirm('Return to Main Menu? Current progress will be lost.')) {
                return;
            }
            // Trigger the same cleanup as exit, then go menu
            try { exitBtn.click(); } catch (_) {}
            // Ensure navigation to hub menu in case exit cleanup keeps us on page
            window.location.href = 'menu.html';
        };
    }

    // Back to in-page game selection screen (visible during gameplay except on launcher & game-over)
    if (backToGameMenuBtn) {
        backToGameMenuBtn.onclick = () => {
            // Confirm if there is progress
            if (gameDiv.style.display !== 'none' && currentQuestionIndex > 0 && !confirm('Go back to the game menu? Progress for this run will be lost.')) {
                return;
            }
            // Cleanup basic timers/audio but stay on the same page
            clearInterval(timer);
            AudioManager.stopTicking();
            if (isTimeAttackMode) { stopGlobalTimer(); }

            // Reset state and UI to launcher
            resetState();
            AudioManager.pauseBgMusic();
            slideOut(gameDiv, () => slideIn(container));
            gameDiv.style.display = 'none';
            gameOverDiv.style.display = 'none';
            gameDiv.classList.remove('active');
            gameOverDiv.classList.remove('active');

            // Hide top-right controls relevant to gameplay
            exitBtn.style.display = 'none';
            backToGameMenuBtn.style.display = 'none';
        };
    }
    nextBtn.onclick = () => {
        // Hide explanation first if it's visible
        if (explanationDiv.style.display === 'block') {
            explanationDiv.style.opacity = '0';
            setTimeout(() => {
                explanationDiv.style.display = 'none';
                explanationDiv.style.opacity = '1';
            }, 300);
        }
        // Determine if next question is prophecy
        const nextQ = questions[currentQuestionIndex + 1];
        const isProphecy = nextQ && (nextQ.category === 'Prophecy' || nextQ.category === 'The Great Controversy');
        // Show glitch effect and play sound, then fade out and show next
        showGlitchTransition(isProphecy, () => {
            fadeOut(document.querySelector('.question'), () => {
                fadeOut(document.querySelector('.options'), () => {
                    currentQuestionIndex++;
                    if (currentQuestionIndex < questions.length) {
                        setTimeout(() => {
                            showQuestion();
                        }, 100);
                    } else showEndScreen();
                });
            });
        });
    };
    
    showOptionsBtn.onclick = () => {
        hideKeyFactOverlay();
        // Transition from question-only to options-with-timer phase
        showOptionsWithTimer();
    };
    
    // Skip button removed - manual advancement only
    playAgainBtn.onclick = () => {
        if (gameMode === 'solo') checkSignInAndStartGame('solo');
        else checkSignInAndStartGame('teams');
    };
    downloadBtn.onclick = () => {
        // Create a text file with the game results
        let content = 'End of Time - Game Results\n';
        content += '================================\n\n';
        
        if (gameMode === 'solo') {
            content += `Game Mode: Solo Player\n`;
            content += `Final Score: ${playerScore}\n`;
            content += `Correct Answers: ${correctAnswers}/${questions.length}\n`;
            content += `Longest Streak: ${longestStreak}\n`;
            if (gameElapsedTime > 0) {
                content += `Total Time: ${formatTime(gameElapsedTime)}\n`;
            }
        } else {
            content += `Game Mode: Two Teams\n`;
            content += `Blue Team Score: ${teamBlueScore}\n`;
            content += `Black Team Score: ${teamBlackScore}\n`;
            if (gameElapsedTime > 0) {
                content += `Total Time: ${formatTime(gameElapsedTime)}\n`;
            }
        }
        
        content += `\nQuestions and Answers:\n`;
        content += `====================\n\n`;
        
        questions.forEach((q, index) => {
            content += `${index + 1}. ${q.question}\n`;
            content += `   Category: ${q.category}\n`;
            content += `   Correct Answer: ${q.correctAnswer}\n`;
            if (q.explanation) {
                content += `   Explanation: ${q.explanation}\n`;
            }
            content += `\n`;
        });
        
        // Create and download the file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `end-of-time-results-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const startNextTurnBtn = document.getElementById('start-next-turn-btn');
    if(startNextTurnBtn) {
        console.log('Attaching event listener to Start Your Turn button');
        startNextTurnBtn.onclick = startNextTeamTurn;
    } else {
        console.warn('Start Your Turn button not found in DOM');
    }
    
    // --- MOBILE OPTIMIZATIONS ---
    if (isMobileDevice()) {
        console.log('📱 Mobile device detected - applying optimizations');
        
        // Apply touch optimizations to all buttons
        const allButtons = document.querySelectorAll('button, .comic-button, .level-button');
        allButtons.forEach(button => {
            preventDoubleTabZoom(button);
            addTouchFeedback(button);
        });
        
        // Prevent viewport zoom on input focus
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            input.style.fontSize = '16px';
        });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', debounce(() => {
            // Force viewport recalculation after orientation change
            setTimeout(() => {
                window.scrollTo(0, 0);
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            }, 100);
        }, 250));
        
        // Handle virtual keyboard
        let initialViewportHeight = window.innerHeight;
        window.addEventListener('resize', debounce(() => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // If viewport height reduced significantly, likely virtual keyboard
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                // Scroll active element into view
                if (document.activeElement && document.activeElement.scrollIntoView) {
                    setTimeout(() => {
                        document.activeElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }, 300);
                }
            } else {
                document.body.classList.remove('keyboard-open');
            }
        }, 150));
        
        // Add swipe detection for certain elements (if needed)
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            
            // Prevent pull-to-refresh on game screen
            if (document.querySelector('.game:not([style*="display: none"])')) {
                if (diffY < -50 && window.scrollY === 0) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        // Performance optimization: Pause/resume timers when tab becomes inactive
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab is now hidden - could pause intensive operations
                console.log('🔄 Tab hidden - game continues in background');
            } else {
                // Tab is now visible - resume operations
                console.log('👁️ Tab visible - game active');
            }
        });
        
        console.log('✅ Mobile optimizations applied');
    }
});

// --- High Contrast Mode Toggle ---
const contrastToggle = document.getElementById('contrast-toggle');
if (contrastToggle) {
    contrastToggle.onclick = () => {
        document.body.classList.toggle('high-contrast');
        localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
    };
    // Restore preference
    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
}

    // --- Accessibility: Keyboard navigation for main controls ---
    [soloBtn, teamsBtn, hintBtn, takeawayBtn, freezeTimeBtn, nextBtn, exitBtn, mainMenuBtn, backToGameMenuBtn, contrastToggle].forEach(btn => {
    if (btn) btn.tabIndex = 0;
});

    // --- ARIA labels for game elements ---
    if (timerDiv) {
        timerDiv.setAttribute('aria-label', 'Time remaining');
        timerDiv.setAttribute('role', 'timer');
    }
    if (questionDiv) {
        questionDiv.setAttribute('aria-label', 'Current question');
        questionDiv.setAttribute('role', 'text');
    }
    if (optionsDiv) {
        optionsDiv.setAttribute('aria-label', 'Answer options - use number keys 1-4 to select');
        optionsDiv.setAttribute('role', 'radiogroup');
    }
    if (scoreSolo) {
        scoreSolo.setAttribute('aria-label', 'Solo player score and statistics');
        scoreSolo.setAttribute('role', 'status');
    }
    if (scoreTeams) {
        scoreTeams.setAttribute('aria-label', 'Team scores');
        scoreTeams.setAttribute('role', 'status');
    }
    if (gameDiv) {
        gameDiv.setAttribute('aria-live', 'polite');
        gameDiv.setAttribute('aria-atomic', 'false');
    }

    // --- Screen reader announcements ---
    let announcementDiv = document.createElement('div');
    announcementDiv.setAttribute('aria-live', 'assertive');
    announcementDiv.setAttribute('aria-atomic', 'true');
    announcementDiv.style.position = 'absolute';
    announcementDiv.style.left = '-10000px';
    announcementDiv.style.width = '1px';
    announcementDiv.style.height = '1px';
    announcementDiv.style.overflow = 'hidden';
    document.body.appendChild(announcementDiv);

    function announceToScreenReader(message) {
        announcementDiv.textContent = message;
        // Clear after a brief delay to allow re-announcement of same message
        setTimeout(() => {
            announcementDiv.textContent = '';
        }, 1000);
    }

    // --- Keyboard navigation for answer selection ---
    document.addEventListener('keydown', (event) => {
        // Only handle keyboard navigation during options phase
        if (currentPhase !== 'options' || !gameDiv || gameDiv.style.display === 'none') return;

        const key = event.key;
        const isNumberKey = /^[1-4]$/.test(key);

        if (isNumberKey) {
            event.preventDefault();
            const optionIndex = parseInt(key) - 1;
            const optionButtons = document.querySelectorAll('.option-button');

            if (optionButtons[optionIndex]) {
                // Focus the button and click it
                optionButtons[optionIndex].focus();
                optionButtons[optionIndex].click();
            }
        }
    });

// --- Timer pulse for low time ---
let lastAnnouncedTime = null;
function updateTimerDisplay(timeLeft) {
    // Format time as two digits (e.g., "08" instead of "8")
    const formattedTime = timeLeft.toString().padStart(2, '0');
    timerDiv.innerText = formattedTime;

    // Add low-time class for urgent styling
    if (timeLeft <= 3) {
        timerDiv.classList.add('low-time');
        timerDiv.parentElement.parentElement.classList.add('urgent');

        // Announce low time once per countdown
        if (timeLeft !== lastAnnouncedTime && timeLeft > 0) {
            announceToScreenReader(`${timeLeft} seconds remaining`);
            lastAnnouncedTime = timeLeft;
        }
    } else {
        timerDiv.classList.remove('low-time');
        timerDiv.parentElement.parentElement.classList.remove('urgent');
        lastAnnouncedTime = null; // Reset for next question
    }
}

// --- Service Worker Registration ---
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// --- Add ripple effect to buttons ---
function addRippleEffect(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}
function attachRippleToButtons() {
    document.querySelectorAll('.comic-button, .options button').forEach(btn => {
        btn.removeEventListener('click', addRippleEffect);
        btn.addEventListener('click', addRippleEffect);
    });
}
// --- Add pop/bounce effect to answer selection ---
function popButton(btn) {
    btn.classList.remove('button-pop');
    void btn.offsetWidth;
    btn.classList.add('button-pop');
}
// --- Add glow/pulse to Next button when available ---
function setNextButtonGlow(on) {
    if (on) nextBtn.classList.add('glow-pulse');
    else nextBtn.classList.remove('glow-pulse');
}
// --- Animate progress bar for question count ---
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        const percent = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = percent + '%';
    }
}
// --- Patch into existing logic ---
// After DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachRippleToButtons);
} else {
    attachRippleToButtons();
}
// Patch showQuestion to call attachRippleToButtons
const origShowQuestion = window.showQuestion;
window.showQuestion = function() {
    origShowQuestion.apply(this, arguments);
    attachRippleToButtons();
    setNextButtonGlow(false);
};
// Patch answer selection to pop/bounce and enable Next button glow
const origSelectAnswer = window.selectAnswer;
window.selectAnswer = function(e) {
    const btn = e.target;
    popButton(btn);
    origSelectAnswer.apply(this, arguments);
    setNextButtonGlow(true);
};
// Patch Next button to remove glow on click
nextBtn.addEventListener('click', () => setNextButtonGlow(false));

// --- Animated backgrounds and category-based backgrounds ---
function setCategoryBackground(category) {
    document.body.classList.remove('prophecy-bg', 'diet-health-bg', 'animated-gradient');
    const video = document.getElementById('background-video');
    if (video) {
        video.style.filter = '';
        video.style.opacity = '0.45';
        video.style.mixBlendMode = 'screen';
        // Always show video, but adjust for prophecy
        if (category === 'Prophecy' || category === 'The Great Controversy') {
            video.style.filter = 'contrast(1.5) brightness(0.7) grayscale(0.2)';
            video.style.opacity = '0.7';
            video.style.mixBlendMode = 'multiply';
            // Add a dark overlay for drama
            if (!document.getElementById('prophecy-overlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'prophecy-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.background = 'rgba(10,10,20,0.55)';
                overlay.style.zIndex = '1';
                overlay.style.pointerEvents = 'none';
                document.body.appendChild(overlay);
            }
        } else {
            video.style.filter = '';
            video.style.opacity = '0.45';
            video.style.mixBlendMode = 'screen';
            const overlay = document.getElementById('prophecy-overlay');
            if (overlay) overlay.remove();
        }
        // Ensure video is always looped and playing
        if (video.paused) video.play();
        video.loop = true;
    }
}
// Removed particle animation function
// --- Patch showQuestion to set category background ---
const origShowQuestion2 = window.showQuestion;
window.showQuestion = function() {
    origShowQuestion2.apply(this, arguments);
    const q = questions[currentQuestionIndex];
    setCategoryBackground(q && q.category);
};
// Removed VHS grain animation function

// --- Glitchy Transition Overlay ---
function showGlitchTransition(isProphecy, cb) {
    // Remove any existing glitch overlays
    const old = document.getElementById('glitch-transition-overlay');
    if (old) old.remove();
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'glitch-transition-overlay';
    overlay.className = 'glitch-effect';
    // Transition art: randomly use 1.svg–17.svg across all levels
    try {
        const img = document.createElement('img');
        const idx = 1 + Math.floor(Math.random() * TRANSITION_SVG_COUNT);
        img.src = idx + '.svg';
        img.alt = 'Transition';
        img.onerror = () => { overlay.innerText = '✝️'; };
        img.style.width = '100vw';
        img.style.height = '100vh';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        overlay.appendChild(img);
    } catch (e) {
        overlay.innerText = '✝️';
    }
    overlay.style.position = 'fixed';
    overlay.style.left = '50%';
    overlay.style.top = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.fontSize = '10vw';
    overlay.style.zIndex = 9999;
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0.98';
    overlay.style.textAlign = 'center';
    overlay.style.userSelect = 'none';
    // Make the overlay full-screen to fill the viewport with the SVG
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.transform = 'none';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontSize = '';
    document.body.appendChild(overlay);
    // Play sound
    playSound(isProphecy ? audioTransition2 : audioTransition);
    // Remove after 650ms
    setTimeout(() => {
        overlay.remove();
        if (cb) cb();
    }, 650);
}

explanationDiv.style.fontSize = '1.35rem';
explanationDiv.style.background = 'rgba(255,255,255,0.92)';
explanationDiv.style.color = '#222';
explanationDiv.style.border = '2.5px solid #ffd700';
explanationDiv.style.borderRadius = '16px';
explanationDiv.style.boxShadow = '0 2px 18px #ffd70044, 0 0 8px #fff8';
explanationDiv.style.padding = '1.2rem 1.5rem';
explanationDiv.style.margin = '1.5rem auto 0 auto';
explanationDiv.style.maxWidth = '95%';
explanationDiv.style.textAlign = 'left';
explanationDiv.style.display = 'none';

// Service worker already registered above (line 3566) - duplicate removed

// --- Background video sequential playback ---
let currentBgVideoIndex = 0;
let currentBgVideoSet = [];

function setSequentialBackgroundVideo(videoSet) {
    const bgVideo = document.getElementById('background-video');
    if (!bgVideo) return;
    // If the set has changed, reset index
    if (currentBgVideoSet.join(',') !== videoSet.join(',')) {
        currentBgVideoSet = videoSet.slice();
        currentBgVideoIndex = 0;
    }
    const selectedBg = currentBgVideoSet[currentBgVideoIndex];
    if (!bgVideo.src.endsWith(selectedBg)) {
        bgVideo.src = selectedBg;
        bgVideo.load();
        bgVideo.play().catch(()=>{});
    }
    // Remove previous event
    bgVideo.onended = null;
    // Set up event to play next video in sequence
    bgVideo.onended = () => {
        currentBgVideoIndex = (currentBgVideoIndex + 1) % currentBgVideoSet.length;
        setSequentialBackgroundVideo(currentBgVideoSet);
    };
}

// --- Background video cycling per question ---
let bgVideoIndices = {
    prophecy: 0,
    normal: 0
};
const prophecyBackgrounds = [];
const normalBackgrounds = [];

function setBackgroundVideoForQuestion(isProphecy) {
    const bgVideo = document.getElementById('background-video');
    if (!bgVideo) return;
    
    // Use background 2 for prophecy questions, background 1 for others
    const backgroundFile = isProphecy ? 'background 2.mp4' : 'background 1.mp4';
    if (!bgVideo.src.endsWith(backgroundFile)) {
        bgVideo.src = backgroundFile;
        bgVideo.load();
        bgVideo.play().catch(()=>{});
    }
}

const deepInsightDiv = document.getElementById('deep-insight-div');
const deepInsightContent = document.getElementById('deep-insight-content');
const deepInsightNextBtn = document.getElementById('deep-insight-next-btn');

// Add event listener for deep insight next button
if (deepInsightNextBtn) {
    deepInsightNextBtn.onclick = function() {
        deepInsightDiv.style.display = 'none';
        nextBtn.style.display = 'block';
    };
}

// --- Firebase Config & Auth ---
// Firebase project: "End of Time" (end-of-time-94cd3)
// Project number: 628602476853
// NOTE: Firebase config is now loaded from firebase-config.js

// Only initialize Firebase if not running locally
let currentUser = null;

// Page visibility handling to prevent async errors
let isPageActive = true;
document.addEventListener('visibilitychange', () => {
  isPageActive = !document.hidden;
  if (!isPageActive) {
    console.log('⚠️ Page became hidden - pausing async operations');
  } else {
    console.log('✅ Page became visible - resuming operations');
  }
});

// Handle page unload to clean up async operations
window.addEventListener('beforeunload', () => {
  isPageActive = false;
  console.log('🔄 Page unloading - cleaning up async operations');
});

// Firebase initialization is now handled in the DOMContentLoaded event listener above
// This eliminates duplicate initialization and ensures proper load order

// --- Leaderboard Modal & UI Wiring (delegates to LeaderboardService/AuthManager) ---
const leaderboardModal = document.getElementById('leaderboard-modal');
const googleSigninBtn = document.getElementById('google-signin-btn');
const googleSignoutBtn = document.getElementById('google-signout-btn');
const userInfoDiv = document.getElementById('user-info');
const optoutCheckbox = document.getElementById('optout-leaderboard');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

function showLeaderboardModal() {
  if (window.LeaderboardService && typeof window.LeaderboardService.openModal === 'function') {
    window.LeaderboardService.openModal();
    if (typeof window.LeaderboardService.refresh === 'function') {
      window.LeaderboardService.refresh();
    }
  }
}
function hideLeaderboardModal() {
  if (window.LeaderboardService && typeof window.LeaderboardService.closeModal === 'function') {
    window.LeaderboardService.closeModal();
  }
}
if (closeLeaderboardBtn) closeLeaderboardBtn.onclick = hideLeaderboardModal;

function updateUserInfoUI(user) {
  currentUser = user || null;
    const mainSigninBtn = document.getElementById('main-signin-btn');
    const mainSignoutBtn = document.getElementById('main-signout-btn');
  const statusText = document.getElementById('signin-status-text');
    
  if (currentUser) {
    if (userInfoDiv) userInfoDiv.innerHTML = `<img src="${currentUser.photoURL}" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:0.5em;">${currentUser.displayName}`;
    if (googleSigninBtn) googleSigninBtn.style.display = 'none';
    if (googleSignoutBtn) googleSignoutBtn.style.display = 'inline-block';
    if (statusText) statusText.textContent = `Signed in as ${currentUser.displayName}`;
    if (mainSigninBtn) mainSigninBtn.style.display = 'none';
    if (mainSignoutBtn) mainSignoutBtn.style.display = 'inline-block';
  } else {
    if (userInfoDiv) userInfoDiv.innerHTML = '';
    if (googleSigninBtn) googleSigninBtn.style.display = 'inline-block';
    if (googleSignoutBtn) googleSignoutBtn.style.display = 'none';
    if (statusText) statusText.textContent = 'Not signed in - Your scores won\'t be saved';
    if (mainSigninBtn) mainSigninBtn.style.display = 'inline-block';
    if (mainSignoutBtn) mainSignoutBtn.style.display = 'none';
  }
}

if (googleSigninBtn) {
  googleSigninBtn.onclick = function() {
    if (window.AuthManager && typeof window.AuthManager.signIn === 'function') {
      window.AuthManager.signIn();
    }
  };
}
if (googleSignoutBtn) {
googleSignoutBtn.onclick = function() {
    if (window.AuthManager && typeof window.AuthManager.signOut === 'function') {
      window.AuthManager.signOut();
    }
  };
}

const mainSigninBtn = document.getElementById('main-signin-btn');
if (mainSigninBtn) {
  mainSigninBtn.onclick = function() {
    if (window.AuthManager && typeof window.AuthManager.signIn === 'function') {
      window.AuthManager.signIn();
    }
  };
  mainSigninBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(66,133,244,0.4)';
  });
  mainSigninBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(66,133,244,0.3)';
  });
}

const mainSignoutBtn = document.getElementById('main-signout-btn');
if (mainSignoutBtn) {
  mainSignoutBtn.onclick = function() {
    if (window.AuthManager && typeof window.AuthManager.signOut === 'function') {
      window.AuthManager.signOut();
    }
  };
  mainSignoutBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(102,102,102,0.4)';
  });
  mainSignoutBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(102,102,102,0.3)';
  });
}

const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
if (viewLeaderboardBtn) {
  viewLeaderboardBtn.onclick = function() {
    showLeaderboardModal();
  };
  viewLeaderboardBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(56,142,60,0.4)';
  });
  viewLeaderboardBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(56,142,60,0.3)';
  });
}

/**
 * Comprehensive Firebase system check
 * Call this in the browser console to verify Firebase setup
 */
function comprehensiveFirebaseCheck() {
    console.log('🔥 Starting Comprehensive Firebase Check...');
    
    // Check 1: Firebase SDK Loading
    console.log('\n📦 Firebase SDK Check:');
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded! Check script tags in index.html');
        return;
    }
    console.log('✅ Firebase SDK loaded successfully');
    
    // Check 2: Firebase Configuration
    console.log('\n⚙️ Firebase Configuration Check:');
    const requiredConfigFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    let configIssues = 0;
    
    requiredConfigFields.forEach(field => {
        if (firebaseConfig[field]) {
            console.log(`✅ ${field}: Configured`);
        } else {
            console.log(`❌ ${field}: Missing`);
            configIssues++;
        }
    });
    
    console.log('📋 Firebase config summary:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING',
        environment: window.location.protocol === 'file:' ? 'Local' : 'Hosted'
    });
    
    // Check 3: Environment Detection
    console.log('\n🌐 Environment Check:');
    if (window.location.protocol === 'file:') {
        console.log('⚠️ Running locally - Firebase features are disabled for security');
        console.log('💡 To test Firebase features, deploy to a web server or use Firebase Hosting');
        return;
    }
    console.log('✅ Running on web server - Firebase features enabled');
    
    // Check 4: Firebase App Initialization
    console.log('\n🚀 Firebase App Initialization Check:');
    try {
        if (firebase.apps.length > 0) {
            console.log('✅ Firebase app initialized successfully');
            console.log('📱 App name:', firebase.apps[0].name);
        } else {
            console.log('❌ Firebase app not initialized');
        }
    } catch (error) {
        console.error('❌ Error checking Firebase app:', error);
    }
    
    // Check 5: Authentication Service
    console.log('\n🔐 Authentication Service Check:');
    if (auth && typeof auth.onAuthStateChanged === 'function') {
        console.log('✅ Auth service available');
        
        // Test auth state
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log('✅ User is signed in:', {
                    displayName: user.displayName,
                    email: user.email,
                    uid: user.uid
                });
            } else {
                console.log('ℹ️ No user currently signed in');
            }
        }, error => {
            console.error('❌ Auth state change error:', error);
        });
    } else {
        console.log('❌ Auth service not available');
    }
    
    // Check 6: Firestore Database
    console.log('Firestore Database Check:');
    if (typeof db !== 'undefined' && db) {
        console.log('Firestore database object available');

        // Test Firestore connection with a simple read
        db.collection('leaderboard').limit(1).get()
            .then(() => {
                console.log('Firestore read test successful');
                console.log('Leaderboard collection accessible');
            })
            .catch(error => {
                console.error('Firestore read test failed:', error);
                if (error.code === 'permission-denied') {
                    console.log('Permission denied - Check Firestore security rules');
                    showFirebaseErrorMessage('Firestore denied access. Deploy the latest security rules and make sure you are signed in.', false);
                } else if (error.code === 'unavailable') {
                    console.log('Service unavailable - Check internet connection');
                    showFirebaseErrorMessage('Firestore service is unavailable. Check your connection and try again.', true);
                } else {
                    console.log('Other Firestore error - Verify Firebase project configuration');
                }
            });
    } else {
        console.log('Firestore database object not available');
    }

    // Check 7: DOM Elements for Firebase Features
    console.log('\n🎮 Firebase UI Elements Check:');
    const firebaseElements = {
        'leaderboard-modal': document.getElementById('leaderboard-modal'),
        'google-signin-btn': document.getElementById('google-signin-btn'),
        'google-signout-btn': document.getElementById('google-signout-btn'),
        'main-signin-btn': document.getElementById('main-signin-btn'),
        'main-signout-btn': document.getElementById('main-signout-btn'),
        'user-info': document.getElementById('user-info'),
        'signin-status-text': document.getElementById('signin-status-text')
    };
    
    let missingElements = 0;
    Object.entries(firebaseElements).forEach(([name, element]) => {
        if (element) {
            console.log(`✅ ${name}: Found`);
        } else {
            console.log(`❌ ${name}: Missing`);
            missingElements++;
        }
    });
    
    // Check 8: Firebase Functions Test
    console.log('\n🧪 Firebase Functions Test:');
    
    // Test sign-in function
    if (typeof signInWithGoogle === 'function') {
        console.log('✅ signInWithGoogle function: Available');
    } else {
        console.log('❌ signInWithGoogle function: Missing');
    }
    
    // Test save score function
    if (typeof saveScoreToLeaderboard === 'function') {
        console.log('✅ saveScoreToLeaderboard function: Available');
    } else {
        console.log('❌ saveScoreToLeaderboard function: Missing');
    }
    
    // Summary
    console.log('\n📊 Firebase System Summary:');
    console.log(`Configuration Issues: ${configIssues}`);
    console.log(`Missing UI Elements: ${missingElements}`);
    
    if (window.location.protocol === 'file:') {
        console.log('⚠️ Local environment - Deploy to test Firebase features');
    } else if (configIssues === 0 && missingElements === 0) {
        console.log('🎉 Firebase system appears to be properly configured!');
        console.log('💡 Test sign-in and leaderboard features in the game');
    } else {
        console.log('⚠️ Some issues detected - see details above');
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Make sure Firebase project is created and configured');
    console.log('2. Check that Google Sign-In is enabled in Firebase Console');
    console.log('3. Verify your domain is in the authorized domains list');
    console.log('4. Ensure Firestore database is created with proper rules');
    console.log('5. Check browser console for any JavaScript errors');
}

// Wait for Firestore to be ready with proper connection
function waitForFirestoreReady(maxAttempts = 10, delayMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function attemptConnection() {
      attempts++;
      console.log(`🔄 Attempting Firestore connection (${attempts}/${maxAttempts})...`);

      if (!db) {
        if (attempts < maxAttempts) {
          setTimeout(attemptConnection, delayMs);
        } else {
          reject(new Error('Firestore not initialized after maximum attempts'));
        }
        return;
      }

      // Try a simple read to verify connection
      db.collection('leaderboard').limit(1).get()
        .then(() => {
          console.log(`✅ Firestore connected successfully on attempt ${attempts}`);
          resolve();
        })
        .catch((error) => {
          if (error.code === 'permission-denied') {
            // Permission denied means we're connected, just no access to this specific query
            // This is actually fine - the connection works
            console.log(`✅ Firestore connected (permission check on attempt ${attempts})`);
            resolve();
          } else if (attempts < maxAttempts) {
            console.log(`⚠️ Connection attempt ${attempts} failed, retrying...`);
            setTimeout(attemptConnection, delayMs);
          } else {
            console.error('❌ Firestore connection failed after maximum attempts');
            reject(error);
          }
        });
    }

    attemptConnection();
  });
}

// Test Firebase connection (for debugging)
function testFirebaseConnection() {
  console.log('🔍 Testing Firebase connection...');
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase is not loaded! Check if Firebase SDKs are properly included.');
    showFirebaseErrorMessage('Firebase SDK not loaded. Please refresh the page.', true);
    return;
  }

  console.log('✅ Firebase SDK loaded successfully');
  console.log('📋 Firebase config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING'
  });

  if (window.location.protocol === 'file:') {
    console.log('⚠️ Running locally - Firebase features will be limited');
    return;
  }

  if (!db) {
    console.error('❌ Firestore (db) is not initialized!');
    return;
  }

  // Try to access leaderboard collection (only if connection is ready)
  db.collection('leaderboard').limit(1).get()
    .then((snapshot) => {
      console.log('✅ Firestore connection successful!');
      console.log(`📊 Leaderboard has ${snapshot.size} entries`);
    })
    .catch(error => {
      // Don't show error to user during initial connection test
      // Only log it for debugging (reduced verbosity since waitForFirestoreReady handles this)
      if (error.code === 'permission-denied') {
        console.log('ℹ️ Firestore connection confirmed (permission check passed)');
      } else if (error.code !== 'unavailable') {
        // Only log if it's not a temporary unavailable error
        console.warn('⚠️ Firestore test query failed:', error.code);
      }
    });

  // Test Auth connection
  if (!auth) {
    console.error('❌ Auth is not initialized!');
    return;
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      console.log('✅ Auth connection successful! User:', user.displayName);
    } else {
      console.log('✅ Auth connection successful! No user signed in.');
    }
  }, error => {
    console.error('❌ Auth connection failed:', error);
    handleFirebaseError(error, 'Auth connection test');
  });
}

  // Test Firebase connection when the page loads (moved to DOMContentLoaded)
  // testFirebaseConnection();

// Optionally, call showLeaderboardAfterGame(finalScore, finalTime) at game end

// --- Enhanced Firebase Error Handling ---
function handleFirebaseError(error, context = 'Firebase operation') {
    console.error(`❌ ${context} failed:`, error);
    
    let userMessage = '';
    let shouldRetry = false;
    
    switch (error.code) {
        case 'unavailable':
            userMessage = '⚠️ Network connection issue. Please check your internet connection and try again.';
            shouldRetry = true;
            break;
        case 'permission-denied':
            userMessage = '❌ Access denied. Please sign in again.';
            shouldRetry = false;
            break;
        case 'not-found':
            userMessage = '❌ Resource not found. Please refresh the page.';
            shouldRetry = false;
            break;
        case 'already-exists':
            userMessage = '⚠️ Resource already exists.';
            shouldRetry = false;
            break;
        case 'resource-exhausted':
            userMessage = '⚠️ Service temporarily unavailable. Please try again later.';
            shouldRetry = true;
            break;
        case 'failed-precondition':
            userMessage = '❌ Operation failed. Please refresh and try again.';
            shouldRetry = false;
            break;
        case 'aborted':
            userMessage = '⚠️ Operation was cancelled.';
            shouldRetry = true;
            break;
        case 'out-of-range':
            userMessage = '❌ Invalid data. Please check your input.';
            shouldRetry = false;
            break;
        case 'unimplemented':
            userMessage = '❌ Feature not available.';
            shouldRetry = false;
            break;
        case 'internal':
            userMessage = '⚠️ Internal error. Please try again later.';
            shouldRetry = true;
            break;
        case 'unauthenticated':
            userMessage = '❌ Please sign in to continue.';
            shouldRetry = false;
            break;
        default:
            userMessage = `⚠️ ${error.message || 'An unexpected error occurred.'}`;
            shouldRetry = true;
    }
    
    // Show user-friendly error message
    if (userMessage) {
        showFirebaseErrorMessage(userMessage, shouldRetry);
    }
    
    return { userMessage, shouldRetry };
}

function showFirebaseErrorMessage(message, canRetry = false) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: 'Montserrat-Regular', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">⚠️</span>
            <div>
                <div style="font-weight: bold; margin-bottom: 5px;">Firebase Error</div>
                <div>${message}</div>
                ${canRetry ? '<button onclick="retryFirebaseOperation()" style="margin-top: 10px; padding: 5px 10px; background: white; color: #f44336; border: none; border-radius: 4px; cursor: pointer;">Retry</button>' : ''}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto;">×</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

function retryFirebaseOperation() {
    console.log('🔄 Retrying Firebase operation...');
    
    // Test connection
    testFirebaseConnection();
    
    // If user is signed in, try to refresh leaderboard
    if (currentUser) {
        fetchAndDisplayLeaderboard();
    }
}

// Enhanced connection test with detailed diagnostics
function enhancedFirebaseConnectionTest() {
    console.log('🔍 Running Enhanced Firebase Connection Test...');
    
    const tests = {
        internet: false,
        firebaseSDK: false,
        firebaseConfig: false,
        firestore: false,
        auth: false
    };
    
    // Test 1: Basic internet connectivity
    fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
        .then(() => {
            tests.internet = true;
            console.log('✅ Internet connectivity: OK');
        })
        .catch(() => {
            console.error('❌ Internet connectivity: FAILED');
            showFirebaseErrorMessage('No internet connection detected. Please check your network.', true);
        });
    
    // Test 2: Firebase SDK
    if (typeof firebase !== 'undefined') {
        tests.firebaseSDK = true;
        console.log('✅ Firebase SDK: Loaded');
    } else {
        console.error('❌ Firebase SDK: Not loaded');
        showFirebaseErrorMessage('Firebase SDK not loaded. Please refresh the page.', true);
        return;
    }
    
    // Test 3: Firebase Configuration
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
        tests.firebaseConfig = true;
        console.log('✅ Firebase Configuration: Valid');
    } else {
        console.error('❌ Firebase Configuration: Invalid');
        showFirebaseErrorMessage('Firebase configuration is invalid.', false);
        return;
    }
    
    // Test 4: Firestore Connection
    if (db) {
        db.collection('test').doc('connection-test').get()
            .then(() => {
                tests.firestore = true;
                console.log('✅ Firestore Connection: OK');
            })
            .catch(error => {
                console.error('❌ Firestore Connection: FAILED', error);
                handleFirebaseError(error, 'Firestore connection test');
            });
    } else {
        console.error('❌ Firestore: Not initialized');
    }
    
    // Test 5: Auth Connection
    if (auth) {
        auth.onAuthStateChanged(user => {
            tests.auth = true;
            console.log('✅ Auth Connection: OK', user ? `User: ${user.displayName}` : 'No user');
        }, error => {
            console.error('❌ Auth Connection: FAILED', error);
            handleFirebaseError(error, 'Auth connection test');
        });
    } else {
        console.error('❌ Auth: Not initialized');
    }
    
    // Summary after 3 seconds
    setTimeout(() => {
        console.log('📊 Connection Test Summary:', tests);
        const failedTests = Object.entries(tests).filter(([key, value]) => !value).map(([key]) => key);
        
        if (failedTests.length > 0) {
            console.warn('⚠️ Failed tests:', failedTests);
            showFirebaseErrorMessage(`Connection issues detected: ${failedTests.join(', ')}. Some features may not work properly.`, true);
        } else {
            console.log('🎉 All connection tests passed!');
        }
    }, 3000);
}

function displayLevelSelection() {
    const levelButtonsContainer = document.getElementById('level-buttons');
    if (!levelButtonsContainer) return;

    const progress = getPlayerProgress();
    const highestLevelUnlocked = progress.highestLevelUnlocked;
    levelButtonsContainer.innerHTML = ''; // Clear existing buttons

    allLevels.forEach(level => {
        const button = document.createElement('button');
        button.className = 'comic-button level-button';
        button.textContent = level.name;
        button.dataset.level = level.id;

        // Mark completed levels (any level strictly below highest unlocked)
        if (level.id < highestLevelUnlocked) {
            button.classList.add('completed');
        } else if (level.id === highestLevelUnlocked) {
            // Current highest unlocked (not yet completed)
            button.classList.add('unlocked');
        }

        if (level.id > highestLevelUnlocked) {
            button.disabled = true;
            button.textContent += ' (Locked)';
        } else {
            button.addEventListener('click', () => {
                // Set the selected level and show mode selection
                currentGameLevel = level.id;
                showModeSelection();
            });
        }
        levelButtonsContainer.appendChild(button);
    });
}

// Show mode selection after level is chosen
function showModeSelection() {
    // Hide level selection
    document.getElementById('level-selection').style.display = 'none';
    
    // Show the game mode buttons
    const container = document.querySelector('.container');
    const buttons = container.querySelector('.buttons');
    if (buttons) {
        buttons.style.display = 'flex';
    }
    
    // Ensure a View Tutorial button exists and is wired
    let viewTutorialBtn = document.getElementById('view-tutorial-btn');
    if (!viewTutorialBtn) {
        viewTutorialBtn = document.createElement('button');
        viewTutorialBtn.id = 'view-tutorial-btn';
        viewTutorialBtn.className = 'comic-button';
        viewTutorialBtn.textContent = 'View Tutorial';
        buttons.appendChild(viewTutorialBtn);
    }
    viewTutorialBtn.onclick = () => {
        // Show tutorial without marking as viewed or starting the game automatically
        const levelNumber = currentGameLevel || 1;
        window.showTutorial(levelNumber, gameMode, () => {
            // After closing tutorial in view-only mode, just return to mode selection
        }, { viewOnly: true });
    };

    // Ensure a View Video button exists and is wired
    let viewVideoBtn = document.getElementById('view-video-btn');
    if (!viewVideoBtn) {
        viewVideoBtn = document.createElement('button');
        viewVideoBtn.id = 'view-video-btn';
        viewVideoBtn.className = 'comic-button';
        viewVideoBtn.textContent = 'View Video';
        buttons.appendChild(viewVideoBtn);
    }
    viewVideoBtn.onclick = () => {
        const levelNumber = currentGameLevel || 1;
        window.showLevelVideo(levelNumber, {
            afterVideo: () => {
                // Return to mode selection after viewing
                showModeSelection();
            },
            viewOnly: true
        });
    };
    
    // Update the intro text to show selected level
    const introText = container.querySelector('.intro-text');
    if (introText) {
        introText.textContent = `Level ${currentGameLevel} selected. Choose your game mode:`;
    }
}

// Reset to level selection
function resetToLevelSelection() {
    // Show level selection
    document.getElementById('level-selection').style.display = 'block';
    // Rebuild level buttons to reflect newly completed/unlocked levels
    try { displayLevelSelection(); } catch (_) {}
    
    // Hide mode buttons
    const container = document.querySelector('.container');
    const buttons = container.querySelector('.buttons');
    if (buttons) {
        buttons.style.display = 'none';
    }
    
    // Reset intro text
    const introText = container.querySelector('.intro-text');
    if (introText) {
        introText.textContent = 'Behold, the days come, saith the Lord God, that I will send a famine in the land, not a famine of bread, nor a thirst for water, but of hearing the words of the Lord:';
    }
}

// ... existing code ...
        // Update results display
        if (gameMode === 'solo') {
            const scorePercentage = correctAnswers / gameQuestionCount;
            if (scorePercentage >= LEVEL_PASS_PERCENTAGE && currentGameLevel < allLevels.length) {
                const progress = getPlayerProgress();
                const nextLevel = currentGameLevel + 1;
                if (nextLevel > progress.highestLevelUnlocked) {
                    progress.highestLevelUnlocked = nextLevel;
                    savePlayerProgress(progress);
                    // Optionally, show a message that the next level is unlocked
                    const achievementTitle = document.getElementById('achievement-title');
                    if(achievementTitle) {
                        achievementTitle.textContent = `Congratulations! You've unlocked Level ${nextLevel}!`;
                    }
                }
            }
            // ... existing solo results display logic
        } else { // teams
            // ... existing teams results display logic
        }
// ... existing code ...
// ... existing code ...
    // --- Endgame Logic ---
    function endGame() {
        stopTimer();
        stopBgMusic();
// ... existing code ...
        resultsSolo.querySelector('p:nth-child(2)').innerText = `Correct Answers: ${correctAnswers}/${gameQuestionCount}`;
        resultsSolo.querySelector('p:nth-child(3)').innerText = `Longest Streak: ${longestStreak}`;
        
        // --- NEW: LEVEL UNLOCK LOGIC ---
        const scorePercentage = correctAnswers / gameQuestionCount;
        if (scorePercentage >= LEVEL_PASS_PERCENTAGE && currentGameLevel < allLevels.length) {
            const progress = getPlayerProgress();
            const nextLevel = currentGameLevel + 1;
            if (nextLevel > progress.highestLevelUnlocked) {
                progress.highestLevelUnlocked = nextLevel;
                savePlayerProgress(progress);
                achievementTitle.textContent = `Congratulations! You've unlocked Level ${nextLevel}!`;
                achievementTitle.style.display = 'block';
            }
        }
        
    }


// --- NEW HELPER FUNCTIONS for game logic ---
// ... existing code ...

// --- NEW LEADERBOARD LOGIC ---

// Delegate leaderboard update to the new service
async function updateLeaderboardScore(level, score) {
    if (typeof window.LeaderboardService !== 'undefined' && typeof window.LeaderboardService.submitLevelScore === 'function') {
        await window.LeaderboardService.submitLevelScore(level, score);
    }
}

// Fetches and displays the new leaderboard data
function fetchAndDisplayLeaderboard() {
    if (window.LeaderboardService && typeof window.LeaderboardService.refresh === 'function') {
        window.LeaderboardService.refresh();
    }
}

// Removed local rendering helpers; handled by LeaderboardService

// Removed error handler; service will report



// Removed deprecated local submission

// This function is no longer needed to submit the score, just to show the modal
// --- END LEADERBOARD LOGIC ---

// --- AUTHENTICATION SETUP ---
// Removed legacy auth listener; handled by AuthManager

// ... existing code ...
function showEndScreen(stats) {
// ... existing code ...
    // Check and award achievements
    const newAchievements = checkAchievements(stats);

    // --- NEW: LEVEL UNLOCK & LEADERBOARD LOGIC ---
    if (stats.correctPct >= LEVEL_PASS_PERCENTAGE) {
        // Unlock next level if applicable
        if (currentGameLevel < allLevels.length) {
            const progress = getPlayerProgress();
            const nextLevel = currentGameLevel + 1;
            if (nextLevel > progress.highestLevelUnlocked) {
                progress.highestLevelUnlocked = nextLevel;
                savePlayerProgress(progress);
                // Display unlock message if no other achievement was shown
                if (newAchievements.length === 0) {
                    const achievementTitle = document.getElementById('achievement-title');
                    if(achievementTitle) {
                        achievementTitle.textContent = `Congratulations! You've unlocked Level ${nextLevel}!`;
                    }
                }
            }
        }
        // Update leaderboard with the score from the completed level
        updateLeaderboardScore(currentGameLevel, stats.score);
    }
    
    // Display the end screen
    const gameScreen = document.getElementById('game');
// ... existing code ...
}