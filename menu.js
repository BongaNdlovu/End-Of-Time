(function(window, document) {
    'use strict';

    if (!window || !document) {
        return;
    }

    const __MENU_LOCAL_DEV__ = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    const menuDevLog = (...args) => {
        if (__MENU_LOCAL_DEV__ && window.console) {
            window.console.log(...args);
        }
    };
    const menuDevWarn = (...args) => {
        if (__MENU_LOCAL_DEV__ && window.console) {
            window.console.warn(...args);
        }
    };
    const menuDevDebug = (...args) => {
        if (__MENU_LOCAL_DEV__ && window.console) {
            window.console.debug(...args);
        }
    };

    const MENU_ASSET_VERSION = '20251102b';
    function versionedAsset(src) {
        if (!src) return '';
        const joinChar = src.includes('?') ? '&' : '?';
        return `${src}${joinChar}v=${MENU_ASSET_VERSION}`;
    }

    const SCRIPT_LOAD_CACHE = new Map();
    function loadScriptOnce(src) {
        if (!src) {
            return Promise.reject(new Error('Script source is required'));
        }
        const url = versionedAsset(src);
        if (SCRIPT_LOAD_CACHE.has(url)) {
            return SCRIPT_LOAD_CACHE.get(url);
        }
        const promise = new Promise((resolve, reject) => {
            const scriptEl = document.createElement('script');
            scriptEl.src = url;
            scriptEl.async = true;
            scriptEl.onload = () => resolve();
            scriptEl.onerror = (error) => reject(error || new Error(`Failed to load ${url}`));
            document.head.appendChild(scriptEl);
        });
        SCRIPT_LOAD_CACHE.set(url, promise);
        return promise;
    }

    const BACKGROUND_VIDEO_STORAGE_KEY = 'endOfTime_backgroundVideoEnabled';
    let backgroundVideoEnabled = true;
    let backgroundVideoLoaded = false;

    const backgroundVideoEl = document.getElementById('background-video');
    const backgroundToggleBtn = document.getElementById('menu-background-video-toggle');
    const hoverAudio = document.getElementById('audio-hover');
    const selectAudio = document.getElementById('audio-select');
    const bgAudio = document.getElementById('audio-bg');
    const menuItems = Array.from(document.querySelectorAll('.menu-item'));
    const isFileProtocol = window.location.protocol === 'file:';

    let currentUser = null;
    let detachSignInError = null;
    let audioStarted = false;
    let authListenersAttached = false;
    let authSetupPromise = null;
    const AUTH_SCRIPT = 'auth-leaderboard.js';

    const authElements = {
        message: document.getElementById('auth-message'),
        error: document.getElementById('auth-error'),
        signin: document.getElementById('google-signin-btn'),
        signout: document.getElementById('google-signout-btn'),
        userInfo: document.getElementById('user-info'),
        photo: document.getElementById('user-photo'),
        name: document.getElementById('user-name')
    };
    const defaultSigninLabel = authElements.signin ? authElements.signin.textContent.trim() : 'Sign In with Google';

    function readBackgroundVideoPreference() {
        try {
            const stored = window.localStorage.getItem(BACKGROUND_VIDEO_STORAGE_KEY);
            if (stored === 'false') {
                return false;
            }
            if (stored === 'true') {
                return true;
            }
        } catch (_) {}
        try {
            // Honor reduced-motion preference if no stored choice
            const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduce) {
                return false;
            }
            // Honor Save-Data / 2G networks if no stored choice
            const conn = (navigator && (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) || null;
            if (conn) {
                const saveData = conn.saveData === true;
                const effective = (conn.effectiveType || '').toLowerCase();
                const slow = effective.includes('2g');
                if (saveData || slow) {
                    return false;
                }
            }
        } catch (_) {}
        return true;
    }

    function updateBackgroundVideoUI() {
        if (backgroundToggleBtn) {
            backgroundToggleBtn.textContent = backgroundVideoEnabled ? 'Background Video: On' : 'Background Video: Off';
            backgroundToggleBtn.setAttribute('aria-pressed', backgroundVideoEnabled ? 'true' : 'false');
        }
        if (backgroundVideoEl) {
            backgroundVideoEl.style.display = backgroundVideoEnabled ? 'block' : 'none';
        }
    }

    function detachBackgroundVideoSource() {
        if (!backgroundVideoEl) {
            return;
        }
        backgroundVideoEl.pause();
        backgroundVideoEl.onended = null;
        delete backgroundVideoEl.dataset.currentSrc;
        if (backgroundVideoLoaded) {
            backgroundVideoEl.removeAttribute('src');
            backgroundVideoEl.load();
            backgroundVideoEl.removeAttribute('data-loaded');
            backgroundVideoLoaded = false;
        }
    }

    function ensureBackgroundVideoLoaded() {
        if (!backgroundVideoEnabled || !backgroundVideoEl) {
            return null;
        }
        if (!backgroundVideoLoaded) {
            const candidate = backgroundVideoEl.dataset.currentSrc || backgroundVideoEl.dataset.defaultSrc;
            if (candidate && backgroundVideoEl.src !== candidate) {
                backgroundVideoEl.src = candidate;
            }
            backgroundVideoEl.load();
            backgroundVideoEl.dataset.loaded = 'true';
            backgroundVideoLoaded = true;
        }
        return backgroundVideoEl;
    }

    function playBackgroundVideo() {
        const video = ensureBackgroundVideoLoaded();
        if (!video) {
            return;
        }
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    function setBackgroundVideoPreference(enabled) {
        backgroundVideoEnabled = Boolean(enabled);
        try {
            window.localStorage.setItem(BACKGROUND_VIDEO_STORAGE_KEY, backgroundVideoEnabled ? 'true' : 'false');
        } catch (_) {}
        updateBackgroundVideoUI();
        if (backgroundVideoEnabled) {
            playBackgroundVideo();
        } else {
            detachBackgroundVideoSource();
        }
    }

    function startAudio() {
        if (audioStarted) {
            return;
        }
        audioStarted = true;
        if (bgAudio) {
            bgAudio.volume = 0.3;
            const startPromise = bgAudio.play();
            if (startPromise && typeof startPromise.catch === 'function') {
                startPromise.catch(() => {});
            }
        }
        if (backgroundVideoEnabled) {
            playBackgroundVideo();
        }
    }

    function playHoverSound() {
        startAudio();
        if (!hoverAudio) return;
        hoverAudio.volume = 0.5;
        hoverAudio.currentTime = 0;
        const playPromise = hoverAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    function playSelectSound() {
        startAudio();
        if (!selectAudio) return;
        selectAudio.volume = 0.7;
        selectAudio.currentTime = 0;
        const playPromise = selectAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    const getComingSoonLabel = (item) => {
        if (!item) return 'This feature';
        return item.dataset?.soonLabel || (item.querySelector('h2') && item.querySelector('h2').textContent.trim()) || 'This feature';
    };

    function showComingSoon(featureLabel) {
        playSelectSound();
        const label = featureLabel ? `${featureLabel} is coming soon!` : 'This feature is coming soon!';
        const existing = document.querySelector('.coming-soon-toast');
        if (existing) {
            existing.remove();
        }
        const toast = document.createElement('div');
        toast.className = 'coming-soon-toast';
        toast.textContent = label;
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(11,11,12,0.95); color: #fff; padding: 12px 24px; border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); font-weight: 600; letter-spacing: 0.02em; z-index: 9999;';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 250ms ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 250);
        }, 2000);
    }

    function enterGame() {
        playSelectSound();
        try {
            if (currentUser) {
                window.localStorage.setItem('endOfTime_user', JSON.stringify({
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL
                }));
            } else {
                window.localStorage.removeItem('endOfTime_user');
            }
        } catch (_) {}
        window.setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    function openAcademy() {
        playSelectSound();
        window.setTimeout(() => {
            window.location.href = 'End Of Time Academy.html';
        }, 500);
    }

    function openMagazine() {
        playSelectSound();
        window.setTimeout(() => {
            window.location.href = 'magazines/volume-1/index.html';
        }, 500);
    }

    function bindMenuItems() {
        let selectedIndex = -1;
        const actionableItems = menuItems.filter(item => !item.hasAttribute('aria-disabled'));

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action === 'enterGame') {
                    enterGame();
                } else if (action === 'openAcademy') {
                    openAcademy();
                } else if (action === 'openMagazine') {
                    openMagazine();
                } else if (action === 'comingSoon') {
                    showComingSoon(getComingSoonLabel(item));
                }
            });

            item.addEventListener('mouseenter', () => {
                if (item.classList.contains('locked')) {
                    return;
                }
                playHoverSound();
                item.classList.add('hovered');
            });

            item.addEventListener('mouseleave', () => {
                if (item.classList.contains('locked')) {
                    return;
                }
                item.classList.remove('hovered');
            });

            item.addEventListener('touchend', () => {
                if (item.classList.contains('locked')) {
                    showComingSoon(getComingSoonLabel(item));
                    return;
                }
                item.click();
            }, { passive: true });

            item.addEventListener('keydown', (event) => {
                if (item.classList.contains('locked')) {
                    return;
                }
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    item.click();
                }
            });
        });

        document.addEventListener('keydown', (event) => {
            if (!actionableItems.length) {
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (selectedIndex >= 0) {
                    actionableItems[selectedIndex].classList.remove('keyboard-selected');
                }
                selectedIndex = (selectedIndex + 1) % actionableItems.length;
                actionableItems[selectedIndex].classList.add('keyboard-selected');
                actionableItems[selectedIndex].focus();
                playHoverSound();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (selectedIndex >= 0) {
                    actionableItems[selectedIndex].classList.remove('keyboard-selected');
                }
                selectedIndex = selectedIndex <= 0 ? actionableItems.length - 1 : selectedIndex - 1;
                actionableItems[selectedIndex].classList.add('keyboard-selected');
                actionableItems[selectedIndex].focus();
                playHoverSound();
            }
        });
    }

    function showAuthError(message) {
        if (!authElements.error) return;
        authElements.error.textContent = message;
        authElements.error.style.display = 'block';
        authElements.error.setAttribute('role', 'alert');
    }

    function clearAuthError() {
        if (!authElements.error) return;
        authElements.error.textContent = '';
        authElements.error.style.display = 'none';
        authElements.error.removeAttribute('role');
    }

    function updateAuthUI(userOverride) {
        const user = typeof userOverride !== 'undefined' ? userOverride : currentUser;
        const message = authElements.message;
        const signin = authElements.signin;
        const signout = authElements.signout;
        const userInfo = authElements.userInfo;
        const photo = authElements.photo;
        const nameEl = authElements.name;

        if (!message || !signin || !signout || !userInfo || !photo || !nameEl) {
            return;
        }

        if (user) {
            message.textContent = `Welcome back, ${user.displayName || user.email || 'Player'}!`;
            signin.style.display = 'none';
            signin.textContent = defaultSigninLabel;
            signout.style.display = 'block';
            userInfo.style.display = 'flex';
            if (user.photoURL) {
                photo.src = user.photoURL;
                photo.style.display = 'block';
            } else {
                photo.style.display = 'none';
            }
            nameEl.textContent = user.displayName || user.email || 'Player';
            clearAuthError();
        } else {
            message.textContent = isFileProtocol
                ? 'Sign-in is unavailable while running offline.'
                : 'Sign in to save your progress and compete on leaderboards';
            signin.style.display = 'block';
            signin.textContent = isFileProtocol ? 'Sign-in unavailable offline' : defaultSigninLabel;
            signout.style.display = 'none';
            userInfo.style.display = 'none';
            photo.style.display = 'none';
        }
    }

    function handleSignInError(payload) {
        if (!payload) return;
        const { stage, error } = payload;
        const code = error && error.code;
        let message = "We couldn't complete Google sign-in. Check your popup settings and try again.";
        if (code === 'auth/popup-blocked') {
            message = 'Your browser blocked the Google sign-in window. Enable pop-ups for this site and try again.';
        } else if (code === 'auth/network-request-failed') {
            message = 'Network issue prevented Google sign-in. Please check your connection and try again.';
        } else if (code === 'auth/cancelled-popup-request') {
            message = 'Another sign-in attempt was already in progress. Please try again.';
        }
        showAuthError(message);
        if (authElements.signin) {
            authElements.signin.disabled = false;
            authElements.signin.textContent = defaultSigninLabel;
        }
        menuDevWarn('[Menu] Google sign-in issue (stage:', stage || 'unknown', 'code:', code || 'n/a', '):', error);
    }

    function attachAuthHandlers() {
        if (authListenersAttached || !window.AuthManager) {
            return;
        }
        if (typeof window.AuthManager.subscribe === 'function') {
            window.AuthManager.subscribe((user) => {
                currentUser = user || null;
                updateAuthUI();
            });
        }
        if (typeof detachSignInError === 'function') {
            try { detachSignInError(); } catch (_) {}
            detachSignInError = null;
        }
        if (typeof window.AuthManager.onSignInError === 'function') {
            detachSignInError = window.AuthManager.onSignInError(handleSignInError);
        }
        authListenersAttached = true;
        updateAuthUI();
    }

    async function ensureAuthSetup() {
        if (isFileProtocol) {
            return false;
        }
        if (window.AuthManager && authListenersAttached) {
            return true;
        }
        if (authSetupPromise) {
            return authSetupPromise;
        }
        authSetupPromise = (async () => {
            if (!window.AuthManager) {
                await loadScriptOnce(AUTH_SCRIPT);
            }
            if (!window.AuthManager) {
                throw new Error('AuthManager unavailable after loading script');
            }
            attachAuthHandlers();
            return true;
        })();
        try {
            return await authSetupPromise;
        } catch (error) {
            menuDevWarn('[Menu] Auth setup failed:', error);
            return false;
        } finally {
            authSetupPromise = null;
        }
    }

    async function signInWithGoogle() {
        if (!authElements.signin) {
            return;
        }
        if (isFileProtocol) {
            window.alert('Firebase authentication is not available when running locally. Please host the files on a web server.');
            return;
        }
        const authReady = await ensureAuthSetup();
        if (!authReady) {
            showAuthError('Authentication is not available right now. Please try again later.');
            return;
        }
        if (!window.AuthManager || typeof window.AuthManager.signIn !== 'function') {
            const fallbackMessage = 'Authentication is not available right now. Please try again later.';
            showAuthError(fallbackMessage);
            window.alert(fallbackMessage);
            return;
        }
        authElements.signin.disabled = true;
        authElements.signin.textContent = 'Signing in...';
        try {
            await window.AuthManager.signIn();
        } catch (err) {
            console.error('Unexpected menu sign-in error:', err);
            showAuthError('Sign-in failed. Please try again.');
        } finally {
            authElements.signin.disabled = false;
            authElements.signin.textContent = defaultSigninLabel;
        }
    }
    async function signOut() {
        const authReady = await ensureAuthSetup();
        if (!authReady) {
            showAuthError('Authentication is not available right now. Please try again later.');
            return;
        }

        if (!window.AuthManager || typeof window.AuthManager.signOut !== 'function') {
            menuDevWarn('AuthManager.signOut is unavailable.');
            return;
        }
        try {
            await window.AuthManager.signOut();
        } catch (error) {
            console.error('Sign-out error:', error);
            showAuthError('Failed to sign out. Please try again.');
            window.alert('Failed to sign out. Please try again.');
        }
    }
