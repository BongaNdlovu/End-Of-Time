const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');
require('dotenv').config();

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

// Course progression order (easy -> hard) to keep unlocks coherent with the UI.
const ACADEMY_COURSE_SEQUENCE = Object.freeze({
  c1: 1,
  c2: 2,
  c9: 3,
  c5: 4,
  c3: 5,
  c6: 6,
  c8: 7,
  c4: 8,
  c7: 9,
  c10: 10,
});

const ACADEMY_PREREQUISITES = Object.freeze({
  c2: ['c1'],
  c9: ['c1'],
  c5: ['c2'],
  c3: ['c2'],
  c6: ['c3'],
  c8: ['c5', 'c6'],
  c4: ['c5'],
  c7: ['c4', 'c8'],
  c10: ['c7', 'c8'],
});

const ACADEMY_LESSON_DURATIONS = Object.freeze({
  c1: { l1: 25 },
  c2: { l1: 28 },
  c3: { l1: 32 },
  c4: { l1: 38 },
  c5: { l1: 30 },
  c6: { l1: 30 },
  c7: { l1: 40 },
  c8: { l1: 34 },
  c9: { l1: 28 },
  c10: { l1: 45 },
});

const ACADEMY_MAX_COURSE_NUMBER = (() => {
  const nums = Object.values(ACADEMY_COURSE_SEQUENCE)
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : 1;
})();

function academyParseCourseNumber(courseId) {
  if (typeof courseId !== 'string') return null;
  const mapped = ACADEMY_COURSE_SEQUENCE[courseId];
  if (Number.isFinite(mapped)) return Number(mapped);
  const m = /^c(\d+)$/.exec(courseId);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function academyGetTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function academyGetWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function academyDiffInDays(fromKey, toKey) {
  const parseDateKey = (key) => {
    const [year, month, day] = String(key).split('-').map((value) => Number(value));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(year, month - 1, day);
  };
  const fromDate = parseDateKey(fromKey);
  const toDate = parseDateKey(toKey);
  if (!fromDate || !toDate) return 0;
  const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
  const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
  return Math.round((toMidnight - fromMidnight) / 86400000);
}

function academyClampTarget(value, fallback) {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num) || num < 1) return fallback;
  return num;
}

function academyNormalizeStringArray(value, limit = 2000) {
  if (!Array.isArray(value)) return [];
  const normalized = value.filter((item) => typeof item === 'string');
  return normalized.slice(0, limit);
}

const ACADEMY_DEFAULT_PLAN = { type: 'lessons', target: 1 };

function academyNormalizeStudyPlan(plan) {
  const type = plan && plan.type === 'minutes' ? 'minutes' : 'lessons';
  const target = academyClampTarget(plan?.target, ACADEMY_DEFAULT_PLAN.target);
  return { type, target };
}

function academySelectDailyMission(plan) {
  const today = academyGetTodayKey();
  const seed = today.split('-').join('');
  const seedValue = Number(seed.slice(-4)) || 1;
  const choice = seedValue % 3;
  if (plan.type === 'minutes') {
    return choice === 0
      ? { type: 'minutes', target: Math.max(10, Math.min(plan.target, 25)) }
      : { type: 'quiz', target: 1 };
  }
  if (choice === 0) return { type: 'lessons', target: 1 };
  if (choice === 1) return { type: 'minutes', target: 10 };
  return { type: 'quiz', target: 1 };
}

function academyNormalizeStudyHistory(history) {
  if (!history || typeof history !== 'object') return {};
  const normalized = {};
  Object.entries(history).forEach(([key, entry]) => {
    const lessons = Number(entry?.lessons);
    const minutes = Number(entry?.minutes);
    const quizzes = Number(entry?.quizzes);
    const hasLessonKeys = Array.isArray(entry?.lessonKeys);
    const lessonKeys = hasLessonKeys ? entry.lessonKeys.filter((value) => typeof value === 'string') : [];
    const normalizedEntry = {
      lessons: Number.isFinite(lessons) && lessons > 0 ? lessons : 0,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
      quizzes: Number.isFinite(quizzes) && quizzes > 0 ? quizzes : 0,
    };
    if (hasLessonKeys) {
      normalizedEntry.lessonKeys = lessonKeys;
    }
    normalized[key] = normalizedEntry;
  });
  return normalized;
}

function academyPruneStudyHistory(history, keepDays = 28) {
  const keys = Object.keys(history).sort();
  const trimmed = {};
  keys.slice(-keepDays).forEach((key) => {
    trimmed[key] = history[key];
  });
  return trimmed;
}

