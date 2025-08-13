# Updated Firestore Security Rules - Prayer Reminders

## Required Security Rules Update

You need to add these new rules to your Firestore Security Rules for the Prayer Reminders system:

### Complete Updated Security Rules

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
    
    // Prayer Lists - Users can only access their own lists
    match /prayerLists/{listId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Prayer List Items - Users can only access items for their own lists
    match /prayerListItems/{itemId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)) &&
        get(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)).data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/prayerLists/$(request.resource.data.prayerListId)) &&
        get(/databases/$(database)/documents/prayerLists/$(request.resource.data.prayerListId)).data.userId == request.auth.uid;
    }
    
    // NEW: Prayer Reminders - Users can only access their own reminders
    match /prayerReminders/{reminderId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // NEW: Reminder Instances - Users can only access their own reminder instances
    match /reminderInstances/{instanceId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## What These New Rules Do

### Prayer Reminders Security
- **Read/Write**: Users can only access reminders where `userId` matches their authentication ID
- **Create**: Users can only create reminders with their own `userId`

### Reminder Instances Security
- **Read/Write**: Users can only access reminder instances they own
- **Create**: Users can only create reminder instances for themselves
- **Purpose**: Tracks when reminders fire and user responses

## How to Update

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "end-of-time-94cd3" project
3. Click "Firestore Database" → "Rules" tab

### Step 2: Replace Security Rules
1. Replace your entire rules file with the complete rules above
2. Click "Publish" to deploy

### Step 3: Test the Updates
1. Refresh your Prayer Network app
2. Sign in and go to Settings → Prayer Reminders tab
3. You should see the default "Morning Prayer" reminder
4. Try creating a new reminder - it should work without errors

## Verification Steps

After updating the rules, verify these features work:

1. **View Reminders**: Settings → Prayer Reminders shows your reminders
2. **Create Reminder**: "Add Reminder" button works
3. **Quick Setup**: Quick setup buttons create reminders
4. **Edit Reminder**: Click "Edit" on existing reminders
5. **Toggle Reminders**: Active/Inactive toggle works
6. **Notification Permission**: Browser asks for notification permission

## Database Collections Created

The reminder system will automatically create these new collections:

### `prayerReminders`
- Stores user reminder configurations
- Includes time, frequency, prayer list associations
- Tracks active/inactive status

### `reminderInstances` 
- Logs each time a reminder fires
- Tracks user responses (dismissed, snoozed, prayed)
- Used for analytics and debugging

## Notification Permissions

The app will automatically:
1. Request notification permission after 3 seconds for new users
2. Show browser notifications when reminders trigger
3. Display in-app reminder toasts with action buttons
4. Play notification sounds (if enabled)

Make sure your browser allows notifications from your domain for the best experience!