function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || isFileProtocol) {
            return;
        }
        navigator.serviceWorker.register('service-worker.js').then(() => {
            menuDevLog('Service worker registered from menu');
        }).catch(err => {
            menuDevWarn('SW registration failed:', err);
        });
    }

    function primeMediaOnInteraction() {
        const handler = () => {
            startAudio();
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
        document.addEventListener('touchstart', handler, { once: true, passive: true });
    }

    function bindAuthButtons() {
        if (authElements.signin) {
            authElements.signin.addEventListener('click', signInWithGoogle);
        }
        if (authElements.signout) {
            authElements.signout.addEventListener('click', signOut);
        }
    }

    function bindBackgroundToggle() {
        if (!backgroundToggleBtn) {
            return;
        }
        backgroundToggleBtn.addEventListener('click', () => {
            setBackgroundVideoPreference(!backgroundVideoEnabled);
        });
    }

    function initialise() {
        backgroundVideoEnabled = readBackgroundVideoPreference();
        updateBackgroundVideoUI();
        // Start background video immediately to reduce initial still time
        if (backgroundVideoEnabled) {
            playBackgroundVideo();
        }
        bindBackgroundToggle();
        bindMenuItems();
        bindAuthButtons();
        updateAuthUI();
        primeMediaOnInteraction();
        registerServiceWorker();
        if (!isFileProtocol) {
            ensureAuthSetup().catch((error) => menuDevWarn('[Menu] Early auth init failed:', error));
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (bgAudio) {
                    bgAudio.pause();
                }
                detachBackgroundVideoSource();
            } else if (backgroundVideoEnabled) {
                playBackgroundVideo();
            }
        });

        window.addEventListener('beforeunload', () => {
            if (typeof detachSignInError === 'function') {
                try { detachSignInError(); } catch (_) {}
                detachSignInError = null;
            }
        });
    }

    initialise();

})(window, document);
