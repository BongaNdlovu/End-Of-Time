import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CourseView } from './components/CourseView';
import { Certificate } from './components/Certificate';
import { AdminPanel } from './components/AdminPanel';
import { Leaderboard } from './components/Leaderboard';
import { View, Course, User, type AcademyProgress } from './types';
import { INITIAL_COURSES } from './constants';
import { Zap } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase';
import { ensureAcademyUser, resetEverything, submitLessonQuiz, subscribeToProgress } from './services/academyBackend';
import { saveCourse, subscribeToCourses } from './services/academyCourses';
import { getCourseUnlockStatus, getCourseTitle } from './services/skillTree';
import { syncGamificationFromProgress } from './services/studyPlan';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('login');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const progressUnsubRef = useRef<null | (() => void)>(null);
  const coursesUnsubRef = useRef<null | (() => void)>(null);
  const xpTimeoutsRef = useRef<number[]>([]);

  const [xpNotifications, setXpNotifications] = useState<{id: number, amount: number, label: string}[]>([]);

  const notifyXp = (amount: number, label: string) => {
    // Add Notification
    const notifId = Date.now();
    setXpNotifications(prev => [...prev, { id: notifId, amount, label }]);
    
    // Remove notification after animation
    const timeoutId = window.setTimeout(() => {
      setXpNotifications(prev => prev.filter(n => n.id !== notifId));
      xpTimeoutsRef.current = xpTimeoutsRef.current.filter(id => id !== timeoutId);
    }, 2000);
    xpTimeoutsRef.current.push(timeoutId);
  };

  const mergeCourseLists = (base: Course[], incoming: Course[]) => {
    const map = new Map<string, Course>();
    const normalizeTags = (tags: Course['tags']) => {
      if (!Array.isArray(tags)) return ['General'];
      const cleaned = tags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .map((tag) => tag.replace(/\s+/g, ' '));
      if (cleaned.length === 0) return ['General'];
      const titled = cleaned.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
      return Array.from(new Set(titled));
    };
    base.forEach((course) => map.set(course.id, { ...course, tags: normalizeTags(course.tags) }));
    incoming.forEach((course) => map.set(course.id, { ...course, tags: normalizeTags(course.tags) }));
    return Array.from(map.values());
  };

  useEffect(() => {
    return () => {
      xpTimeoutsRef.current.forEach(id => window.clearTimeout(id));
      xpTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    coursesUnsubRef.current?.();
    coursesUnsubRef.current = subscribeToCourses(
      (remoteCourses) => {
        const sanitized = remoteCourses.map((course) => ({
          ...course,
          sequence: Number.isFinite(course.sequence) ? course.sequence : 0,
          totalProgress: Number.isFinite(course.totalProgress) ? course.totalProgress : 0,
          tags: Array.isArray(course.tags) ? course.tags : [],
        }));
        setCourses(mergeCourseLists(INITIAL_COURSES, sanitized));
      },
      (err) => {
        console.error('Failed to load academy courses:', err);
        setCourses(INITIAL_COURSES);
      },
    );
    return () => {
      coursesUnsubRef.current?.();
      coursesUnsubRef.current = null;
    };
  }, []);

  const orderedCourses = useMemo(
    () => [...courses].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [courses],
  );
  const maxSequence = useMemo(
    () => orderedCourses.reduce((acc, course) => Math.max(acc, course.sequence ?? 0), 0),
    [orderedCourses],
  );

  const user: User | null = useMemo(() => {
    if (!authUser || !progress) return null;
    const unlocked = Math.max(1, Number(progress.studyLevelUnlocked ?? 1));
    const completed = Math.max(0, Number(progress.studyLevelCompleted ?? 0));
    return {
      id: authUser.uid,
      name: authUser.displayName || 'Student',
      photoURL: authUser.photoURL,
      streakDays: Number(progress.streakDays || 0),
      xp: Number(progress.xpTotal || 0),
      level: Number(progress.xpLevel || 1),
      rank: String(progress.rank || 'Initiate'),
      badges: Array.isArray(progress.badges) ? progress.badges : [],
      studyLevelUnlocked: maxSequence ? Math.min(unlocked, maxSequence) : unlocked,
      studyLevelCompleted: maxSequence ? Math.min(completed, maxSequence) : completed,
      passedLessonKeys: Array.isArray(progress.passedLessonKeys) ? progress.passedLessonKeys : [],
    };
  }, [authUser, maxSequence, progress]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setIsBootstrapping(true);
      setAuthUser(nextUser);
      setProgress(null);
      setProgressError(null);
      setSelectedCourseId(null);
      progressUnsubRef.current?.();
      progressUnsubRef.current = null;

      if (!nextUser) {
        setCurrentView('login');
        setIsBootstrapping(false);
        setProgressError(null);
        return;
      }

      try {
        await ensureAcademyUser();
      } catch (e) {
        console.error('Failed to ensure academy user:', e);
      }

      progressUnsubRef.current = subscribeToProgress(
        nextUser.uid,
        (p) => {
          setProgress(p);
          syncGamificationFromProgress(p);
          setProgressError(null);
          setIsBootstrapping(false);
          setCurrentView((v) => (v === 'login' ? 'dashboard' : v));
        },
        (err) => {
          console.error('Failed to load progress:', err);
          setProgressError('Failed to load academy profile. Please retry.');
          setIsBootstrapping(false);
        },
      );
    });

    return () => {
      unsub();
      progressUnsubRef.current?.();
    };
  }, []);


  const handleSignIn = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleResumeCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const unlockStatus = getCourseUnlockStatus(courseId, courses, user);
    if (!unlockStatus.unlocked) {
      if (!unlockStatus.sequenceUnlocked) {
        alert('This study level is locked. Complete the previous level first.');
      } else if (unlockStatus.missingPrereqs.length > 0) {
        const titles = unlockStatus.missingPrereqs.map((id) => getCourseTitle(id, courses)).join(', ');
        alert(`Prerequisites required: ${titles}.`);
      } else {
        alert('This study level is locked.');
      }
      return;
    }
    setSelectedCourseId(courseId);
    setCurrentView('course');
  };

  const handleBackToDashboard = () => {
    setSelectedCourseId(null);
    setCurrentView('dashboard');
  };

  const handleAddCourse = async (newCourse: Course) => {
    const isDuplicate = courses.some((course) => course.id === newCourse.id);
    if (isDuplicate) {
      alert('A course with this ID already exists.');
      return;
    }
    const nextSequence = courses.reduce((acc, course) => Math.max(acc, course.sequence ?? 0), 0) + 1;
    const courseWithSequence = Number.isFinite(newCourse.sequence) && newCourse.sequence > 0
      ? newCourse
      : { ...newCourse, sequence: nextSequence };
    const normalizedCourse = {
      ...courseWithSequence,
      totalProgress: Number.isFinite(courseWithSequence.totalProgress) ? courseWithSequence.totalProgress : 0,
      tags: Array.isArray(courseWithSequence.tags) ? courseWithSequence.tags : [],
    };

    try {
      await saveCourse(normalizedCourse);
      setCourses((prev) => mergeCourseLists(prev, [normalizedCourse]));
      setCurrentView('dashboard');
    } catch (e) {
      console.error('Failed to save course:', e);
      alert('Failed to save course. Please try again.');
    }
  };

  const getActiveCourse = () => orderedCourses.find(c => c.id === selectedCourseId) || orderedCourses[0];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return user ? (
          <Dashboard
            user={user}
            courses={orderedCourses}
            onResume={handleResumeCourse}
            onResetEverything={async () => {
              await resetEverything();
              setCurrentView('dashboard');
              setSelectedCourseId(null);
            }}
          />
        ) : null;
      case 'course':
        if (!user) return null;
        const defaultCourseId = (() => {
          const targetLevel = Math.min(user.studyLevelUnlocked, user.studyLevelCompleted + 1);
          const targetCourse = orderedCourses.find((course) => course.sequence === targetLevel);
          return targetCourse?.id || orderedCourses[0]?.id;
        })();

        return (
          <CourseView
            course={orderedCourses.find((c) => c.id === (selectedCourseId || defaultCourseId)) || orderedCourses[0]}
            allCourses={orderedCourses}
            user={user}
            onBack={handleBackToDashboard}
            onSubmitQuiz={async (payload) => {
              const res = await submitLessonQuiz(payload);
              if (res?.xpAwarded) notifyXp(res.xpAwarded, 'Lesson Passed');
              if (res?.courseBonusAwarded) notifyXp(res.courseBonusAwarded, 'Study Level Completed');
              return res;
            }}
            onResetEverything={async () => {
              await resetEverything();
              setCurrentView('dashboard');
              setSelectedCourseId(null);
            }}
          />
        );
      case 'certificate':
        return user ? <Certificate user={user} courses={courses} /> : null;
      case 'admin':
        return <AdminPanel onAddCourse={handleAddCourse} />;
      case 'leaderboard':
        return user ? <Leaderboard user={user} /> : null;
      case 'login':
        return null;
      default:
        return user ? (
          <Dashboard
            user={user}
            courses={orderedCourses}
            onResume={handleResumeCourse}
            onResetEverything={async () => {
              await resetEverything();
              setCurrentView('dashboard');
              setSelectedCourseId(null);
            }}
          />
        ) : null;
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-black/30 border border-white/10 backdrop-blur-3xl rounded-xl p-8 text-center">
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">End Of Time Academy</h1>
          <p className="text-stone-400 mt-3 text-sm leading-relaxed">
            Sign in to track your progress, earn XP, and appear on the global leaderboard.
          </p>
          <button
            onClick={handleSignIn}
            className="mt-8 w-full bg-gold-500 hover:bg-gold-400 text-white font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (progressError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-black/30 border border-white/10 backdrop-blur-3xl rounded-xl p-8 text-center">
          <h1 className="font-display font-black text-2xl text-white uppercase tracking-tight">Profile Load Failed</h1>
          <p className="text-stone-400 mt-3 text-sm leading-relaxed">{progressError}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gold-500 hover:bg-gold-400 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleSignOut}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 font-bold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBootstrapping || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400 font-mono text-xs uppercase tracking-widest">
        Loading Academy Profile...
      </div>
    );
  }

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user} onSignOut={handleSignOut}>
      {renderContent()}
      
      {/* Global XP Notification Overlay */}
      <div className="fixed top-24 right-8 z-[100] pointer-events-none flex flex-col gap-2">
         {xpNotifications.map(n => (
            <div key={n.id} className="animate-float-up bg-gold-500/10 border border-gold-500 text-gold-500 px-4 py-2 rounded shadow-[0_0_20px_rgba(217,119,6,0.3)] backdrop-blur-md flex items-center gap-3">
               <Zap size={18} fill="currentColor" />
               <div>
                  <span className="font-black text-lg">+{n.amount} XP</span>
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-white">{n.label}</span>
                </div>
            </div>
         ))}
      </div>
    </Layout>
  );
};

export default App;
