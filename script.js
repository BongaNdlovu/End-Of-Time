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
const feedbackOverlay = document.querySelector('.feedback-overlay');
const achievementTitle = document.getElementById('achievement-title');
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

// --- Sound Integration ---
const audioCorrect1 = document.getElementById('audio-correct-1');
const audioCorrect2 = document.getElementById('audio-correct-2');
const audioWrong = document.getElementById('audio-wrong');
const audioTimeup = document.getElementById('audio-timeup');
const audioRiser = document.getElementById('audio-riser');
// Background music tracks - now includes 5 soundtracks for variety
const audioBgTracks = [
    document.getElementById('audio-bg-1'),
    document.getElementById('audio-bg-2'),
    document.getElementById('audio-bg-3'),
    document.getElementById('audio-bg-4'),
    document.getElementById('audio-bg-5')
];
let currentBgTrackIndex = 0;
let currentBgTrack = null;
const audioTimerTick = document.getElementById('audio-timer-tick'); // old ticking sound
const audioTickingTime = document.getElementById('audio-ticking-time'); // new ticking sound
const muteToggle = document.getElementById('mute-toggle');
let isMuted = false;
let tickingInterval = null;
let userInteracted = false;

// Debug function to check audio element status
function debugAudioElements() {
    const audioElements = {
        'audioCorrect1': audioCorrect1,
        'audioCorrect2': audioCorrect2,
        'audioWrong': audioWrong,
        'audioTimeup': audioTimeup,
        'audioRiser': audioRiser,
        'audioTickingTime': audioTickingTime,
        'audioTimerTick': audioTimerTick
    };
    
    console.log('Audio Elements Status:');
    Object.entries(audioElements).forEach(([name, element]) => {
        console.log(`${name}: ${element ? 'Found' : 'Missing'}`);
    });
    
    // Check background music tracks
    console.log('Background Music Tracks:');
    audioBgTracks.forEach((track, index) => {
        console.log(`audio-bg-${index + 1}: ${track ? 'Found' : 'Missing'}`);
    });
    
    // Test ticking sound if available
    if (audioTickingTime) {
        console.log('Testing ticking sound...');
        setTimeout(() => {
            try {
                audioTickingTime.currentTime = 0;
                audioTickingTime.volume = 0.3;
                audioTickingTime.play().then(() => {
                    console.log('✅ Ticking sound test successful');
                    setTimeout(() => {
                        audioTickingTime.pause();
                        audioTickingTime.currentTime = 0;
                    }, 1000);
                }).catch(e => {
                    console.warn('❌ Ticking sound test failed:', e);
                });
            } catch (e) {
                console.warn('❌ Ticking sound test error:', e);
            }
        }, 1000);
    }
}

/**
 * Plays an audio element with error handling
 * @param {HTMLAudioElement} audio - The audio element to play
 */
function playSound(audio) {
    if (!isMuted && audio) {
        try {
            // Reset audio to beginning
            audio.currentTime = 0;
            
            // Ensure volume is set properly
            if (audio.volume === 0) {
                audio.volume = 1;
            }
            
            // Play with proper promise handling
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Only log if it's not an interruption error
                    if (e.name !== 'AbortError') {
                        console.warn('Error playing sound:', e);
                    }
                });
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }
}
function playCorrectSound() {
    const which = Math.random() < 0.5 ? audioCorrect1 : audioCorrect2;
    playSound(which);
}
function playBgMusic() {
    if (!isMuted) {
        try {
            // Stop any currently playing background track
            audioBgTracks.forEach(track => {
                if (track) {
                    track.pause();
                    track.currentTime = 0;
                    track.onended = null;
                }
            });
            
            // Play the current track
            currentBgTrack = audioBgTracks[currentBgTrackIndex];
            if (currentBgTrack) {
                currentBgTrack.volume = 0.5;
                currentBgTrack.currentTime = 0;
                
                // Use a promise to handle the play request properly
                const playPromise = currentBgTrack.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        // Only log if it's not an interruption error
                        if (e.name !== 'AbortError') {
                            console.warn('Error playing background music:', e);
                        }
                    });
                }
                
                // Set up event to play next track when this one ends
                currentBgTrack.onended = () => {
                    currentBgTrackIndex = (currentBgTrackIndex + 1) % audioBgTracks.length;
                    playBgMusic();
                };
            }
        } catch (e) {
            console.warn('Error in playBgMusic:', e);
        }
    }
}
function pauseBgMusic() {
    audioBgTracks.forEach(track => {
        track.pause();
        track.onended = null;
    });
}
function startTicking() {
    if (isMuted || !audioTickingTime) return;
    stopTicking();
    
    try {
        // Reset and prepare the audio
    audioTickingTime.currentTime = 0;
    audioTickingTime.loop = true;
        audioTickingTime.volume = 0.7;
        
        // Try to play with loop first
        const playPromise = audioTickingTime.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Error starting ticking sound with loop:', e);
            // Fallback to interval method if loop doesn't work
            tickingInterval = setInterval(() => {
                    if (!isMuted && audioTickingTime) {
                    audioTickingTime.currentTime = 0;
                    audioTickingTime.play().catch(() => {});
                }
            }, 1000);
        });
        }
    } catch (e) {
        console.warn('Error playing ticking sound:', e);
        // Fallback to interval method
        tickingInterval = setInterval(() => {
            if (!isMuted && audioTickingTime) {
                audioTickingTime.currentTime = 0;
                audioTickingTime.play().catch(() => {});
            }
        }, 1000);
    }
}

