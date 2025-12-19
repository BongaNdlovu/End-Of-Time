import React, { useState } from 'react';
import { Course } from '../types';
import { AlertTriangle, CheckCircle, Database, ShieldAlert, Terminal, UploadCloud } from 'lucide-react';

interface AdminPanelProps {
  onAddCourse: (course: Course) => Promise<void>;
}

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const normalizeCourse = (course: Partial<Course>): Course | null => {
  if (!hasText(course.id) || !hasText(course.title) || !hasText(course.description) || !hasText(course.instructor) || !hasText(course.thumbnail)) {
    return null;
  }
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(String(course.difficulty))) {
    return null;
  }
  const prerequisites = Array.isArray((course as any).prerequisites)
    ? (course as any).prerequisites.filter((value: unknown) => typeof value === 'string' && value.trim())
    : [];
  if (!Array.isArray(course.modules) || course.modules.length === 0) {
    return null;
  }

  const normalizedModules = course.modules.map((mod) => {
    if (!hasText(mod?.id) || !hasText(mod?.title)) return null;
    if (!Array.isArray(mod?.lessons) || mod.lessons.length === 0) return null;
    const normalizedLessons = mod.lessons.map((lesson) => {
      if (!hasText(lesson?.id) || !hasText(lesson?.title)) return null;
      if (lesson?.type !== 'text' && lesson?.type !== 'audio') return null;
      if (lesson.type === 'text' && !hasText(lesson?.content)) return null;
      if (lesson.type === 'audio' && !hasText((lesson as any)?.audioUrl)) return null;
      if (!hasText(lesson?.scriptureReference)) return null;
      if (typeof lesson?.durationMinutes !== 'number' || !Number.isFinite(lesson.durationMinutes)) return null;
      return {
        ...lesson,
        content: hasText(lesson.content) ? lesson.content : '',
        audioUrl: lesson.type === 'audio' ? (lesson as any).audioUrl : undefined,
        isCompleted: typeof lesson.isCompleted === 'boolean' ? lesson.isCompleted : false,
        supports: lesson.supports || undefined,
        quiz: Array.isArray(lesson.quiz) ? lesson.quiz : undefined,
      };
    });
    if (normalizedLessons.some((lesson) => lesson === null)) return null;
    return {
      id: mod.id,
      title: mod.title,
      lessons: normalizedLessons as Course['modules'][number]['lessons'],
    };
  });

  if (normalizedModules.some((mod) => mod === null)) {
    return null;
  }

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    instructor: course.instructor,
    thumbnail: course.thumbnail,
    difficulty: course.difficulty as Course['difficulty'],
    sequence: typeof course.sequence === 'number' && Number.isFinite(course.sequence) ? course.sequence : 0,
    modules: normalizedModules as Course['modules'],
    totalProgress: typeof course.totalProgress === 'number' ? course.totalProgress : 0,
    tags: Array.isArray(course.tags) ? course.tags : [],
    prerequisites,
  };
};

