export type StudyPlanType = 'lessons' | 'minutes';

export type StudyPlan = {
  type: StudyPlanType;
  target: number;
};

export type StudyProgress = {
  date: string;
  lessons: string[];
  minutes: number;
  quizzes: number;
};

export type StudyHistoryEntry = {
  lessons: number;
  minutes: number;
  quizzes: number;
  lessonKeys?: string[];
};

export type StudyHistory = Record<string, StudyHistoryEntry>;

export type StreakState = {
  current: number;
  lastStudyDate: string | null;
  graceUsedWeek: string | null;
};

export type WeeklyChallenge = {
  week: string;
  lessons: string[];
  quizzes: number;
  completed: boolean;
};

export type DailyMissionType = 'lessons' | 'minutes' | 'quiz';

export type DailyMission = {
  date: string;
  type: DailyMissionType;
  target: number;
};

export type WeeklyMastery = {
  week: string;
  counts: Record<string, number>;
};

export type GamificationSnapshot = {
  studyPlan?: StudyPlan;
  studyHistory?: StudyHistory;
  streakState?: StreakState;
  weeklyChallenge?: WeeklyChallenge;
  dailyMission?: DailyMission;
  weeklyMastery?: WeeklyMastery;
  milestoneClaims?: string[];
  readLessonKeys?: string[];
};

const PLAN_STORAGE_KEY = 'academy:study-plan';
const PROGRESS_STORAGE_KEY = 'academy:study-progress';
const HISTORY_STORAGE_KEY = 'academy:study-history';
const STREAK_STORAGE_KEY = 'academy:study-streak';
const WEEKLY_CHALLENGE_KEY = 'academy:weekly-challenge';
const DAILY_MISSION_KEY = 'academy:daily-mission';
const MASTERY_KEY = 'academy:mastery-weekly';
const MILESTONE_CLAIMS_KEY = 'academy:milestone-claims';
const READ_LESSONS_KEY = 'academy:read-lessons';

const DEFAULT_PLAN: StudyPlan = { type: 'lessons', target: 1 };
const DEFAULT_STREAK: StreakState = { current: 0, lastStudyDate: null, graceUsedWeek: null };

const clampTarget = (value: unknown, fallback: number) => {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num) || num < 1) return fallback;
  return num;
};

export const getTodayKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const loadStudyPlan = (): StudyPlan => {
  if (typeof window === 'undefined') return DEFAULT_PLAN;
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return DEFAULT_PLAN;
    const parsed = JSON.parse(raw);
    const type: StudyPlanType = parsed?.type === 'minutes' ? 'minutes' : 'lessons';
    const target = clampTarget(parsed?.target, DEFAULT_PLAN.target);
    return { type, target };
  } catch {
    return DEFAULT_PLAN;
  }
};

export const saveStudyPlan = (plan: StudyPlan) => {
  if (typeof window === 'undefined') return;
  const normalized: StudyPlan = {
    type: plan.type === 'minutes' ? 'minutes' : 'lessons',
    target: clampTarget(plan.target, DEFAULT_PLAN.target),
  };
  window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(normalized));
};

export const loadStudyProgress = (): StudyProgress => {
  const today = getTodayKey();
  if (typeof window === 'undefined') {
    return { date: today, lessons: [], minutes: 0, quizzes: 0 };
  }
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      const fresh = { date: today, lessons: [], minutes: 0, quizzes: 0 };
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const date = typeof parsed?.date === 'string' ? parsed.date : today;
    if (date !== today) {
      const reset = { date: today, lessons: [], minutes: 0, quizzes: 0 };
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }
    const lessons = Array.isArray(parsed?.lessons) ? parsed.lessons.filter((value) => typeof value === 'string') : [];
    const minutes = Number(parsed?.minutes);
    const quizzes = Number(parsed?.quizzes);
    return {
      date: today,
      lessons,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
      quizzes: Number.isFinite(quizzes) && quizzes > 0 ? quizzes : 0,
    };
  } catch {
    const fallback = { date: today, lessons: [], minutes: 0, quizzes: 0 };
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
};

export const saveStudyProgress = (progress: StudyProgress) => {
  if (typeof window === 'undefined') return;
  const normalized: StudyProgress = {
    date: progress.date || getTodayKey(),
    lessons: Array.isArray(progress.lessons) ? progress.lessons.filter((value) => typeof value === 'string') : [],
    minutes: Number.isFinite(progress.minutes) && progress.minutes > 0 ? progress.minutes : 0,
    quizzes: Number.isFinite(progress.quizzes) && progress.quizzes > 0 ? progress.quizzes : 0,
  };
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
};

