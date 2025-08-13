# Prayer Reminders System - Database Schema & Architecture

## Database Schema

### 1. Prayer Reminders Collection: `prayerReminders`
```javascript
{
  id: "auto-generated-id",
  userId: "user-uid",
  title: "Morning Prayer Time",
  description: "Start your day with prayer and reflection",
  
  // Scheduling
  frequency: "daily", // daily, weekly, weekdays, weekends, custom
  time: "09:00", // 24-hour format HH:MM
  daysOfWeek: [1, 2, 3, 4, 5], // 0=Sunday, 1=Monday, etc. (for weekly/custom)
  timezone: "America/New_York", // User's timezone
  
  // Targeting
  prayerListId: "list-id", // Optional: remind for specific prayer list
  reminderType: "general", // general, prayer_list, streak, follow_up
  
  // Settings
  isActive: true,
  notificationMethod: ["browser", "email"], // browser, email (future: sms)
  soundEnabled: true,
  snoozeEnabled: true,
  snoozeDuration: 10, // minutes
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastTriggered: Timestamp,
  nextScheduled: Timestamp, // calculated field for efficiency
  triggerCount: 0 // how many times this reminder has fired
}
```

### 2. Reminder Instances Collection: `reminderInstances` 
```javascript
{
  id: "auto-generated-id",
  reminderId: "reminder-id",
  userId: "user-uid",
  scheduledTime: Timestamp,
  actualTriggerTime: Timestamp,
  status: "pending", // pending, triggered, dismissed, snoozed, completed
  
  // Action tracking
  userAction: null, // dismissed, snoozed, prayed, opened_app
  actionTimestamp: null,
  snoozeUntil: null, // if snoozed
  
  // Content (denormalized for efficiency)
  title: "Morning Prayer Time",
  message: "Time for your morning prayers",
  
  createdAt: Timestamp
}
```

### 3. User Notification Preferences (extend existing users collection)
```javascript
// Add to existing users collection
{
  // ... existing user fields
  
  // Notification preferences
  notificationSettings: {
    prayerReminders: true,
    browserNotifications: true,
    emailNotifications: true,
    quietHours: {
      enabled: true,
      startTime: "22:00",
      endTime: "07:00"
    },
    maxDailyReminders: 5,
    timezone: "America/New_York"
  },
  
  // Default reminder preferences
  defaultReminderSettings: {
    soundEnabled: true,
    snoozeEnabled: true,
    snoozeDuration: 10
  }
}
```

## Reminder Types

### 1. General Prayer Reminders
- **Purpose**: Regular prayer habit formation
- **Examples**: "Morning Prayer", "Evening Reflection", "Lunch Prayer"
- **Frequency**: Daily, weekdays, weekends, custom days

### 2. Prayer List Reminders  
- **Purpose**: Remind to pray for specific prayer lists
- **Examples**: "Pray for Family", "Work Prayer Time"
- **Integration**: Links to specific prayer lists

### 3. Streak Maintenance Reminders
- **Purpose**: Keep prayer streaks alive
- **Examples**: "Keep your 7-day streak going!"
- **Smart**: Only triggers if user hasn't prayed recently

### 4. Follow-up Reminders
- **Purpose**: Check on ongoing prayer requests
- **Examples**: "How is your health prayer progressing?"
- **Smart**: Suggests marking prayers as answered

## Notification System Architecture

### Browser Notifications (Primary)
```javascript
// Service Worker for background notifications
// Push API for when app is closed
// Notification API for when app is open
```

### Email Notifications (Secondary)
```javascript
// Firestore trigger function
// Email templates for different reminder types
// User preference checking
```

### In-App Notifications (Immediate)
```javascript
// Real-time toast notifications
// Reminder badge in navigation
// Reminder dashboard
```

## Scheduling Logic

### Client-Side Scheduling
- **Immediate reminders** (next 24 hours)
- **Browser setTimeout/setInterval** for active sessions
- **Service Worker scheduling** for background

### Server-Side Scheduling (Future Enhancement)
- **Cloud Functions** with Pub/Sub scheduling
- **Handles timezone conversions** and daylight saving
- **Reliable delivery** even when app is closed

## User Experience Flow

### 1. First-Time Setup
1. User signs up → Default "Morning Prayer" reminder created
2. Onboarding suggests adding evening reminder
3. Explain notification permissions

### 2. Daily Usage
1. Browser notification appears at scheduled time
2. User can: Dismiss, Snooze 10min, or "Start Praying"
3. "Start Praying" opens app to prayer lists or submission
4. Track engagement and adjust reminders

### 3. Reminder Management
1. Settings page shows all active reminders
2. Easy toggle on/off for each reminder
3. Quick edit time and frequency
4. Smart suggestions based on usage patterns

## Premium vs Free Features

### Free Tier (Habit Formation)
- **3 active reminders maximum**
- **Basic frequencies**: Daily, weekdays, weekends
- **Browser notifications only**
- **Simple snooze** (10 minutes)

### Premium Tier (Advanced Organization)
- **Unlimited reminders**
- **Custom frequencies**: Every 2 days, monthly, etc.
- **Email notifications**
- **Advanced snooze**: 5min, 15min, 30min, 1hr
- **Smart reminders**: Based on prayer activity
- **Reminder analytics**: Best times, response rates

## Implementation Phases

### Phase 1: Basic Reminders (Week 1)
- Simple daily/weekly reminders
- Browser notifications
- Basic reminder CRUD

### Phase 2: Smart Features (Week 2)  
- Prayer list integration
- Snooze functionality
- Quiet hours

### Phase 3: Advanced (Week 3)
- Smart reminder suggestions
- Usage analytics
- Email notifications

## Success Metrics

### User Engagement
- **Daily Active Users increase**: Target 40-60%
- **Session frequency**: Users open app via reminders
- **Prayer submission rate**: Reminders → prayer actions
- **Retention**: 7-day and 30-day retention improvement

### Reminder Effectiveness
- **Response rate**: % of reminders that lead to app usage
- **Optimal timing**: Which times get best response
- **Frequency tolerance**: How many reminders before fatigue
- **Feature usage**: Which reminder types are most popular

This system creates a habit-forming notification experience that drives daily engagement while respecting user preferences and building toward premium features.