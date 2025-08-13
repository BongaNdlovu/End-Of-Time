# Firestore Security Rules - Prayer Lists Update

## Current Error
`FirebaseError: Missing or insufficient permissions`

This error occurs because the Firestore security rules don't include permissions for the new `prayerLists` and `prayerListItems` collections.

## Required Security Rules

You need to add these rules to your Firestore Security Rules in the Firebase Console:

### Complete Security Rules File

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Existing prayer rules (keep these)
    match /prayers/{prayerId} {
      allow read: if true; // Anyone can read prayers (community feature)
      allow write: if request.auth != null; // Only authenticated users can write
      
      // Prayer interactions (comments, prayers)
      match /interactions/{interactionId} {
        allow read: if true; // Anyone can read interactions
        allow write: if request.auth != null; // Only authenticated users can interact
      }
    }
    
    // User profiles (keep existing if you have them)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notifications (keep existing if you have them)
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Email queue (keep existing if you have them)
    match /emailQueue/{emailId} {
      allow write: if request.auth != null; // Users can queue emails
      allow read: if false; // Only backend can read
    }
    
    // NEW: Prayer Lists - Users can only access their own lists
    match /prayerLists/{listId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // NEW: Prayer List Items - Users can only access items for their own lists
    match /prayerListItems/{itemId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)) &&
        get(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)).data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/prayerLists/$(request.resource.data.prayerListId)) &&
        get(/databases/$(database)/documents/prayerLists/$(request.resource.data.prayerListId)).data.userId == request.auth.uid;
    }
  }
}
```

## How to Update Firestore Rules

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "end-of-time-94cd3" project
3. Click on "Firestore Database" in the left sidebar

### Step 2: Update Security Rules
1. Click on the "Rules" tab at the top
2. You'll see your current security rules
3. Replace the entire rules file with the complete rules above
4. Click "Publish" to deploy the new rules

### Step 3: Test the Changes
1. Refresh your Prayer Network app
2. Sign in with a user account
3. Navigate to the "My Lists" tab
4. The error should be resolved and default prayer lists should appear

## What These Rules Do

### Prayer Lists Security
- **Read/Write**: Users can only access prayer lists where `userId` matches their authentication ID
- **Create**: Users can only create prayer lists with their own `userId`

### Prayer List Items Security
- **Read/Write**: Users can only access prayer list items if they own the parent prayer list
- **Create**: Users can only add items to prayer lists they own
- **Cross-collection validation**: Uses `exists()` and `get()` to verify list ownership

## Alternative: Simpler Rules (Less Secure)

If you encounter issues with the complex rules above, you can temporarily use these simpler rules for testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing collections
    match /prayers/{document=**} {
      allow read, write: if true;
    }
    
    match /users/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /notifications/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /emailQueue/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // NEW: Prayer Lists (simplified for testing)
    match /prayerLists/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // NEW: Prayer List Items (simplified for testing)
    match /prayerListItems/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Note**: The simpler rules are less secure and should only be used for testing. Use the complete rules above for production.

## Verification Steps

After updating the rules:

1. Check browser console - the error should disappear
2. Try creating a new prayer list
3. Try adding a prayer to a list
4. Verify that default lists appear when signing in

If you continue to have issues, please share your current Firestore security rules and I can help debug further.