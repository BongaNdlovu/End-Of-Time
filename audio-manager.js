/**
 * audio-manager.js - Audio System for SDA Trivia Challenge
 *
 * Centralizes all audio playback, mute control, and background music management.
 * Handles sound pools, crossfading, and user interaction requirements.
 *
 * @author SDA Trivia Challenge Team
 * @version 1.0.0
 */

// --- Audio Element References ---
const audioCorrect1 = document.getElementById('audio-correct-1');
const audioCorrect2 = document.getElementById('audio-correct-2');
const audioWrong = document.getElementById('audio-wrong');
const audioTimeup = document.getElementById('audio-timeup');
const audioRiser = document.getElementById('audio-riser');
const audioKeyFact = document.getElementById('audio-key-fact');
// Background music tracks - updated to cycle 2-8 (removing 1)
const audioBgTracks = [
    document.getElementById('audio-bg-2'),
    document.getElementById('audio-bg-3'),
    document.getElementById('audio-bg-4'),
    document.getElementById('audio-bg-5'),
    document.getElementById('audio-bg-6'),
    document.getElementById('audio-bg-7'),
    document.getElementById('audio-bg-8')
];
let currentBgTrackIndex = 0;
let currentBgTrack = null;
const audioTimerTick = document.getElementById('audio-timer-tick'); // old ticking sound
const audioTickingTime = document.getElementById('audio-ticking-time'); // new ticking sound
const muteToggle = document.getElementById('mute-toggle');
const volumeControl = document.getElementById('volume-control');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const VOLUME_STORAGE_KEY = 'endOfTime_masterVolume';
let isMuted = false;
let masterVolume = 1;
let tickingInterval = null;
let userInteracted = false;

try {
    const storedVolume = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
    if (!Number.isNaN(storedVolume)) {
        masterVolume = Math.min(Math.max(storedVolume, 0), 1);
    }
} catch (e) {
    masterVolume = 1;
}

// --- Additional Correct Answer Sounds (Correct 1..10, etc.) ---
const correctSoundPool = [];
const incorrectSoundPool = [];
let loadedCorrectFiles = [];
let loadedIncorrectFiles = [];

function getBaseVolume(audio) {
    if (!audio || typeof audio.__baseVolume !== 'number') {
        return 1;
    }
    return audio.__baseVolume;
}

function setBaseVolume(audio, baseVolume) {
    if (!audio) return;
    const clamped = Math.min(Math.max(baseVolume, 0), 1);
    audio.__baseVolume = clamped;
    applyVolume(audio);
}

function applyVolume(audio) {
    if (!audio) return;
    const calculated = Math.min(1, Math.max(0, getBaseVolume(audio) * masterVolume));
    audio.volume = calculated;
}

function applyVolumeToAll() {
    const elements = [
        audioCorrect1, audioCorrect2, audioWrong, audioTimeup, audioRiser,
        audioKeyFact, audioTickingTime, audioTimerTick,
        ...audioBgTracks,
        ...correctSoundPool,
        ...incorrectSoundPool
    ];
    const uniqueElements = new Set(elements.filter(Boolean));
    uniqueElements.forEach(applyVolume);
}

function currentVolumeIcon() {
    if (isMuted) return '🔇';
    if (masterVolume === 0 || masterVolume <= 0.33) return '🔈';
    if (masterVolume <= 0.66) return '🔉';
    return '🔊';
}

function updateVolumeUI() {
    if (volumeSlider) {
        const sliderValue = Math.round(masterVolume * 100);
        const valueString = sliderValue.toString();
        if (volumeSlider.value !== valueString) {
            volumeSlider.value = valueString;
        }
    }
    if (volumeIcon) {
        volumeIcon.textContent = currentVolumeIcon();
    }
    if (muteToggle) {
        muteToggle.innerText = isMuted ? '🔇' : currentVolumeIcon();
    }
}

function handleVolumeChange(value) {
    if (!Number.isFinite(value)) return;
    masterVolume = Math.min(Math.max(value, 0), 1);
    try {
        localStorage.setItem(VOLUME_STORAGE_KEY, masterVolume.toString());
    } catch (e) {
        // Ignore storage failures
    }
    applyVolumeToAll();
    updateVolumeUI();
    if (isMuted && masterVolume > 0) {
        setMuteState(false);
    }
}