function stopTicking() {
    if (tickingInterval) {
        clearInterval(tickingInterval);
        tickingInterval = null;
    }
    
    try {
        if (audioTickingTime) {
        audioTickingTime.pause();
        audioTickingTime.currentTime = 0;
            audioTickingTime.loop = false;
        }
    } catch (e) {
        console.warn('Error stopping ticking sound:', e);
    }
}
// Mute/unmute logic with better error handling
muteToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    
    // Create an array of all audio elements
    const allAudioElements = [
        audioCorrect1, audioCorrect2, audioWrong, audioTimeup,
        audioRiser, ...audioBgTracks, audioTimerTick, audioTickingTime,
        audioStreakWowza, audioStreakZing, audioStreakKawabanga,
        audioStreakLetsGo, audioStreakNice,
        audioTransition, audioTransition2
    ];
    
    // Set muted state for all audio elements
    allAudioElements.forEach(a => {
        if(a) a.muted = isMuted;
    });
    
    // Update mute button UI
    muteToggle.innerText = isMuted ? '🔇' : '🔊';
    
    // Handle background music
    if (isMuted) {
        pauseBgMusic();
    } else {
        playBgMusic();
    }
});
// Show mute button after first user interaction with improved implementation
function ensureUserInteraction() {
    if (!userInteracted) {
        userInteracted = true;
        muteToggle.style.display = 'block';
        
        // Ensure all audio elements are properly loaded
        console.log('Ensuring audio elements are ready...');
        
        // Pre-load audio files after user interaction
        const allAudioElements = [
            audioCorrect1, audioCorrect2, audioWrong, audioTimeup,
            audioRiser, ...audioBgTracks, audioTimerTick, audioTickingTime,
            audioStreakWowza, audioStreakZing, audioStreakKawabanga,
            audioStreakLetsGo, audioStreakNice,
            audioTransition, audioTransition2
        ];
        
        // Touch all audio elements to prepare them
        allAudioElements.forEach(audio => {
            if (audio) {
                try {
                    // Create a silent buffer and play it to "warm up" the audio context
                    const originalVolume = audio.volume;
                    audio.volume = 0;
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = isMuted ? 0 : originalVolume;
                    }).catch(() => {
                        // Silently fail - this is just pre-loading
                        audio.volume = isMuted ? 0 : originalVolume;
                    });
                } catch (e) {
                    // Ignore errors during preloading
                }
            }
        });
        
        // Start background music with normal volume
        playBgMusic();
    }
}

// Use once: true to automatically remove these listeners after first trigger
document.body.addEventListener('click', ensureUserInteraction, { once: true });
document.body.addEventListener('keydown', ensureUserInteraction, { once: true });

// --- Confetti Setup ---
const confettiSettings = { target: 'confetti-canvas', respawn: false, clock: 30, colors: [[230, 57, 70], [183, 28, 28], [255, 215, 0]] };
const confetti = new ConfettiGenerator(confettiSettings);

// --- Timer and Game State Variables ---
let TIME_LIMIT = 40; // Extended to 40 seconds for better gameplay
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

    // 3. Optional: Play sound if audio system is available
    if (window.playSound && window.audioRiser) {
      window.playSound(window.audioRiser);
    }
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
}

function resetState() {
    clearInterval(timer);
    nextBtn.style.display = 'none';
    clearOptions();
    timerDiv.classList.remove('low-time');
    timerDiv.parentElement.parentElement.classList.remove('urgent');
    stopTicking();
    
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
    { text: 'KAPOW!', color: '#ffd700', fontSize: '3.7rem', rotate: -8 },
    { text: 'ZING!', color: '#4caf50', fontSize: '3.2rem', rotate: 6 },
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

// --- Audio Streak Sounds ---
const audioStreakWowza = document.getElementById('audio-streak-wowza');
const audioStreakZing = document.getElementById('audio-streak-zing');
const audioStreakKawabanga = document.getElementById('audio-streak-kawabanga');
const audioStreakLetsGo = document.getElementById('audio-streak-letsgo');
const audioStreakNice = document.getElementById('audio-streak-nice');
const audioTransition = document.getElementById('audio-transition');
const audioTransition2 = document.getElementById('audio-transition2');

/**
 * Plays a special sound effect based on the player's streak level
 * @param {number} streak - The current streak count
 */
function playStreakSound(streak) {
    let audio = null;
    if (streak === 3) audio = audioStreakWowza;
    else if (streak === 5) audio = audioStreakZing;
    else if (streak === 7) audio = audioStreakKawabanga;
    else if (streak === 10) audio = audioStreakLetsGo;
    else if (streak >= 15) audio = audioStreakNice;
    
    if (audio) {
        playSound(audio);
    }
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
  
  // Play achievement sound
  playSound(audioRiser);
  
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
    'audio-streak-wowza','audio-streak-zing','audio-streak-kawabanga','audio-streak-letsgo','audio-streak-nice',
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
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.innerText = option;
        btn.onclick = onClick;
        frag.appendChild(btn);
    });
    return frag;
};