export const getWeekKey = (date: Date = new Date()) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};

const diffInDays = (fromKey: string, toKey: string) => {
  const fromDate = parseDateKey(fromKey);
  const toDate = parseDateKey(toKey);
  if (!fromDate || !toDate) return 0;
  const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
  const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
  return Math.round((toMidnight - fromMidnight) / 86400000);
};

export const loadStudyHistory = (): StudyHistory => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const history: StudyHistory = {};
    Object.entries(parsed).forEach(([date, entry]) => {
      const lessons = Number((entry as any)?.lessons);
      const minutes = Number((entry as any)?.minutes);
      const quizzes = Number((entry as any)?.quizzes);
      const lessonKeys = Array.isArray((entry as any)?.lessonKeys)
        ? (entry as any).lessonKeys.filter((value: unknown) => typeof value === 'string')
        : undefined;
      history[date] = {
        lessons: Number.isFinite(lessons) && lessons > 0 ? lessons : 0,
        minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
        quizzes: Number.isFinite(quizzes) && quizzes > 0 ? quizzes : 0,
        lessonKeys,
      };
    });
    return history;
  } catch {
    return {};
  }
};

export const saveStudyHistory = (history: StudyHistory) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
};

export const loadStreakState = (): StreakState => {
  if (typeof window === 'undefined') return DEFAULT_STREAK;
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return DEFAULT_STREAK;
    const parsed = JSON.parse(raw);
    return {
      current: Number.isFinite(Number(parsed?.current)) ? Number(parsed?.current) : 0,
      lastStudyDate: typeof parsed?.lastStudyDate === 'string' ? parsed.lastStudyDate : null,
      graceUsedWeek: typeof parsed?.graceUsedWeek === 'string' ? parsed.graceUsedWeek : null,
    };
  } catch {
    return DEFAULT_STREAK;
  }
};

export const saveStreakState = (state: StreakState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
};

export const loadWeeklyChallenge = (): WeeklyChallenge => {
  const currentWeek = getWeekKey();
  if (typeof window === 'undefined') {
    return { week: currentWeek, lessons: [], quizzes: 0, completed: false };
  }
  try {
    const raw = window.localStorage.getItem(WEEKLY_CHALLENGE_KEY);
    if (!raw) return { week: currentWeek, lessons: [], quizzes: 0, completed: false };
    const parsed = JSON.parse(raw);
    if (parsed?.week !== currentWeek) {
      return { week: currentWeek, lessons: [], quizzes: 0, completed: false };
    }
    return {
      week: currentWeek,
      lessons: Array.isArray(parsed?.lessons) ? parsed.lessons.filter((value) => typeof value === 'string') : [],
      quizzes: Number.isFinite(Number(parsed?.quizzes)) ? Number(parsed?.quizzes) : 0,
      completed: Boolean(parsed?.completed),
    };
  } catch {
    return { week: currentWeek, lessons: [], quizzes: 0, completed: false };
  }
};

export const saveWeeklyChallenge = (challenge: WeeklyChallenge) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(challenge));
};

const selectDailyMission = (plan: StudyPlan) => {
  const today = getTodayKey();
  const seed = today.split('-').join('');
  const seedValue = Number(seed.slice(-4)) || 1;
  const choice = seedValue % 3;
  if (plan.type === 'minutes') {
    return choice === 0
      ? { type: 'minutes' as const, target: Math.max(10, Math.min(plan.target, 25)) }
      : { type: 'quiz' as const, target: 1 };
  }
  if (choice === 0) {
    return { type: 'lessons' as const, target: 1 };
  }
  if (choice === 1) {
    return { type: 'minutes' as const, target: 10 };
  }
  return { type: 'quiz' as const, target: 1 };
};

