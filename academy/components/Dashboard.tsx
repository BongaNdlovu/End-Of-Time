import React, { useEffect, useState } from 'react';
import { Course, User } from '../types';
import { Award, Calendar, Flame, Headphones, Activity, ArrowRight, Zap, Shield, Book, Star, CheckCircle, Lock, RotateCcw, GitBranch, Target } from 'lucide-react';
import { AVAILABLE_BADGES } from '../constants';
import {
  loadStudyPlan,
  saveStudyPlan,
  loadStudyProgress,
  loadStudyHistory,
  loadStreakState,
  loadWeeklyChallenge,
  loadDailyMission,
  loadWeeklyMasteryCounts,
  loadMilestoneClaims,
  saveMilestoneClaims,
  getWeekKey,
  getTodayKey,
  type StudyPlan,
  type StudyProgress,
  type StudyHistory,
  type StreakState,
  type WeeklyChallenge,
  type DailyMission,
} from '../services/studyPlan';
import { COURSE_PREREQUISITES, getCourseLessonKeys, getCourseTitle, getCourseUnlockStatus, isCourseCompleted } from '../services/skillTree';
import { updateStudyPlan as updateStudyPlanRemote, claimMilestone as claimMilestoneRemote } from '../services/academyBackend';

interface DashboardProps {
  user: User;
  courses: Course[];
  onResume: (courseId: string) => void;
  onResetEverything: () => Promise<void>;
}

const FAVORITES_STORAGE_KEY = 'academy:favorites';

const lessonKey = (courseId: string, lessonId: string) => `${courseId}:${lessonId}`;

const loadFavoriteKeys = () => {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [] as string[];
  }
};

const getFavoriteLessonCount = (course: Course, favorites: Set<string>) => {
  return course.modules.reduce((count, module) => {
    return count + module.lessons.filter((lesson) => favorites.has(lessonKey(course.id, lesson.id))).length;
  }, 0);
};

const getCourseProgressPercent = (course: Course, user: User) => {
  const keys = course.modules.flatMap(m => m.lessons.map(l => lessonKey(course.id, l.id)));
  if (keys.length === 0) return 0;
  const passed = keys.filter(k => user.passedLessonKeys.includes(k)).length;
  return Math.round((passed / keys.length) * 100);
};

const buildTopicMastery = (courses: Course[], user: User) => {
  const totals: Record<string, { total: number; passed: number }> = {};
  courses.forEach((course) => {
    const lessonKeys = getCourseLessonKeys(course);
    const passedCount = lessonKeys.filter((key) => user.passedLessonKeys.includes(key)).length;
    course.tags.forEach((tag) => {
      if (!totals[tag]) totals[tag] = { total: 0, passed: 0 };
      totals[tag].total += lessonKeys.length;
      totals[tag].passed += passedCount;
    });
  });
  return Object.entries(totals)
    .map(([tag, data]) => {
      const progress = data.total > 0 ? data.passed / data.total : 0;
      const tier = progress >= 0.75 ? 'Gold' : progress >= 0.5 ? 'Silver' : progress >= 0.25 ? 'Bronze' : 'Unranked';
      return { tag, progress, tier, passed: data.passed, total: data.total };
    })
    .sort((a, b) => b.progress - a.progress);
};