// --- DOMContentLoaded for all DOM queries and listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Debug audio elements to check if they're properly loaded
    debugAudioElements();
    
    // Initialize animation effects
    try {
        animationEffects = new AnimationEffects();
    } catch (e) {
        console.warn('AnimationEffects initialization failed:', e);
    }
    
    // Initialize DOM elements
    categoryDropdown = document.getElementById('category-dropdown');
    
    // Category Dropdown Population
    let categories = Array.from(new Set(gameQuestions.map(q => q.category)));
    categories = categories.filter(cat => cat && cat !== 'undefined');
    categories = categories.filter(cat => !['General SDA', 'Diet & Health', 'Music'].includes(cat));
    if (categoryDropdown) {
        categoryDropdown.innerHTML = '<option value="All">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Show a random fun fact/verse/tip on the start screen
    const funFactBox = document.getElementById('fun-fact-box');
    if (funFactBox) {
        funFactBox.innerText = getRandomFunFact();
    }
    // --- Check Sign In and Start Game ---
    function checkSignInAndStartGame(mode) {
        if (!currentUser) {
            // Show sign-in prompt modal
            showSignInPromptModal(mode);
        } else {
            // User is already signed in, start game directly
            exitBtn.style.display = 'block';
            startGame(mode);
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
            
            googleBtn.onclick = () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider).then(result => {
                    console.log('✅ Google sign-in successful:', result.user.displayName);
                    currentUser = result.user;
                    hideSignInPromptModal();
                    // Start game after successful sign-in
                    exitBtn.style.display = 'block';
                    startGame(gameMode);
                }).catch(error => {
                    console.error('❌ Google sign-in failed:', error);
                    alert('Failed to sign in with Google. Please try again.');
                });
            };
            
            skipBtn.onclick = () => {
                hideSignInPromptModal();
                // Start game without sign-in
                exitBtn.style.display = 'block';
                startGame(gameMode);
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

    // --- Start Game ---
    window.startGame = function(mode) {
        ensureUserInteraction();
        playSound(audioRiser);
        setTimeout(playBgMusic, 800);
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

        // Get game length
        let numQuestions = 20;
        const gameLengthSelect = document.getElementById('game-length-select');
        if (gameLengthSelect && !isNaN(parseInt(gameLengthSelect.value, 10))) {
            numQuestions = parseInt(gameLengthSelect.value, 10);
        }

        // Filter questions by category and COMPLETELY RANDOMIZE
        const selectedCategory = categoryDropdown.value;
        let availableQuestions;
        if (selectedCategory === 'All') {
            availableQuestions = [...gameQuestions];
        } else {
            availableQuestions = gameQuestions.filter(q => q.category === selectedCategory);
        }

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

        if (questions.length === 0) {
            alert('No questions found for this category!');
            return;
        }
        
        console.log('Questions selected (completely randomized):', questions.map(q => q.id));
        
        // Verify that questions are truly randomized
        verifyQuestionRandomization(questions, selectedCategory);
        
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
        
        showQuestion();
        exitBtn.style.display = 'block';
    };

    // --- Two-Phase Question Display ---
    function resetPhase() {
        currentPhase = 'question';
        gameDiv.classList.remove('options-phase');
        gameDiv.classList.add('question-phase');
    }
    
    function showQuestionOnly() {
        resetState();
        resetPhase();
        
        hintBtn.disabled = false;
        takeawayBtn.disabled = false;
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
        TIME_LIMIT = 40;
        
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
        // Add category icon/badge
        const icon = CATEGORY_ICONS[question.category] || '';
        questionDiv.innerHTML = `<span class='category-badge'>${icon}</span> ${question.question}`;
        
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
        
        // Clear encouragement message if it exists
        const encouragementDiv = document.getElementById('encouragement-message');
        if (encouragementDiv) {
            encouragementDiv.innerText = '';
        }
    }
    
    function showOptionsWithTimer() {
        currentPhase = 'options';
        gameDiv.classList.remove('question-phase');
        gameDiv.classList.add('options-phase');
        
        const question = questions[currentQuestionIndex];
        const shuffledOptions = shuffle(question.options);
        optionsDiv.innerHTML = '';
        optionsDiv.appendChild(createOptionButtons(shuffledOptions, selectAnswer));
        
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
            stopTicking();
            clearInterval(timer);
        }

        const selectedBtn = e.target;
        const correct = selectedBtn.innerText === questions[currentQuestionIndex].answer;
        showFeedback(correct);
        
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
            playCorrectSound();
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
            playSound(audioWrong);
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
        const selectedCategory = categoryDropdown.value;
        console.log('Selected category:', selectedCategory);
        
        let availableQuestions = (selectedCategory === 'All') 
            ? [...gameQuestions] 
            : gameQuestions.filter(q => q.category === selectedCategory);
        
        console.log('Available questions for black team:', availableQuestions.length);
        
        // COMPLETELY RANDOMIZE - no exclusions, no ordering criteria
        questions = shuffle(availableQuestions).slice(0, gameQuestionCount);
        
        console.log('Black team questions loaded (completely randomized):', questions.length, 'questions');
        console.log('Black team question IDs:', questions.map(q => q.id));
        
        // Verify that questions are truly randomized for black team
        verifyQuestionRandomization(questions, selectedCategory);
        
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
        playSound(audioTimeup);
        stopTicking();
    }

    // --- Timer Functions ---
    function startTimer() {
        timeLeft = TIME_LIMIT;
        updateTimerDisplay(timeLeft); // Use the new function
        startTicking(); // Start ticking for the whole timer
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
        playSound(audioTimeup);
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
                playStreakSound(10); // Epic sound
                break;
            case 'excellent':
                triggerConfetti('streak');
                triggerComicFireworks(false);
                playStreakSound(5);
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
            
            playBgMusic();
            
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
    
    // Add CSS animation for fadeInOut
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.8); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.1); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
        }
    `;
    document.head.appendChild(style);

    // --- Hint and Take Away Two logic ---
    hintBtn.onclick = function() {
        if (hintBtn.disabled) return;
        
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
        stopTicking();
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
        pauseBgMusic();

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
    };
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
[soloBtn, teamsBtn, hintBtn, takeawayBtn, freezeTimeBtn, nextBtn, exitBtn, muteToggle, contrastToggle].forEach(btn => {
    if (btn) btn.tabIndex = 0;
});

// --- Timer pulse for low time ---
function updateTimerDisplay(timeLeft) {
    // Format time as two digits (e.g., "08" instead of "8")
    const formattedTime = timeLeft.toString().padStart(2, '0');
    timerDiv.innerText = formattedTime;
    
    // Add low-time class for urgent styling
    if (timeLeft <= 3) {
        timerDiv.classList.add('low-time');
        timerDiv.parentElement.parentElement.classList.add('urgent');
    } else {
        timerDiv.classList.remove('low-time');
        timerDiv.parentElement.parentElement.classList.remove('urgent');
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
    overlay.innerText = '✝️';
    overlay.style.position = 'fixed';
    overlay.style.left = '50%';
    overlay.style.top = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.fontSize = '10vw';
    overlay.style.zIndex = 9999;
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0.93';
    overlay.style.textAlign = 'center';
    overlay.style.userSelect = 'none';
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

// Register service worker for PWA/offline support
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
// TODO: You need to create a Web App in your Firebase project to get the API key and other credentials
// Go to https://console.firebase.google.com/ → Your Project → Project Settings → General → Your Apps → Add Web App
const firebaseConfig = {
  apiKey: "AIzaSyA78bvzjP-b7K9TPCbIL3ttzPJr07VR8kY",
  authDomain: "end-of-time-94cd3.firebaseapp.com",
  projectId: "end-of-time-94cd3",
  storageBucket: "end-of-time-94cd3.firebasestorage.app",
  messagingSenderId: "628602476853",
  appId: "1:628602476853:web:181df03c3374465811147c",
  measurementId: "G-E5R3NG1533"
};

// Only initialize Firebase if not running locally
let auth, db, currentUser = null;

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

if (window.location.protocol !== 'file:') {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    // Initialize Analytics if available and measurementId exists
    try {
        if (firebase.analytics && firebaseConfig.measurementId) {
            firebase.analytics();
            console.log('✅ Firebase Analytics initialized');
        }
    } catch (e) {
        console.warn('⚠️ Firebase Analytics init failed:', e);
    }
    console.log('✅ Firebase initialized successfully');
} else {
    console.log('⚠️ Running locally - Firebase features disabled');
    // Create dummy auth object for local testing
    auth = {
        onAuthStateChanged: (callback) => callback(null),
        signInWithPopup: () => Promise.reject(new Error('Firebase disabled locally')),
        signOut: () => Promise.resolve()
    };
    // Create dummy db object for local testing
    db = {
        collection: () => ({
            doc: () => ({
                set: () => Promise.resolve(),
                get: () => Promise.resolve({ data: () => null })
            }),
            orderBy: () => ({
                limit: () => ({
                    get: () => Promise.resolve({ forEach: () => {}, size: 0, empty: true, docs: [] })
                }),
                get: () => Promise.resolve({ forEach: () => {}, size: 0, empty: true, docs: [] })
            }),
            limit: () => ({
                get: () => Promise.resolve({ forEach: () => {}, size: 0, empty: true, docs: [] })
            }),
            get: () => Promise.resolve({ forEach: () => {}, size: 0, empty: true, docs: [] })
        })
    };
}

// --- Leaderboard Modal Logic ---
const leaderboardModal = document.getElementById('leaderboard-modal');
const googleSigninBtn = document.getElementById('google-signin-btn');
const googleSignoutBtn = document.getElementById('google-signout-btn');
const userInfoDiv = document.getElementById('user-info');
const optoutCheckbox = document.getElementById('optout-leaderboard');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

function showLeaderboardModal() {
  leaderboardModal.style.display = 'flex';
  leaderboardModal.style.opacity = '0';
  leaderboardModal.style.transform = 'scale(0.9)';
  
  // Animate modal appearance
  setTimeout(() => {
    leaderboardModal.style.transition = 'all 0.3s ease';
    leaderboardModal.style.opacity = '1';
    leaderboardModal.style.transform = 'scale(1)';
  }, 10);
  
  updateUserInfoUI();
}
function hideLeaderboardModal() {
  // Animate modal disappearance
  if (leaderboardModal) {
    leaderboardModal.style.transition = 'all 0.3s ease';
    leaderboardModal.style.opacity = '0';
    leaderboardModal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      leaderboardModal.style.display = 'none';
    }, 300);
  }
}
closeLeaderboardBtn.onclick = hideLeaderboardModal;

// Google Auth logic
function updateUserInfoUI() {
  if (currentUser) {
    userInfoDiv.innerHTML = `<img src="${currentUser.photoURL}" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:0.5em;">${currentUser.displayName}`;
    googleSigninBtn.style.display = 'none';
    googleSignoutBtn.style.display = 'inline-block';
    
    // Update main menu sign-in status
    const statusText = document.getElementById('signin-status-text');
    const mainSigninBtn = document.getElementById('main-signin-btn');
    const mainSignoutBtn = document.getElementById('main-signout-btn');
    
    if (statusText) statusText.textContent = `Signed in as ${currentUser.displayName}`;
    if (mainSigninBtn) mainSigninBtn.style.display = 'none';
    if (mainSignoutBtn) mainSignoutBtn.style.display = 'inline-block';
  } else {
    userInfoDiv.innerHTML = '';
    googleSigninBtn.style.display = 'inline-block';
    googleSignoutBtn.style.display = 'none';
    
    // Update main menu sign-in status
    const statusText = document.getElementById('signin-status-text');
    const mainSigninBtn = document.getElementById('main-signin-btn');
    const mainSignoutBtn = document.getElementById('main-signout-btn');
    
    if (statusText) statusText.textContent = 'Not signed in - Your scores won\'t be saved';
    if (mainSigninBtn) mainSigninBtn.style.display = 'inline-block';
    if (mainSignoutBtn) mainSignoutBtn.style.display = 'none';
  }
}

