
import React, { useEffect, useRef, useState } from 'react';
import { Course, QuizQuestion, User } from '../types';
// Fixed: Added missing Clock and BarChart imports from lucide-react
import { ChevronLeft, CheckCircle, List, Loader2, X, Activity, Target, Award, Database, Book, Clock, BarChart, Menu, Headphones, Star } from 'lucide-react';
import { fetchKjvVerse } from '../services/scriptureService';
import { recordLessonCompletion, recordLessonRead, getLessonMasteryStatus, loadReadLessonKeys } from '../services/studyPlan';
import { recordReading } from '../services/academyBackend';
import { getCourseUnlockStatus, getCourseTitle, isCourseCompleted as isCourseCompletedInTree } from '../services/skillTree';
import type { LessonQuizResult, LessonQuizSubmission } from '../services/academyBackend';

interface CourseViewProps {
  course: Course;
  allCourses: Course[];
  user: User | null;
  onBack: () => void;
  onSubmitQuiz: (payload: LessonQuizSubmission) => Promise<LessonQuizResult>;
  onResetEverything: () => Promise<void>;
}

const DICTIONARY: Record<string, string> = {
  "God": "The Supreme Being, Creator and Ruler of all, who is self-existent and eternal.",
  "incomprehensible": "The theological attribute denoting that God cannot be fully grasped by finite minds.",
  "knowable": "Despite being incomprehensible, God has revealed Himself sufficiently for relationship.",
  "Revelation": "The act of God disclosing truth about Himself to humanity.",
  "Scripture": "The sacred writings of the Old and New Testaments, inspired by God.",
  "Aseity": "From the Latin 'a se' (from himself); God's self-existence and independence.",
  "redemption": "The action of saving or being saved from sin, error, or evil.",
  "sovereignty": "God's supreme power and authority over all creation."
};

const SCRIPTURE_REGEX = /\b(?:[1-3]\s*)?(?:Gen|Ex|Lev|Num|Deut|Josh|Judg|Ruth|Sam|Kings|Chron|Ezra|Neh|Esth|Job|Ps|Prov|Eccles|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Titus|Phile|Heb|James|Pet|Jude|Rev)[a-z]*\.?\s\d+:\d+(?:-\d+)?\b/i;

interface InteractiveTextProps {
  content: string;
  onOpenRef: (ref: { type: 'dict' | 'scripture'; value: string }) => void;
}

const DIFFICULTY_PROFILES = {
  Beginner: {
    label: 'Foundation',
    summary: 'Slow, guided formation with a single core idea and simple next steps.',
    signals: ['Shorter passages', 'Guided prompts', 'Foundational vocabulary'],
    tools: ['Key ideas', 'Guided reflection', 'Prayer focus'],
  },
  Intermediate: {
    label: 'Formation',
    summary: 'Deeper practice with layered concepts and steady application drills.',
    signals: ['Cross-text connections', 'Habit practice', 'Memory focus'],
    tools: ['Practice steps', 'Reflection prompts', 'Memory focus'],
  },
  Advanced: {
    label: 'Synthesis',
    summary: 'High-clarity study with tension points, synthesis, and case testing.',
    signals: ['Doctrinal tension', 'Integration work', 'Case testing'],
    tools: ['Challenge questions', 'Integration work', 'Case testing'],
  },
} as const;

const verseCache: Record<string, string> = {};
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

const saveFavoriteKeys = (keys: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(keys));
};