function academyEnsureWeeklyChallenge(challenge, weekKey) {
  if (!challenge || challenge.week !== weekKey) {
    return { week: weekKey, lessons: [], quizzes: 0, completed: false };
  }
  return {
    week: weekKey,
    lessons: Array.isArray(challenge.lessons) ? challenge.lessons.filter((value) => typeof value === 'string') : [],
    quizzes: Number.isFinite(Number(challenge.quizzes)) ? Number(challenge.quizzes) : 0,
    completed: Boolean(challenge.completed),
  };
}

function academyEnsureDailyMission(mission, plan, todayKey) {
  if (!mission || mission.date !== todayKey) {
    return { date: todayKey, ...academySelectDailyMission(plan) };
  }
  const type = mission.type === 'minutes' || mission.type === 'quiz' ? mission.type : 'lessons';
  const target = academyClampTarget(mission.target, 1);
  return { date: todayKey, type, target };
}

function academyNormalizeStreakState(streakState, weekKey, fallbackCurrent = 0) {
  const baseCurrent = Number.isFinite(Number(streakState?.current))
    ? Number(streakState.current)
    : Number(fallbackCurrent || 0);
  const current = Math.max(0, Math.floor(baseCurrent));
  const lastStudyDate = typeof streakState?.lastStudyDate === 'string' ? streakState.lastStudyDate : null;
  let graceUsedWeek = typeof streakState?.graceUsedWeek === 'string' ? streakState.graceUsedWeek : null;
  if (graceUsedWeek && graceUsedWeek !== weekKey) graceUsedWeek = null;
  return { current, lastStudyDate, graceUsedWeek };
}

function academyNormalizeWeeklyMastery(weeklyMastery, weekKey) {
  if (!weeklyMastery || weeklyMastery.week !== weekKey || typeof weeklyMastery.counts !== 'object') {
    return { week: weekKey, counts: {} };
  }
  const counts = {};
  Object.entries(weeklyMastery.counts || {}).forEach(([key, value]) => {
    const count = Math.round(Number(value));
    if (Number.isFinite(count) && count > 0) {
      counts[key] = count;
    }
  });
  return { week: weekKey, counts };
}

function academyUpdateStreak(streakState, todayKey, weekKey) {
  const state = {
    current: Number(streakState?.current || 0),
    lastStudyDate: typeof streakState?.lastStudyDate === 'string' ? streakState.lastStudyDate : null,
    graceUsedWeek: typeof streakState?.graceUsedWeek === 'string' ? streakState.graceUsedWeek : null,
  };
  const graceWeek = state.graceUsedWeek === weekKey ? weekKey : null;
  if (!state.lastStudyDate) {
    return { current: 1, lastStudyDate: todayKey, graceUsedWeek: graceWeek };
  }
  if (state.lastStudyDate === todayKey) {
    return { ...state, graceUsedWeek: graceWeek };
  }
  const gap = academyDiffInDays(state.lastStudyDate, todayKey);
  if (gap === 1) {
    return { current: state.current + 1, lastStudyDate: todayKey, graceUsedWeek: graceWeek };
  }
  if (gap === 2 && !graceWeek) {
    return { current: state.current + 1, lastStudyDate: todayKey, graceUsedWeek: weekKey };
  }
  return { current: 1, lastStudyDate: todayKey, graceUsedWeek: graceWeek };
}

function academyCourseLessonKeys(courseId) {
  const lessons = Object.keys(ACADEMY_QUIZ_KEYS?.[courseId] || {});
  return lessons.map((lessonId) => academyLessonKey(courseId, lessonId));
}

function academyMissingPrereqs(courseId, passedLessonKeys) {
  const prereqs = ACADEMY_PREREQUISITES[courseId] || [];
  const passedSet = new Set(passedLessonKeys || []);
  return prereqs.filter((prereqId) => {
    const keys = academyCourseLessonKeys(prereqId);
    return keys.length === 0 || !keys.every((key) => passedSet.has(key));
  });
}

function academyRankForLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n) || n < 1) return 'Initiate';
  if (n <= 2) return 'Initiate';
  if (n <= 4) return 'Novice';
  if (n <= 9) return 'Acolyte';
  if (n <= 19) return 'Operative';
  if (n <= 29) return 'Scholar';
  if (n <= 49) return 'Theologian';
  if (n <= 74) return 'Apologist';
  if (n <= 99) return 'Dogmatician';
  return 'Grandmaster';
}