function initializeBaseVolumes() {
    setBaseVolume(audioCorrect1, 1);
    setBaseVolume(audioCorrect2, 1);
    setBaseVolume(audioWrong, 1);
    setBaseVolume(audioTimeup, 1);
    setBaseVolume(audioRiser, 1);
    setBaseVolume(audioKeyFact, 1);
    setBaseVolume(audioTickingTime, 0.4);
    setBaseVolume(audioTimerTick, 0.4);
    audioBgTracks.forEach(track => setBaseVolume(track, 0.3));
}

function initializeVolumeControls() {
    initializeBaseVolumes();
    applyVolumeToAll();
    updateVolumeUI();
}

function setMuteState(muted) {
    isMuted = muted;
    const elements = [
        audioCorrect1, audioCorrect2, audioWrong, audioTimeup, audioRiser,
        audioKeyFact, audioTickingTime, audioTimerTick,
        ...audioBgTracks,
        ...correctSoundPool,
        ...incorrectSoundPool
    ];
    const uniqueElements = new Set(elements.filter(Boolean));
    uniqueElements.forEach(audio => {
        audio.muted = isMuted;
    });
    if (muteToggle) {
        muteToggle.innerText = isMuted ? '🔇' : currentVolumeIcon();
    }
    if (isMuted) {
        pauseBgMusic();
    } else {
        playBgMusic();
    }
}

initializeVolumeControls();

if (volumeSlider) {
    volumeSlider.addEventListener('input', (event) => {
        const rawValue = Number(event.target.value);
        if (!Number.isNaN(rawValue)) {
            handleVolumeChange(rawValue / 100);
        }
    });
}

if (muteToggle) {
    muteToggle.addEventListener('click', () => {
        setMuteState(!isMuted);
    });
}

function initCorrectSoundPool() {
    // Known existing files that we can load (from directory listing)
    const existingCorrectFiles = [
        'Correct 1.wav', 'Correct 2.wav', 'Correct 3.wav', 'Correct 4.wav', 'Correct 5.wav',
        'Correct 6.wav', 'Correct 7.wav', 'Correct 8.wav', 'Correct 9.wav', 'Correct 10.wav'
    ];

    // Try to load each file with robust error handling
    existingCorrectFiles.forEach((filename) => {
        try {
            const a = new Audio(filename);
            a.preload = 'metadata'; // Changed from 'auto' to 'metadata' to prevent aggressive preloading
            setBaseVolume(a, 0.8);
            a.muted = isMuted;

            // Conditional error handling based on debug mode
            const silenceErrors = (e) => {
                if (window.AUDIO_DEBUG) {
                    console.error('Audio load error for', filename, ':', e);
                }
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                return false;
            };
            a.addEventListener('error', silenceErrors, true);
            a.addEventListener('abort', silenceErrors, true);
            a.addEventListener('stalled', silenceErrors, true);
            a.addEventListener('suspend', silenceErrors, true);

            const onReady = () => {
                // Only add if not already in pool and audio can actually play
                if (!correctSoundPool.some(s => s.src && s.src === a.src) && a.readyState >= 2) {
                    correctSoundPool.push(a);
                    loadedCorrectFiles.push(filename);
                    if (window.AUDIO_DEBUG) {
                        console.log(`✅ Loaded correct sound: ${filename}`);
                    }
                }
                a.removeEventListener('canplaythrough', onReady);
            };
            a.addEventListener('canplaythrough', onReady);

            // Lazy load - don't call a.load() immediately
            // The audio will load when first played
        } catch (e) {
            // Ignore any exceptions
        }
    });
}

