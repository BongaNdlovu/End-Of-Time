const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');
// Load existing compiled TypeScript exports (e.g., onInteractionCreate)
let tsExports = {};
try {
    tsExports = require('./lib/index.js');
}
catch (e) {
    console.log('TypeScript compiled functions not available, using JS-only functions:', e.message);
}
if (!admin.apps.length) {
    admin.initializeApp();
}
// ============================================
// END OF TIME ACADEMY (Study Progress + XP)
// ============================================
const ACADEMY_LESSON_XP = 15;
const ACADEMY_COURSE_COMPLETION_XP = 100;
// Canonical answer keys (server-side). Course IDs map to their quiz question correct indices.
// NOTE: Client can render questions/options, but only server awards progress/XP.
const ACADEMY_QUIZ_KEYS = Object.freeze({
    c1: { l1: { q1: 2, q2: 2, q3: 1 } },
    c2: { l1: { q1: 1, q2: 1 } },
    c3: { l1: { q1: 2, q2: 1 } },
    c4: { l1: { q1: 2, q2: 1 } },
    c5: { l1: { q1: 2, q2: 1 } },
    c6: { l1: { q1: 2, q2: 1 } },
    c7: { l1: { q1: 2, q2: 1, q3: 1 } },
    c8: { l1: { q1: 2, q2: 1 } },
    c9: { l1: { q1: 1, q2: 2 } },
    c10: { l1: { q1: 1, q2: 1, q3: 1 } },
});
const ACADEMY_MAX_COURSE_NUMBER = (() => {
    const nums = Object.keys(ACADEMY_QUIZ_KEYS)
        .map((id) => (id.startsWith('c') ? Number(id.slice(1)) : NaN))
        .filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 1;
})();
function academyParseCourseNumber(courseId) {
    if (typeof courseId !== 'string')
        return null;
    const m = /^c(\d+)$/.exec(courseId);
    if (!m)
        return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 1 ? n : null;
}
function academyRankForLevel(level) {
    const n = Number(level);
    if (!Number.isFinite(n) || n < 1)
        return 'Initiate';
    if (n <= 2)
        return 'Initiate';
    if (n <= 4)
        return 'Novice';
    if (n <= 9)
        return 'Acolyte';
    if (n <= 19)
        return 'Operative';
    if (n <= 29)
        return 'Scholar';
    if (n <= 49)
        return 'Theologian';
    if (n <= 74)
        return 'Apologist';
    if (n <= 99)
        return 'Dogmatician';
    return 'Grandmaster';
}
function academyComputeLevelFromXp(xpTotal) {
    const xp = Number(xpTotal);
    if (!Number.isFinite(xp) || xp <= 0)
        return 1;
    return Math.floor(xp / 1000) + 1;
}
function academyLessonKey(courseId, lessonId) {
    return `${courseId}:${lessonId}`;
}
function academyDefaultProgress() {
    return {
        schemaVersion: 1,
        studyLevelUnlocked: 1,
        studyLevelCompleted: 0,
        passedLessonKeys: [],
        xpTotal: 0,
        xpLevel: 1,
        rank: 'Initiate',
        badges: [],
        streakDays: 0,
        resetCount: 0,
        lastResetAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}
function academyValidateAuth(context) {
    if (!context || !context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign-in required.');
    }
    return context.auth.uid;
}
function academyPickDisplayName(context) {
    const token = (context && context.auth && context.auth.token) ? context.auth.token : {};
    const name = token.name || token.email || 'Student';
    return String(name).slice(0, 80);
}
const academyEnsureUser = functions
    .region('us-central1')
    .https.onCall(async (_data, context) => {
    var _a, _b;
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = ((_b = (_a = context === null || context === void 0 ? void 0 : context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.picture) ? String(context.auth.token.picture).slice(0, 500) : null;
    const db = admin.firestore();
    const userRef = db.collection('academy_users').doc(uid);
    const progressRef = db.collection('academy_progress').doc(uid);
    const leaderboardRef = db.collection('academy_leaderboard').doc(uid);
    await db.runTransaction(async (tx) => {
        const [userSnap, progressSnap] = await Promise.all([tx.get(userRef), tx.get(progressRef)]);
        if (!userSnap.exists) {
            tx.create(userRef, {
                uid,
                displayName,
                photoURL,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            tx.set(userRef, {
                displayName,
                photoURL,
                lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        if (!progressSnap.exists) {
            tx.create(progressRef, academyDefaultProgress());
        }
        else {
            tx.set(progressRef, { updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        const progressData = progressSnap.exists ? progressSnap.data() : academyDefaultProgress();
        const xpTotal = Number((progressData === null || progressData === void 0 ? void 0 : progressData.xpTotal) || 0);
        const xpLevel = Number((progressData === null || progressData === void 0 ? void 0 : progressData.xpLevel) || academyComputeLevelFromXp(xpTotal));
        const rank = String((progressData === null || progressData === void 0 ? void 0 : progressData.rank) || academyRankForLevel(xpLevel));
        const studyLevelCompleted = Number((progressData === null || progressData === void 0 ? void 0 : progressData.studyLevelCompleted) || 0);
        tx.set(leaderboardRef, {
            uid,
            displayName,
            photoURL,
            xpTotal,
            xpLevel,
            rank,
            studyLevelCompleted,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
const academySubmitLessonQuiz = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = ((_b = (_a = context === null || context === void 0 ? void 0 : context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.picture) ? String(context.auth.token.picture).slice(0, 500) : null;
    const courseId = data && typeof data.courseId === 'string' ? data.courseId : null;
    const lessonId = data && typeof data.lessonId === 'string' ? data.lessonId : null;
    const answers = data && typeof data.answers === 'object' && data.answers ? data.answers : null;
    if (!courseId || courseId.length > 40) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid courseId.');
    }
    if (!lessonId || lessonId.length > 40) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid lessonId.');
    }
    if (!answers) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing answers.');
    }
    const courseNumber = academyParseCourseNumber(courseId);
    if (!courseNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Unsupported courseId format.');
    }
    const lessonQuizKeys = (_c = ACADEMY_QUIZ_KEYS === null || ACADEMY_QUIZ_KEYS === void 0 ? void 0 : ACADEMY_QUIZ_KEYS[courseId]) === null || _c === void 0 ? void 0 : _c[lessonId];
    if (!lessonQuizKeys) {
        throw new functions.https.HttpsError('not-found', 'Quiz not found for this lesson.');
    }
    const expectedQuestionIds = Object.keys(lessonQuizKeys)
        .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    // Validate all required questions answered.
    for (const qId of expectedQuestionIds) {
        const v = answers[qId];
        if (!Number.isInteger(v) || v < 0 || v > 20) {
            throw new functions.https.HttpsError('invalid-argument', `Invalid answer for ${qId}.`);
        }
    }
    const perQuestion = {};
    let correctCount = 0;
    for (const qId of expectedQuestionIds) {
        const isCorrect = Number(answers[qId]) === Number(lessonQuizKeys[qId]);
        if (isCorrect)
            correctCount += 1;
        perQuestion[qId] = {
            isCorrect,
            correctIndex: Number(lessonQuizKeys[qId]),
        };
    }
    const total = expectedQuestionIds.length;
    const passed = correctCount === total;
    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const leaderboardRef = db.collection('academy_leaderboard').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);
    const result = await db.runTransaction(async (tx) => {
        const progressSnap = await tx.get(progressRef);
        const progress = progressSnap.exists ? progressSnap.data() : academyDefaultProgress();
        const studyLevelUnlocked = Number((progress === null || progress === void 0 ? void 0 : progress.studyLevelUnlocked) || 1);
        const studyLevelCompleted = Number((progress === null || progress === void 0 ? void 0 : progress.studyLevelCompleted) || 0);
        const passedLessonKeys = Array.isArray(progress === null || progress === void 0 ? void 0 : progress.passedLessonKeys) ? progress.passedLessonKeys.slice(0, 2000) : [];
        if (courseNumber > studyLevelUnlocked) {
            throw new functions.https.HttpsError('failed-precondition', 'This study level is locked.');
        }
        // Update last seen/profile fields opportunistically.
        tx.set(userRef, {
            uid,
            displayName,
            photoURL,
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (!passed) {
            // No state changes on failure (100% required).
            return {
                ok: true,
                passed: false,
                score: correctCount,
                total,
                perQuestion,
                xpAwarded: 0,
                courseBonusAwarded: 0,
                unlockedStudyLevel: studyLevelUnlocked,
                completedStudyLevel: studyLevelCompleted,
            };
        }
        const key = academyLessonKey(courseId, lessonId);
        const alreadyPassed = passedLessonKeys.includes(key);
        let xpAwarded = 0;
        let courseBonusAwarded = 0;
        let newStudyLevelUnlocked = studyLevelUnlocked;
        let newStudyLevelCompleted = studyLevelCompleted;
        let newXpTotal = Number((progress === null || progress === void 0 ? void 0 : progress.xpTotal) || 0);
        if (!alreadyPassed) {
            passedLessonKeys.push(key);
            xpAwarded = ACADEMY_LESSON_XP;
            newXpTotal += ACADEMY_LESSON_XP;
        }
        // Course completion check (all lessons for the course passed).
        const courseLessonIds = Object.keys((ACADEMY_QUIZ_KEYS === null || ACADEMY_QUIZ_KEYS === void 0 ? void 0 : ACADEMY_QUIZ_KEYS[courseId]) || {});
        const courseComplete = courseLessonIds.every((lId) => passedLessonKeys.includes(academyLessonKey(courseId, lId)));
        const wasCourseAlreadyCompleted = newStudyLevelCompleted >= courseNumber;
        if (courseComplete && !wasCourseAlreadyCompleted) {
            newStudyLevelCompleted = courseNumber;
            if (courseNumber < ACADEMY_MAX_COURSE_NUMBER) {
                newStudyLevelUnlocked = Math.max(newStudyLevelUnlocked, courseNumber + 1);
            }
            courseBonusAwarded = ACADEMY_COURSE_COMPLETION_XP;
            newXpTotal += ACADEMY_COURSE_COMPLETION_XP;
        }
        const newXpLevel = academyComputeLevelFromXp(newXpTotal);
        const newRank = academyRankForLevel(newXpLevel);
        tx.set(progressRef, {
            schemaVersion: 1,
            studyLevelUnlocked: Math.min(newStudyLevelUnlocked, ACADEMY_MAX_COURSE_NUMBER),
            studyLevelCompleted: newStudyLevelCompleted,
            passedLessonKeys,
            xpTotal: newXpTotal,
            xpLevel: newXpLevel,
            rank: newRank,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(leaderboardRef, {
            uid,
            displayName,
            photoURL,
            xpTotal: newXpTotal,
            xpLevel: newXpLevel,
            rank: newRank,
            studyLevelCompleted: newStudyLevelCompleted,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return {
            ok: true,
            passed: true,
            score: correctCount,
            total,
            perQuestion,
            xpAwarded,
            courseBonusAwarded,
            unlockedStudyLevel: Math.min(newStudyLevelUnlocked, ACADEMY_MAX_COURSE_NUMBER),
            completedStudyLevel: newStudyLevelCompleted,
            xpTotal: newXpTotal,
            xpLevel: newXpLevel,
            rank: newRank,
        };
    });
    return result;
});
const academyResetEverything = functions
    .region('us-central1')
    .https.onCall(async (_data, context) => {
    var _a, _b;
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = ((_b = (_a = context === null || context === void 0 ? void 0 : context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.picture) ? String(context.auth.token.picture).slice(0, 500) : null;
    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const leaderboardRef = db.collection('academy_leaderboard').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(progressRef);
        const prev = snap.exists ? snap.data() : null;
        const prevResetCount = Number((prev === null || prev === void 0 ? void 0 : prev.resetCount) || 0);
        tx.set(userRef, {
            uid,
            displayName,
            photoURL,
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(progressRef, Object.assign({ schemaVersion: 1, studyLevelUnlocked: 1, studyLevelCompleted: 0, passedLessonKeys: [], xpTotal: 0, xpLevel: 1, rank: 'Initiate', badges: [], streakDays: 0, resetCount: prevResetCount + 1, lastResetAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, (snap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })), { merge: true });
        tx.set(leaderboardRef, {
            uid,
            displayName,
            photoURL,
            xpTotal: 0,
            xpLevel: 1,
            rank: 'Initiate',
            studyLevelCompleted: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
// Configure email transport (dotenv for local, Secrets Manager for production)
const emailCfgEnv = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
};
const smtpCfgEnv = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
};
// Legacy config (will be removed before March 2026)
const emailCfgLegacy = {};
const smtpCfgLegacy = {};
function buildTransporter() {
    var _a;
    const useSmtpEnv = Boolean(smtpCfgEnv.host);
    const useEmailEnv = Boolean(emailCfgEnv.user && emailCfgEnv.pass);
    if (useSmtpEnv) {
        return nodemailer.createTransport({
            host: smtpCfgEnv.host,
            port: Number(smtpCfgEnv.port || 465),
            secure: String((_a = smtpCfgEnv.secure) !== null && _a !== void 0 ? _a : 'true') === 'true',
            auth: {
                user: emailCfgEnv.user,
                pass: emailCfgEnv.pass,
            },
        });
    }
    if (useEmailEnv) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailCfgEnv.user,
                pass: emailCfgEnv.pass,
            },
        });
    }
    if (smtpCfgLegacy.host) {
        return nodemailer.createTransport({
            host: smtpCfgLegacy.host,
            port: Number(smtpCfgLegacy.port || 465),
            secure: String(smtpCfgLegacy.secure || 'true') === 'true',
            auth: {
                user: emailCfgLegacy.user,
                pass: emailCfgLegacy.pass,
            },
        });
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailCfgLegacy.user,
            pass: emailCfgLegacy.pass,
        },
    });
}
function computeFromAddress() {
    return emailCfgEnv.from
        || emailCfgLegacy.from
        || `End of Time Prayer Network <${emailCfgEnv.user || emailCfgLegacy.user || 'noreply@endoftime.com'}>`;
}
// Declare secrets and attach to functions so they load into env at runtime (1st Gen)
const SECRET_EMAIL_USER = defineSecret('EMAIL_USER');
const SECRET_EMAIL_PASS = defineSecret('EMAIL_PASS');
// Helper subject/body builders
function getEmailSubject(type) {
    switch (type) {
        case 'prayer_received':
            return 'Someone is praying for you';
        case 'comment_received':
            return 'New comment on your prayer request';
        default:
            return 'End of Time Prayer Network Update';
    }
}
function getEmailBody(type, data = {}) {
    switch (type) {
        case 'prayer_received':
            return `
        <h2>Someone is lifting you up in prayer!</h2>
        <p>${data.message || ''}</p>
        <p>Remember: "The prayer of a righteous person is powerful and effective." - James 5:16</p>
      `;
        case 'comment_received':
            return `
        <h2>New encouragement on your prayer request</h2>
        <p><strong>${data.userName || 'Someone'}</strong> commented:</p>
        <blockquote>${data.comment || ''}</blockquote>
        <p>Prayer: "${data.prayerTitle || ''}"</p>
      `;
        default:
            return '<p>Update from End of Time Prayer Network</p>';
    }
}
// Listen for email queue entries (attach secrets so env is populated at invocation time)
const sendEmailNotification = functions
    .runWith({ secrets: [
        SECRET_EMAIL_USER,
        SECRET_EMAIL_PASS,
    ] })
    .firestore
    .document('emailQueue/{docId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!data || !data.to) {
        await snap.ref.update({ status: 'failed', error: 'Missing recipient email' });
        return;
    }
    const mailOptions = {
        from: computeFromAddress(),
        to: data.to,
        subject: getEmailSubject(data.type),
        html: getEmailBody(data.type, data.data),
    };
    try {
        const transporter = buildTransporter();
        await transporter.sendMail(mailOptions);
        await snap.ref.update({ status: 'sent' });
    }
    catch (error) {
        console.error('Email send error:', error);
        await snap.ref.update({ status: 'failed', error: error.message });
    }
});
// Public HTTPS function to fetch leaderboard top 100 as a fallback
// Useful when client-side Firestore reads are blocked by App Check enforcement
const getLeaderboardTop = functions.region('us-central1').https.onRequest(async (req, res) => {
    // Basic CORS handling
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }
    try {
        const snapshot = await admin
            .firestore()
            .collection('leaderboard')
            .orderBy('totalCumulativeScore', 'desc')
            .limit(100)
            .get();
        const items = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json({ items });
    }
    catch (e) {
        console.error('getLeaderboardTop error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Create Stripe Checkout session for donations
// Note: STRIPE_SECRET_KEY is optional - function will return 503 if not configured
exports.createDonationSession = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
    // Basic CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }
    // Feature flag: donations disabled unless explicitly enabled
    if (process.env.DONATIONS_ENABLED !== 'true') {
        res.status(503).json({ error: 'Donations are temporarily disabled' });
        return;
    }
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        res.status(500).json({ error: 'Stripe not configured' });
        return;
    }
    const stripe = require('stripe')(stripeSecretKey);
    try {
        const { amount, currency = 'usd', customer_email, metadata } = req.body || {};
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 100 || numericAmount > 10000000) {
            res.status(400).json({ error: 'Invalid amount. Must be between 1.00 and 100,000.00' });
            return;
        }
        // Build success/cancel URLs from request or fallback to hosting site
        const forwardedHost = req.get('x-forwarded-host');
        const proto = req.get('x-forwarded-proto') || 'https';
        const baseUrl = (req.get('origin'))
            || (forwardedHost ? `${proto}://${forwardedHost}` : 'https://end-of-time-94cd3.web.app');
        const successUrl = `${baseUrl}/menu.html?donation=success`;
        const cancelUrl = `${baseUrl}/menu.html?donation=cancelled`;
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            // Let Stripe determine available payment methods; defaults include cards
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: { name: 'Donation to End of Time' },
                        unit_amount: Math.round(numericAmount),
                    },
                    quantity: 1,
                },
            ],
            customer_email: customer_email || undefined,
            metadata: metadata || undefined,
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
        res.status(200).json({ url: session.url });
    }
    catch (e) {
        console.error('createDonationSession error:', e);
        res.status(500).json({ error: 'Failed to create donation session' });
    }
});
// Export all functions
module.exports = Object.assign(Object.assign({}, tsExports), { sendEmailNotification,
    getLeaderboardTop,
    academyEnsureUser,
    academySubmitLessonQuiz,
    academyResetEverything, createDonationSession: exports.createDonationSession });

