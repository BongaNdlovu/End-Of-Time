# Security Policy - End of Time Trivia Game

## 🔒 Overview

This document outlines the security measures implemented in the End of Time trivia game to protect user data, prevent cheating, and ensure fair gameplay.

---

## 📊 Security Architecture

### 1. **Firebase Security Layers**

Our security model implements defense-in-depth with multiple layers:

```
┌─────────────────────────────────────────┐
│  Layer 1: Firebase App Check           │  ← Verify requests from legitimate app
├─────────────────────────────────────────┤
│  Layer 2: Firebase Authentication      │  ← Verify user identity
├─────────────────────────────────────────┤
│  Layer 3: Firestore Security Rules     │  ← Server-side data validation
├─────────────────────────────────────────┤
│  Layer 4: Cloud Functions Validation   │  ← Business logic enforcement
├─────────────────────────────────────────┤
│  Layer 5: Content Security Policy      │  ← Prevent XSS/injection attacks
└─────────────────────────────────────────┘
```

---

## 🛡️ Implemented Security Measures

### **Layer 1: Firebase App Check**

**Purpose**: Prevent API abuse from bots and unauthorized clients

**Implementation**:
- Uses reCAPTCHA v3 to verify requests come from your web app
- Tokens automatically refresh before expiration
- Blocks requests without valid App Check tokens

**Files**:
- `app-check-init.js` - App Check initialization
- `index.html` - Includes App Check SDK

**Setup Required**:
1. Register reCAPTCHA v3 site key at https://www.google.com/recaptcha/admin
2. Replace `YOUR_RECAPTCHA_V3_SITE_KEY` in `app-check-init.js`
3. Enable enforcement in Firebase Console → App Check

---

### **Layer 2: Firebase Authentication**

**Purpose**: Verify user identity for leaderboard submissions

**Features**:
- Google Sign-In integration
- Anonymous gameplay (scores not saved)
- User profile management

**Protection**:
- Only authenticated users can submit scores
- User IDs verified server-side
- Session tokens validated by Firebase

---

### **Layer 3: Firestore Security Rules**

**Purpose**: Server-side data validation and access control

**Key Rules**:

#### **Leaderboard Collection**
```javascript
// Anyone can read, only authenticated users can write their own scores
allow read: if true;
allow create, update: if request.auth != null
  && request.auth.uid == userId
  // Data validation
  && request.resource.data.score >= 0
  && request.resource.data.score <= 50000
  && request.resource.data.level >= 1
  && request.resource.data.level <= 7
  // Rate limiting (30 seconds between submissions)
  && request.time > resource.data.date + duration.value(30, 's');
```

**Enforces**:
- User can only write to their own document
- Score must be within valid range (0-50,000)
- Level must be 1-7
- Name must be 1-50 characters
- Rate limiting: 1 submission per 30 seconds
- Leaderboard entries cannot be deleted

#### **Prayers & Interactions**
- User-specific read/write permissions
- Content length validation
- Timestamp verification (must be recent)
- Type validation for interaction types

**Files**:
- `firestore-rules.txt` - Complete security rules

---

### **Layer 4: Cloud Functions Validation**

**Purpose**: Server-side score validation and anti-cheat measures

**Function**: `submitScore`

**Validations**:

1. **Authentication**: Requires signed-in user
2. **Input Validation**:
   - Score range: 0-50,000
   - Level range: 1-7
   - Correct answers ≤ question count
3. **Timing Validation**:
   - Minimum 1 second per question
   - Detects impossible completion times
4. **Score Calculation Validation**:
   - Verifies score doesn't exceed theoretical maximum
   - Accounts for wagers and power-ups
5. **Rate Limiting**:
   - Maximum 1 submission per 30 seconds
6. **Metadata Logging**:
   - IP address tracking
   - User agent logging
   - Submission timestamps

**Files**:
- `functions/index.ts` - Cloud Functions implementation

**To Deploy**:
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

### **Layer 5: Content Security Policy (CSP)**

**Purpose**: Prevent XSS attacks and unauthorized code execution

**Headers Implemented**:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Strict CSP | Only allow scripts/styles from trusted sources |
| X-Content-Type-Options | nosniff | Prevent MIME-sniffing attacks |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Browser XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer information |
| Permissions-Policy | Restrictive | Block unnecessary browser features |

**Files**:
- `firebase.json` - Header configuration

---

## 🔑 API Key Security

### **Why Firebase API Keys Are Public**

Firebase API keys are **designed to be public** and are safe to commit to version control.

**Important Distinctions**:

| Traditional API Keys | Firebase API Keys |
|---------------------|-------------------|
| ❌ Secret credentials | ✅ Project identifiers |
| ❌ Grant access to resources | ✅ Only identify your project |
| ❌ Must be kept private | ✅ Safe to expose publicly |
| ❌ Hard to rotate | ✅ Easy to manage |

**Security is enforced by**:
1. **Firestore Security Rules** - Control data access
2. **Firebase App Check** - Verify legitimate clients
3. **Firebase Authentication** - Verify user identity

**What you MUST protect**:
- ⚠️ Firebase Admin SDK private keys (server-side only)
- ⚠️ Service account credentials
- ⚠️ Cloud Function environment variables with secrets

