# Security Quick Reference Card

## 🚀 One-Command Deployment

```bash
# Deploy everything at once
firebase deploy

# Or deploy individually:
firebase deploy --only firestore:rules    # Firestore security rules
firebase deploy --only functions          # Cloud Functions
firebase deploy --only hosting            # Static files + headers
```

---

## 🔑 Configuration Checklist

### **Before First Deployment**

1. **Get reCAPTCHA Site Key**:
   - Visit: https://www.google.com/recaptcha/admin
   - Create reCAPTCHA v3 site
   - Add domains: `localhost`, your domain, `*.web.app`
   - Copy Site Key

2. **Update `app-check-init.js`**:
   ```javascript
   const RECAPTCHA_SITE_KEY = 'YOUR_KEY_HERE'; // Line 36
   ```

3. **Enable in Firebase Console**:
   - App Check → Register app → reCAPTCHA v3
   - Enforce for: Firestore, Authentication

---

## 📊 Security Layers (Defense in Depth)

| Layer | File | Purpose | Status |
|-------|------|---------|--------|
| 1. App Check | `app-check-init.js` | Block bots | ⚠️ Needs Site Key |
| 2. Auth | Firebase built-in | Verify users | ✅ Configured |
| 3. Firestore Rules | `firestore-rules.txt` | Validate data | ✅ Enhanced |
| 4. Cloud Functions | `functions/index.ts` | Business logic | ✅ Created |
| 5. CSP Headers | `firebase.json` | Prevent XSS | ✅ Added |

---

## 🛠️ Common Tasks

### **Update Security Rules**
```bash
# Edit firestore-rules.txt, then:
firebase deploy --only firestore:rules
```

### **Update Cloud Functions**
```bash
cd functions
npm run build
firebase deploy --only functions
cd ..
```

### **Test Locally**
```bash
# Start emulators
firebase emulators:start

# In another terminal, run tests
npm test
```

### **View Logs**
```bash
# Cloud Function logs
firebase functions:log

# Or view in Firebase Console → Functions → Logs
```

---

## 🔍 Quick Testing Commands

### **Browser Console**

```javascript
// 1. Check App Check is active
AppCheckDebug.isActive()
// Expected: true

// 2. Get App Check token
await AppCheckDebug.getToken()
// Expected: token string

// 3. Check if user is authenticated
firebase.auth().currentUser
// Expected: user object or null

// 4. Test score submission (should use Cloud Function)
const submit = firebase.functions().httpsCallable('submitScore');
await submit({ score: 100, level: 1, displayName: 'Test' });
// Expected: { success: true, message: "..." }

// 5. Test invalid score (should fail)
await submit({ score: -1, level: 1 });
// Expected: Error "Score is out of valid range"

// 6. Test rate limiting (submit twice rapidly)
await submit({ score: 100, level: 1, displayName: 'Test' });
await submit({ score: 100, level: 1, displayName: 'Test' });
// Second call should fail with "Please wait"
```

---

## ⚠️ Troubleshooting

### **"App Check token validation failed"**
- Check reCAPTCHA Site Key in `app-check-init.js`
- Verify domain whitelisted in reCAPTCHA admin
- Enable enforcement in Firebase Console

### **"Function not found: submitScore"**
```bash
firebase deploy --only functions
```
Wait 2-3 minutes after deployment.

### **"PERMISSION_DENIED" in Firestore**
- Check user is authenticated: `firebase.auth().currentUser`
- Verify data matches rules in `firestore-rules.txt`
- Check userId matches: `auth.uid === userId`

### **"Blocked by CSP"**
- Add domain to CSP in `firebase.json`
- Redeploy: `firebase deploy --only hosting`

---

## 📋 Security Validation Checklist

After deployment, verify:

- [ ] App Check initialized (check browser console)
- [ ] reCAPTCHA badge visible in bottom-right
- [ ] Invalid scores rejected (test with score = -1)
- [ ] Rate limiting works (submit twice rapidly)
- [ ] Authenticated users can submit scores
- [ ] Unauthenticated users blocked from leaderboard
- [ ] CSP headers present (Network tab → Response Headers)
- [ ] No CSP errors in console (except expected blocks)

---

## 🔐 What's Protected

| Resource | Protection | Max Values |
|----------|-----------|------------|
| Scores | Validation + Cloud Function | 0-50,000 |
| Levels | Firestore rules | 1-7 |
| Names | Length validation | 1-50 chars |
| Submission Rate | Firestore + Cloud Function | 1 per 30s |
| API Calls | App Check | Unlimited (legitimate) |

---

## 📞 Important Links

| Resource | URL |
|----------|-----|
| Firebase Console | https://console.firebase.google.com |
| reCAPTCHA Admin | https://www.google.com/recaptcha/admin |
| App Check Docs | https://firebase.google.com/docs/app-check |
| Firestore Rules | https://firebase.google.com/docs/firestore/security |
| Cloud Functions | https://firebase.google.com/docs/functions |

---

## 🎯 Score Submission Flow

```
User completes game
         ↓
Client calls Cloud Function: submitScore()
         ↓
App Check validates token ✓
         ↓
Cloud Function validates:
  - Authentication ✓
  - Score range (0-50,000) ✓
  - Level range (1-7) ✓
  - Timing (min 1s/question) ✓
  - Score calculation ✓
  - Rate limit (30s) ✓
         ↓
Cloud Function writes to Firestore
         ↓
Firestore rules validate again:
  - User owns document ✓
  - Data structure correct ✓
  - Values in range ✓
  - Timestamp recent ✓
         ↓
Score saved! 🎉
```

---

## 💡 Pro Tips

1. **Development**: Use debug tokens for App Check on localhost
2. **Testing**: Test all error cases, not just happy path
3. **Monitoring**: Check Firebase Console daily for first week
4. **Updates**: Redeploy after any security rule changes
5. **Logs**: Cloud Function logs are your friend for debugging

---

## 🚨 Emergency Commands

### **Rollback Firestore Rules**
```bash
# If new rules break things:
git checkout HEAD~1 firestore-rules.txt
firebase deploy --only firestore:rules
```

### **Rollback Cloud Functions**
```bash
# In Firebase Console:
# Functions → submitScore → Actions → Rollback
```

### **Disable App Check** (if blocking legitimate users)
```bash
# In Firebase Console:
# App Check → APIs → Turn off enforcement
```

---

## 📊 Monitoring Metrics

Check these daily (first week):

- **App Check**: % of requests with valid tokens (should be ~100%)
- **Functions**: `submitScore` error rate (should be <5%)
- **Firestore**: Leaderboard entry patterns (flag outliers)
- **Logs**: Check for validation errors (investigate any spikes)

---

*Keep this card handy for quick reference during development and maintenance!*