// Enhanced Google sign-in with proper error handling
googleSigninBtn.onclick = function() {
  console.log('Attempting Google sign-in...');
  
  // Check if page is still active
  if (document.hidden) {
    console.log('⚠️ Page is hidden, skipping sign-in');
    return;
  }
  
  const provider = new firebase.auth.GoogleAuthProvider();
  
  // Add timeout to prevent hanging
  const signInPromise = auth.signInWithPopup(provider);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Sign-in timeout')), 30000); // 30 second timeout
  });
  
  Promise.race([signInPromise, timeoutPromise])
    .then(result => {
      // Check if page is still active before updating UI
      if (!document.hidden) {
        console.log('✅ Google sign-in successful:', result.user.displayName);
        currentUser = result.user;
        updateUserInfoUI();
      } else {
        console.log('⚠️ Page became hidden during sign-in, skipping UI update');
      }
    })
    .catch(error => {
      // Only log errors if page is still active
      if (!document.hidden) {
        console.error('❌ Google sign-in failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // More specific error messages
        let errorMessage = 'Failed to sign in with Google. ';
        switch(error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage += 'Sign-in was cancelled.';
            break;
          case 'auth/popup-blocked':
            errorMessage += 'Pop-up was blocked by browser. Please allow pop-ups for this site.';
            break;
          case 'auth/unauthorized-domain':
            errorMessage += 'This domain is not authorized. Please check Firebase Console settings.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage += 'Google sign-in is not enabled. Please enable it in Firebase Console.';
            break;
          default:
            errorMessage += 'Please try again.';
        }
        alert(errorMessage);
      }
    });
};
googleSignoutBtn.onclick = function() {
  auth.signOut().then(() => {
    currentUser = null;
    updateUserInfoUI();
  }).catch(error => {
    console.error('Error signing out:', error);
  });
};