function initIncorrectSoundPool() {
    // Known existing files that we can load (from directory listing)
    const existingIncorrectFiles = [
        'Incorrect 1.wav', 'Incorrect 2.wav', 'Incorrect 3.wav', 'Incorrect 4.wav', 'Incorrect 5.wav',
        'Incorrect 6.wav', 'Incorrect 7.wav', 'Incorrect 8.wav', 'Incorrect 9.wav', 'Incorrect 10.wav'
    ];

    // Try to load each file with robust error handling
    existingIncorrectFiles.forEach((filename) => {
        try {
            const a = new Audio(filename);
            a.preload = 'metadata'; // Changed from 'auto' to 'metadata' to prevent aggressive preloading
            setBaseVolume(a, 0.8);
            a.muted = isMuted;

            // Conditional error handling based on debug mode
            const silenceErrors = (e) => {
                if (window.AUDIO_DEBUG) {
                    console.error('Audio load error for', filename, ':', e);
                }
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                return false;
            };
            a.addEventListener('error', silenceErrors, true);
            a.addEventListener('abort', silenceErrors, true);
            a.addEventListener('stalled', silenceErrors, true);
            a.addEventListener('suspend', silenceErrors, true);

            const onReady = () => {
                // Only add if not already in pool and audio can actually play
                if (!incorrectSoundPool.some(s => s.src && s.src === a.src) && a.readyState >= 2) {
                    incorrectSoundPool.push(a);
                    loadedIncorrectFiles.push(filename);
                    if (window.AUDIO_DEBUG) {
                        console.log(`✅ Loaded incorrect sound: ${filename}`);
                    }
                }
                a.removeEventListener('canplaythrough', onReady);
            };
            a.addEventListener('canplaythrough', onReady);

            // Lazy load - don't call a.load() immediately
            // The audio will load when first played
        } catch (e) {
            // Ignore any exceptions
        }
    });
}

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

    // Test ticking sound only after user gesture to avoid autoplay restrictions
    if (audioTickingTime) {
        const testOnce = () => {
            document.removeEventListener('click', testOnce);
            document.removeEventListener('keydown', testOnce);
            try {
                audioTickingTime.currentTime = 0;
                applyVolume(audioTickingTime);
                audioTickingTime.play().then(() => {
                    console.log('✅ Ticking sound test successful');
                    setTimeout(() => {
                        audioTickingTime.pause();
                        audioTickingTime.currentTime = 0;
                    }, 300);
                }).catch(e => {
                    // Swallow NotAllowedError quietly; it's non-fatal
                    if (e && e.name !== 'NotAllowedError') {
                        console.warn('❌ Ticking sound test failed:', e);
                    }
                });
            } catch (e) {
                console.warn('❌ Ticking sound test error:', e);
            }
        };
        document.addEventListener('click', testOnce, { once: true });
        document.addEventListener('keydown', testOnce, { once: true });
    }

    if (window.AUDIO_DEBUG) {
        console.log(`Loaded Correct SFX: ${loadedCorrectFiles.length}/10 [${loadedCorrectFiles.join(', ') || 'none'}]`);
        console.log(`Loaded Incorrect SFX: ${loadedIncorrectFiles.length}/10 [${loadedIncorrectFiles.join(', ') || 'none'}]`);
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

            applyVolume(audio);
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
    // Play both the original correct sounds AND the new Correct 1-10 sounds simultaneously

    // First, play the original correct answer sound (if available)
    const originalPool = [audioCorrect1, audioCorrect2].filter(Boolean);
    if (originalPool.length > 0) {
        const originalSound = originalPool[Math.floor(Math.random() * originalPool.length)];
        if (originalSound) {
            playSound(originalSound);
        }
    }

    // Then, play a random Correct 1-10 sound simultaneously
    if (correctSoundPool && correctSoundPool.length > 0) {
        const newSound = correctSoundPool[Math.floor(Math.random() * correctSoundPool.length)];
        if (newSound) {
            playSound(newSound);
        }
    }
}

function playIncorrectSound() {
    // Play both the original incorrect sound AND the new Incorrect 1-10 sounds simultaneously

    // First, play the original incorrect answer sound (if available)
    if (audioWrong) {
        playSound(audioWrong);
    }

    // Then, play a random Incorrect 1-10 sound simultaneously
    if (incorrectSoundPool && incorrectSoundPool.length > 0) {
        const newSound = incorrectSoundPool[Math.floor(Math.random() * incorrectSoundPool.length)];
        if (newSound) {
            playSound(newSound);
        }
    }
}

/**
 * Helper to pick the next random background track, excluding a specific index.
 * @param {number} excludeIndex - The index to avoid selecting (current track).
 * @returns {{element: HTMLAudioElement, globalIndex: number}|null} The selected track or null if none available.
 */
