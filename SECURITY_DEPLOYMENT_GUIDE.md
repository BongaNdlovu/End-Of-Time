# Security Deployment Guide

## 🚀 Quick Start - Complete Security Setup

This guide walks you through deploying all security features for the End of Time trivia game.

**Estimated Time**: 30-45 minutes

---

## ✅ Prerequisites

Before starting, ensure you have:

- [ ] Firebase project created
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase authenticated (`firebase login`)
- [ ] Node.js installed (v14 or higher)

---

## 📋 Step-by-Step Deployment

### **Step 1: Set Up reCAPTCHA v3** (10 minutes)

App Check uses reCAPTCHA v3 to verify requests come from your legitimate app.

1. **Register your site**:
   - Go to https://www.google.com/recaptcha/admin
   - Click "Create" or "+"
   - Fill in:
     - **Label**: End of Time Trivia
     - **reCAPTCHA type**: reCAPTCHA v3
     - **Domains**: Add your domains:
       - `localhost` (for testing)
       - `127.0.0.1` (for testing)
       - `your-domain.com` (production)
       - `your-app.web.app` (Firebase hosting)
   - Accept terms and submit

2. **Copy the Site Key**:
   - After creation, copy the **Site Key** (starts with `6L...`)
   - ⚠️ **DO NOT** use the Secret Key (that's for server-side only)

3. **Add to your app**:
   - Open `app-check-init.js`
   - Replace this line:
     ```javascript
     const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // TEST KEY
     ```
   - With your actual key:
     ```javascript
     const RECAPTCHA_SITE_KEY = 'YOUR_ACTUAL_SITE_KEY_HERE';
     ```

---

### **Step 2: Enable App Check in Firebase** (5 minutes)

1. **Open Firebase Console**:
   - Go to https://console.firebase.google.com
   - Select your project: `end-of-time-94cd3`

2. **Navigate to App Check**:
   - Click "Build" in left sidebar
   - Click "App Check"

3. **Register your web app**:
   - Click "Add app" → Select your web app
   - Choose "reCAPTCHA v3"
   - Enter the same Site Key from Step 1
   - Click "Save"

4. **Enable enforcement** (⚠️ Important):
   - Under "APIs", find:
     - **Firestore**: Click "Enforce" → Confirm
     - **Authentication**: Click "Enforce" → Confirm
   - This blocks requests without valid App Check tokens

5. **Optional - Debug tokens** (for local development):
   - In App Check settings, click "Apps" → Your app → "Debug tokens"
   - Click "Add debug token"
   - Copy the token and add to your browser's console:
     ```javascript
     self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'your-debug-token';
     ```
   - Refresh the page

---

### **Step 3: Deploy Firestore Security Rules** (5 minutes)

1. **Review the rules**:
   - Open `firestore-rules.txt`
   - Read through the validation logic
   - Adjust max score limit if needed (currently 50,000)

2. **Test rules locally** (optional but recommended):
   ```bash
   firebase emulators:start --only firestore
   ```

3. **Deploy to Firebase**:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Verify deployment**:
   - Check Firebase Console → Firestore → Rules
   - Look for the updated timestamp
   - Test by trying to submit an invalid score (should fail)

---

### **Step 4: Deploy Cloud Functions** (10 minutes)

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Build the functions**:
   ```bash
   npm run build
   ```

3. **Deploy to Firebase**:
   ```bash
   firebase deploy --only functions
   ```

   This will deploy:
   - `submitScore` - Secure score submission with validation
   - `onInteractionCreate` - Prayer notification system (existing)

4. **Verify deployment**:
   - Check Firebase Console → Functions
   - Look for `submitScore` function
   - Click on it to see logs and usage

5. **Test the function**:
   - After deploying, try submitting a score from your app
   - Check the function logs in Firebase Console

---

### **Step 5: Update Client Code to Use Cloud Function** (5 minutes)

Currently, your app writes directly to Firestore. We need to use the Cloud Function instead.

1. **Find the score submission code**:
   - Open `script.js`
   - Search for: `db.collection('leaderboard')`
   - Find the code that submits scores (around line 4900-4930)

2. **Replace direct Firestore write with Cloud Function call**:

   **OLD CODE** (find this):
   ```javascript
   await db.collection('leaderboard').doc(userId).set({
     score: playerScore,
     level: currentGameLevel,
     name: displayName,
     correctAnswers: correctAnswers,
     questionCount: gameQuestionCount,
     date: firebase.firestore.FieldValue.serverTimestamp()
   });
   ```

   **NEW CODE** (replace with this):
   ```javascript
   // Call secure Cloud Function instead of direct Firestore write
   const submitScoreFunction = firebase.functions().httpsCallable('submitScore');

   const result = await submitScoreFunction({
     score: playerScore,
     level: currentGameLevel,
     displayName: displayName,
     correctAnswers: correctAnswers,
     questionCount: gameQuestionCount,
     timeElapsed: gameElapsedTime,
     wagerTotal: 0, // Calculate from your wager system
     powerUpsUsed: powerUpsUsed
   });

   console.log('✅ Score submitted:', result.data.message);
   ```

3. **Add error handling**:
   ```javascript
   try {
     const submitScoreFunction = firebase.functions().httpsCallable('submitScore');
     const result = await submitScoreFunction({
       score: playerScore,
       level: currentGameLevel,
       displayName: displayName,
       correctAnswers: correctAnswers,
       questionCount: gameQuestionCount,
       timeElapsed: gameElapsedTime,
       wagerTotal: 0,
       powerUpsUsed: powerUpsUsed
     });

     console.log('✅', result.data.message);
     alert('Score submitted successfully! 🎉');

   } catch (error) {
     console.error('❌ Score submission failed:', error);

     if (error.code === 'resource-exhausted') {
       alert('⏱️ Please wait before submitting another score.');
     } else if (error.code === 'invalid-argument') {
       alert('❌ Invalid score detected. Please play fairly!');
     } else {
       alert('❌ Failed to submit score. Please try again.');
     }
   }
   ```

---

### **Step 6: Deploy Security Headers** (3 minutes)

The CSP headers are already configured in `firebase.json`.

1. **Deploy hosting**:
   ```bash
   firebase deploy --only hosting
   ```

2. **Verify headers** (after deployment):
   - Open your app in browser
   - Open Developer Tools (F12)
   - Go to Network tab
   - Refresh page
   - Click on the main document
   - Look for these headers in the Response Headers:
     - `content-security-policy`
     - `x-frame-options`
     - `x-content-type-options`

---

### **Step 7: Testing** (10 minutes)

Test each security layer:

#### **1. Test App Check**:
```javascript
// Run in browser console
AppCheckDebug.isActive()
// Should return: true

await AppCheckDebug.getToken()
// Should return: a token string (or null if not working)
```

#### **2. Test Firestore Rules**:
```javascript
// Try to submit an invalid score (should FAIL)
await firebase.firestore().collection('leaderboard').doc('test').set({
  score: 999999 // Too high!
});
// Expected error: "PERMISSION_DENIED"
```

#### **3. Test Cloud Function**:
```javascript
// Try to submit via Cloud Function with invalid data
const submitScore = firebase.functions().httpsCallable('submitScore');
await submitScore({ score: -1, level: 1 });
// Expected error: "Score is out of valid range"
```

#### **4. Test Rate Limiting**:
- Submit a score
- Immediately try to submit again
- Should get: "Please wait X seconds before submitting another score"

#### **5. Test CSP Headers**:
```javascript
// Try to run inline script (should be blocked by CSP)
eval('alert("This should be blocked")');
// Expected: CSP error in console
```

---

## 🔍 Troubleshooting

### **App Check Issues**

**Problem**: "App Check token validation failed"

**Solutions**:
- Verify reCAPTCHA Site Key is correct in `app-check-init.js`
- Check domain is whitelisted in reCAPTCHA admin
- Enable enforcement in Firebase Console
- Use debug token for localhost testing

---

### **Cloud Function Issues**

**Problem**: "Function not found"

**Solutions**:
- Verify deployment: `firebase deploy --only functions`
- Check function name matches: `submitScore`
- Wait a few minutes after deployment
- Check Firebase Console → Functions for errors

---

**Problem**: "Internal error"

**Solutions**:
- Check Firebase Console → Functions → Logs
- Verify billing is enabled (required for Cloud Functions)
- Ensure Node.js version compatibility

---

### **Firestore Rules Issues**

**Problem**: "PERMISSION_DENIED"

**Solutions**:
- Check you're authenticated: `firebase.auth().currentUser`
- Verify userId matches: `auth.uid === userId`
- Check data format matches rules
- Use Firebase Emulator to test rules locally

---

### **CSP Issues**

**Problem**: "Blocked by Content Security Policy"

**Solutions**:
- Check the blocked resource URL in console error
- Add the domain to appropriate CSP directive in `firebase.json`
- Redeploy hosting: `firebase deploy --only hosting`

---

## 📊 Monitoring

After deployment, monitor these metrics:

### **Firebase Console → App Check**
- Request volume
- Token validity rate
- Blocked requests

### **Firebase Console → Functions**
- Invocation count for `submitScore`
- Error rate
- Execution time

### **Firebase Console → Firestore**
- Leaderboard entry patterns
- Suspicious scores (manual review)

### **Browser Console**
- App Check initialization: `✅ Firebase App Check activated successfully`
- No CSP errors (unless expected)

---

## 🎯 Success Criteria

After completing all steps, verify:

- [x] App Check token shown in browser console
- [x] Firestore rules reject invalid data
- [x] Cloud Function validates scores
- [x] Rate limiting prevents spam
- [x] CSP headers present in network response
- [x] No console errors (except expected CSP blocks)

---

## 📝 Post-Deployment Checklist

- [ ] Update `RECAPTCHA_SITE_KEY` in `app-check-init.js`
- [ ] Enable App Check enforcement in Firebase Console
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Update client code to use Cloud Function for scores
- [ ] Deploy hosting: `firebase deploy --only hosting`
- [ ] Test all security features
- [ ] Monitor for 24 hours for issues
- [ ] Document any custom changes in `SECURITY.md`

---

## 🆘 Need Help?

- **Firebase Documentation**: https://firebase.google.com/docs
- **Community Support**: https://stackoverflow.com/questions/tagged/firebase
- **Firebase Support**: https://firebase.google.com/support

---

## ✅ Deployment Complete!

Your End of Time trivia game now has enterprise-grade security:

- ✅ **App Check** blocks unauthorized API access
- ✅ **Firestore Rules** validate all data
- ✅ **Cloud Functions** prevent score manipulation
- ✅ **CSP Headers** prevent XSS attacks
- ✅ **Rate Limiting** prevents abuse

**Next Steps**:
- Monitor usage for the first week
- Review Cloud Function logs for anomalies
- Consider adding more anti-cheat measures if needed
- Update security measures based on observed patterns

**Congratulations!** 🎉