const InteractiveText: React.FC<InteractiveTextProps> = ({ content, onOpenRef }) => {
  const processContent = (text: string) => {
    const matches: { start: number, end: number, type: 'dict' | 'scripture', value: string }[] = [];
    Object.keys(DICTIONARY).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      let m;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: 'dict', value: key });
      }
    });
    const scriptureRegex = new RegExp(SCRIPTURE_REGEX.source, 'gi');
    let scriptureMatch;
    while ((scriptureMatch = scriptureRegex.exec(text)) !== null) {
      matches.push({ start: scriptureMatch.index, end: scriptureMatch.index + scriptureMatch[0].length, type: 'scripture', value: scriptureMatch[0] });
    }
    const sortedMatches = matches.sort((a, b) => a.start - b.start);
    const nonOverlapping: typeof matches = [];
    let lastEnd = -1;
    for (const match of sortedMatches) {
      if (match.start >= lastEnd) {
        nonOverlapping.push(match);
        lastEnd = match.end;
      }
    }
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;
    nonOverlapping.forEach((match, idx) => {
      if (match.start > currentIndex) {
        elements.push(text.substring(currentIndex, match.start));
      }
      elements.push(
        <span key={`match-${idx}`} className="relative inline-block">
          <span
            role="button"
            tabIndex={0}
            onClick={() => onOpenRef({ type: match.type, value: match.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenRef({ type: match.type, value: match.value });
            }}
            className="cursor-pointer transition-all duration-300 font-serif italic text-stone-300 decoration-stone-600 underline decoration-1 underline-offset-4 hover:decoration-gold-500 hover:text-white"
          >
            {text.substring(match.start, match.end)}
          </span>
        </span>
      );
      currentIndex = match.end;
    });
    if (currentIndex < text.length) elements.push(text.substring(currentIndex));
    return elements;
  };

  return <p className="mb-8 font-serif text-xl md:text-2xl leading-loose text-stone-300 font-normal tracking-wide antialiased">{processContent(content)}</p>;
};

