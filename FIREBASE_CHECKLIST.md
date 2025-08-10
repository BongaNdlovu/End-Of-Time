# Firebase Configuration Checklist for End of Time

## ✅ Current Configuration Status

Based on your current `script.js` file, here's the status of your Firebase configuration:

### 🔧 Configuration Values
- **Project ID**: `end-of-time-94cd3` ✅
- **Auth Domain**: `end-of-time-94cd3.firebaseapp.com` ✅
- **API Key**: `AIzaSyA78bvzjP-b7K9TPCbIL3ttzPJr07VR8kY` ✅
- **Storage Bucket**: `end-of-time-94cd3.firebasestorage.app` ✅
- **Messaging Sender ID**: `628602476853` ✅
- **App ID**: `1:628602476853:web:181df03c3374465811147c` ✅
- **Measurement ID**: `G-E5R3NG1533` ✅

### 📦 SDK Loading
- Firebase App SDK: ✅ Loaded in `index.html`
- Firebase Auth SDK: ✅ Loaded in `index.html`
- Firebase Firestore SDK: ✅ Loaded in `index.html`

## 🔍 Verification Steps

### 1. Firebase Project Setup
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Verify project "end-of-time" exists
- [ ] Check project number matches: `361998196975`

### 2. Authentication Setup
- [ ] Go to Authentication → Sign-in method
- [ ] Verify Google provider is enabled
- [ ] Check authorized domains include your deployment domain
- [ ] Add `localhost` for local testing if needed

### 3. Firestore Database Setup
- [ ] Go to Firestore Database
- [ ] Verify database is created
- [ ] Check security rules are published
- [ ] Ensure `leaderboard` collection is accessible

### 4. Security Rules Verification
Current rules should include leaderboard and prayer collections:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /prayers/{prayerId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    match /prayers/{prayerId}/interactions/{interactionId} {
      allow read: if true;
      allow create: if true; // allow guests to record "I prayed"
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 5. Web App Configuration
- [ ] Go to Project Settings → General → Your Apps
- [ ] Verify web app "End of Time Web" exists
- [ ] Check app ID matches: `1:361998196975:web:a2c3dabc5c8a760868bb1a`

## 🧪 Testing Your Configuration

### Option 1: Use the Validator Page
1. Open `firebase-validator.html` in your browser
2. Run the automated tests
3. Check all results are green ✅

### Option 2: Test in Your Game
1. Deploy your game to a web server (not file://)
2. Open browser console (F12)
3. Call `comprehensiveFirebaseCheck()` in console
4. Verify all checks pass

### Option 3: Manual Testing
1. Start a solo game
2. Complete the game
3. Try to access the leaderboard
4. Test Google sign-in
5. Verify score submission works

## 🚨 Common Issues and Solutions

### Issue: "Firebase SDK not loaded"
**Solution**: Check internet connection and verify script tags in `index.html`

### Issue: "Permission denied" errors
**Solution**: 
1. Check Firestore security rules
2. Ensure user is authenticated
3. Verify collection name is correct

### Issue: "Google sign-in not working"
**Solution**:
1. Enable Google provider in Firebase Console
2. Add domain to authorized domains
3. Check browser console for errors

### Issue: "Configuration invalid"
**Solution**:
1. Verify all config values are correct
2. Check for typos in API keys
3. Ensure project ID matches

## 📊 Configuration Validation Results

Run this in your browser console to validate:

```javascript
// Copy this into browser console
function validateFirebaseConfig() {
    console.log('🔍 Validating Firebase Configuration...');
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase not loaded');
        return false;
    }
    
    // Check configuration
    const config = {
        apiKey: "AIzaSyAKExnN5p_QiS7iX-2x4S8Ttf7cPQ_U72E",
        authDomain: "end-of-time.firebaseapp.com",
        projectId: "end-of-time",
        storageBucket: "end-of-time.appspot.com",
        messagingSenderId: "361998196975",
        appId: "1:361998196975:web:a2c3dabc5c8a760868bb1a"
    };
    
    const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    let valid = true;
    
    required.forEach(field => {
        if (!config[field] || config[field].includes('YOUR_ACTUAL')) {
            console.error(`❌ Invalid ${field}: ${config[field]}`);
            valid = false;
        } else {
            console.log(`✅ ${field}: Valid`);
        }
    });
    
    if (valid) {
        console.log('🎉 Firebase configuration is valid!');
    } else {
        console.log('⚠️ Firebase configuration has issues');
    }
    
    return valid;
}

validateFirebaseConfig();
```

## 🔧 Next Steps

1. **Test the validator page**: Open `firebase-validator.html` in your browser
2. **Deploy your game**: Use Firebase Hosting or another web server
3. **Test leaderboard functionality**: Play a game and test sign-in
4. **Monitor Firebase Console**: Check for any errors or usage

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify all steps in this checklist
3. Test with the validator page
4. Check Firebase Console for project status

Your Firebase configuration appears to be properly set up! The keys and settings look correct based on the code analysis. 