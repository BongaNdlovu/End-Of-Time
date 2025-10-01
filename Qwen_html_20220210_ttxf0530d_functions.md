Cloud Functions plan (server-side notifications)

1) Firestore triggers
- onCreate(prayers/{id}/interactions/{iid}):
  - if type == 'prayed' or 'comment', look up owner (prayer.userId), increment a daily metric (optional), and enqueue notification jobs.

2) Email notifications (SendGrid)
- Use SENDGRID_API_KEY (secret) and send templated emails to owner's email when opted-in.

3) Web push (FCM)
- If owner has `users/{uid}.fcmTokens[]`, send an FCM message using admin.messaging().

Data needed
- users/{uid}:
  - email
  - notifyEmail: boolean
  - notifyPush: boolean
  - fcmTokens: string[]

Security
- Rules already allow users to manage their own profile and read/write own notifications.

Deployment
- `firebase init functions` (TypeScript), add SendGrid and Admin SDK. Deploy with `firebase deploy --only functions`.