const QuizModule = ({
  courseId,
  lessonId,
  questions,
  onSubmitQuiz,
  onLessonPassed,
  masteryStatus,
}: {
  courseId: string;
  lessonId: string;
  questions: QuizQuestion[];
  onSubmitQuiz: (payload: LessonQuizSubmission) => Promise<LessonQuizResult>;
  onLessonPassed?: () => void;
  masteryStatus?: { count: number; mastered: boolean };
}) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LessonQuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!questions || questions.length === 0) return null;

  const isFullyAnswered = questions.every((q) => answers[q.id] !== undefined);
  const canSubmit = isFullyAnswered && !isSubmitting && !result;

  const handleOptionClick = (qId: string, optIdx: number) => {
    if (isSubmitting || result) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const res = await onSubmitQuiz({ courseId, lessonId, answers });
      setResult(res);
      if (res?.passed) onLessonPassed?.();
    } catch (e) {
      console.error('Quiz submission failed:', e);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="my-16 space-y-8 bg-white/5 p-8 rounded-lg border border-white/5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif font-bold text-2xl text-white flex items-center gap-3">
          <Target className="text-gold-500" />
          Assessment
        </h3>
        <div className="flex flex-col items-end gap-1">
          {result && (
            <div className={`text-[10px] font-bold uppercase tracking-widest ${result.passed ? 'text-emerald-400' : 'text-red-300'}`}>
              Score: {result.score}/{result.total} (100% required)
            </div>
          )}
          {masteryStatus && (
            <div className={`text-[10px] uppercase tracking-widest ${masteryStatus.mastered ? 'text-gold-300' : 'text-stone-500'}`}>
              Mastery {Math.min(masteryStatus.count, 2)}/2 this week
            </div>
          )}
        </div>
      </div>

      {questions.map((q) => {
        const qResult = result?.perQuestion?.[q.id];
        const selectedIdx = answers[q.id];
        return (
          <div key={q.id} className="space-y-6">
            <p className="font-sans font-bold text-lg text-stone-200">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isAnswered = selectedIdx !== undefined;
                const correctIndex = qResult?.correctIndex;
                const showFeedback = Boolean(result);
                const isCorrectOption = showFeedback && correctIndex === idx;
                const isWrongSelected = showFeedback && isSelected && qResult && !qResult.isCorrect;

                let containerClass = 'border-stone-700 hover:bg-white/5';
                let textClass = 'text-stone-400';
                let icon = <div className="w-4 h-4 rounded-full border border-stone-600"></div>;

                if (showFeedback) {
                  if (isCorrectOption) {
                    containerClass = 'bg-green-900/20 border-green-800';
                    textClass = 'text-green-300 font-medium';
                    icon = <CheckCircle size={20} className="text-green-400" />;
                  } else if (isWrongSelected) {
                    containerClass = 'bg-red-900/20 border-red-800';
                    textClass = 'text-red-300 font-medium';
                    icon = <X size={20} className="text-red-400" />;
                  } else {
                    containerClass = 'opacity-40 border-transparent';
                  }
                } else if (isAnswered && isSelected) {
                  containerClass = 'bg-white/5 border-stone-600';
                  textClass = 'text-stone-200 font-medium';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(q.id, idx)}
                    disabled={isSubmitting || result?.passed}
                    className={`w-full text-left p-4 rounded border transition-all flex items-center justify-between group font-sans text-base ${containerClass}`}
                  >
                    <span className={`${textClass}`}>{opt}</span>
                    {icon}
                  </button>
                );
              })}
            </div>
            {result && (
              <div className="mt-4 p-4 bg-black/30 rounded text-sm text-stone-400 animate-fade-in border-l-2 border-stone-600 font-sans leading-relaxed">
                <strong className="text-white uppercase tracking-wider text-xs block mb-1">Debrief</strong>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 flex items-center justify-end gap-3">
        {result && !result.passed && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Retry
          </button>
        )}
        {result && result.passed && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Practice Again
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-6 py-3 rounded-sm bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:hover:bg-gold-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          {isSubmitting ? 'Submitting...' : result?.passed ? 'Passed' : 'Submit Answers'}
        </button>
      </div>
    </div>
  );
};

const CourseDebrief = ({
  course,
  onBackToDashboard,
  onResetEverything,
}: {
  course: Course;
  onBackToDashboard: () => void;
  onResetEverything: () => Promise<void>;
}) => {
  const totalDuration = course.modules.reduce((acc, m) => acc + m.lessons.reduce((lAcc, l) => lAcc + l.durationMinutes, 0), 0);
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
       <div className="glass-panel p-8 md:p-12 rounded-xl relative overflow-hidden border border-gold-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="text-center mb-12 relative z-10">
             <div className="inline-flex items-center justify-center p-3 rounded-full bg-gold-500/10 text-gold-400 mb-6 border border-gold-500/20"><Award size={32} /></div>
             <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-4 uppercase tracking-tight">Mission Accomplished</h2>
             <p className="font-serif text-lg text-stone-300">Course completed successfully. Reviewing tactical performance.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
             <div className="p-4 rounded bg-white/5 border border-white/10 text-center"><Activity size={20} className="mx-auto text-stone-400 mb-2" /><div className="text-2xl font-serif font-bold text-white">100%</div><div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Accuracy</div></div>
             <div className="p-4 rounded bg-white/5 border border-white/10 text-center"><Clock size={20} className="mx-auto text-stone-400 mb-2" /><div className="text-2xl font-serif font-bold text-white">{totalDuration}m</div><div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Study Time</div></div>
             <div className="p-4 rounded bg-white/5 border border-white/10 text-center"><BarChart size={20} className="mx-auto text-stone-400 mb-2" /><div className="text-2xl font-serif font-bold text-white">{totalLessons}</div><div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Modules Cleared</div></div>
           </div>
           <div className="text-center relative z-10">
             <div className="flex flex-col md:flex-row gap-4 justify-center">
               <button
                 onClick={onBackToDashboard}
                 className="group relative px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest transition-all overflow-hidden shadow-xl bg-gold-500 hover:bg-gold-400 text-white hover:scale-105"
               >
                 <span className="relative z-10 flex items-center gap-3 font-sans">
                   <CheckCircle size={20} /> Return to Study Desk
                 </span>
               </button>
               <button
                 onClick={async () => {
                   const confirmed = window.confirm('Reset EVERYTHING? This clears all progress and XP and locks all levels except Level 1.');
                   if (!confirmed) return;
                   await onResetEverything();
                 }}
                 className="px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest transition-all overflow-hidden shadow-xl bg-white/5 hover:bg-red-950/40 border border-white/10 text-stone-200 hover:text-red-200"
               >
                 Reset Everything
               </button>
             </div>
           </div>
        </div>
     </div>
  );
};

