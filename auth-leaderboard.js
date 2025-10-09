(function(window) {
    'use strict';

    const isFileProtocol = window.location.protocol === 'file:';

    let initialized = false;
    let auth = null;
    let db = null;
    let currentUser = null;
    const subscribers = [];

    function notifySubscribers(user) {
        for (const cb of subscribers) {
            try { cb(user || null); } catch (e) { console.warn('Auth subscriber error:', e); }
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;

        if (isFileProtocol) {
            console.warn('Auth/Leaderboard disabled on file:// protocol');
            return;
        }

        if (typeof window.firebase === 'undefined') {
            console.error('Firebase SDK not found. Ensure compat SDKs are loaded before auth-leaderboard.js');
            return;
        }

        try {
            const cfg = (typeof window.firebaseConfig !== 'undefined')
                ? window.firebaseConfig
                : (typeof firebaseConfig !== 'undefined' ? firebaseConfig : undefined);
            if (!firebase.apps.length && cfg) {
                firebase.initializeApp(cfg);
            }
            auth = firebase.auth();
            db = firebase.firestore();

            // Complete pending redirect if any, then set listener
            completeRedirect().finally(() => {
                auth.onAuthStateChanged((user) => {
                    currentUser = user || null;
                    notifySubscribers(currentUser);
                }, (e) => console.error('Auth state listener error:', e));
            });
        } catch (e) {
            console.error('Failed to initialize Firebase (auth/leaderboard):', e);
        }
    }

    function subscribe(callback) {
        if (typeof callback === 'function') {
            subscribers.push(callback);
            callback(currentUser || null);
        }
    }

    function signIn() {
        if (!auth) {
            alert('Authentication is not available right now. Please try again later.');
            return Promise.resolve();
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // Prefer redirect for reliability across browsers
        return auth.signInWithRedirect(provider)
            .catch(async (err) => {
                console.warn('Redirect sign-in failed, attempting popup:', err);
                try {
                    await auth.signInWithPopup(provider);
                } catch (popupErr) {
                    console.error('Popup sign-in failed:', popupErr);
                    alert('Failed to sign in with Google. Please try again.');
                }
            });
    }

    function signOut() {
        if (!auth) return Promise.resolve();
        return auth.signOut().catch((e) => console.error('Sign out error:', e));
    }

    function completeRedirect() {
        if (!auth || typeof auth.getRedirectResult !== 'function') {
            return Promise.resolve();
        }
        return auth.getRedirectResult()
            .then((result) => {
                if (result && result.user) {
                    currentUser = result.user;
                    notifySubscribers(currentUser);
                }
            })
            .catch((error) => {
                // Ignore no-auth-event; report others
                if (!error || error.code === 'auth/no-auth-event') return;
                console.error('Redirect result error:', error);
            });
    }

    function getUser() {
        return currentUser || null;
    }

    // -------- Leaderboard Service --------
    async function submitLevelScore(levelNumber, scoreValue) {
        if (!db || !auth) {
            console.warn('Firestore/Auth not initialized. Skipping score submit.');
            return;
        }
        const user = auth.currentUser;
        if (!user) {
            console.warn('No user signed in. Skipping score submit.');
            return;
        }

        const uid = user.uid;
        const docRef = db.collection('leaderboard').doc(uid);
        const level = parseInt(levelNumber, 10) || 1;
        const score = parseInt(scoreValue, 10) || 0;

        try {
            await db.runTransaction(async (tx) => {
                const snap = await tx.get(docRef);
                if (!snap.exists) {
                    tx.set(docRef, {
                        name: user.displayName || 'Anonymous',
                        photoURL: user.photoURL || '',
                        levelScores: { [level]: score },
                        totalCumulativeScore: score,
                        lastCompletedLevel: level,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    const data = snap.data() || {};
                    const prev = (data.levelScores && data.levelScores[level]) || 0;
                    const levelScores = Object.assign({}, data.levelScores || {});
                    levelScores[level] = Math.max(prev, score);
                    const total = Object.values(levelScores).reduce((a, b) => (parseInt(a, 10) || 0) + (parseInt(b, 10) || 0), 0);
                    tx.update(docRef, {
                        name: user.displayName || data.name || 'Anonymous',
                        photoURL: user.photoURL || data.photoURL || '',
                        levelScores,
                        totalCumulativeScore: total,
                        lastCompletedLevel: Math.max(level, data.lastCompletedLevel || 0),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            console.log('Leaderboard updated');
        } catch (e) {
            console.error('Error updating leaderboard:', e);
        }
    }

    function openModal() {
        const modal = document.getElementById('leaderboard-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease';
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
    }

    function closeModal() {
        const modal = document.getElementById('leaderboard-modal');
        if (!modal) return;
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }

    function renderLeaderboardRows(querySnapshot) {
        const tbody = document.querySelector('#leaderboard-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const user = getUser();

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;font-style:italic;color:#ccc;">The leaderboard is empty. Be the first!</td></tr>';
            return;
        }

        if (!user) {
            const prompt = [
                '<tr style="background:rgba(139,0,0,0.15);border-bottom:2px solid rgba(139,0,0,0.3);">',
                '  <td colspan="5" style="padding:1.2rem;text-align:center;">',
                '    <p style="margin:0 0 0.8rem;color:#ffcc00;font-weight:bold;font-size:1.05rem;">🎮 Sign in to save your scores and compete on the leaderboard!</p>',
                '    <button id="leaderboard-inline-signin" class="comic-button" style="background:#4285f4;color:#fff;border:none;padding:0.6rem 1.5rem;border-radius:8px;cursor:pointer;font-size:1rem;font-weight:bold;box-shadow:0 4px 8px rgba(66,133,244,0.3);transition:all 0.2s;">',
                '      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style="width:18px;height:18px;vertical-align:middle;margin-right:0.5rem;">Sign In with Google',
                '    </button>',
                '  </td>',
                '</tr>'
            ].join('');
            tbody.insertAdjacentHTML('beforeend', prompt);
            const inlineBtn = document.getElementById('leaderboard-inline-signin');
            if (inlineBtn) inlineBtn.onclick = signIn;
        }

        let index = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data() || {};
            const rank = (++index);
            const name = data.name || 'Anonymous';
            const score = data.totalCumulativeScore || 0;
            const level = data.lastCompletedLevel || 1;
            const lastUpdated = (data.lastUpdated && data.lastUpdated.seconds) ? new Date(data.lastUpdated.seconds * 1000) : null;
            const date = lastUpdated ? lastUpdated.toLocaleDateString() : 'N/A';
            const highlight = (user && user.uid === doc.id) ? 'rgba(139,0,0,0.25)' : 'transparent';
            const row = [
                `<tr style="background:${highlight};">`,
                `  <td style="padding:0.8rem;text-align:center;">${rank}</td>`,
                `  <td style="padding:0.8rem;text-align:left;display:flex;align-items:center;gap:0.8rem;">`,
                `    <img src="${data.photoURL || 'icon-192.png'}" style="width:32px;height:32px;border-radius:50%;">`,
                `    <span>${name}</span>`,
                '  </td>',
                `  <td style="padding:0.8rem;text-align:center;">${score}</td>`,
                `  <td style="padding:0.8rem;text-align:center;">${level}</td>`,
                `  <td style="padding:0.8rem;text-align:center;">${date}</td>`,
                '</tr>'
            ].join('');
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    function refresh() {
        const tbody = document.querySelector('#leaderboard-table tbody');
        if (!db || !tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;font-style:italic;color:#ccc;">Loading...</td></tr>';
        db.collection('leaderboard')
            .orderBy('totalCumulativeScore', 'desc')
            .limit(100)
            .get()
            .then(renderLeaderboardRows)
            .catch(async (error) => {
                console.error('Leaderboard fetch error:', error);
                if (error && error.code === 'permission-denied') {
                    // Fallback to HTTPS function
                    try {
                        const projectId = (firebase && firebase.app && firebase.app().options && firebase.app().options.projectId) || '';
                        const url = `https://us-central1-${projectId}.cloudfunctions.net/getLeaderboardTop`;
                        const resp = await fetch(url, { method: 'GET' });
                        if (!resp.ok) throw new Error('HTTP ' + resp.status);
                        const data = await resp.json();
                        const fakeSnapshot = {
                            empty: !data.items || data.items.length === 0,
                            forEach: (cb) => (data.items || []).forEach((item) => cb({ id: item.id, data: () => item }))
                        };
                        renderLeaderboardRows(fakeSnapshot);
                        return;
                    } catch (e) {
                        console.error('HTTPS fallback failed:', e);
                    }
                }
                let message = 'Could not load leaderboard.';
                if (error && error.code === 'failed-precondition') {
                    message = 'Leaderboard index is building. Please wait and refresh.';
                }
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#ff6b6b;">${message}</td></tr>`;
            });
    }

    window.AuthManager = {
        init,
        subscribe,
        signIn,
        signOut,
        completeRedirect,
        getUser
    };

    window.LeaderboardService = {
        submitLevelScore,
        openModal,
        closeModal,
        refresh
    };

})(window);