export const loadDailyMission = (plan: StudyPlan = loadStudyPlan()): DailyMission => {
  const today = getTodayKey();
  if (typeof window === 'undefined') {
    const mission = selectDailyMission(plan);
    return { date: today, ...mission };
  }
  try {
    const raw = window.localStorage.getItem(DAILY_MISSION_KEY);
    if (!raw) {
      const mission = { date: today, ...selectDailyMission(plan) };
      window.localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(mission));
      return mission;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) {
      const mission = { date: today, ...selectDailyMission(plan) };
      window.localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(mission));
      return mission;
    }
    const type = parsed?.type === 'minutes' || parsed?.type === 'quiz' ? parsed.type : 'lessons';
    const target = clampTarget(parsed?.target, 1);
    return { date: today, type, target };
  } catch {
    const mission = { date: today, ...selectDailyMission(plan) };
    window.localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(mission));
    return mission;
  }
};

export const loadWeeklyMasteryCounts = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MASTERY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
};

export const saveWeeklyMasteryCounts = (counts: Record<string, Record<string, number>>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MASTERY_KEY, JSON.stringify(counts));
};

export const loadMilestoneClaims = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MILESTONE_CLAIMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [];
  }
};

export const saveMilestoneClaims = (claims: string[]) => {
  if (typeof window === 'undefined') return;
  const normalized = Array.isArray(claims) ? claims.filter((value) => typeof value === 'string') : [];
  window.localStorage.setItem(MILESTONE_CLAIMS_KEY, JSON.stringify(normalized));
};

export const loadReadLessonKeys = () => {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const raw = window.localStorage.getItem(READ_LESSONS_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [] as string[];
  }
};

export const saveReadLessonKeys = (keys: string[]) => {
  if (typeof window === 'undefined') return;
  const normalized = Array.isArray(keys) ? keys.filter((value) => typeof value === 'string') : [];
  window.localStorage.setItem(READ_LESSONS_KEY, JSON.stringify(normalized));
};

export const getLessonMasteryStatus = (courseId: string, lessonId: string) => {
  const weekKey = getWeekKey();
  const counts = loadWeeklyMasteryCounts();
  const lessonKey = `${courseId}:${lessonId}`;
  const count = Number(counts?.[weekKey]?.[lessonKey] || 0);
  return { count, mastered: count >= 2, week: weekKey };
};

const pruneWeeklyMasteryCounts = (counts: Record<string, Record<string, number>>) => {
  const keys = Object.keys(counts).sort().slice(-12);
  const trimmed: Record<string, Record<string, number>> = {};
  keys.forEach((key) => {
    trimmed[key] = counts[key];
  });
  return trimmed;
};