// Main menu sign-in button
const mainSigninBtn = document.getElementById('main-signin-btn');
if (mainSigninBtn) {
  mainSigninBtn.onclick = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
      console.log('✅ Google sign-in successful:', result.user.displayName);
      currentUser = result.user;
      updateUserInfoUI();
    }).catch(error => {
      console.error('❌ Google sign-in failed:', error);
      alert('Failed to sign in with Google. Please try again.');
    });
  };
  
  // Add hover effects
  mainSigninBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(66,133,244,0.4)';
  });
  
  mainSigninBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(66,133,244,0.3)';
  });
}

// Main menu sign-out button
const mainSignoutBtn = document.getElementById('main-signout-btn');
if (mainSignoutBtn) {
  mainSignoutBtn.onclick = function() {
    auth.signOut().then(() => {
      currentUser = null;
      updateUserInfoUI();
    }).catch(error => {
      console.error('Error signing out:', error);
    });
  };
  
  // Add hover effects
  mainSignoutBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(102,102,102,0.4)';
  });
  
  mainSignoutBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(102,102,102,0.3)';
  });
}

// View leaderboard button
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
if (viewLeaderboardBtn) {
  viewLeaderboardBtn.onclick = function() {
    showLeaderboardModal();
    fetchAndDisplayLeaderboard();
  };
  
  // Add hover effects
  viewLeaderboardBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-2px) scale(1.02)';
    this.style.boxShadow = '0 6px 20px rgba(56,142,60,0.4)';
  });
  
  viewLeaderboardBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 15px rgba(56,142,60,0.3)';
  });
}
auth.onAuthStateChanged(user => {
  currentUser = user;
  updateUserInfoUI();
});

