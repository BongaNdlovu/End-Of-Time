import type { Course, User } from '../types';

export const COURSE_PREREQUISITES: Record<string, string[]> = {
  c2: ['c1'],
  c9: ['c1'],
  c5: ['c2'],
  c3: ['c2'],
  c6: ['c3'],
  c8: ['c5', 'c6'],
  c4: ['c5'],
  c7: ['c4', 'c8'],
  c10: ['c7', 'c8'],
};

const lessonKey = (courseId: string, lessonId: string) => `${courseId}:${lessonId}`;

export const getCourseLessonKeys = (course: Course) => {
  return course.modules.flatMap((module) =>
    module.lessons.map((lesson) => lessonKey(course.id, lesson.id)),
  );
};

export const isCourseCompleted = (courseId: string, courses: Course[], user: User | null) => {
  if (!user) return false;
  const course = courses.find((c) => c.id === courseId);
  if (!course) return false;
  const lessonKeys = getCourseLessonKeys(course);
  if (lessonKeys.length === 0) return false;
  return lessonKeys.every((key) => user.passedLessonKeys.includes(key));
};

export const getCourseUnlockStatus = (courseId: string, courses: Course[], user: User | null) => {
  const course = courses.find((c) => c.id === courseId);
  const sequenceUnlocked = Boolean(course && user && (course.sequence ?? 0) <= user.studyLevelUnlocked);
  const prereqs = new Set<string>();
  (COURSE_PREREQUISITES[courseId] || []).forEach((id) => prereqs.add(id));
  (course?.prerequisites || []).forEach((id) => prereqs.add(id));
  const missing = Array.from(prereqs).filter((id) => !isCourseCompleted(id, courses, user));
  return {
    unlocked: sequenceUnlocked && missing.length === 0,
    missingPrereqs: missing,
    sequenceUnlocked,
  };
};

export const getCourseTitle = (courseId: string, courses: Course[]) => {
  return courses.find((course) => course.id === courseId)?.title || courseId;
};
