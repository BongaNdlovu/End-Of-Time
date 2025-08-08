# Firebase Setup Guide for End of Time Leaderboard

## Overview
This guide will help you set up Firebase for the global leaderboard feature in your End of Time trivia game.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `end-of-time` (or your preferred name)
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get started**
3. Go to the **Sign-in method** tab
4. Click on **Google** provider
5. Enable it and configure:
   - **Project support email**: Your email
   - **Authorized domains**: Add your deployment domain (e.g., `your-app.web.app` for Firebase Hosting)
6. Click **Save**

## Step 3: Create Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules later)
4. Select a location close to your users
5. Click **Done**

## Step 4: Get Your Firebase Configuration

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Add app** → **Web** (</>)
4. Register your app with a nickname (e.g., "End of Time Web")
5. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

## Step 5: Update Your Code

1. Open `script.js` in your project
2. Find the Firebase configuration section (around line 2375)
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

## Step 6: Set Up Firestore Security Rules

1. In your Firebase project, go to **Firestore Database**
2. Click on the **Rules** tab
3. Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard collection rules
    match /leaderboard/{userId} {
      // Anyone can read leaderboard entries
      allow read: if true;
      
      // Users can only write to their own document
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

## Step 7: Test the Leaderboard

1. Open your game in a web browser
2. Play a solo game
3. When the game ends, you should see the leaderboard modal
4. Click "Sign in with Google"
5. Complete the sign-in process
6. Your score should be submitted and the leaderboard should display

## Troubleshooting

### "Unable to load leaderboard" Error
- Check that your Firebase configuration is correct
- Ensure Firestore Database is created and in test mode
- Check browser console for specific error messages

### Google Sign-in Not Working
- Verify Google authentication is enabled in Firebase Console
- Check that your domain is authorized in Authentication settings
- Ensure you're testing on a proper domain (not just `file://`)

### Permission Denied Errors
- Make sure Firestore Security Rules are published
- Check that the rules allow the operations you're trying to perform

## Deployment Considerations

### Firebase Hosting (Recommended)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

### GitHub Pages or Vercel
- The leaderboard will work on any hosting platform
- Make sure to add your domain to Firebase Authentication authorized domains
- Update the authorized domains in Firebase Console → Authentication → Settings → Authorized domains

## Security Notes

- The current security rules allow anyone to read leaderboard data (which is fine for a public leaderboard)
- Users can only write to their own leaderboard entry
- Consider adding rate limiting for production use
- Monitor your Firebase usage to stay within free tier limits

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all Firebase services are properly configured
3. Ensure your domain is authorized in Firebase Authentication
4. Test with a simple Firebase app first to verify your configuration 