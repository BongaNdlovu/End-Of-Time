/**
 * Firebase App Check Initialization
 * ==================================
 *
 * App Check helps protect your backend resources from abuse by preventing
 * unauthorized clients from accessing your Firebase resources.
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Go to Firebase Console → App Check
 * 2. Register your app with reCAPTCHA v3:
 *    - Visit https://www.google.com/recaptcha/admin
 *    - Create a new site with reCAPTCHA v3
 *    - Add your domain (and localhost for testing)
 *    - Copy the Site Key
 * 3. Replace 'YOUR_RECAPTCHA_V3_SITE_KEY' below with your actual key
 * 4. In Firebase Console, enable enforcement for Firestore and Authentication
 *
 * TESTING:
 * --------
 * - Use debug tokens for local development
 * - Monitor App Check metrics in Firebase Console
 *
 * For more info: https://firebase.google.com/docs/app-check
 */

(function initializeAppCheck() {
  // Wait for Firebase SDK to be loaded
  if (typeof firebase === 'undefined') {
    console.log('⏳ Waiting for Firebase SDK to load...');
    // Retry after a short delay
    setTimeout(initializeAppCheck, 100);
    return;
  }

  // Wait for Firebase to be initialized
  if (!firebase.apps || firebase.apps.length === 0) {
    console.log('⏳ Waiting for Firebase to initialize...');
    // Retry after a short delay
    setTimeout(initializeAppCheck, 100);
    return;
  }

  try {
    // Configuration - Your reCAPTCHA v3 Site Key
    const RECAPTCHA_SITE_KEY = '6LeVwtErAAAAAMq0D4uZvXjMNKRtlCJiD8hFMztz';
    // ✅ CONFIGURED: Your actual reCAPTCHA v3 Site Key is now active
    // Registered domains: localhost, 127.0.0.1, end-of-time-94cd3.web.app, end-of-time-94cd3.firebaseapp.com
    // Manage at: https://www.google.com/recaptcha/admin

    // Check if App Check is available
    if (!firebase.appCheck) {
      console.warn('⚠️ Firebase App Check not available. Please include the App Check SDK.');
      return;
    }

    // Initialize App Check with reCAPTCHA v3
    const appCheck = firebase.appCheck();

    // Activate App Check
    appCheck.activate(
      RECAPTCHA_SITE_KEY,
      true // Automatically refresh tokens before they expire
    );

    console.log('✅ Firebase App Check activated successfully');
    console.log('📊 Your app is now protected against unauthorized API abuse');

    // Optional: Add debug logging for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Running in development mode');
      console.log('💡 Tip: Use App Check debug tokens for local testing');
      console.log('   Visit: https://firebase.google.com/docs/app-check/web/debug-provider');
    }

  } catch (error) {
    console.error('❌ Failed to initialize Firebase App Check:', error);
    console.error('📝 Common issues:');
    console.error('   1. Invalid reCAPTCHA Site Key');
    console.error('   2. Domain not whitelisted in reCAPTCHA settings');
    console.error('   3. App Check not enabled in Firebase Console');
    console.error('   Visit Firebase Console → App Check for troubleshooting');
  }
})();

// Export for use in debugging
window.AppCheckDebug = {
  isActive: () => {
    try {
      return firebase.appCheck && firebase.appCheck()._delegate;
    } catch (e) {
      return false;
    }
  },

  getToken: async () => {
    try {
      const appCheckTokenResponse = await firebase.appCheck().getToken();
      return appCheckTokenResponse.token;
    } catch (e) {
      console.error('Failed to get App Check token:', e);
      return null;
    }
  }
};