function pickNextRandomTrack(excludeIndex) {
    // Sequential picker: advance to the next available track in list order
    if (!audioBgTracks || audioBgTracks.length === 0) return null;
    const total = audioBgTracks.length;
    // If nothing has played yet, start from the first available
    let start = excludeIndex >= 0 ? (excludeIndex + 1) % total : 0;
    for (let i = 0; i < total; i++) {
        const idx = (start + i) % total;
        const candidate = audioBgTracks[idx];
        if (candidate) {
            // Prefer tracks that are ready to play but don't strictly require it
            if (!candidate.readyState || candidate.readyState >= 2) {
                return { element: candidate, globalIndex: idx };
            }
        }
    }
    // Fallback: return the start index even if readiness is not confirmed
    const fallback = audioBgTracks[start];
    return fallback ? { element: fallback, globalIndex: start } : null;
}
function playBgMusic() {
    if (!isMuted) {
        try {
            // Stop any currently playing background track
            if (currentBgTrack) {
                currentBgTrack.pause();
                currentBgTrack.currentTime = 0;
                currentBgTrack.onended = null;
            }

            const excludeIndex = currentBgTrack ? currentBgTrackIndex : -1;
            const nextTrack = pickNextRandomTrack(excludeIndex);
            if (nextTrack) {
                currentBgTrack = nextTrack.element;
                currentBgTrackIndex = nextTrack.globalIndex;

                // Ensure base volume (slightly lowered)
                setBaseVolume(currentBgTrack, 0.3);

                // Play the track
                const playPromise = currentBgTrack.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.warn('Error playing background music:', e);
                        currentBgTrack = null;
                        setTimeout(playBgMusic, 1000);
                    }).then(() => {
                        // Attach onended handler after successful play
                        if (currentBgTrack) {
                            currentBgTrack.onended = () => playNextBgTrack();
                        }
                    });
                } else {
                    // Attach if no promise
                    if (currentBgTrack) {
                        currentBgTrack.onended = () => playNextBgTrack();
                    }
                }
            } else {
                if (window.AUDIO_DEBUG) {
                    console.warn('[Audio] No ready tracks yet; retrying');
                }
                setTimeout(playBgMusic, 1000);
            }
        } catch (e) {
            console.warn('Error starting background music:', e);
        }
    }
}

function playNextBgTrack() {
    if (isMuted) return;

    try {
        let excludeIndex = currentBgTrack ? currentBgTrackIndex : -1;
        const nextTrack = pickNextRandomTrack(excludeIndex);
        if (!nextTrack) {
            if (window.AUDIO_DEBUG) {
                console.warn('[Audio] No ready tracks yet; retrying');
            }
            setTimeout(playNextBgTrack, 1000);
            return;
        }

        const oldTrack = currentBgTrack;
        currentBgTrack = nextTrack.element;
        currentBgTrackIndex = nextTrack.globalIndex;

        setBaseVolume(currentBgTrack, 0.3);

        if (oldTrack && !oldTrack.paused) {
            crossfadeTracks(oldTrack, currentBgTrack);
        } else {
            const playPromise = currentBgTrack.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn('Error playing next background track:', e);
                    currentBgTrack = null;
                    setTimeout(playNextBgTrack, 1000);
                }).then(() => {
                    if (currentBgTrack) {
                        currentBgTrack.onended = playNextBgTrack;
                    }
                });
            } else {
                if (currentBgTrack) {
                    currentBgTrack.onended = playNextBgTrack;
                }
            }
        }
    } catch (e) {
        console.warn('Error in playNextBgTrack:', e);
    }
}

/**
 * Perform a gentle crossfade between old and new background tracks.
 * @param {HTMLAudioElement} oldTrack - The currently playing track.
 * @param {HTMLAudioElement} newTrack - The track to fade in.
 * @param {number} ms - Duration of the crossfade in milliseconds (default 400).
 */
