import * as functions from 'firebase-functions';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();
const db = admin.firestore();

// Helper: send FCM to tokens
async function sendPush(tokens: string[], title: string, body: string) {
  if (!tokens || tokens.length === 0) return;
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
  };
  try { await admin.messaging().sendMulticast(message); } catch (e) { console.error('FCM error', e); }
}

// Helper: send email via SendGrid (if configured)
async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.SENDGRID_API_KEY || (functions.config().sendgrid && functions.config().sendgrid.key);
  if (!key || !to) return;
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'no-reply@end-of-time.app', name: 'End of Time' },
        subject,
        content: [{ type: 'text/plain', value: text }]
      })
    });
  } catch (e) { console.error('SendGrid error', e); }
}

// Trigger: interactions on a prayer (Gen 2)
export const onInteractionCreate = onDocumentCreated(
  'prayers/{prayerId}/interactions/{interactionId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const interaction = snap.data() as any;
    const prayerId = event.params.prayerId;
    if (!interaction || (interaction.type !== 'prayed' && interaction.type !== 'comment')) return;

    // Load prayer
    const prayerDoc = await db.collection('prayers').doc(prayerId).get();
    if (!prayerDoc.exists) return;
    const prayer = prayerDoc.data() as any;
    const ownerId = prayer.userId;
    if (!ownerId) return;

    // Avoid notifying the actor about their own interaction
    if (interaction.userId && interaction.userId === ownerId) {
      return;
    }

    // Create notification
    await db.collection('notifications').add({
      userId: ownerId,
      type: interaction.type,
      prayerId,
      actorId: interaction.userId || null,
      actorName: interaction.userDisplayName || 'Someone',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    // Fan out push/email if opted in
    const userDoc = await db.collection('users').doc(ownerId).get();
    const profile = (userDoc.exists ? userDoc.data() : {}) as any;
    const title = interaction.type === 'comment' ? 'New comment' : 'Someone prayed for you';
    const body = interaction.type === 'comment' ? `${interaction.userDisplayName || 'Someone'} commented on your prayer.` : `${interaction.userDisplayName || 'Someone'} clicked "I prayed".`;

    if (profile && Array.isArray(profile.fcmTokens) && profile.fcmTokens.length) {
      await sendPush(profile.fcmTokens, title, body);
    }
    if (profile && profile.notifyEmail && profile.email) {
      await sendEmail(profile.email, title, body);
    }
  });

/**
 * SECURE SCORE SUBMISSION (Gen 2)
 * =======================
 * This Cloud Function validates and submits scores to the leaderboard.
 *
 * Why Cloud Functions for scores?
 * - Prevents score manipulation via browser console
 * - Server-side validation of game logic
 * - Rate limiting enforcement
 * - Timing verification to detect cheating
 * - App Check enforcement (blocks requests without valid tokens)
 *
 * Call this instead of directly writing to Firestore from the client.
 */
export const submitScore = onCall(
  {
    // Enable App Check enforcement - reject requests without valid tokens
    enforceAppCheck: true,
  },
  async (request) => {
    const {data, auth, app, rawRequest} = request;

    // 0. APP CHECK VERIFICATION (automatically handled by enforceAppCheck)
    // app will contain App Check data if token is valid
    if (app) {
      console.log(`✅ App Check verified for app: ${app}`);
    }

    // 1. AUTHENTICATION CHECK
    if (!auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to submit scores.'
      );
    }

  const userId = auth.uid;
  const displayName = data.displayName || auth.token.name || 'Anonymous';

  // 2. VALIDATE INPUT DATA
  const {
    score,
    level,
    correctAnswers,
    questionCount,
    timeElapsed,
    wagerTotal,
    powerUpsUsed
  } = data;

  // Check required fields
  if (typeof score !== 'number' || typeof level !== 'number') {
    throw new HttpsError(
      'invalid-argument',
      'Score and level are required and must be numbers.'
    );
  }

  // Validate ranges
  if (score < 0 || score > 50000) {
    throw new HttpsError(
      'invalid-argument',
      'Score is out of valid range (0-50000).'
    );
  }

  if (level < 1 || level > 7) {
    throw new HttpsError(
      'invalid-argument',
      'Level must be between 1 and 7.'
    );
  }

  if (correctAnswers && (correctAnswers < 0 || correctAnswers > questionCount)) {
    throw new HttpsError(
      'invalid-argument',
      'Correct answers cannot exceed question count.'
    );
  }

  // 3. TIMING VALIDATION (Anti-cheat)
  if (questionCount && timeElapsed) {
    const MIN_SECONDS_PER_QUESTION = 1; // Minimum 1 second per question
    const minTime = questionCount * MIN_SECONDS_PER_QUESTION;

    if (timeElapsed < minTime) {
      console.warn(`Suspicious timing detected: ${userId} completed ${questionCount} questions in ${timeElapsed}s`);
      throw new HttpsError(
        'invalid-argument',
        `Impossible completion time detected. Minimum time: ${minTime}s, actual: ${timeElapsed}s`
      );
    }
  }

  // 4. SCORE CALCULATION VALIDATION
  // Basic validation: score should not exceed theoretical maximum
  if (correctAnswers && questionCount) {
    // Max score formula: (correct * 10) + bonuses
    // Allow some margin for wagers and power-ups
    const maxTheoreticalScore = (correctAnswers * 10) + (wagerTotal || 0) + 1000; // 1000 buffer for bonuses

    if (score > maxTheoreticalScore) {
      console.warn(`Invalid score calculation: ${userId} score ${score} exceeds max ${maxTheoreticalScore}`);
      throw new HttpsError(
        'invalid-argument',
        'Score exceeds theoretical maximum based on correct answers.'
      );
    }
  }

  // 5. RATE LIMITING
  // Check if user submitted a score recently
  try {
    const userScoreDoc = await db.collection('leaderboard').doc(userId).get();

    if (userScoreDoc.exists) {
      const lastScore = userScoreDoc.data();
      const lastSubmitTime = lastScore?.date?.toDate();

      if (lastSubmitTime) {
        const timeSinceLastSubmit = Date.now() - lastSubmitTime.getTime();
        const RATE_LIMIT_MS = 30 * 1000; // 30 seconds

        if (timeSinceLastSubmit < RATE_LIMIT_MS) {
          const waitTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmit) / 1000);
          throw new HttpsError(
            'resource-exhausted',
            `Please wait ${waitTime} seconds before submitting another score.`
          );
        }
      }
    }
  } catch (error: any) {
    if (error.code === 'resource-exhausted') {
      throw error; // Re-throw rate limit errors
    }
    // Continue if there's an error checking rate limit (don't block legitimate submissions)
    console.warn('Error checking rate limit:', error);
  }

  // 6. SUBMIT TO LEADERBOARD
  try {
    await db.collection('leaderboard').doc(userId).set({
      score,
      level,
      name: displayName,
      correctAnswers: correctAnswers || 0,
      questionCount: questionCount || 0,
      timeElapsed: timeElapsed || 0,
      powerUpsUsed: powerUpsUsed || 0,
      date: admin.firestore.FieldValue.serverTimestamp(),
      // Store some metadata for analysis
      metadata: {
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: rawRequest?.headers['user-agent'] || 'unknown',
        ipAddress: rawRequest?.ip || 'unknown'
      }
    }, { merge: true });

    console.log(`✅ Score submitted: ${userId} - Level ${level} - Score ${score}`);

    return {
      success: true,
      message: 'Score submitted successfully!',
      leaderboardId: userId
    };

  } catch (error: any) {
    console.error('Error submitting score:', error);
    throw new HttpsError(
      'internal',
      'Failed to submit score. Please try again.'
    );
  }
});


