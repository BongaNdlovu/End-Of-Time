"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitScore = exports.onInteractionCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const db = admin.firestore();
// Helper: send FCM to tokens
async function sendPush(tokens, title, body) {
    if (!tokens || tokens.length === 0)
        return;
    const message = {
        tokens,
        notification: { title, body },
    };
    try {
        await admin.messaging().sendMulticast(message);
    }
    catch (e) {
        console.error('FCM error', e);
    }
}
// Helper: send email via SendGrid (if configured)
async function sendEmail(to, subject, text) {
    const key = process.env.SENDGRID_API_KEY || (functions.config().sendgrid && functions.config().sendgrid.key);
    if (!key || !to)
        return;
    try {
        await (0, node_fetch_1.default)('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: 'no-reply@end-of-time.app', name: 'End of Time' },
                subject,
                content: [{ type: 'text/plain', value: text }]
            })
        });
    }
    catch (e) {
        console.error('SendGrid error', e);
    }
}
// Trigger: interactions on a prayer (Gen 2)
exports.onInteractionCreate = (0, firestore_1.onDocumentCreated)('prayers/{prayerId}/interactions/{interactionId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const interaction = snap.data();
    const prayerId = event.params.prayerId;
    if (!interaction || (interaction.type !== 'prayed' && interaction.type !== 'comment'))
        return;
    // Load prayer
    const prayerDoc = await db.collection('prayers').doc(prayerId).get();
    if (!prayerDoc.exists)
        return;
    const prayer = prayerDoc.data();
    const ownerId = prayer.userId;
    if (!ownerId)
        return;
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
    const profile = (userDoc.exists ? userDoc.data() : {});
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
exports.submitScore = (0, https_1.onCall)({
    // Enable App Check enforcement - reject requests without valid tokens
    enforceAppCheck: true,
}, async (request) => {
    const { data, auth, app, rawRequest } = request;
    // 0. APP CHECK VERIFICATION (automatically handled by enforceAppCheck)
    // app will contain App Check data if token is valid
    if (app) {
        console.log(`✅ App Check verified for app: ${app}`);
    }
    // 1. AUTHENTICATION CHECK
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to submit scores.');
    }
    const userId = auth.uid;
    const displayName = data.displayName || auth.token.name || 'Anonymous';
    // 2. VALIDATE INPUT DATA
    const { score, level, correctAnswers, questionCount, timeElapsed, wagerTotal, powerUpsUsed } = data;
    // Check required fields
    if (typeof score !== 'number' || typeof level !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Score and level are required and must be numbers.');
    }
    // Validate ranges
    if (score < 0 || score > 50000) {
        throw new https_1.HttpsError('invalid-argument', 'Score is out of valid range (0-50000).');
    }
    if (level < 1 || level > 7) {
        throw new https_1.HttpsError('invalid-argument', 'Level must be between 1 and 7.');
    }
    if (correctAnswers && (correctAnswers < 0 || correctAnswers > questionCount)) {
        throw new https_1.HttpsError('invalid-argument', 'Correct answers cannot exceed question count.');
    }
    // 3. TIMING VALIDATION (Anti-cheat)
    if (questionCount && timeElapsed) {
        const MIN_SECONDS_PER_QUESTION = 1; // Minimum 1 second per question
        const minTime = questionCount * MIN_SECONDS_PER_QUESTION;
        if (timeElapsed < minTime) {
            console.warn(`Suspicious timing detected: ${userId} completed ${questionCount} questions in ${timeElapsed}s`);
            throw new https_1.HttpsError('invalid-argument', `Impossible completion time detected. Minimum time: ${minTime}s, actual: ${timeElapsed}s`);
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
            throw new https_1.HttpsError('invalid-argument', 'Score exceeds theoretical maximum based on correct answers.');
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
                    throw new https_1.HttpsError('resource-exhausted', `Please wait ${waitTime} seconds before submitting another score.`);
                }
            }
        }
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error submitting score:', error);
        throw new https_1.HttpsError('internal', 'Failed to submit score. Please try again.');
    }
});
