import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { auth, db } from '../firebase';
import type { Course } from '../types';

const COURSES_COLLECTION = 'academy_courses';

export const subscribeToCourses = (
  onChange: (courses: Course[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const q = query(collection(db, COURSES_COLLECTION), orderBy('sequence', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const courses = snap.docs.map((docSnap) => {
        const data = docSnap.data() as Course;
        return { ...data, id: data.id || docSnap.id };
      });
      onChange(courses);
    },
    (err) => onError?.(err as Error),
  );
};

export const saveCourse = async (course: Course): Promise<void> => {
  const ref = doc(db, COURSES_COLLECTION, course.id);
  await setDoc(ref, {
    ...course,
    createdBy: auth.currentUser?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
