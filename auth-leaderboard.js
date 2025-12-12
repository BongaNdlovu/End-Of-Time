/*
 * Auth/Leaderboard Manager (Firebase v9 modular, dynamic imports)
 * Exposes window.AuthManager and window.LeaderboardService
 */
(function (window) {
  "use strict";

  const __LOCAL_DEV__ = typeof window !== "undefined" && ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  const log = (...args) => { if (__LOCAL_DEV__ && window.console) window.console.log(...args); };
  const warn = (...args) => { if (__LOCAL_DEV__ && window.console) window.console.warn(...args); };

  const isFileProtocol = window.location.protocol === "file:";
  const FIREBASE_VERSION = "9.23.0";
  const FB_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;

  let appMod;
  let authMod;
  let fsMod;

  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  let configCache = null;
  let projectIdCache = "";
  let authReady = false;
  let initPromise = null;
  let forceHttpsLeaderboard = false;

  const subscribers = [];
  const signInErrorSubscribers = [];

  async function loadFirebaseModules() {
    if (appMod && authMod && fsMod) return;
    try {
      [appMod, authMod, fsMod] = await Promise.all([
        import(`${FB_BASE}firebase-app.js`),
        import(`${FB_BASE}firebase-auth.js`),
        import(`${FB_BASE}firebase-firestore.js`)
      ]);
    } catch (error) {
      console.error("[Auth] Failed to load Firebase modules:", error);
      throw error;
    }
  }

  function resolveFirebaseConfig() {
    if (configCache) return configCache;
    const cfg = (typeof window.firebaseConfig !== "undefined")
      ? window.firebaseConfig
      : (typeof firebaseConfig !== "undefined" ? firebaseConfig : undefined);
    if (cfg) {
      configCache = cfg;
      if (!projectIdCache && cfg.projectId) {
        projectIdCache = cfg.projectId;
      }
    }
    return configCache;
  }

  function notifySubscribers(user) {
    for (const cb of subscribers) {
      try { cb(user || null); } catch (error) { warn("Auth subscriber error:", error); }
    }
  }

  function notifySignInError(payload) {
    for (const cb of signInErrorSubscribers) {
      try { cb(payload); } catch (error) { warn("Auth sign-in error subscriber error:", error); }
    }
  }

  async function init() {
    if (isFileProtocol) {
      warn("Auth/Leaderboard disabled on file:// protocol");
      return;
    }
    if (initPromise) {
      return initPromise;
    }
    initPromise = (async () => {
      await loadFirebaseModules();
      const cfg = resolveFirebaseConfig();
      if (!cfg) {
        throw new Error("Missing firebaseConfig");
      }

      if (appMod.getApps) {
        const apps = appMod.getApps();
        app = apps && apps.length ? appMod.getApp() : appMod.initializeApp(cfg);
      } else if (appMod.getApp) {
        try {
          app = appMod.getApp();
        } catch (_) {
          app = appMod.initializeApp(cfg);
        }
      } else {
        app = appMod.initializeApp(cfg);
      }

      auth = authMod.getAuth(app);
      db = fsMod.getFirestore(app);

      try {
        await authMod.setPersistence(auth, authMod.browserLocalPersistence);
        log("[Auth] Persistence set to LOCAL");
      } catch (errorLocal) {
        warn("[Auth] LOCAL persistence not available, trying SESSION", errorLocal && errorLocal.code);
        try {
          await authMod.setPersistence(auth, authMod.browserSessionPersistence);
          log("[Auth] Persistence set to SESSION");
        } catch (errorSession) {
          warn("[Auth] SESSION persistence not available, falling back to NONE", errorSession && errorSession.code);
          try {
            await authMod.setPersistence(auth, authMod.inMemoryPersistence);
            log("[Auth] Persistence set to NONE (in-memory)");
          } catch (errorMemory) {
            console.error("[Auth] Failed to set any persistence mode", errorMemory);
          }
        }
      }

      authMod.onAuthStateChanged(auth, (user) => {
        currentUser = user || null;
        authReady = true;
        notifySubscribers(currentUser);
      }, (error) => console.error("Auth state listener error:", error));

      await handleRedirectResult();
    })();

    try {
      await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      return;
    }
    subscribers.push(callback);
    if (authReady) {
      try { callback(currentUser || null); } catch (error) { warn("Auth subscriber error:", error); }
    }
  }

  function onSignInError(callback) {
    if (typeof callback !== "function") return () => {};
    signInErrorSubscribers.push(callback);
    return () => {
      const index = signInErrorSubscribers.indexOf(callback);
      if (index >= 0) signInErrorSubscribers.splice(index, 1);
    };
  }

  async function signIn() {
    await init();
    if (!auth) {
      const error = new Error("Authentication is not available right now.");
      notifySignInError({ stage: "unavailable", error });
      alert("Authentication is not available right now. Please try again later.");
      return Promise.reject(error);
    }

    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    provider.addScope("email");
    provider.addScope("profile");

    try {
      const result = await authMod.signInWithPopup(auth, provider);
      log("signInWithPopup successful. Result:", result);
      if (result && result.user) {
        currentUser = result.user;
        notifySubscribers(currentUser);
        return result;
      }
      throw new Error("No user returned from sign-in");
    } catch (err) {
      warn("Popup sign-in failed, attempting redirect. Error:", err);
      notifySignInError({ stage: "popup", error: err });
      try {
        await authMod.signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error("Redirect sign-in failed. Full error object:", redirectErr);
        notifySignInError({ stage: "redirect", error: redirectErr });
        let errorMessage = "Failed to sign in with Google. ";
        if (redirectErr.code === "auth/popup-blocked") {
          errorMessage += "Popup was blocked by browser. Please allow popups and try again.";
        } else if (redirectErr.code === "auth/popup-closed-by-user") {
          errorMessage += "Sign-in popup was closed. Please try again.";
        } else if (redirectErr.code === "auth/unauthorized-domain") {
          errorMessage += "This domain is not authorized for sign-in. Please check your Firebase configuration.";
        } else {
          errorMessage += "Please try again.";
        }
        alert(errorMessage);
        throw redirectErr;
      }
    }
  }

  async function signOut() {
    await init();
    if (!auth) return Promise.resolve();
    try {
      await authMod.signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  async function handleRedirectResult() {
    if (!auth) return;
    try {
      const result = await authMod.getRedirectResult(auth);
      if (result && result.user) {
        currentUser = result.user;
        notifySubscribers(currentUser);
      }
    } catch (error) {
      console.error("Auth redirect result error. Full error object:", error);
      notifySignInError({ stage: "redirect-result", error });
    }
  }

  async function completeRedirect() {
    await init();
    await handleRedirectResult();
  }

  function getUser() {
    return currentUser || null;
  }

  async function submitLevelScore(levelNumber, scoreValue) {
    await init();
    if (!db || !auth) {
      warn("Firestore/Auth not initialized. Skipping score submit.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      warn("No user signed in. Skipping score submit.");
      return;
    }

    const uid = user.uid;
    const level = parseInt(levelNumber, 10) || 1;
    const score = parseInt(scoreValue, 10) || 0;

    const docRef = fsMod.doc(db, "leaderboard", uid);
    try {
      await fsMod.runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          tx.set(docRef, {
            name: user.displayName || "Anonymous",
            photoURL: user.photoURL || "",
            levelScores: { [level]: score },
            totalCumulativeScore: score,
            lastCompletedLevel: level,
            lastUpdated: fsMod.serverTimestamp()
          });
        } else {
          const data = snap.data() || {};
          const prev = (data.levelScores && data.levelScores[level]) || 0;
          const levelScores = Object.assign({}, data.levelScores || {});
          levelScores[level] = Math.max(prev, score);
          const totalCumulativeScore = Object.values(levelScores).reduce((acc, value) => acc + (parseInt(value, 10) || 0), 0);
          tx.update(docRef, {
            name: user.displayName || data.name || "Anonymous",
            photoURL: user.photoURL || data.photoURL || "",
            levelScores,
            totalCumulativeScore,
            lastCompletedLevel: Math.max(data.lastCompletedLevel || 0, level),
            lastUpdated: fsMod.serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }

  function openModal() {
    const modal = document.getElementById("leaderboard-modal");
    if (!modal) return;
    modal.removeAttribute("hidden");
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    refresh();
  }

  function closeModal() {
    const modal = document.getElementById("leaderboard-modal");
    if (!modal) return;
    modal.setAttribute("hidden", "");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  function renderLeaderboardRows(snapshot) {
    const tbody = document.querySelector("#leaderboard-table tbody");
    if (!tbody) return;
    if (!snapshot || snapshot.empty) {
      tbody.innerHTML = "<tr><td colspan=\"5\" style=\"text-align:center;padding:2rem;font-style:italic;color:#ccc;\">The leaderboard is empty. Be the first!</td></tr>";
      return;
    }
    let rank = 0;
    tbody.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = typeof docSnap.data === "function" ? docSnap.data() : docSnap;
      const name = (data && data.name) || "Anonymous";
      const score = (data && data.totalCumulativeScore) || 0;
      const photoURL = (data && data.photoURL) || "icon-192.png";
      const lastCompleted = (data && data.lastCompletedLevel) || "-";
      let lastUpdated = "-";
      if (data && data.lastUpdated) {
        if (typeof data.lastUpdated.toDate === "function") {
          lastUpdated = data.lastUpdated.toDate().toLocaleString();
        } else if (typeof data.lastUpdated === "string") {
          lastUpdated = data.lastUpdated;
        }
      }
      rank += 1;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${rank}</td>
        <td><img src="${photoURL}" alt="User" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:8px;">${name}</td>
        <td>${score}</td>
        <td>${lastCompleted}</td>
        <td>${lastUpdated}
      `;
      tbody.appendChild(tr);
    });
  }

  async function refresh() {
    const tbody = document.querySelector("#leaderboard-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "<tr><td colspan=\"5\" style=\"text-align:center;padding:1.5rem;color:#999;\">Loading...</td></tr>";

    const fetchViaHttps = async () => {
      const effectiveProjectId = projectIdCache || (configCache && configCache.projectId) || (app && app.options && app.options.projectId) || "";
      if (!effectiveProjectId) {
        throw new Error("projectId unavailable");
      }
      const url = `https://us-central1-${effectiveProjectId}.cloudfunctions.net/getLeaderboardTop`;
      const resp = await fetch(url, { method: "GET" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      const fakeSnapshot = {
        empty: !data.items || data.items.length === 0,
        forEach: (cb) => (data.items || []).forEach((item) => cb({ data: () => item }))
      };
      renderLeaderboardRows(fakeSnapshot);
    };

    if (forceHttpsLeaderboard) {
      try {
        await fetchViaHttps();
      } catch (fallbackErr) {
        console.error("HTTPS fallback failed:", fallbackErr);
        tbody.innerHTML = "<tr><td colspan=\"5\" style=\"text-align:center;padding:2rem;color:#ff6b6b;\">Could not load leaderboard.</td></tr>";
      }
      return;
    }

    try {
      await init();
      if (!db) throw new Error("Firestore unavailable");
      const leaderboardQuery = fsMod.query(
        fsMod.collection(db, "leaderboard"),
        fsMod.orderBy("totalCumulativeScore", "desc"),
        fsMod.limit(20)
      );
      const snap = await fsMod.getDocs(leaderboardQuery);
      renderLeaderboardRows(snap);
    } catch (error) {
      const message = (error && error.message) ? String(error.message) : "";
      const code = error && error.code ? String(error.code) : "";
      const permissionDenied = code === 'permission-denied' || /insufficient permissions/i.test(message);
      if (permissionDenied) {
        forceHttpsLeaderboard = true;
        warn("Leaderboard Firestore access denied; using HTTPS fallback.");
      } else {
        console.error("Leaderboard fetch error:", error);
      }
      try {
        await fetchViaHttps();
      } catch (fallbackErr) {
        console.error("HTTPS fallback failed:", fallbackErr);
        tbody.innerHTML = "<tr><td colspan=\"5\" style=\"text-align:center;padding:2rem;color:#ff6b6b;\">Could not load leaderboard.</td></tr>";
      }
    }
  }

  window.AuthManager = {
    init,
    subscribe,
    signIn,
    signOut,
    completeRedirect,
    getUser,
    onSignInError
  };

  window.LeaderboardService = {
    submitLevelScore,
    openModal,
    closeModal,
    refresh
  };

})(window);