export const CourseView: React.FC<CourseViewProps> = ({ course, allCourses, user, onBack, onSubmitQuiz, onResetEverything }) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [showDebrief, setShowDebrief] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [activeRef, setActiveRef] = useState<{ type: 'dict' | 'scripture'; value: string } | null>(null);
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [loadingBible, setLoadingBible] = useState(false);
  const [journalEntry, setJournalEntry] = useState('');
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [readLessonKeys, setReadLessonKeys] = useState<string[]>([]);

  const activeModule = course.modules[activeModuleIndex] || { lessons: [] };
  const activeLesson =
    (activeModule.lessons && activeModule.lessons[activeLessonIndex]) ||
    (activeModule.lessons && activeModule.lessons[0]) ||
    ({
      id: '__empty__',
      title: '',
      type: 'text',
      content: '',
      audioUrl: '',
      durationMinutes: 0,
      scriptureReference: '',
      isCompleted: false,
    } as any);
  const activeLessonContent = typeof activeLesson.content === 'string' ? activeLesson.content : '';
  const lessonSupports = activeLesson.supports;
  const transcriptWordCount = activeLessonContent.trim().split(/\s+/).filter(Boolean).length;
  const hasTranscript = transcriptWordCount > 0;
  const estimatedReadMinutes = transcriptWordCount ? Math.max(1, Math.round(transcriptWordCount / 180)) : 0;
  const quizCount = activeLesson.quiz?.length ?? 0;
  const difficultyProfile = DIFFICULTY_PROFILES[course.difficulty];
  const isAudioLesson = activeLesson.type === 'audio';
  const masteryStatus = getLessonMasteryStatus(course.id, activeLesson.id);
  const activeLessonKey = lessonKey(course.id, activeLesson.id);
  const favoriteKeySet = new Set(favoriteKeys);
  const isLessonLogged = readLessonKeys.includes(activeLessonKey);
  const isFavoriteLesson = favoriteKeySet.has(activeLessonKey);

  const courseSequence = course.sequence ?? 0;
  const unlockStatus = getCourseUnlockStatus(course.id, allCourses, user);
  const isCourseLocked = Boolean(courseSequence && user && !unlockStatus.unlocked);
  const isCourseCompleted = Boolean(user && isCourseCompletedInTree(course.id, allCourses, user));

  useEffect(() => {
    setActiveModuleIndex(0);
    setActiveLessonIndex(0);
    setShowDebrief(false);
  }, [course.id]);

  useEffect(() => {
    setReadLessonKeys(loadReadLessonKeys());
  }, []);

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
    if (typeof window === 'undefined') return;
    const key = `academy:journal:${course.id}:${activeLesson.id}`;
    const stored = window.localStorage.getItem(key);
    setJournalEntry(stored || '');
  }, [course.id, activeLesson.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `academy:journal:${course.id}:${activeLesson.id}`;
    window.localStorage.setItem(key, journalEntry);
  }, [course.id, activeLesson.id, journalEntry]);

  const toggleFavoriteLesson = () => {
    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (next.has(activeLessonKey)) {
        next.delete(activeLessonKey);
      } else {
        next.add(activeLessonKey);
      }
      const list = Array.from(next);
      saveFavoriteKeys(list);
      return list;
    });
  };

  const prevCourseCompletedRef = useRef<boolean>(isCourseCompleted);
  useEffect(() => {
    if (!prevCourseCompletedRef.current && isCourseCompleted) setShowDebrief(true);
    prevCourseCompletedRef.current = isCourseCompleted;
  }, [isCourseCompleted]);

  const fetchBibleVerse = async (reference: string) => {
    if (verseCache[reference]) {
      setBibleText(verseCache[reference]);
      return;
    }

    setLoadingBible(true);
    setBibleText(null);
    try {
      const result = await fetchKjvVerse(reference);
      if ('text' in result) {
        const cleanedText = result.text.trim();
        verseCache[reference] = cleanedText;
        setBibleText(cleanedText);
      } else {
        setBibleText(result.error);
      }
    } catch (err) {
      setBibleText("Failed to retrieve sacred text from KJV library.");
    } finally {
      setLoadingBible(false);
    }
  };

  const handleOpenRef = async (ref: { type: 'dict' | 'scripture'; value: string }) => {
    setActiveRef(ref);
    if (ref.type === 'scripture') {
      await fetchBibleVerse(ref.value);
      return;
    }
  };

  const handleLogLesson = async () => {
    recordLessonRead(course.id, activeLesson.id, activeLesson.durationMinutes);
    setReadLessonKeys(loadReadLessonKeys());
    try {
      await recordReading({ courseId: course.id, lessonId: activeLesson.id, durationMinutes: activeLesson.durationMinutes });
    } catch (err) {
      console.error('Failed to sync reading log:', err);
    }
  };

  if (isCourseLocked) {
    const missingPrereqs = unlockStatus.missingPrereqs.map((id) => getCourseTitle(id, allCourses));
    return (
      <div className="min-h-[60dvh] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full bg-black/30 border border-white/10 backdrop-blur-3xl rounded-xl p-8 text-center">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Study Level Locked</h2>
          <p className="text-stone-400 mt-3 text-sm leading-relaxed">
            {unlockStatus.sequenceUnlocked
              ? 'Complete the required prerequisites to unlock this content.'
              : 'Complete the previous study level with a 100% score to unlock this content.'}
          </p>
          {missingPrereqs.length > 0 && (
            <div className="mt-4 text-xs text-stone-400">
              <span className="uppercase tracking-widest text-stone-500 block mb-2">Prerequisites</span>
              <div className="space-y-1">
                {missingPrereqs.map((title) => (
                  <div key={title} className="text-stone-300">{title}</div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={onBack}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors"
            >
              Back to Study Desk
            </button>
            <button
              onClick={async () => {
                const confirmed = window.confirm('Reset EVERYTHING? This clears all progress and XP and locks all levels except Level 1.');
                if (!confirmed) return;
                await onResetEverything();
              }}
              className="w-full bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-200 font-bold py-4 rounded-lg uppercase tracking-widest text-xs transition-colors"
            >
              Reset Everything
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row bg-transparent relative text-stone-300 overflow-hidden">
      {activeRef && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveRef(null)}>
          <div className="w-full max-w-xl bg-stone-900 border border-white/10 rounded shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-stone-800 p-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {activeRef.type === 'scripture' ? <Book size={16} className="text-amber-500" /> : <Database size={16} className="text-gold-500" />}
                <div>
                  <h3 className="font-serif font-bold text-white text-lg">{activeRef.value}</h3>
                  {activeRef.type === 'scripture' && (
                    <div className="text-[10px] uppercase tracking-widest text-stone-500">KJV</div>
                  )}
                </div>
              </div>
              <button onClick={() => setActiveRef(null)} className="text-stone-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[70dvh] overflow-y-auto custom-scrollbar">
              {activeRef.type === 'dict' ? (
                <div className="space-y-6">
                  <p className="text-stone-300 leading-relaxed font-sans">{DICTIONARY[activeRef.value] || 'No definition found.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loadingBible ? (
                    <div className="flex items-center justify-center py-8"><Loader2 size={28} className="animate-spin text-amber-500" /></div>
                  ) : (
                    <p className="leading-relaxed font-serif italic text-stone-200 whitespace-pre-line">{bibleText || "Retrieving text..."}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-2xl mx-auto px-6 py-12 md:py-24">
          <div className="mb-12 flex items-center justify-between gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors text-xs font-sans font-bold uppercase tracking-widest group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
            </button>
            <button onClick={() => setIsMobilePanelOpen(true)} className="lg:hidden flex items-center gap-2 text-stone-500 hover:text-white transition-colors text-xs font-sans font-bold uppercase tracking-widest">
              <Menu size={16} /> Menu
            </button>
          </div>

          {showDebrief ? (
            <CourseDebrief course={course} onBackToDashboard={onBack} onResetEverything={onResetEverything} />
          ) : (
             <>
             <header className="mb-16">
                 <div className="flex items-center gap-4 mb-8">
                   <span className="text-xs font-bold font-sans uppercase tracking-widest text-gold-500">{course.title}</span>
                   <span className="text-stone-700 text-xs font-sans">|</span>
                   <span className="text-xs font-sans text-stone-500 flex items-center gap-2"><Activity size={12} className="text-stone-500" />{activeLesson.durationMinutes} min</span>
                 </div>
                 <h1 className="font-serif text-5xl md:text-6xl font-bold text-white leading-tight mb-8">{activeLesson.title}</h1>
                 
                 <div className="flex gap-4 flex-wrap">
                     {isCourseCompleted && (
                       <button
                         onClick={() => setShowDebrief(true)}
                         className="flex items-center gap-2 px-4 py-2 rounded border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest font-mono"
                       >
                         <Award size={14} /> View Debrief
                       </button>
                     )}
                     <button
                       onClick={toggleFavoriteLesson}
                       aria-pressed={isFavoriteLesson}
                       className={`flex items-center gap-2 px-4 py-2 rounded border transition-all text-[10px] font-bold uppercase tracking-widest font-mono ${
                         isFavoriteLesson
                           ? 'border-gold-500/40 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20'
                           : 'border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                       }`}
                     >
                       <Star size={14} fill={isFavoriteLesson ? 'currentColor' : 'none'} className={isFavoriteLesson ? 'text-gold-400' : 'text-stone-400'} />
                       {isFavoriteLesson ? 'Saved' : 'Save Lesson'}
                     </button>
                     <button
                       onClick={handleLogLesson}
                       className={`flex items-center gap-2 px-4 py-2 rounded border transition-all text-[10px] font-bold uppercase tracking-widest font-mono ${
                         isLessonLogged
                           ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                           : 'border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                       }`}
                     >
                       <CheckCircle size={14} className={isLessonLogged ? 'text-emerald-400' : 'text-stone-400'} />
                       {isLessonLogged ? 'Logged' : 'Log Lesson'}
                     </button>
                     <button
                       onClick={async () => {
                         const confirmed = window.confirm('Reset EVERYTHING? This clears all progress and XP and locks all levels except Level 1.');
                         if (!confirmed) return;
                         await onResetEverything();
                       }}
                       className="flex items-center gap-2 px-4 py-2 rounded border border-red-900/40 bg-red-950/20 text-red-200 hover:bg-red-950/40 transition-all text-[10px] font-bold uppercase tracking-widest font-mono"
                     >
                       <X size={14} /> Reset
                     </button>
                  </div>
               </header>

              <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded bg-white/5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Difficulty</p>
                  <div className="text-white font-serif text-xl">{course.difficulty}</div>
                  <div className="text-stone-400 text-xs mt-2">{difficultyProfile.summary}</div>
                  <ul className="mt-3 text-stone-400 text-[10px] uppercase tracking-widest space-y-1">
                    {difficultyProfile.signals.map((signal) => (
                      <li key={signal} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gold-500"></span>
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Study Load</p>
                  <div className="text-white font-serif text-xl">
                    {isAudioLesson ? `${activeLesson.durationMinutes} min audio` : `${estimatedReadMinutes} min read`}
                  </div>
                  <div className="text-stone-400 text-xs mt-2">
                    {isAudioLesson ? (transcriptWordCount ? `${transcriptWordCount} transcript words` : 'Audio only') : `${transcriptWordCount} words - ${quizCount} quiz items`}
                  </div>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Tools</p>
                  <ul className="text-stone-300 text-xs space-y-2">
                    {difficultyProfile.tools.map((tool) => (
                      <li key={tool} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <article>
                 <div className="my-16 pl-6 border-l-2 border-gold-500">
                    <p className="font-serif text-2xl text-stone-200 italic leading-relaxed">"{activeLesson.scriptureReference}"</p>
                 </div>
                 {isAudioLesson && (
                  <div className="my-12 p-6 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4 text-stone-200">
                      <Headphones size={16} className="text-gold-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Audio Briefing</span>
                    </div>
                    {activeLesson.audioUrl ? (
                      <audio controls className="w-full">
                        <source src={activeLesson.audioUrl} />
                      </audio>
                    ) : (
                      <p className="text-xs text-red-300">Audio file missing for this lesson.</p>
                    )}
                    {!hasTranscript && (
                      <p className="text-xs text-stone-500 mt-4">Transcript not provided.</p>
                    )}
                  </div>
                 )}
                 {hasTranscript && (
                   <>
                     {isAudioLesson && (
                       <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-6">Transcript</p>
                     )}
                     {activeLessonContent.split('\n').map((paragraph, idx) => (
                       <InteractiveText key={idx} content={paragraph} onOpenRef={handleOpenRef} />
                     ))}
                   </>
                 )}
                 {lessonSupports && (
                  <div className="my-16 space-y-8">
                    {lessonSupports.keyIdeas && lessonSupports.keyIdeas.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Key Ideas</p>
                        <ul className="space-y-2 text-stone-300 text-sm">
                          {lessonSupports.keyIdeas.map((idea, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0"></span>
                              <span>{idea}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lessonSupports.reflectionPrompts && lessonSupports.reflectionPrompts.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Personal Reflection</p>
                        <ul className="space-y-2 text-stone-300 text-sm">
                          {lessonSupports.reflectionPrompts.map((prompt, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-500 shrink-0"></span>
                              <span>{prompt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lessonSupports.practiceSteps && lessonSupports.practiceSteps.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Practice Steps</p>
                        <ol className="space-y-2 text-stone-300 text-sm list-decimal list-inside">
                          {lessonSupports.practiceSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {lessonSupports.challengeQuestions && lessonSupports.challengeQuestions.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Challenge Questions</p>
                        <ul className="space-y-2 text-stone-300 text-sm">
                          {lessonSupports.challengeQuestions.map((question, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lessonSupports.memoryFocus && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Memory Focus</p>
                        <p className="text-stone-300 text-sm">{lessonSupports.memoryFocus}</p>
                      </div>
                    )}

                    {lessonSupports.integrationWork && lessonSupports.integrationWork.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Integration Work</p>
                        <ul className="space-y-2 text-stone-300 text-sm">
                          {lessonSupports.integrationWork.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lessonSupports.caseTesting && lessonSupports.caseTesting.length > 0 && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Case Testing</p>
                        <ul className="space-y-2 text-stone-300 text-sm">
                          {lessonSupports.caseTesting.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lessonSupports.prayerFocus && (
                      <div className="p-6 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4">Prayer Focus</p>
                        <p className="text-stone-300 text-sm">{lessonSupports.prayerFocus}</p>
                      </div>
                    )}
                  </div>
                 )}
                 <div className="my-16 p-6 rounded bg-white/5 border border-white/10">
                   <div className="flex items-center justify-between mb-3">
                     <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Private Journal</p>
                     <span className="text-[10px] text-stone-500 uppercase tracking-widest">Auto-saved</span>
                   </div>
                   <p className="text-xs text-stone-500 mb-4">Stored locally on this device only.</p>
                   <textarea
                     value={journalEntry}
                     onChange={(e) => setJournalEntry(e.target.value)}
                     placeholder="Write your reflection, prayers, or questions here..."
                     className="w-full min-h-[180px] bg-black/40 border border-white/10 rounded p-4 text-sm text-stone-200 focus:outline-none focus:border-gold-500 transition-colors resize-y"
                   />
                 </div>
                  {activeLesson.quiz && (
                    <QuizModule
                      key={`${course.id}:${activeLesson.id}`}
                      courseId={course.id}
                      lessonId={activeLesson.id}
                      questions={activeLesson.quiz}
                      onSubmitQuiz={onSubmitQuiz}
                      onLessonPassed={() => {
                        recordLessonCompletion(course.id, activeLesson.id, activeLesson.durationMinutes);
                        setReadLessonKeys(loadReadLessonKeys());
                      }}
                      masteryStatus={{ count: masteryStatus.count, mastered: masteryStatus.mastered }}
                    />
                  )}
                </article>
             </>
           )}
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-black/30 border-l border-white/5 h-full relative z-20 backdrop-blur-3xl">
        <div className="p-8 h-full flex flex-col">
          <h3 className="font-sans font-bold text-stone-500 text-xs uppercase tracking-widest mb-8 flex items-center gap-2"><List size={14} /> Index</h3>
          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
            {course.modules.map((module, mIdx) => (
              <div key={module.id} className="relative pl-4">
                <div className="absolute left-[7px] top-8 bottom-0 w-px bg-stone-800"></div>
                <h4 className="text-xs font-bold text-white uppercase mb-4 tracking-wider flex items-center gap-3">
                   <span className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-[10px] text-stone-400">{mIdx + 1}</span>
                   {module.title}
                </h4>
                <div className="space-y-1 ml-2">
                  {module.lessons.map((lesson, lIdx) => {
                    const isActive = mIdx === activeModuleIndex && lIdx === activeLessonIndex;
                    const isPassed = Boolean(user?.passedLessonKeys?.includes(`${course.id}:${lesson.id}`));
                    const isFavorite = favoriteKeySet.has(lessonKey(course.id, lesson.id));
                    const mastery = getLessonMasteryStatus(course.id, lesson.id);
                    return (
                      <button key={lesson.id} onClick={() => { setActiveModuleIndex(mIdx); setActiveLessonIndex(lIdx); setShowDebrief(false); }} className={`group w-full text-left pl-6 py-3 text-sm transition-all duration-300 relative rounded-r flex items-center justify-between gap-3 ${isActive ? 'text-white bg-white/5 font-bold' : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'}`}>
                        <div className={`absolute left-[5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border-2 ${isActive ? 'border-gold-500 bg-gold-500' : 'border-stone-600'}`}></div>
                        <span className="truncate block">{lesson.title}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          {isFavorite && <Star size={14} className="text-gold-500" fill="currentColor" />}
                          {mastery.mastered && <Award size={16} className="text-amber-400" />}
                          {isPassed && <CheckCircle size={16} className="text-emerald-400" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMobilePanelOpen && (
        <div className="lg:hidden fixed inset-0 z-[105] bg-black/70 backdrop-blur-sm" onClick={() => setIsMobilePanelOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 bg-stone-900 border-t border-white/10 rounded-t-2xl max-h-[80dvh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Index</div>
              <button onClick={() => setIsMobilePanelOpen(false)} className="text-stone-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar max-h-[calc(80dvh-64px)]">
              <div className="space-y-8">
                {course.modules.map((module, mIdx) => (
                  <div key={module.id} className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-[10px] text-stone-400">{mIdx + 1}</span>
                      {module.title}
                    </h4>
                    <div className="space-y-1">
                      {module.lessons.map((lesson, lIdx) => {
                        const isActive = mIdx === activeModuleIndex && lIdx === activeLessonIndex;
                        const isPassed = Boolean(user?.passedLessonKeys?.includes(`${course.id}:${lesson.id}`));
                        const isFavorite = favoriteKeySet.has(lessonKey(course.id, lesson.id));
                        const mastery = getLessonMasteryStatus(course.id, lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => { setActiveModuleIndex(mIdx); setActiveLessonIndex(lIdx); setShowDebrief(false); setIsMobilePanelOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded border transition-all font-sans text-sm flex items-center justify-between gap-3 ${isActive ? 'bg-white/10 border-gold-500/30 text-white font-bold' : 'bg-black/20 border-white/10 text-stone-400 hover:text-white'}`}
                          >
                            <span className="truncate">{lesson.title}</span>
                            <span className="flex items-center gap-2 shrink-0">
                              {isFavorite && <Star size={14} className="text-gold-500" fill="currentColor" />}
                              {mastery.mastered && <Award size={16} className="text-amber-400" />}
                              {isPassed && <CheckCircle size={16} className="text-emerald-400" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