const TEMPLATE_COURSE: Course = {
  id: 'c11',
  title: 'Example Course Title',
  description: 'A concise description of what this course covers.',
  instructor: 'Prof. Example',
  thumbnail: './assets/covers/cover-1.svg',
  difficulty: 'Beginner',
  sequence: 11,
  totalProgress: 0,
  tags: ['Example'],
  prerequisites: ['c1'],
  modules: [
    {
      id: 'm1',
      title: 'Module 1: Example Module',
      lessons: [
        {
          id: 'l1',
          title: 'Lesson Title',
          type: 'text',
          content: 'This is a sample lesson transcript or study text.',
          durationMinutes: 25,
          scriptureReference: 'John 1:9',
          supports: {
            keyIdeas: ['Sample key idea.'],
            reflectionPrompts: ['Sample reflection prompt.'],
            practiceSteps: ['Sample practice step.'],
            memoryFocus: 'Sample memory focus verse.',
            challengeQuestions: ['Sample challenge question.'],
            integrationWork: ['Sample integration work item.'],
            caseTesting: ['Sample case testing scenario.'],
            prayerFocus: 'Sample prayer focus.',
          },
          isCompleted: false,
        },
      ],
    },
  ],
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onAddCourse }) => {
  const [draftJson, setDraftJson] = useState(JSON.stringify(TEMPLATE_COURSE, null, 2));
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleValidate = () => {
    setParseError(null);
    setPreviewCourse(null);
    try {
      const parsed = JSON.parse(draftJson);
      const normalized = normalizeCourse(parsed);
      if (!normalized) {
        setParseError('JSON is valid but missing required fields. Check IDs, titles, lesson types, and audioUrl for audio lessons.');
        return;
      }
      setPreviewCourse(normalized);
    } catch (err) {
      setParseError('Invalid JSON. Check commas, quotes, and bracket nesting.');
    }
  };

  const handlePublish = async () => {
    if (!previewCourse) {
      setParseError('Validate the JSON before publishing.');
      return;
    }
    setIsPublishing(true);
    try {
      await onAddCourse(previewCourse);
      setPreviewCourse(null);
      alert('Course saved successfully.');
    } catch (err) {
      setParseError('Failed to save the course. Check your connection and try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto text-stone-900 dark:text-white">
      <header className="mb-10 border-b border-stone-200 dark:border-stone-800 pb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={18} className="text-gold-600 dark:text-gold-400" />
            <span className="text-xs font-mono text-gold-600 dark:text-gold-400 uppercase tracking-widest">Admin Console</span>
          </div>
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter">Curriculum Uplink</h1>
          <p className="font-mono text-stone-500 dark:text-stone-400 text-sm mt-2">// Upload a validated course JSON payload.</p>
        </div>
        <div className="hidden md:block">
          <div className="w-16 h-16 border border-stone-300 dark:border-stone-700 flex items-center justify-center opacity-20">
            <Database size={32} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-stone-100 dark:bg-stone-900/30 p-6 border border-stone-200 dark:border-stone-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 uppercase border border-stone-300 dark:border-stone-700 px-1">AI-MOD: OFFLINE</span>
            </div>
            <h2 className="font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
              <UploadCloud className="text-gold-600 dark:text-gold-500" size={20} /> Course JSON
            </h2>
            <textarea
              value={draftJson}
              onChange={(e) => setDraftJson(e.target.value)}
              className="w-full bg-white dark:bg-black border border-stone-300 dark:border-stone-800 text-stone-900 dark:text-white font-mono rounded-none p-4 h-[420px] focus:outline-none focus:border-gold-500 transition-colors text-xs leading-relaxed"
            />
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleValidate}
                className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-bold uppercase tracking-widest border border-stone-800 dark:border-white transition-colors hover:bg-stone-800 dark:hover:bg-stone-200"
              >
                Validate JSON
              </button>
              <button
                onClick={() => setDraftJson(JSON.stringify(TEMPLATE_COURSE, null, 2))}
                className="px-4 py-2 bg-white/5 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white/10"
              >
                Load Template
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-200 dark:border-blue-900/30 flex gap-4 items-start">
            <ShieldAlert className="text-blue-500 shrink-0 mt-1" size={20} />
            <div>
              <h3 className="font-bold text-blue-600 dark:text-blue-400 text-xs font-mono uppercase tracking-widest mb-1">Notes</h3>
              <p className="text-xs text-blue-700 dark:text-blue-300/70 font-mono leading-relaxed">
                Audio lessons require an <span className="font-bold">audioUrl</span>. Text lessons require <span className="font-bold">content</span>. Use local thumbnail paths for offline assets.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 dark:bg-black border border-stone-200 dark:border-stone-800 flex flex-col min-h-[500px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-500 via-transparent to-gold-500 opacity-50"></div>
          <div className="bg-stone-100 dark:bg-stone-900/50 p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
            <h2 className="font-bold text-stone-500 dark:text-stone-400 text-xs font-mono uppercase tracking-widest">Validation Console</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto font-mono text-sm">
            {parseError && (
              <div className="flex items-start gap-3 text-red-600 dark:text-red-300 text-xs">
                <AlertTriangle size={16} className="mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
            {previewCourse && (
              <div className="space-y-6 animate-fade-in text-stone-800 dark:text-stone-300">
                <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gold-500/10 text-gold-600 dark:text-gold-400 px-2 py-0.5 text-[10px] uppercase border border-gold-500/20">{previewCourse.difficulty}</span>
                    <span className="text-stone-400 text-[10px]">ID: {previewCourse.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-white uppercase font-display">{previewCourse.title}</h3>
                  <p className="text-stone-500 dark:text-stone-400 mt-1 text-xs italic">Instructor: {previewCourse.instructor}</p>
                  <p className="text-stone-600 dark:text-stone-300 mt-4 leading-relaxed border-l border-stone-300 dark:border-stone-800 pl-3">{previewCourse.description}</p>
                </div>
                <div className="space-y-4">
                  {previewCourse.modules.map((mod) => (
                    <div key={mod.id} className="border border-stone-200 dark:border-stone-800">
                      <div className="bg-stone-100 dark:bg-stone-900/30 p-2 text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider border-b border-stone-200 dark:border-stone-800">
                        {mod.title}
                      </div>
                      <div className="divide-y divide-stone-200 dark:divide-stone-800">
                        {mod.lessons.map((lesson) => (
                          <div key={lesson.id} className="p-3">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-bold text-stone-700 dark:text-stone-300 text-xs uppercase">{lesson.title}</p>
                              <span className="text-[10px] text-gold-600 dark:text-gold-400 uppercase font-mono">{lesson.type}</span>
                            </div>
                            <p className="text-[10px] text-stone-500">Duration: {lesson.durationMinutes} min</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!parseError && !previewCourse && (
              <div className="h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-800">
                <Terminal size={48} className="mb-4 opacity-50" />
                <p className="uppercase tracking-widest text-xs font-mono">Waiting for Validation...</p>
              </div>
            )}
          </div>
          {previewCourse && (
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-end">
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-green-600 text-white border border-green-500 px-6 py-2 hover:bg-green-500 transition-all font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={14} /> {isPublishing ? 'Publishing...' : 'Publish Course'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
