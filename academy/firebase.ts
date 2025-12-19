import { initializeApp } from 'firebase/app';
// App Check temporarily disabled - configure in Firebase Console first
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyAl6zWpFj8Y2RmAiMaR8jauD1SahRTcld4',
  authDomain: 'end-of-time-94cd3.firebaseapp.com',
  projectId: 'end-of-time-94cd3',
  storageBucket: 'end-of-time-94cd3.firebasestorage.app',
  messagingSenderId: '628602476853',
  appId: '1:628602476853:web:40e3a9fb40963e8811147c',
  measurementId: 'G-6L3NKYJFR5',
};

export const firebaseApp = initializeApp(firebaseConfig);
// const appCheckSiteKey = '6Ldu1jAsAAAAAPxLGBrRZZ_ZBMjHnoNn1t5KCw7M';

// App Check disabled - re-enable after configuring in Firebase Console:
// if (typeof window !== 'undefined') {
//   initializeAppCheck(firebaseApp, {
//     provider: new ReCaptchaV3Provider(appCheckSiteKey),
//     isTokenAutoRefreshEnabled: true,
//   });
// }
export const auth = getAuth(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, 'us-central1');