function crossfadeTracks(oldTrack, newTrack, ms = 400) {
    const targetVolume = getBaseVolume(newTrack) * masterVolume;

    if (!oldTrack || oldTrack.paused) {
        // Just play the new track
        const playPromise = newTrack.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                newTrack.onended = playNextBgTrack;
            }).catch(e => {
                console.warn('Error playing background track:', e);
                currentBgTrack = null;
                setTimeout(playNextBgTrack, 1000);
            });
        } else {
            newTrack.onended = playNextBgTrack;
        }
        return;
    }

    // Crossfade
    const startOldVol = oldTrack.volume;
    newTrack.volume = 0;
    newTrack.play().catch(e => {
        console.warn('Error starting new track in crossfade:', e);
    });

    const startTime = performance.now();
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ms, 1);
        oldTrack.volume = startOldVol * (1 - progress);
        newTrack.volume = targetVolume * progress;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            oldTrack.pause();
            oldTrack.currentTime = 0;
            oldTrack.onended = null;
            newTrack.onended = playNextBgTrack;
        }
    }
    requestAnimationFrame(animate);
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
        applyVolume(audioTickingTime);

        // Try to play with loop first
        const playPromise = audioTickingTime.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Loop method failed, trying interval method:', e);
                // Fallback to interval method if loop doesn't work
                tickingInterval = setInterval(() => {
                    if (!isMuted && audioTickingTime) {
                        audioTickingTime.currentTime = 0;
                        applyVolume(audioTickingTime);
                        audioTickingTime.play().catch(() => {});
                    }
                }, 1000);
            });
        }
    } catch (e) {
        console.warn('Error starting ticking with loop, using interval fallback:', e);
        // Fallback to interval method
        tickingInterval = setInterval(() => {
            if (!isMuted && audioTickingTime) {
                audioTickingTime.currentTime = 0;
                applyVolume(audioTickingTime);
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

    if (audioTickingTime) {
        audioTickingTime.pause();
        audioTickingTime.currentTime = 0;
    }
}

// Initialize audio pools when user interacts
function initAudio() {
    // Initialize sound pools
    initCorrectSoundPool();
    initIncorrectSoundPool();

    // Show mute button after first user interaction with improved implementation
    if (!userInteracted) {
        userInteracted = true;
        if (muteToggle) {
            muteToggle.style.display = 'block';
        }
        if (volumeControl) {
            volumeControl.style.display = 'flex';
        }

        // Ensure all audio elements are properly loaded
        const allAudioElements = [
            audioCorrect1, audioCorrect2, audioWrong, audioTimeup, audioRiser, audioTickingTime, audioTimerTick,
            ...audioBgTracks
        ];

        allAudioElements.forEach(audio => {
            if (audio && audio.readyState < 2) {
                try {
                    const baseVolume = getBaseVolume(audio);
                    const restoredVolume = baseVolume * masterVolume;
                    audio.volume = 0;
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = isMuted ? 0 : restoredVolume;
                    }).catch(() => {
                        // Silently fail - this is just pre-loading
                        audio.volume = isMuted ? 0 : restoredVolume;
                    });
                } catch (e) {
                    // Silently fail - this is just pre-loading
                    audio.volume = isMuted ? 0 : restoredVolume;
                }
            }
        });
        updateVolumeUI();
    }
}

// Audio Manager API
const AudioManager = {
    init: initAudio,
    play: playSound,
    playCorrect: playCorrectSound,
    playIncorrect: playIncorrectSound,
    playBgMusic: playBgMusic,
    pauseBgMusic: pauseBgMusic,
    startTicking: startTicking,
    stopTicking: stopTicking,
    setMuted: (muted) => {
        setMuteState(Boolean(muted));
    },
    isMuted: () => isMuted,
    setVolume: (value) => {
        const numeric = Number(value);
        if (Number.isNaN(numeric)) return;
        const normalized = numeric > 1 ? numeric / 100 : numeric;
        handleVolumeChange(normalized);
    },
    getVolume: () => masterVolume,
    debug: debugAudioElements,
    enableDebug: () => { window.AUDIO_DEBUG = true; console.log('Audio debug mode enabled'); },
    disableDebug: () => { window.AUDIO_DEBUG = false; console.log('Audio debug mode disabled'); },
    playKeyFact: () => playSound(audioKeyFact)
};

// Export for use in other modules
window.AudioManager = AudioManager;
