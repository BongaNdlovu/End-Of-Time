const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Helper: basic payload guards
function toInt(value, def = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.trunc(n);
}

exports.submitLeaderboardEntry = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign-in required');
  }

  const uid = context.auth.uid;
  const displayName = context.auth.token?.name || 'Anonymous';
  const photoURL = context.auth.token?.picture || null;

  // Sanitize inputs
  const score = Math.max(0, toInt(data?.score, 0));
  const time = Math.max(0, toInt(data?.time, 0));
  const questionCount = toInt(data?.questionCount, 0);
  const correctAnswers = Math.max(0, toInt(data?.correctAnswers, 0));
  const longestStreak = Math.max(0, toInt(data?.longestStreak, 0));
  const powerUpsUsed = Math.max(0, toInt(data?.powerUpsUsed, 0));
  const gameMode = typeof data?.gameMode === 'string' ? data.gameMode : 'solo';
  const startedAtMs = toInt(data?.startedAtMs, 0);
  const endedAtMs = toInt(data?.endedAtMs, 0);

  // Validate basics
  const allowedCounts = new Set([10, 20, 50, 100]);
  if (!allowedCounts.has(questionCount)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid question count');
  }
  if (correctAnswers > questionCount) {
    throw new functions.https.HttpsError('invalid-argument', 'correctAnswers exceeds questionCount');
  }
  if (!startedAtMs || !endedAtMs || endedAtMs <= startedAtMs) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid start/end timestamps');
  }

  // Timing plausibility (anti-cheat window)
  const elapsedSec = Math.floor((endedAtMs - startedAtMs) / 1000);
  const minElapsed = Math.max(10, questionCount * 2); // assume at least 2s per question
  const maxElapsed = questionCount * 120; // 2 minutes per question upper bound
  if (elapsedSec < minElapsed || elapsedSec > maxElapsed) {
    throw new functions.https.HttpsError('failed-precondition', 'Unreasonable elapsed time');
  }

  // Optional: simple sanity checks between score and answers (heuristic)
  if (score < 0 || score > questionCount * 1000) {
    throw new functions.https.HttpsError('failed-precondition', 'Unreasonable score');
  }

  // Persist entry with server timestamp
  const entry = {
    uid,
    displayName,
    photoURL,
    score,
    time,
    questionCount,
    correctAnswers,
    longestStreak,
    powerUpsUsed,
    gameMode,
    date: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('leaderboard').doc(uid).set(entry, { merge: true });
  return { ok: true };
});