**References**:
- [Firebase API Key Documentation](https://firebase.google.com/docs/projects/api-keys)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)

---

## 🚨 Potential Attack Vectors & Mitigations

### **1. Score Manipulation**

**Attack**: User modifies score via browser console
```javascript
// Attempted attack (will fail):
db.collection('leaderboard').doc(userId).set({ score: 999999 })
```

**Mitigations**:
- ✅ Firestore rules validate score range (0-50,000)
- ✅ Cloud Function validates score calculations
- ✅ Rate limiting prevents spam submissions
- ✅ Timing validation detects impossible speeds

---

### **2. Question/Answer Exposure**

**Attack**: User inspects network traffic or source code to see answers

**Mitigations**:
- ⚠️ Questions are client-side (unavoidable for web apps)
- ✅ Timing validation prevents instant answers
- ✅ Score validation ensures realistic gameplay
- 💡 Future: Implement question obfuscation or server-side question delivery

---

### **3. API Abuse**

**Attack**: Automated bots submit thousands of requests

**Mitigations**:
- ✅ App Check blocks unauthorized clients
- ✅ Rate limiting (30s between submissions)
- ✅ reCAPTCHA v3 scoring
- ✅ Firestore quota limits

---

### **4. XSS/Injection Attacks**

**Attack**: Inject malicious scripts via user input

**Mitigations**:
- ✅ Content Security Policy headers
- ✅ Input validation in Firestore rules
- ✅ Character limits on all text fields
- ✅ Firebase Auth handles user sessions securely

---

### **5. Replay Attacks**

**Attack**: Resubmit valid requests to gain unfair advantage

**Mitigations**:
- ✅ Server timestamps prevent time manipulation
- ✅ Rate limiting prevents rapid resubmissions
- ✅ Metadata logging tracks suspicious patterns

---

## 🔍 Monitoring & Incident Response

### **What We Log**

- Score submissions (user ID, score, level, timestamp)
- Suspicious timing patterns
- Rate limit violations
- Failed validation attempts
- IP addresses and user agents (for abuse detection)

### **Where to Monitor**

1. **Firebase Console → Firestore**
   - View all leaderboard entries
   - Check for anomalies in scores

2. **Firebase Console → Functions**
   - Monitor Cloud Function logs
   - Check for validation failures

3. **Firebase Console → App Check**
   - Monitor request patterns
   - Check token validity rates

4. **Firebase Console → Authentication**
   - Track user sign-ins
   - Monitor for unusual account creation

### **Responding to Incidents**

If you suspect cheating or security issues:

1. **Investigate**: Check Cloud Function logs for the user ID
2. **Verify**: Look for patterns (impossible times, suspicious scores)
3. **Act**:
   - Remove fraudulent leaderboard entries
   - Ban user via Firebase Auth (if needed)
   - Update security rules if vulnerability found
4. **Document**: Record incident details for future prevention

---

## 📋 Security Checklist

Before deploying to production, ensure:

- [ ] **App Check configured**
  - [ ] reCAPTCHA v3 site key registered
  - [ ] Site key added to `app-check-init.js`
  - [ ] Enforcement enabled in Firebase Console

- [ ] **Firestore Rules deployed**
  - [ ] Test rules with Firebase Emulator
  - [ ] Deploy via `firebase deploy --only firestore:rules`

- [ ] **Cloud Functions deployed**
  - [ ] Build functions: `cd functions && npm run build`
  - [ ] Deploy: `firebase deploy --only functions`

- [ ] **Security Headers active**
  - [ ] Deploy hosting: `firebase deploy --only hosting`
  - [ ] Verify CSP headers in browser DevTools

- [ ] **Firebase project settings**
  - [ ] Billing enabled (required for Cloud Functions)
  - [ ] Quota alerts configured
  - [ ] Budget alerts set up

---

## 🐛 Reporting Security Issues

If you discover a security vulnerability, please:

**DO:**
- ✅ Email the development team privately
- ✅ Provide detailed reproduction steps
- ✅ Allow reasonable time for a fix before public disclosure
- ✅ Work with us to verify the fix

**DON'T:**
- ❌ Post vulnerabilities publicly on GitHub Issues
- ❌ Exploit vulnerabilities for personal gain
- ❌ Test on production systems without permission

**Contact**: [Add your security contact email here]

---

## 📚 Additional Resources

- [Firebase Security Documentation](https://firebase.google.com/docs/rules)
- [App Check Setup Guide](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
- [Cloud Functions Security](https://firebase.google.com/docs/functions/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-XX | Initial security implementation |
|  |  | - Added Firestore security rules validation |
|  |  | - Implemented Firebase App Check |
|  |  | - Created score validation Cloud Function |
|  |  | - Added CSP headers |
|  |  | - Documented security architecture |

---

## ✅ Compliance

This application implements security best practices from:
- OWASP Web Application Security
- Firebase Security Guidelines
- Google Cloud Security Best Practices

**Data Privacy**: User scores and profile data are stored securely in Firebase. We do not sell or share user data with third parties.

---

*Last Updated: January 2025*
