import { doc, onSnapshot, query, collection, orderBy, limit, getDocs, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase';
import type { AcademyProgress, LeaderboardEntry } from '../types';

export type LessonQuizSubmission = {
  courseId: string;
  lessonId: string;
  answers: Record<string, number>;
};

export type LessonQuizResult = {
  ok: boolean;
  passed: boolean;
  score: number;
  total: number;
  perQuestion: Record<string, { isCorrect: boolean; correctIndex: number }>;
  xpAwarded?: number;
  courseBonusAwarded?: number;
  unlockedStudyLevel?: number;
  completedStudyLevel?: number;
  xpTotal?: number;
  xpLevel?: number;
  rank?: string;
};

export async function ensureAcademyUser(): Promise<void> {
  const fn = httpsCallable(functions, 'academyEnsureUser');
  await fn({});
}

export async function submitLessonQuiz(payload: LessonQuizSubmission): Promise<LessonQuizResult> {
  const fn = httpsCallable(functions, 'academySubmitLessonQuiz');
  const res = await fn(payload);
  return res.data as LessonQuizResult;
}

export async function resetEverything(): Promise<void> {
  const fn = httpsCallable(functions, 'academyResetEverything');
  await fn({});
}

export async function updateStudyPlan(payload: { type: 'lessons' | 'minutes'; target: number }): Promise<void> {
  const fn = httpsCallable(functions, 'academyUpdateStudyPlan');
  await fn(payload);
}

export async function recordReading(payload: { courseId: string; lessonId: string; durationMinutes?: number }): Promise<void> {
  const fn = httpsCallable(functions, 'academyRecordReading');
  await fn(payload);
}

export async function claimMilestone(payload: { milestoneId: string }): Promise<void> {
  const fn = httpsCallable(functions, 'academyClaimMilestone');
  await fn(payload);
}

export function subscribeToProgress(uid: string, onChange: (progress: AcademyProgress) => void, onError?: (err: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'academy_progress', uid),
    (snap) => {
      if (!snap.exists()) {
        onError?.(new Error('Academy profile not found.'));
        return;
      }
      onChange(snap.data() as AcademyProgress);
    },
    (err) => onError?.(err as Error),
  );
}

export async function fetchLeaderboardTop(limitCount = 100): Promise<LeaderboardEntry[]> {
  const q = query(collection(db, 'academy_leaderboard'), orderBy('xpTotal', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LeaderboardEntry);
}