function academyComputeLevelFromXp(xpTotal) {
  const xp = Number(xpTotal);
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.floor(xp / 1000) + 1;
}

function academyLessonKey(courseId, lessonId) {
  return `${courseId}:${lessonId}`;
}

function academyDefaultProgress() {
  const todayKey = academyGetTodayKey();
  const weekKey = academyGetWeekKey();
  const plan = academyNormalizeStudyPlan(null);
  return {
    schemaVersion: 1,
    studyLevelUnlocked: 1,
    studyLevelCompleted: 0,
    passedLessonKeys: [],
    readLessonKeys: [],
    xpTotal: 0,
    xpLevel: 1,
    rank: 'Initiate',
    badges: [],
    streakDays: 0,
    studyPlan: plan,
    studyHistory: {},
    streakState: { current: 0, lastStudyDate: null, graceUsedWeek: null },
    weeklyChallenge: { week: weekKey, lessons: [], quizzes: 0, completed: false },
    dailyMission: { date: todayKey, ...academySelectDailyMission(plan) },
    weeklyMastery: { week: weekKey, counts: {} },
    milestoneClaims: [],
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
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

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
      } else {
        tx.set(userRef, {
          displayName,
          photoURL,
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      const todayKey = academyGetTodayKey();
      const weekKey = academyGetWeekKey();
      let progressData = progressSnap.exists ? progressSnap.data() : null;

      if (!progressSnap.exists) {
        const initialProgress = academyDefaultProgress();
        tx.create(progressRef, initialProgress);
        progressData = initialProgress;
      } else {
        const plan = academyNormalizeStudyPlan(progressData?.studyPlan);
        const dailyMission = academyEnsureDailyMission(progressData?.dailyMission, plan, todayKey);
        const weeklyChallenge = academyEnsureWeeklyChallenge(progressData?.weeklyChallenge, weekKey);
        const weeklyMastery = academyNormalizeWeeklyMastery(progressData?.weeklyMastery, weekKey);
        const studyHistory = academyPruneStudyHistory(academyNormalizeStudyHistory(progressData?.studyHistory));
        const readLessonKeys = academyNormalizeStringArray(progressData?.readLessonKeys, 2000);
        const milestoneClaims = academyNormalizeStringArray(progressData?.milestoneClaims, 200);
        const streakState = academyNormalizeStreakState(progressData?.streakState, weekKey, progressData?.streakDays || 0);

        const progressPatch = {
          studyPlan: plan,
          dailyMission,
          weeklyChallenge,
          weeklyMastery,
          studyHistory,
          readLessonKeys,
          milestoneClaims,
          streakState,
          streakDays: streakState.current,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        tx.set(progressRef, progressPatch, { merge: true });
        progressData = { ...progressData, ...progressPatch };
      }

      const xpTotal = Number(progressData?.xpTotal || 0);
      const xpLevel = Number(progressData?.xpLevel || academyComputeLevelFromXp(xpTotal));
      const rank = String(progressData?.rank || academyRankForLevel(xpLevel));
      const studyLevelCompleted = Number(progressData?.studyLevelCompleted || 0);

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
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

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

    const lessonQuizKeys = ACADEMY_QUIZ_KEYS?.[courseId]?.[lessonId];
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
      if (isCorrect) correctCount += 1;
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
      const todayKey = academyGetTodayKey();
      const weekKey = academyGetWeekKey();
      const studyPlan = academyNormalizeStudyPlan(progress?.studyPlan);
      const dailyMission = academyEnsureDailyMission(progress?.dailyMission, studyPlan, todayKey);
      const weeklyChallenge = academyEnsureWeeklyChallenge(progress?.weeklyChallenge, weekKey);
      const weeklyMastery = academyNormalizeWeeklyMastery(progress?.weeklyMastery, weekKey);
      const studyHistory = academyNormalizeStudyHistory(progress?.studyHistory);
      const passedLessonKeys = academyNormalizeStringArray(progress?.passedLessonKeys, 2000);
      const readLessonKeys = academyNormalizeStringArray(progress?.readLessonKeys, 2000);
      const milestoneClaims = academyNormalizeStringArray(progress?.milestoneClaims, 200);
      const streakState = academyNormalizeStreakState(progress?.streakState, weekKey, progress?.streakDays || 0);

      const studyLevelUnlocked = Number(progress?.studyLevelUnlocked || 1);
      const studyLevelCompleted = Number(progress?.studyLevelCompleted || 0);

      const key = academyLessonKey(courseId, lessonId);
      const alreadyPassed = passedLessonKeys.includes(key);

      if (courseNumber > studyLevelUnlocked) {
        throw new functions.https.HttpsError('failed-precondition', 'This study level is locked.');
      }
      if (!alreadyPassed) {
        const missingPrereqs = academyMissingPrereqs(courseId, passedLessonKeys);
        if (missingPrereqs.length > 0) {
          throw new functions.https.HttpsError('failed-precondition', 'Prerequisites required.', { missingPrereqs });
        }
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

      if (!readLessonKeys.includes(key)) {
        readLessonKeys.push(key);
      }

      const rawMinutes = Number(ACADEMY_LESSON_DURATIONS?.[courseId]?.[lessonId] || 0);
      const durationMinutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? Math.round(rawMinutes) : 0;
      const todayEntry = studyHistory[todayKey] || { lessons: 0, minutes: 0, quizzes: 0, lessonKeys: [] };
      const lessonKeys = Array.isArray(todayEntry.lessonKeys) ? todayEntry.lessonKeys.slice() : [];
      const isNewLessonToday = !lessonKeys.includes(key);
      if (isNewLessonToday) {
        lessonKeys.push(key);
        if (durationMinutes > 0) {
          todayEntry.minutes += durationMinutes;
        }
      }
      todayEntry.quizzes += 1;
      todayEntry.lessons = lessonKeys.length;
      todayEntry.lessonKeys = lessonKeys;
      studyHistory[todayKey] = todayEntry;
      const prunedHistory = academyPruneStudyHistory(studyHistory);

      const updatedStreakState = academyUpdateStreak(streakState, todayKey, weekKey);

      const weeklyLessonSet = new Set(weeklyChallenge.lessons);
      if (isNewLessonToday) {
        weeklyLessonSet.add(key);
      }
      const updatedWeeklyChallenge = {
        week: weekKey,
        lessons: Array.from(weeklyLessonSet),
        quizzes: weeklyChallenge.quizzes + 1,
        completed: false,
      };
      updatedWeeklyChallenge.completed = updatedWeeklyChallenge.lessons.length >= 2
        && updatedWeeklyChallenge.quizzes >= 1;

      const masteryCounts = { ...weeklyMastery.counts };
      masteryCounts[key] = Number(masteryCounts[key] || 0) + 1;
      const updatedWeeklyMastery = { week: weekKey, counts: masteryCounts };

      let xpAwarded = 0;
      let courseBonusAwarded = 0;
      let newStudyLevelUnlocked = studyLevelUnlocked;
      let newStudyLevelCompleted = studyLevelCompleted;
      let newXpTotal = Number(progress?.xpTotal || 0);

      if (!alreadyPassed) {
        passedLessonKeys.push(key);
        xpAwarded = ACADEMY_LESSON_XP;
        newXpTotal += ACADEMY_LESSON_XP;
      }

      // Course completion check (all lessons for the course passed).
      const courseLessonIds = Object.keys(ACADEMY_QUIZ_KEYS?.[courseId] || {});
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
        passedLessonKeys: passedLessonKeys.slice(0, 2000),
        readLessonKeys: readLessonKeys.slice(0, 2000),
        xpTotal: newXpTotal,
        xpLevel: newXpLevel,
        rank: newRank,
        badges: Array.isArray(progress?.badges) ? progress.badges : [],
        streakDays: updatedStreakState.current,
        studyPlan,
        studyHistory: prunedHistory,
        streakState: updatedStreakState,
        weeklyChallenge: updatedWeeklyChallenge,
        dailyMission,
        weeklyMastery: updatedWeeklyMastery,
        milestoneClaims,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(progressSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
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

const academyUpdateStudyPlan = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

    const plan = academyNormalizeStudyPlan(data || {});
    const todayKey = academyGetTodayKey();
    const dailyMission = { date: todayKey, ...academySelectDailyMission(plan) };

    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);

    await db.runTransaction(async (tx) => {
      const progressSnap = await tx.get(progressRef);

      tx.set(userRef, {
        uid,
        displayName,
        photoURL,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!progressSnap.exists) {
        const initialProgress = academyDefaultProgress();
        tx.create(progressRef, {
          ...initialProgress,
          studyPlan: plan,
          dailyMission,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      tx.set(progressRef, {
        studyPlan: plan,
        dailyMission,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { ok: true, studyPlan: plan, dailyMission };
  });

const academyRecordReading = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

    const courseId = data && typeof data.courseId === 'string' ? data.courseId : null;
    const lessonId = data && typeof data.lessonId === 'string' ? data.lessonId : null;

    if (!courseId || courseId.length > 40) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid courseId.');
    }
    if (!lessonId || lessonId.length > 40) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid lessonId.');
    }

    const courseNumber = academyParseCourseNumber(courseId);
    if (!courseNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Unsupported courseId format.');
    }

    const rawDuration = Number(data?.durationMinutes);
    const fallbackDuration = Number(ACADEMY_LESSON_DURATIONS?.[courseId]?.[lessonId]);
    const durationMinutes = Number.isFinite(fallbackDuration) && fallbackDuration > 0
      ? Math.round(fallbackDuration)
      : (Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : 0);

    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);

    await db.runTransaction(async (tx) => {
      const progressSnap = await tx.get(progressRef);
      const progress = progressSnap.exists ? progressSnap.data() : academyDefaultProgress();

      const todayKey = academyGetTodayKey();
      const weekKey = academyGetWeekKey();
      const studyPlan = academyNormalizeStudyPlan(progress?.studyPlan);
      const dailyMission = academyEnsureDailyMission(progress?.dailyMission, studyPlan, todayKey);
      const weeklyChallenge = academyEnsureWeeklyChallenge(progress?.weeklyChallenge, weekKey);
      const studyHistory = academyNormalizeStudyHistory(progress?.studyHistory);
      const passedLessonKeys = academyNormalizeStringArray(progress?.passedLessonKeys, 2000);
      const readLessonKeys = academyNormalizeStringArray(progress?.readLessonKeys, 2000);
      const milestoneClaims = academyNormalizeStringArray(progress?.milestoneClaims, 200);
      const streakState = academyNormalizeStreakState(progress?.streakState, weekKey, progress?.streakDays || 0);

      const studyLevelUnlocked = Number(progress?.studyLevelUnlocked || 1);
      const key = academyLessonKey(courseId, lessonId);
      const alreadyRead = readLessonKeys.includes(key);

      if (!alreadyRead) {
        if (courseNumber > studyLevelUnlocked) {
          throw new functions.https.HttpsError('failed-precondition', 'This study level is locked.');
        }
        const missingPrereqs = academyMissingPrereqs(courseId, passedLessonKeys);
        if (missingPrereqs.length > 0) {
          throw new functions.https.HttpsError('failed-precondition', 'Prerequisites required.', { missingPrereqs });
        }
      }

      tx.set(userRef, {
        uid,
        displayName,
        photoURL,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!alreadyRead) {
        readLessonKeys.push(key);
      }

      const todayEntry = studyHistory[todayKey] || { lessons: 0, minutes: 0, quizzes: 0, lessonKeys: [] };
      const lessonKeys = Array.isArray(todayEntry.lessonKeys) ? todayEntry.lessonKeys.slice() : [];
      const isNewLessonToday = !lessonKeys.includes(key);
      if (isNewLessonToday) {
        lessonKeys.push(key);
        if (durationMinutes > 0) {
          todayEntry.minutes += durationMinutes;
        }
      }
      todayEntry.lessons = lessonKeys.length;
      todayEntry.lessonKeys = lessonKeys;
      studyHistory[todayKey] = todayEntry;
      const prunedHistory = academyPruneStudyHistory(studyHistory);

      let updatedStreakState = streakState;
      let updatedWeeklyChallenge = weeklyChallenge;

      if (isNewLessonToday) {
        updatedStreakState = academyUpdateStreak(streakState, todayKey, weekKey);

        const lessonSet = new Set(weeklyChallenge.lessons);
        lessonSet.add(key);
        updatedWeeklyChallenge = {
          week: weekKey,
          lessons: Array.from(lessonSet),
          quizzes: weeklyChallenge.quizzes,
          completed: false,
        };
        updatedWeeklyChallenge.completed = updatedWeeklyChallenge.lessons.length >= 2
          && updatedWeeklyChallenge.quizzes >= 1;
      }

      tx.set(progressRef, {
        schemaVersion: 1,
        readLessonKeys: readLessonKeys.slice(0, 2000),
        streakDays: updatedStreakState.current,
        studyPlan,
        studyHistory: prunedHistory,
        streakState: updatedStreakState,
        weeklyChallenge: updatedWeeklyChallenge,
        dailyMission,
        milestoneClaims,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(progressSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });
    });

    return { ok: true };
  });

const academyClaimMilestone = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

    const milestoneId = data && typeof data.milestoneId === 'string' ? data.milestoneId.trim() : '';
    if (!milestoneId || milestoneId.length > 120) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid milestoneId.');
    }

    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const progressSnap = await tx.get(progressRef);
      const progress = progressSnap.exists ? progressSnap.data() : academyDefaultProgress();
      const milestoneClaims = academyNormalizeStringArray(progress?.milestoneClaims, 200);
      if (!milestoneClaims.includes(milestoneId)) {
        milestoneClaims.push(milestoneId);
      }

      tx.set(userRef, {
        uid,
        displayName,
        photoURL,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(progressRef, {
        milestoneClaims: milestoneClaims.slice(0, 200),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(progressSnap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });

      return { ok: true, milestoneClaims: milestoneClaims.slice(0, 200) };
    });

    return result;
  });

const academyResetEverything = functions
  .region('us-central1')
  .https.onCall(async (_data, context) => {
    const uid = academyValidateAuth(context);
    const displayName = academyPickDisplayName(context);
    const photoURL = context?.auth?.token?.picture ? String(context.auth.token.picture).slice(0, 500) : null;

    const db = admin.firestore();
    const progressRef = db.collection('academy_progress').doc(uid);
    const leaderboardRef = db.collection('academy_leaderboard').doc(uid);
    const userRef = db.collection('academy_users').doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(progressRef);
      const prev = snap.exists ? snap.data() : null;
      const prevResetCount = Number(prev?.resetCount || 0);
      const todayKey = academyGetTodayKey();
      const weekKey = academyGetWeekKey();
      const plan = academyNormalizeStudyPlan(null);

      tx.set(userRef, {
        uid,
        displayName,
        photoURL,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(progressRef, {
        schemaVersion: 1,
        studyLevelUnlocked: 1,
        studyLevelCompleted: 0,
        passedLessonKeys: [],
        readLessonKeys: [],
        xpTotal: 0,
        xpLevel: 1,
        rank: 'Initiate',
        badges: [],
        streakDays: 0,
        studyPlan: plan,
        studyHistory: {},
        streakState: { current: 0, lastStudyDate: null, graceUsedWeek: null },
        weeklyChallenge: { week: weekKey, lessons: [], quizzes: 0, completed: false },
        dailyMission: { date: todayKey, ...academySelectDailyMission(plan) },
        weeklyMastery: { week: weekKey, counts: {} },
        milestoneClaims: [],
        resetCount: prevResetCount + 1,
        lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });

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

function buildTransporter() {
  const useSmtpEnv = Boolean(smtpCfgEnv.host);
  const useEmailEnv = Boolean(emailCfgEnv.user && emailCfgEnv.pass);
  if (useSmtpEnv) {
    return nodemailer.createTransport({
      host: smtpCfgEnv.host,
      port: Number(smtpCfgEnv.port || 465),
      secure: String(smtpCfgEnv.secure ?? 'true') === 'true',
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
  return null;
}

function computeFromAddress() {
  if (emailCfgEnv.from) return emailCfgEnv.from;
  if (emailCfgEnv.user) {
    return `End of Time Prayer Network <${emailCfgEnv.user}>`;
  }
  return 'End of Time Prayer Network <noreply@endoftime.com>';
}

// Declare secrets and attach to functions so they load into env at runtime (1st Gen)
const SECRET_EMAIL_USER = defineSecret('EMAIL_USER');
const SECRET_EMAIL_PASS = defineSecret('EMAIL_PASS');
// ============================================
// END OF TIME ACADEMY
// ============================================

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
  ]})
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
      if (!transporter) {
        await snap.ref.update({ status: 'failed', error: 'Email service not configured' });
        return;
      }
      await transporter.sendMail(mailOptions);
      await snap.ref.update({ status: 'sent' });
    } catch (error) {
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
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ items });
  } catch (e) {
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
    } catch (e) {
      console.error('createDonationSession error:', e);
      res.status(500).json({ error: 'Failed to create donation session' });
    }
  });

// Export all functions
module.exports = {
  sendEmailNotification,
  getLeaderboardTop,
  academyEnsureUser,
  academySubmitLessonQuiz,
  academyUpdateStudyPlan,
  academyRecordReading,
  academyClaimMilestone,
  academyResetEverything,
  createDonationSession: exports.createDonationSession,
};