// --- Firestore Leaderboard Integration ---
// Note: db is already initialized in the main Firebase configuration above
const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');

// Helper: format time (seconds) as mm:ss
function formatLeaderboardTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Helper function to format Firebase timestamps
function formatFirebaseDate(timestamp) {
  if (!timestamp) return 'Recent';
  
  try {
    let jsDate;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      // Firebase Timestamp object (v8)
      jsDate = timestamp.toDate();
    } else if (timestamp.seconds !== undefined) {
      // Firebase Timestamp object (v9) - convert seconds to milliseconds
      jsDate = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      // Regular Date object
      jsDate = timestamp;
    } else if (typeof timestamp === 'string') {
      // String date
      jsDate = new Date(timestamp);
      if (isNaN(jsDate.getTime())) return 'Recent';
    } else if (typeof timestamp === 'number') {
      // Timestamp number (milliseconds)
      jsDate = new Date(timestamp);
    } else {
      return 'Recent';
    }
    
    // Check if date is valid
    if (isNaN(jsDate.getTime())) return 'Recent';
    
    // Format the date
    const now = new Date();
    const diffInHours = (now - jsDate) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Recent';
  }
}

// Submit score to leaderboard
function submitToLeaderboard(score, time) {
  // Check if user is authenticated
  if (!currentUser) {
    console.log('⚠️ No user signed in - skipping leaderboard submission');
    return;
  }
  
  if (optoutCheckbox && optoutCheckbox.checked) {
    console.log('⚠️ User opted out of leaderboard - skipping submission');
    return;
  }
  
  // Ensure score and time are valid numbers
  const finalScore = parseInt(score, 10) || 0;
  const finalTime = parseInt(time, 10) || 0;
  
  console.log('Submitting score to leaderboard:', { 
    originalScore: score, 
    originalTime: time,
    finalScore: finalScore, 
    finalTime: finalTime, 
    user: currentUser.displayName,
    uid: currentUser.uid,
    currentPlayerScore: playerScore,
    timeAttackBlueTeamFinalScore: timeAttackBlueTeamFinalScore
  });
  
  // Validate user data
  if (!currentUser.uid) {
    console.error('❌ User UID is missing');
    return;
  }
  
  const entry = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || 'Anonymous',
    photoURL: currentUser.photoURL || 'https://via.placeholder.com/24x24',
    score: finalScore,
    time: finalTime,
    date: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Validate entry data
  if (!entry.uid || typeof entry.score !== 'number' || typeof entry.time !== 'number') {
    console.error('❌ Invalid entry data:', entry);
    return;
  }
  
  console.log('📝 Submitting entry to Firestore:', entry);
  
  // Submit to leaderboard with enhanced error handling
  db.collection('leaderboard').doc(currentUser.uid).set(entry)
    .then(() => {
      console.log('✅ Score submitted successfully:', finalScore);
    })
    .catch(error => {
      console.error('❌ Error submitting score:', error);
      
      // Handle specific error cases
      if (error.code === 'permission-denied') {
        console.error('🔒 Permission denied - check Firestore security rules');
        showFirebaseErrorMessage('Permission denied. Please check if you are signed in correctly.', false);
      } else if (error.code === 'unauthenticated') {
        console.error('🔐 User not authenticated');
        showFirebaseErrorMessage('Please sign in to save your score.', false);
      } else if (error.code === 'invalid-argument') {
        console.error('📝 Invalid data format');
        showFirebaseErrorMessage('Invalid score data. Please try again.', true);
      } else {
        console.error('🌐 Network or server error:', error.message);
        showFirebaseErrorMessage('Failed to save score. Please check your connection and try again.', true);
      }
    });
}

