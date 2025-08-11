import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();
const db = admin.firestore();

// Helper: send FCM to tokens
async function sendPush(tokens: string[], title: string, body: string) {
  if (!tokens || tokens.length === 0) return;
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
  };
  try { await admin.messaging().sendMulticast(message); } catch (e) { console.error('FCM error', e); }
}

// Helper: send email via SendGrid (if configured)
async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.SENDGRID_API_KEY || (functions.config().sendgrid && functions.config().sendgrid.key);
  if (!key || !to) return;
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'no-reply@end-of-time.app', name: 'End of Time' },
        subject,
        content: [{ type: 'text/plain', value: text }]
      })
    });
  } catch (e) { console.error('SendGrid error', e); }
}

// Trigger: interactions on a prayer
export const onInteractionCreate = functions.firestore
  .document('prayers/{prayerId}/interactions/{interactionId}')
  .onCreate(async (snap, ctx) => {
    const interaction = snap.data() as any;
    const { prayerId } = ctx.params as any;
    if (!interaction || (interaction.type !== 'prayed' && interaction.type !== 'comment')) return;

    // Load prayer
    const prayerDoc = await db.collection('prayers').doc(prayerId).get();
    if (!prayerDoc.exists) return;
    const prayer = prayerDoc.data() as any;
    const ownerId = prayer.userId;
    if (!ownerId) return;

    // Create notification
    await db.collection('notifications').add({
      userId: ownerId,
      type: interaction.type,
      prayerId,
      actorId: interaction.userId || null,
      actorName: interaction.userDisplayName || 'Someone',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    // Fan out push/email if opted in
    const userDoc = await db.collection('users').doc(ownerId).get();
    const profile = (userDoc.exists ? userDoc.data() : {}) as any;
    const title = interaction.type === 'comment' ? 'New comment' : 'Someone prayed for you';
    const body = interaction.type === 'comment' ? `${interaction.userDisplayName || 'Someone'} commented on your prayer.` : `${interaction.userDisplayName || 'Someone'} clicked "I prayed".`;

    if (profile && Array.isArray(profile.fcmTokens) && profile.fcmTokens.length) {
      await sendPush(profile.fcmTokens, title, body);
    }
    if (profile && profile.notifyEmail && profile.email) {
      await sendEmail(profile.email, title, body);
    }
  });