const getTierClass = (tier: string) => {
  switch (tier) {
    case 'Gold':
      return 'text-gold-500';
    case 'Silver':
      return 'text-stone-300';
    case 'Bronze':
      return 'text-amber-600';
    default:
      return 'text-stone-500';
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ user, courses, onResume, onResetEverything }) => {
  const sortedCourses = [...courses].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [studyPlan, setStudyPlan] = useState<StudyPlan>(() => loadStudyPlan());
  const [studyProgress, setStudyProgress] = useState<StudyProgress>(() => loadStudyProgress());
  const [studyHistory, setStudyHistory] = useState<StudyHistory>(() => loadStudyHistory());
  const [streakState, setStreakState] = useState<StreakState>(() => loadStreakState());
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(() => loadWeeklyChallenge());
  const [dailyMission, setDailyMission] = useState<DailyMission>(() => loadDailyMission());
  const [weeklyMasteryCount, setWeeklyMasteryCount] = useState(0);
  const [milestoneClaims, setMilestoneClaims] = useState<string[]>(() => loadMilestoneClaims());

  useEffect(() => {
    setFavoriteKeys(loadFavoriteKeys());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY) {
        setFavoriteKeys(loadFavoriteKeys());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const syncPlan = () => {
      setStudyPlan(loadStudyPlan());
      setStudyProgress(loadStudyProgress());
      setStudyHistory(loadStudyHistory());
      setStreakState(loadStreakState());
      setWeeklyChallenge(loadWeeklyChallenge());
      setDailyMission(loadDailyMission());
      setMilestoneClaims(loadMilestoneClaims());
      const masteryCounts = loadWeeklyMasteryCounts();
      const weekKey = getWeekKey();
      const week = masteryCounts[weekKey] || {};
      const mastered = Object.values(week).filter((count) => Number(count) >= 2).length;
      setWeeklyMasteryCount(mastered);
    };
    syncPlan();
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('academy:')) {
        syncPlan();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const favoriteKeySet = new Set(favoriteKeys);
  const activeCourse =
    sortedCourses.find((c) => {
      if (!getCourseUnlockStatus(c.id, courses, user).unlocked) return false;
      return getCourseProgressPercent(c, user) < 100;
    }) ||
    sortedCourses.find((c) => getCourseUnlockStatus(c.id, courses, user).unlocked) ||
    sortedCourses[0];
  const activeCourseFavoriteCount = getFavoriteLessonCount(activeCourse, favoriteKeySet);

  const xpForNextLevel = Math.max(1, user.level) * 1000;
  const progressPercent = Math.min(100, (user.xp / xpForNextLevel) * 100);
  const studyTarget = Math.max(1, studyPlan.target);
  const rawProgressValue = studyPlan.type === 'minutes' ? studyProgress.minutes : studyProgress.lessons.length;
  const progressValue = studyPlan.type === 'minutes' ? Math.round(rawProgressValue) : rawProgressValue;
  const progressPct = Math.min(100, Math.round((progressValue / studyTarget) * 100));
  const progressUnit = studyPlan.type === 'minutes' ? 'min' : 'lessons';
  const remainingCount = Math.max(0, studyTarget - progressValue);
  const remainingUnit = studyPlan.type === 'minutes' ? 'min' : remainingCount === 1 ? 'lesson' : 'lessons';
  const currentWeek = getWeekKey();
  const graceRemaining = streakState.graceUsedWeek === currentWeek ? 0 : 1;
  const missionProgressValue = dailyMission.type === 'minutes'
    ? studyProgress.minutes
    : dailyMission.type === 'quiz'
      ? studyProgress.quizzes
      : studyProgress.lessons.length;
  const missionCompleted = missionProgressValue >= dailyMission.target;
  const missionProgressPct = Math.min(100, Math.round((missionProgressValue / dailyMission.target) * 100));
  const missionLabel = dailyMission.type === 'minutes'
    ? `Log ${dailyMission.target} minutes`
    : dailyMission.type === 'quiz'
      ? `Pass ${dailyMission.target} quiz`
      : `Complete ${dailyMission.target} lesson`;
  const weeklyLessons = weeklyChallenge.lessons.length;
  const weeklyQuizzes = weeklyChallenge.quizzes;
  const weeklyCompleted = weeklyChallenge.completed;
  const weeklyProgressValue = Math.min(weeklyLessons, 2) + Math.min(weeklyQuizzes, 1);
  const weeklyProgressPct = Math.min(100, Math.round((weeklyProgressValue / 3) * 100));
  const topicMastery = buildTopicMastery(courses, user);

  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    return getTodayKey(date);
  });
  const getHeatLevel = (dateKey: string) => {
    const entry = studyHistory[dateKey];
    if (!entry) return 0;
    const score = entry.lessons + Math.floor(entry.minutes / 15);
    return Math.max(0, Math.min(3, score));
  };

  const MILESTONES = [
    { id: 'milestone-3', level: 3, title: 'Wallpaper: Dawn Signal', subtitle: 'Level 3 Reward', theme: 'from-amber-500/30 to-stone-900/80' },
    { id: 'milestone-5', level: 5, title: 'Wallpaper: Ember Code', subtitle: 'Level 5 Reward', theme: 'from-red-500/20 to-stone-900/80' },
    { id: 'milestone-10', level: 10, title: 'Certificate: Field Scholar', subtitle: 'Level 10 Reward', theme: 'from-indigo-500/20 to-stone-900/80' },
    { id: 'milestone-20', level: 20, title: 'Certificate: Doctrine Vanguard', subtitle: 'Level 20 Reward', theme: 'from-emerald-500/20 to-stone-900/80' },
  ];

  const buildMilestoneSvg = (title: string, subtitle: string) => {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect x="80" y="80" width="1440" height="740" fill="none" stroke="#d97706" stroke-width="6"/>
  <text x="50%" y="40%" fill="#f8fafc" font-family="Playfair Display, serif" font-size="64" text-anchor="middle">${title}</text>
  <text x="50%" y="48%" fill="#e2e8f0" font-family="Montserrat, sans-serif" font-size="28" text-anchor="middle" letter-spacing="4">${subtitle}</text>
  <text x="50%" y="70%" fill="#94a3b8" font-family="Montserrat, sans-serif" font-size="20" text-anchor="middle">End Of Time Academy</text>
</svg>`;
  };

  const handleClaimMilestone = async (milestoneId: string, title: string, subtitle: string) => {
    const nextClaims = Array.from(new Set([...milestoneClaims, milestoneId]));
    setMilestoneClaims(nextClaims);
    saveMilestoneClaims(nextClaims);
    claimMilestoneRemote({ milestoneId }).catch((err) => console.error('Failed to sync milestone claim:', err));

    const svg = buildMilestoneSvg(title, subtitle);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${milestoneId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateStudyPlan = (partial: Partial<StudyPlan>) => {
    setStudyPlan((prev) => {
      const next = { ...prev, ...partial };
      saveStudyPlan(next);
      updateStudyPlanRemote(next).catch((err) => console.error('Failed to sync study plan:', err));
      return next;
    });
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'Beginner': return 'text-sage-600 dark:text-sage-300 bg-sage-100 dark:bg-sage-500/10 border-sage-200 dark:border-sage-400/20';
      case 'Intermediate': return 'text-gold-600 dark:text-gold-400 bg-gold-100 dark:bg-gold-500/10 border-gold-200 dark:border-gold-500/20';
      case 'Advanced': return 'text-crimson-600 dark:text-crimson-400 bg-crimson-100 dark:bg-crimson-500/10 border-crimson-200 dark:border-crimson-500/20';
      default: return 'text-stone-500 dark:text-stone-400 bg-stone-200 dark:bg-stone-500/10';
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10">
      
      {/* Header with Greeting & Date */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <div className="px-2 py-0.5 rounded-sm bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-400 text-[10px] font-sans uppercase tracking-widest font-bold">
                Logged In
             </div>
             <button
               onClick={async () => {
                 const confirmed = window.confirm('Reset EVERYTHING? This clears all study progress, locks all levels except Level 1, and resets XP/Rank back to the start.');
                 if (!confirmed) return;
                 await onResetEverything();
               }}
               className="ml-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-sm bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-300 text-[10px] font-sans uppercase tracking-widest font-bold transition-colors"
               title="Reset all academy progress"
             >
               <RotateCcw size={12} /> Reset Everything
             </button>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
            Good afternoon, {user.name.split(' ')[0]}.
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-3 font-sans font-light max-w-lg leading-relaxed">
            "Theology is the science of God and His relations to the universe." Continue your study.
          </p>
        </div>
        <div className="text-right hidden md:block">
           <div className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-300 tabular-nums">
              {new Date().getHours().toString().padStart(2, '0')}
              <span className="animate-pulse">:</span>
              {new Date().getMinutes().toString().padStart(2, '0')}
           </div>
           <div className="text-xs text-gold-600 dark:text-gold-500 font-sans uppercase tracking-widest font-bold">Local Time</div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        
        {/* Rank Card */}
        <div className="glass-panel p-6 rounded-lg relative overflow-hidden group hover:bg-white dark:hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award size={64} className="text-stone-900 dark:text-white" />
          </div>
          <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Current Rank</p>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-white mb-1">{user.rank}</div>
          <div className="text-xs text-gold-600 dark:text-gold-500 font-sans font-medium mb-4">Level {user.level}</div>
          <div className="h-1 w-full bg-stone-200 dark:bg-stone-700/50 rounded-full overflow-hidden">
             <div className="h-full bg-stone-800 dark:bg-stone-200" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="glass-panel p-6 rounded-lg relative overflow-hidden group hover:bg-white dark:hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Flame size={64} className="text-stone-900 dark:text-white" />
          </div>
          <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Mastery Streak</p>
          <div className="flex items-baseline gap-1">
             <div className="text-3xl font-serif font-bold text-stone-900 dark:text-white">{streakState.current}</div>
             <div className="text-xs text-stone-500 font-bold uppercase ml-1">Days</div>
          </div>
          <div className="mt-4 flex gap-1">
             {[...Array(7)].map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-sm ${i < (streakState.current % 7) || streakState.current >= 7 ? 'bg-gold-500' : 'bg-stone-200 dark:bg-stone-700'}`}></div>
             ))}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-widest text-stone-500">
            Grace left: {graceRemaining}
          </div>
        </div>

        {/* Focus/Intel Card */}
        <div className="glass-panel p-6 rounded-lg relative overflow-hidden group hover:bg-white dark:hover:bg-white/5 transition-all col-span-2 md:col-span-1">
          <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Knowledge Base</p>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-white mb-1">{user.xp.toLocaleString()}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 font-sans">Total Experience Points</div>
        </div>

        {/* Badges Mini-Display */}
        <div className="glass-panel p-6 rounded-lg relative overflow-hidden col-span-2 md:col-span-1 flex flex-col justify-center items-center group">
           <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 self-start">Recent Honors</p>
           <div className="flex gap-3 w-full">
              {AVAILABLE_BADGES.slice(0, 3).map((badge, i) => (
                 <div key={i} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-center text-gold-600 dark:text-gold-400 shadow-sm">
                    <Star size={16} fill={user.badges.includes(badge.id) ? "currentColor" : "none"} className={user.badges.includes(badge.id) ? "text-gold-600 dark:text-gold-400" : "text-stone-300 dark:text-stone-600"} />
                 </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-center text-stone-500 font-bold text-xs font-serif">
                 +{AVAILABLE_BADGES.length - 3}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          
           {/* Priority Mission Card (Hero) */}
           <div onClick={() => onResume(activeCourse.id)} className="group relative rounded-xl overflow-hidden cursor-pointer shadow-xl transition-all duration-500 hover:shadow-2xl">
              {/* Background Image with Dark Gradient Overlay */}
              <div className="absolute inset-0">
                 <img src={activeCourse.thumbnail} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 mix-blend-overlay" />
                 <div className="absolute inset-0 bg-stone-900/90 group-hover:bg-stone-900/80 transition-colors"></div>
              </div>

             <div className="relative p-8 md:p-12 h-full flex flex-col justify-between min-h-[360px]">
                <div className="flex justify-between items-start">
                   <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm border backdrop-blur-sm ${getDifficultyColor(activeCourse.difficulty)} bg-opacity-10 border-opacity-20`}>
                      <span className="text-xs font-bold uppercase tracking-wider">{activeCourse.difficulty}</span>
                   </div>
                   
                   <div className="text-stone-400 group-hover:text-white transition-colors">
                      <ArrowRight size={24} />
                   </div>
                </div>

                <div className="space-y-4 max-w-2xl">
                   <div>
                      <h2 className="text-3xl md:text-4xl font-serif font-bold text-white leading-tight mb-3 group-hover:text-gold-200 transition-colors">
                         {activeCourse.title}
                      </h2>
                      <p className="text-stone-400 text-sm md:text-base font-light leading-relaxed line-clamp-2">
                         {activeCourse.description}
                      </p>
                   </div>

             <div className="flex items-center gap-4 pt-4">
                      <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-[10px] text-stone-400 uppercase tracking-widest mb-1">
                         <span>Progress</span>
                         <span>{getCourseProgressPercent(activeCourse, user)}%</span>
                      </div>
                      <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                         <div className="h-full bg-white" style={{ width: `${getCourseProgressPercent(activeCourse, user)}%` }}></div>
                      </div>
                   </div>
                   {activeCourseFavoriteCount > 0 && (
                     <div className="text-[10px] uppercase tracking-widest text-gold-300 flex items-center gap-2">
                       <Star size={12} className="text-gold-400" fill="currentColor" />
                       {activeCourseFavoriteCount} saved
                     </div>
                   )}
                 </div>
                </div>
             </div>
          </div>

          {/* Secondary Courses Grid */}
          <div>
             <div className="flex items-center justify-between mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Curriculum</h3>
                <button
                  onClick={() => setShowFavoritesOnly((prev) => !prev)}
                  aria-pressed={showFavoritesOnly}
                  className={`text-[10px] font-bold uppercase tracking-widest border px-3 py-1 rounded-sm transition-colors ${
                    showFavoritesOnly
                      ? 'border-gold-500/40 text-gold-500 bg-gold-500/10'
                      : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                  }`}
                >
                  Favorites Only
                </button>
             </div>
             {(() => {
               const filteredCourses = sortedCourses
                 .filter(c => c.id !== activeCourse.id)
                 .filter(c => !showFavoritesOnly || getFavoriteLessonCount(c, favoriteKeySet) > 0);
               if (showFavoritesOnly && filteredCourses.length === 0) {
                 return (
                   <div className="text-sm text-stone-500 dark:text-stone-400 italic">
                     No saved lessons yet.
                   </div>
                 );
               }
               return (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCourses.map(course => {
                      const unlockStatus = getCourseUnlockStatus(course.id, courses, user);
                      const isUnlocked = unlockStatus.unlocked;
                      const progressPct = getCourseProgressPercent(course, user);
                      const isComplete = progressPct >= 100;
                      const favoriteCount = getFavoriteLessonCount(course, favoriteKeySet);
                      const missingPrereqs = unlockStatus.missingPrereqs.map((id) => getCourseTitle(id, courses));
                      return (
                       <div
                         key={course.id}
                         onClick={() => isUnlocked && onResume(course.id)}
                         className={`glass-panel p-5 rounded-lg flex gap-5 group transition-all border shadow-sm hover:shadow-md ${
                           isUnlocked
                             ? 'hover:bg-white dark:hover:bg-white/10 cursor-pointer border-transparent hover:border-stone-200 dark:hover:border-white/10'
                             : 'cursor-not-allowed opacity-60 border-white/5'
                         }`}
                       >
                          <div className="w-24 h-24 rounded-sm bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0 relative">
                             <img src={course.thumbnail} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                             {isComplete && (
                                <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                                   <CheckCircle size={24} className="text-emerald-500" />
                                </div>
                             )}
                             {!isUnlocked && (
                               <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                 <Lock size={22} className="text-stone-200" />
                               </div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] text-gold-600 dark:text-gold-500 uppercase tracking-widest font-bold">{course.difficulty}</span>
                                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">{progressPct}%</span>
                             </div>
                             <h4 className="font-serif font-bold text-stone-900 dark:text-white text-lg leading-tight mb-2 group-hover:underline decoration-stone-300 dark:decoration-stone-600 underline-offset-4 truncate">{course.title}</h4>
                             <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">{course.description}</p>
                             {missingPrereqs.length > 0 && (
                               <div className="mt-2 text-[10px] uppercase tracking-widest text-stone-500">
                                 Prereqs: {missingPrereqs.join(', ')}
                               </div>
                             )}
                             {favoriteCount > 0 && (
                               <div className="mt-3 text-[10px] uppercase tracking-widest text-gold-600 dark:text-gold-500 flex items-center gap-2">
                                 <Star size={12} className="text-gold-500" fill="currentColor" />
                                 {favoriteCount} saved lesson{favoriteCount > 1 ? 's' : ''}
                               </div>
                             )}
                          </div>
                       </div>
                      );
                    })}
                 </div>
               );
             })()}
          </div>

          {/* Skill Tree */}
          <div>
             <div className="flex items-center gap-2 mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">
                <GitBranch size={14} className="text-stone-500" />
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Skill Tree</h3>
             </div>
             <div className="space-y-3">
                {sortedCourses.map((course) => {
                  const unlockStatus = getCourseUnlockStatus(course.id, courses, user);
                  const completed = isCourseCompleted(course.id, courses, user);
                  const prereqs = (COURSE_PREREQUISITES[course.id] || []).map((id) => getCourseTitle(id, courses));
                  const statusLabel = completed ? 'Completed' : unlockStatus.unlocked ? 'Unlocked' : 'Locked';
                  const statusClass = completed ? 'text-emerald-400' : unlockStatus.unlocked ? 'text-gold-400' : 'text-stone-500';
                  return (
                    <div key={course.id} className="p-4 rounded bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-serif text-white">{course.title}</div>
                        <div className={`text-[10px] uppercase tracking-widest ${statusClass}`}>{statusLabel}</div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-stone-500 mt-2">{course.difficulty}</div>
                      {prereqs.length > 0 && (
                        <div className="text-[10px] uppercase tracking-widest text-stone-500 mt-2">
                          Prereqs: {prereqs.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Topic Mastery */}
          <div>
             <div className="flex items-center gap-2 mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">
                <Star size={14} className="text-stone-500" />
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Topic Mastery</h3>
             </div>
             <div className="space-y-4">
               {topicMastery.map((topic) => (
                 <div key={topic.tag} className="p-4 rounded bg-white/5 border border-white/10">
                   <div className="flex items-center justify-between mb-2">
                     <div className="text-sm font-serif text-white">{topic.tag}</div>
                     <div className={`text-[10px] uppercase tracking-widest ${getTierClass(topic.tier)}`}>{topic.tier}</div>
                   </div>
                   <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                     <div className="h-full bg-gold-500" style={{ width: `${Math.round(topic.progress * 100)}%` }}></div>
                   </div>
                   <div className="mt-2 text-[10px] uppercase tracking-widest text-stone-500">
                     {topic.passed}/{topic.total} lessons
                   </div>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* Right Sidebar - Intel Feed */}
        <div className="space-y-8">
           
           {/* Daily Briefing Widget */}
           <div className="bg-stone-100 dark:bg-stone-900 rounded-lg p-6 relative overflow-hidden border border-stone-200 dark:border-stone-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-serif font-bold text-stone-900 dark:text-white text-lg">Daily Briefing</h3>
                 <Calendar size={18} className="text-stone-400" />
              </div>

              <div className="space-y-8 relative z-10">
                 <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center pt-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-gold-600 dark:bg-gold-500"></div>
                       <div className="w-px h-12 bg-stone-300 dark:bg-stone-700 my-1"></div>
                    </div>
                    <div>
                       <span className="text-[10px] text-stone-500 font-sans uppercase tracking-widest block mb-1">Morning Reading</span>
                       <p className="text-sm text-stone-900 dark:text-stone-200 font-serif font-medium leading-relaxed">Psalm 119:1-8</p>
                       <p className="text-xs text-stone-500 mt-1 italic">"Blessed are the undefiled in the way..."</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center pt-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-600"></div>
                    </div>
                    <div>
                       <span className="text-[10px] text-stone-500 font-sans uppercase tracking-widest block mb-1">Systematic Study</span>
                       <p className="text-sm text-stone-600 dark:text-stone-400 font-serif">The Attributes of God</p>
                       <button onClick={() => onResume(activeCourse.id)} className="text-[10px] text-stone-900 dark:text-white mt-2 hover:underline decoration-gold-500 underline-offset-4 font-bold">Start Module &rarr;</button>
                    </div>
                 </div>
              </div>
           </div>

           {/* Daily Study Plan */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <Activity size={16} className="text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Daily Study Plan</span>
                 </div>
                 <span className="text-[10px] text-stone-500 uppercase tracking-widest">Auto-saved</span>
              </div>

              <div className="mb-4">
                 <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                    <span>Today</span>
                    <span>{progressValue} / {studyTarget} {progressUnit}</span>
                 </div>
                 <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gold-500" style={{ width: `${progressPct}%` }}></div>
                 </div>
                 <div className="text-xs text-stone-500 mt-2">
                   {remainingCount === 0 ? 'Goal met for today.' : `${remainingCount} ${remainingUnit} to go.`}
                 </div>
                 <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-500">
                   <span>Streak: {streakState.current} days</span>
                   <span>Grace left: {graceRemaining}</span>
                 </div>
                 <div className="mt-2 text-[10px] uppercase tracking-widest text-stone-500">
                   Mastery this week: {weeklyMasteryCount} lessons
                 </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={studyTarget}
                  onChange={(e) => updateStudyPlan({ target: Math.max(1, Math.round(Number(e.target.value || 1))) })}
                  className="w-20 bg-white dark:bg-black border border-stone-200 dark:border-stone-700 rounded-sm px-2 py-1 text-xs text-stone-700 dark:text-stone-200 focus:outline-none focus:border-gold-500"
                />
                <select
                  value={studyPlan.type}
                  onChange={(e) => updateStudyPlan({ type: e.target.value === 'minutes' ? 'minutes' : 'lessons' })}
                  className="flex-1 bg-white dark:bg-black border border-stone-200 dark:border-stone-700 rounded-sm px-2 py-1 text-xs text-stone-700 dark:text-stone-200 focus:outline-none focus:border-gold-500"
                >
                  <option value="lessons">Lessons / day</option>
                  <option value="minutes">Minutes / day</option>
                </select>
              </div>
              <p className="text-[10px] text-stone-500 mt-3">Progress updates when you pass a quiz.</p>
           </div>

           {/* Focus Mission */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <Target size={16} className="text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Focus Mission</span>
                 </div>
                 <span className={`text-[10px] uppercase tracking-widest ${missionCompleted ? 'text-emerald-400' : 'text-stone-500'}`}>
                   {missionCompleted ? 'Complete' : 'In Progress'}
                 </span>
              </div>
              <div className="text-sm text-stone-700 dark:text-stone-200 font-serif mb-3">{missionLabel}</div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                <span>Today</span>
                <span>{Math.min(missionProgressValue, dailyMission.target)} / {dailyMission.target}</span>
              </div>
              <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                 <div className={`h-full ${missionCompleted ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${missionProgressPct}%` }}></div>
              </div>
           </div>

           {/* Weekly Challenge */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <Shield size={16} className="text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Weekly Challenge</span>
                 </div>
                 <span className={`text-[10px] uppercase tracking-widest ${weeklyCompleted ? 'text-emerald-400' : 'text-stone-500'}`}>
                   {weeklyCompleted ? 'Cleared' : weeklyChallenge.week}
                 </span>
              </div>
              <div className="text-xs text-stone-500 mb-3 uppercase tracking-widest">2 lessons + 1 quiz</div>
              <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-widest text-stone-500 mb-3">
                <div>Lessons: {Math.min(weeklyLessons, 2)}/2</div>
                <div>Quizzes: {Math.min(weeklyQuizzes, 1)}/1</div>
              </div>
              <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                 <div className={`h-full ${weeklyCompleted ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${weeklyProgressPct}%` }}></div>
              </div>
           </div>

           {/* Milestone Vault */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <Award size={16} className="text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Milestone Vault</span>
                 </div>
                 <span className="text-[10px] uppercase tracking-widest text-stone-500">Level {user.level}</span>
              </div>
              <div className="space-y-3">
                {MILESTONES.map((milestone) => {
                  const unlocked = user.level >= milestone.level;
                  const claimed = milestoneClaims.includes(milestone.id);
                  return (
                    <div key={milestone.id} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded bg-gradient-to-br ${milestone.theme} border border-white/10 flex items-center justify-center`}>
                        <span className={`text-[10px] font-bold ${unlocked ? 'text-white' : 'text-stone-500'}`}>{milestone.level}</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-xs font-bold uppercase tracking-widest ${unlocked ? 'text-gold-400' : 'text-stone-500'}`}>{milestone.title}</div>
                        <div className="text-[10px] text-stone-500 uppercase tracking-widest">{milestone.subtitle}</div>
                      </div>
                      {unlocked ? (
                        <button
                          onClick={() => handleClaimMilestone(milestone.id, milestone.title, milestone.subtitle)}
                          className={`text-[10px] uppercase tracking-widest border px-2 py-1 rounded-sm transition-colors ${
                            claimed
                              ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 cursor-default'
                              : 'border-gold-500/40 text-gold-400 hover:bg-gold-500/10'
                          }`}
                          disabled={claimed}
                        >
                          {claimed ? 'Claimed' : 'Claim'}
                        </button>
                      ) : (
                        <div className="text-[10px] uppercase tracking-widest text-stone-500">Locked</div>
                      )}
                    </div>
                  );
                })}
              </div>
           </div>

           {/* Progress Heatmap */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Study Calendar</span>
                 </div>
                 <span className="text-[10px] uppercase tracking-widest text-stone-500">28 days</span>
              </div>
              <div className="grid grid-cols-14 gap-1">
                {heatmapDays.map((day) => {
                  const level = getHeatLevel(day);
                  const className = level === 0
                    ? 'bg-stone-200 dark:bg-stone-800'
                    : level === 1
                      ? 'bg-gold-900/30'
                      : level === 2
                        ? 'bg-gold-700/50'
                        : 'bg-gold-500';
                  return (
                    <div
                      key={day}
                      title={day}
                      className={`w-4 h-4 rounded-sm ${className}`}
                    ></div>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-stone-500">Brighter = more study</div>
           </div>

           {/* Recommended Resource */}
           <div className="glass-panel p-6 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3 mb-4">
                 <div className="text-stone-400">
                    <Book size={16} />
                 </div>
                 <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Recommended</span>
              </div>
              <h4 className="font-serif font-bold text-stone-900 dark:text-white mb-2 text-lg">Confessions</h4>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6 font-light leading-relaxed">St. Augustine's spiritual autobiography. Essential reading for understanding the doctrine of grace.</p>
              <button 
                onClick={() => alert('Added to your reading library!')}
                className="w-full py-3 rounded-sm bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-bold uppercase transition-colors hover:bg-stone-800 dark:hover:bg-stone-200 tracking-widest"
              >
                 Add to Library
              </button>
           </div>

        </div>

      </div>
    </div>
  );
};