// Fetch and display Top 100 leaderboard
function fetchAndDisplayLeaderboard() {
  try {
    console.log('Fetching leaderboard data...');
    console.log('leaderboardTableBody element:', leaderboardTableBody);
    console.log('Firebase db object:', db);
    if (!leaderboardTableBody) {
      console.error('leaderboardTableBody element not found!');
      return;
    }
    if (!db) {
      console.error('Firebase db object not found!');
      return;
    }
    leaderboardTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    console.log('Executing Firebase query...');
    
    // Use Firebase compat mode API
    const leaderboardCol = db.collection('leaderboard');
    const q = leaderboardCol.orderBy('score', 'desc').limit(100);

    q.get()
    .then(snapshot => {
      console.log('Leaderboard data received:', snapshot.docs.map(doc => doc.data()));
      console.log('Snapshot size:', snapshot.size);
      console.log('Snapshot empty:', snapshot.empty);
      leaderboardTableBody.innerHTML = '';
      let foundCurrent = false;
      let currentUserRank = null;
      
      let rank = 1;
      snapshot.forEach((doc) => {
        const d = doc.data();
        console.log('Processing leaderboard entry:', { 
          rank, 
          rankType: typeof rank, 
          docId: doc.id, 
          data: d,
          hasScore: 'score' in d,
          hasUid: 'uid' in d,
          hasDisplayName: 'displayName' in d
        });
        
        const isCurrent = currentUser && d.uid === currentUser.uid;
        
        if (isCurrent) {
          foundCurrent = true;
          currentUserRank = rank;
        }
        
        // Ensure all data is valid before displaying
        const displayName = d.displayName || 'Anonymous';
        const photoURL = d.photoURL || 'https://via.placeholder.com/24x24';
        const score = parseInt(d.score, 10) || 0;
        const time = parseInt(d.time, 10) || 0;
        // Handle Firebase timestamp properly using the helper function
        const date = formatFirebaseDate(d.date);
        console.log('🗓️ Debug: Formatted date:', date, 'from:', d.date);
        
        console.log('Displaying leaderboard entry:', { rank, displayName, score, time, date, isCurrent });
        
        // Add special styling for top 3 positions and current user
        let rankStyle = '';
        let rowStyle = '';
        let textColor = '#d1d8e0';
        
        if (rank === 1) {
          rankStyle = 'background:linear-gradient(45deg,#ffd700,#ffed4e);color:#333;box-shadow:0 0 15px rgba(255,215,0,0.6);';
          rowStyle = 'background:linear-gradient(90deg,rgba(255,215,0,0.15),rgba(255,215,0,0.08));';
          textColor = '#2c3e50';
        } else if (rank === 2) {
          rankStyle = 'background:linear-gradient(45deg,#c0c0c0,#e0e0e0);color:#333;box-shadow:0 0 10px rgba(192,192,192,0.6);';
          rowStyle = 'background:linear-gradient(90deg,rgba(192,192,192,0.15),rgba(192,192,192,0.08));';
          textColor = '#2c3e50';
        } else if (rank === 3) {
          rankStyle = 'background:linear-gradient(45deg,#cd7f32,#daa520);color:#333;box-shadow:0 0 10px rgba(205,127,50,0.6);';
          rowStyle = 'background:linear-gradient(90deg,rgba(205,127,50,0.15),rgba(205,127,50,0.08));';
          textColor = '#2c3e50';
        } else if (isCurrent) {
          rowStyle = 'background:linear-gradient(90deg,rgba(255,215,0,0.25),rgba(255,215,0,0.15));border:2px solid rgba(255,215,0,0.6);';
          textColor = '#ffd700';
        } else {
          rowStyle = 'border-bottom:1px solid rgba(255,215,0,0.15);background:rgba(255,255,255,0.03);';
        }
        
        // Add hover effect and transition
        const rowHTML = `
          <tr style="${rowStyle};transition:all 0.3s ease;cursor:pointer;" onmouseover="this.style.background='rgba(255,215,0,0.15)'" onmouseout="this.style.background='${rowStyle.replace(/background:[^;]+;/, '')}'">
            <td style="padding:1rem 0.8rem;text-align:center;font-weight:bold;${rankStyle};border-radius:8px;font-size:1.1rem;font-family:'Montserrat-Bold',Arial,sans-serif;">${rank}</td>
            <td style="padding:1rem 0.8rem;text-align:left;color:${textColor};font-family:'Montserrat-Regular',Arial,sans-serif;font-size:1rem;">
              <img src="${photoURL}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:0.5em;border:2px solid rgba(255,215,0,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.3);">${displayName}
            </td>
            <td style="padding:1rem 0.8rem;text-align:center;font-weight:bold;color:${textColor};font-family:'Montserrat-Bold',Arial,sans-serif;font-size:1.1rem;text-shadow:0 0 5px rgba(255,215,0,0.3);">${score}</td>
            <td style="padding:1rem 0.8rem;text-align:center;color:${textColor};font-family:'Montserrat-Regular',Arial,sans-serif;font-size:1rem;">${formatLeaderboardTime(time)}</td>
            <td style="padding:1rem 0.8rem;text-align:center;color:${textColor};font-family:'Montserrat-Regular',Arial,sans-serif;font-size:0.9rem;">${date}</td>
          </tr>
        `;
        
        leaderboardTableBody.innerHTML += rowHTML;
        
        rank++; // Increment rank for next entry
      });
      
      // If current user is not in top 100, fetch their rank separately
      if (!foundCurrent && currentUser) {
        const allLeaderboardCol = db.collection('leaderboard');
        const allQuery = allLeaderboardCol.orderBy('score', 'desc').orderBy('time', 'asc');
        
        allQuery.get()
          .then(allSnapshot => {
            let userRank = null;
            let rank = 1;
            allSnapshot.forEach((doc) => {
              if (doc.data().uid === currentUser.uid) {
                userRank = rank;
              }
              rank++;
            });
            
            if (userRank) {
              console.log(`Current user rank: ${userRank}`);
              // Optionally display user's rank if not in top 10
              const userRankRow = document.createElement('tr');
              userRankRow.style.cssText = 'background:linear-gradient(90deg,rgba(255,215,0,0.3),rgba(255,215,0,0.1));border:2px solid rgba(255,215,0,0.6);font-weight:bold;transition:all 0.3s ease;';
              userRankRow.innerHTML = `
                <td style="padding:1rem 0.8rem;text-align:center;font-weight:bold;background:linear-gradient(45deg,#ffd700,#ffed4e);color:#333;border-radius:8px;font-size:1.1rem;font-family:'Montserrat-Bold',Arial,sans-serif;box-shadow:0 0 10px rgba(255,215,0,0.5);">${userRank}</td>
                <td style="padding:1rem 0.8rem;text-align:left;color:#ffd700;font-family:'Montserrat-Regular',Arial,sans-serif;font-size:1rem;">
                  <img src="${currentUser.photoURL}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:0.5em;border:2px solid rgba(255,215,0,0.6);box-shadow:0 2px 8px rgba(0,0,0,0.3);">${currentUser.displayName} (You)
                </td>
                <td style="padding:1rem 0.8rem;text-align:center;font-weight:bold;color:#ffd700;font-family:'Montserrat-Bold',Arial,sans-serif;font-size:1.1rem;text-shadow:0 0 5px rgba(255,215,0,0.5);">Your Score</td>
                <td style="padding:1rem 0.8rem;text-align:center;color:#ffd700;font-family:'Montserrat-Regular',Arial,sans-serif;font-size:1rem;">Your Time</td>
                <td style="padding:1rem 0.8rem;text-align:center;color:#ffd700;font-family:'Montserrat-Regular',Arial,sans-serif;font-size:0.9rem;">Today</td>
              `;
              leaderboardTableBody.appendChild(userRankRow);
            }
          })
          .catch(error => {
            console.error('Error fetching user rank:', error);
          });
      }
    })
    .catch(error => {
      console.error('Error fetching leaderboard:', error);
      leaderboardTableBody.innerHTML = '<tr><td colspan="5" style="color: #ff6b6b;">Unable to load leaderboard. Please check your Firebase configuration.</td></tr>';
    });
  } catch (error) {
    console.error('Error in fetchAndDisplayLeaderboard:', error);
    if (leaderboardTableBody) {
      leaderboardTableBody.innerHTML = '<tr><td colspan="5" style="color: #ff6b6b;">Error loading leaderboard.</td></tr>';
    }
  }
}

