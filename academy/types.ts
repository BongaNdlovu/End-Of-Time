export type View = 'dashboard' | 'course' | 'admin' | 'certificate' | 'login' | 'leaderboard';

export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  photoURL?: string | null;
  streakDays: number;
  xp: number;
  level: number;
  rank: string;
  badges: string[]; // IDs of unlocked badges
  studyLevelUnlocked: number; // highest course number unlocked
  studyLevelCompleted: number; // highest course number completed
  passedLessonKeys: string[]; // `${courseId}:${lessonId}`
}

export interface AcademyProgress {
  schemaVersion: number;
  studyLevelUnlocked: number;
  studyLevelCompleted: number;
  passedLessonKeys: string[];
  readLessonKeys?: string[];
  xpTotal: number;
  xpLevel: number;
  rank: string;
  badges?: string[];
  streakDays?: number;
  studyPlan?: {
    type: 'lessons' | 'minutes';
    target: number;
  };
  studyHistory?: Record<string, { lessons: number; minutes: number; quizzes: number; lessonKeys?: string[] }>;
  streakState?: { current: number; lastStudyDate: string | null; graceUsedWeek: string | null };
  weeklyChallenge?: { week: string; lessons: string[]; quizzes: number; completed: boolean };
  dailyMission?: { date: string; type: 'lessons' | 'minutes' | 'quiz'; target: number };
  weeklyMastery?: { week: string; counts: Record<string, number> };
  milestoneClaims?: string[];
  resetCount?: number;
  lastResetAt?: any;
  updatedAt?: any;
  createdAt?: any;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  xpTotal: number;
  xpLevel: number;
  rank: string;
  studyLevelCompleted: number;
  updatedAt?: any;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'audio' | 'text';
  content: string; // Transcript or lesson text
  audioUrl?: string;
  durationMinutes: number;
  scriptureReference: string;
  supports?: {
    keyIdeas?: string[];
    reflectionPrompts?: string[];
    practiceSteps?: string[];
    challengeQuestions?: string[];
    memoryFocus?: string;
    integrationWork?: string[];
    caseTesting?: string[];
    prayerFocus?: string;
  };
  quiz?: QuizQuestion[];
  isCompleted: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  sequence: number; // progression order, easiest to hardest
  modules: Module[];
  totalProgress: number; // 0-100
  tags: string[];
  prerequisites?: string[];
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  date: string;
  likes: number;
}
