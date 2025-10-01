# Firebase Authentication Troubleshooting Guide

## Error: `auth/internal-error`

This error typically occurs due to OAuth configuration issues. Follow these steps to resolve it:

### 1. Check Firebase Console Settings

#### A. Authorized Domains
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **end-of-time-94cd3**
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Make sure these domains are added:
   - `localhost` (for local development)
   - `127.0.0.1` (for local development)
   - `end-of-time-94cd3.web.app` (your Firebase hosting domain)
   - `end-of-time-94cd3.firebaseapp.com` (your Firebase hosting domain)
   - Any custom domain you're using

### 2. Check Google Cloud Console OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (usually named "Web client (auto created by Google Service)")
5. Click on it to edit
6. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost
   http://127.0.0.1
   https://end-of-time-94cd3.web.app
   https://end-of-time-94cd3.firebaseapp.com
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   http://localhost/__/auth/handler
   http://127.0.0.1/__/auth/handler
   https://end-of-time-94cd3.web.app/__/auth/handler
   https://end-of-time-94cd3.firebaseapp.com/__/auth/handler
   ```

### 3. Browser-Related Issues

#### Clear Cache and Cookies
1. Open browser settings
2. Clear browsing data
3. Select "Cookies and other site data" and "Cached images and files"
4. Clear data and restart browser

#### Enable Third-Party Cookies
The error often occurs when third-party cookies are blocked:

**Chrome:**
1. Settings → Privacy and security → Cookies and other site data
2. Select "Allow all cookies" or "Block third-party cookies in Incognito"

**Firefox:**
1. Settings → Privacy & Security
2. Under "Enhanced Tracking Protection", select "Standard" or add an exception for your site

**Safari:**
1. Preferences → Privacy
2. Uncheck "Prevent cross-site tracking"

**Edge:**
1. Settings → Cookies and site permissions → Cookies and site data
2. Turn off "Block third-party cookies"

#### Disable Privacy Extensions
Temporarily disable extensions like:
- AdBlock/uBlock Origin
- Privacy Badger
- Ghostery
- Any VPN extensions

### 4. Try Different Sign-In Methods

If `signInWithRedirect` fails, try `signInWithPopup` (or vice versa):
- The main sign-in button uses `signInWithRedirect`
- The leaderboard modal uses `signInWithPopup`

### 5. Check Your Code

Make sure you have the correct Firebase configuration in `firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA78bvzjP-b7K9TPCbIL3ttzPJr07VR8kY",
  authDomain: "end-of-time-94cd3.firebaseapp.com",
  projectId: "end-of-time-94cd3",
  storageBucket: "end-of-time-94cd3.firebasestorage.app",
  messagingSenderId: "628602476853",
  appId: "1:628602476853:web:181df03c3374465811147c",
  measurementId: "G-E5R3NG1533"
};
```

### 6. Debugging Steps

Open the browser console (F12) and look for:
1. **Configuration Check** - Should show your current domain and Firebase settings
2. **Error Details** - Shows the specific error code and message
3. **Troubleshooting Tips** - Provides specific guidance for the error

### 7. Common Solutions Summary

Try these in order:
1. ✅ Clear browser cache and cookies
2. ✅ Enable third-party cookies
3. ✅ Try a different browser (Chrome, Firefox, Edge)
4. ✅ Try in a regular window (not incognito/private)
5. ✅ Disable ad blockers and privacy extensions
6. ✅ Check Firebase Console → Authentication → Authorized domains
7. ✅ Check Google Cloud Console → OAuth 2.0 Client → Redirect URIs
8. ✅ Wait 5-10 minutes after making configuration changes (propagation time)

### 8. Still Not Working?

If none of the above works, it's likely a configuration issue that requires admin access to Firebase Console:

1. Verify Google Sign-In is enabled:
   - Firebase Console → Authentication → Sign-in method
   - Google provider should be "Enabled"

2. Check for any Firebase status issues:
   - Visit [Firebase Status Dashboard](https://status.firebase.google.com/)

3. Try creating a new OAuth client:
   - Google Cloud Console → APIs & Services → Credentials
   - Create a new OAuth 2.0 Client ID
   - Update Firebase with the new credentials

### Testing Locally

When testing on `localhost`:
1. Make sure you're using `http://localhost` (not `file://`)
2. Use a simple HTTP server (not just opening the HTML file)
3. Both `localhost` and the port (e.g., `localhost:5000`) should be in authorized domains

### Need More Help?

Check the console logs for detailed diagnostics. The updated code now provides:
- Current domain information
- Firebase configuration details
- Specific troubleshooting steps for your error
- User-friendly error messages

If you're the **administrator**, check the console for admin-specific debugging information marked with 🔧.