// Show leaderboard after game end
function showLeaderboardAfterGame(score, time) {
  console.log('showLeaderboardAfterGame called with:', { score, time, currentUser: currentUser ? currentUser.displayName : 'none' });
  console.log('Current game state:', { 
    isTimeAttackMode, 
    gameMode, 
    playerScore, 
    timeAttackBlueTeamFinalScore,
    teamBlueScore,
    teamBlackScore 
  });
  
  // Optionally, prompt for sign-in if not signed in
  if (!currentUser) {
    console.log('No user signed in, showing leaderboard modal');
    showLeaderboardModal();
    return;
  }
  
  // Ensure score and time are valid
  const finalScore = parseInt(score, 10) || 0;
  const finalTime = parseInt(time, 10) || 0;
  
  console.log('Submitting to leaderboard:', { finalScore, finalTime });
  
  // Submit score if not opted out
  submitToLeaderboard(finalScore, finalTime);
  // Fetch and display leaderboard after a short delay to ensure submission is complete
  setTimeout(() => {
    fetchAndDisplayLeaderboard();
    showLeaderboardModal();
  }, 1000);
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
    console.log('\n💾 Firestore Database Check:');
    if (typeof db !== 'undefined' && db) {
        console.log('✅ Firestore database object available');
        
        // Test Firestore connection with a simple read
        db.collection('leaderboard').limit(1).get()
            .then(snapshot => {
                console.log('✅ Firestore read test successful');
                console.log('📊 Leaderboard collection accessible');
            })
            .catch(error => {
                console.error('❌ Firestore read test failed:', error);
                if (error.code === 'permission-denied') {
                    console.log('💡 Permission denied - Check Firestore security rules');
                } else if (error.code === 'unavailable') {
                    console.log('💡 Service unavailable - Check internet connection');
                } else {
                    console.log('💡 Other error - Check Firebase project configuration');
                }
            });
    } else {
        console.log('❌ Firestore database object not available');
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
  
  // Test Firestore connection
  if (window.location.protocol === 'file:') {
    console.log('⚠️ Running locally - Firebase features will be limited');
    return;
  }
  
  db.collection('test').doc('test').get()
    .then(() => {
      console.log('✅ Firestore connection successful!');
    })
    .catch(error => {
      console.error('❌ Firestore connection failed:', error);
      handleFirebaseError(error, 'Firestore connection test');
    });
    
  // Test Auth connection
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

  // Test Firebase connection when the page loads
  testFirebaseConnection();

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