export const recordLessonCompletion = (courseId: string, lessonId: string, durationMinutes?: number) => {
  const progress = loadStudyProgress();
  const key = `${courseId}:${lessonId}`;
  const readKeys = new Set(loadReadLessonKeys());
  if (!readKeys.has(key)) {
    readKeys.add(key);
    saveReadLessonKeys(Array.from(readKeys));
  }
  const isNewLesson = !progress.lessons.includes(key);
  if (isNewLesson) {
    progress.lessons = [...progress.lessons, key];
    const minutes = Number(durationMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      progress.minutes += Math.round(minutes);
    }
  }
  progress.quizzes += 1;
  saveStudyProgress(progress);

  const history = loadStudyHistory();
  history[progress.date] = {
    lessons: progress.lessons.length,
    minutes: progress.minutes,
    quizzes: progress.quizzes,
    lessonKeys: progress.lessons,
  };
  saveStudyHistory(history);

  const currentWeek = getWeekKey();
  const streak = loadStreakState();
  const graceWeek = streak.graceUsedWeek === currentWeek ? currentWeek : null;
  if (!streak.lastStudyDate) {
    saveStreakState({ current: 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
  } else if (streak.lastStudyDate === progress.date) {
    saveStreakState({ ...streak, graceUsedWeek: graceWeek });
  } else {
    const gap = diffInDays(streak.lastStudyDate, progress.date);
    if (gap === 1) {
      saveStreakState({ current: streak.current + 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
    } else if (gap === 2 && !graceWeek) {
      saveStreakState({ current: streak.current + 1, lastStudyDate: progress.date, graceUsedWeek: currentWeek });
    } else {
      saveStreakState({ current: 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
    }
  }

  const weekly = loadWeeklyChallenge();
  const nextLessons = weekly.week !== currentWeek ? [] : weekly.lessons;
  const nextQuizzes = weekly.week !== currentWeek ? 0 : weekly.quizzes;
  const lessonSet = new Set(nextLessons);
  if (isNewLesson) lessonSet.add(key);
  const updated: WeeklyChallenge = {
    week: currentWeek,
    lessons: Array.from(lessonSet),
    quizzes: nextQuizzes + 1,
    completed: false,
  };
  updated.completed = updated.lessons.length >= 2 && updated.quizzes >= 1;
  saveWeeklyChallenge(updated);

  const masteryCounts = loadWeeklyMasteryCounts();
  const weekCounts = masteryCounts[currentWeek] || {};
  weekCounts[key] = Number(weekCounts[key] || 0) + 1;
  masteryCounts[currentWeek] = weekCounts;
  saveWeeklyMasteryCounts(pruneWeeklyMasteryCounts(masteryCounts));

  return progress;
};

export const recordLessonRead = (courseId: string, lessonId: string, durationMinutes?: number) => {
  const progress = loadStudyProgress();
  const key = `${courseId}:${lessonId}`;
  const readKeys = new Set(loadReadLessonKeys());
  if (!readKeys.has(key)) {
    readKeys.add(key);
    saveReadLessonKeys(Array.from(readKeys));
  }

  const isNewLesson = !progress.lessons.includes(key);
  if (isNewLesson) {
    progress.lessons = [...progress.lessons, key];
    const minutes = Number(durationMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      progress.minutes += Math.round(minutes);
    }
    saveStudyProgress(progress);

    const history = loadStudyHistory();
    history[progress.date] = {
      lessons: progress.lessons.length,
      minutes: progress.minutes,
      quizzes: progress.quizzes,
      lessonKeys: progress.lessons,
    };
    saveStudyHistory(history);

    const currentWeek = getWeekKey();
    const streak = loadStreakState();
    const graceWeek = streak.graceUsedWeek === currentWeek ? currentWeek : null;
    if (!streak.lastStudyDate) {
      saveStreakState({ current: 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
    } else if (streak.lastStudyDate === progress.date) {
      saveStreakState({ ...streak, graceUsedWeek: graceWeek });
    } else {
      const gap = diffInDays(streak.lastStudyDate, progress.date);
      if (gap === 1) {
        saveStreakState({ current: streak.current + 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
      } else if (gap === 2 && !graceWeek) {
        saveStreakState({ current: streak.current + 1, lastStudyDate: progress.date, graceUsedWeek: currentWeek });
      } else {
        saveStreakState({ current: 1, lastStudyDate: progress.date, graceUsedWeek: graceWeek });
      }
    }

    const weekly = loadWeeklyChallenge();
    const nextLessons = weekly.week !== currentWeek ? [] : weekly.lessons;
    const nextQuizzes = weekly.week !== currentWeek ? 0 : weekly.quizzes;
    const lessonSet = new Set(nextLessons);
    lessonSet.add(key);
    const updated: WeeklyChallenge = {
      week: currentWeek,
      lessons: Array.from(lessonSet),
      quizzes: nextQuizzes,
      completed: false,
    };
    updated.completed = updated.lessons.length >= 2 && updated.quizzes >= 1;
    saveWeeklyChallenge(updated);
  }
  return progress;
};

export const syncGamificationFromProgress = (progress: GamificationSnapshot | null | undefined) => {
  if (!progress || typeof window === 'undefined') return;
  if (progress.studyPlan) saveStudyPlan(progress.studyPlan);
  if (progress.studyHistory) saveStudyHistory(progress.studyHistory);
  if (progress.streakState) saveStreakState(progress.streakState);
  if (progress.weeklyChallenge) saveWeeklyChallenge(progress.weeklyChallenge);
  if (progress.dailyMission) {
    window.localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(progress.dailyMission));
  }
  if (progress.weeklyMastery?.counts) saveWeeklyMasteryCounts({ [progress.weeklyMastery.week]: progress.weeklyMastery.counts });
  if (progress.milestoneClaims) saveMilestoneClaims(progress.milestoneClaims);
  if (progress.readLessonKeys) saveReadLessonKeys(progress.readLessonKeys);

  if (progress.studyHistory) {
    const today = getTodayKey();
    const todayEntry = progress.studyHistory[today];
    if (todayEntry) {
      saveStudyProgress({
        date: today,
        lessons: Array.isArray(todayEntry.lessonKeys) ? todayEntry.lessonKeys : [],
        minutes: todayEntry.minutes,
        quizzes: todayEntry.quizzes,
      });
    }
  }
};
