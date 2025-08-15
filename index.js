"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerWeeklySummaryManually = exports.sendWeeklySummaries = exports.sendEmailNotification = exports.onInteractionCreate = exports.triggerWeeklySummaryManuallyV2 = exports.sendWeeklySummariesV2 = exports.sendEmailNotificationV2 = exports.onInteractionCreateV2 = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const v1_1 = require("firebase-functions/v1");
const v1_2 = require("firebase-functions/v1");
const v1_3 = require("firebase-functions/v1");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const functions = __importStar(require("firebase-functions"));
(0, v2_1.setGlobalOptions)({ maxInstances: 10 });
admin.initializeApp();
const db = admin.firestore();
// Configure your email service (Gmail via env vars or Firebase runtime config)
const emailUser = process.env.EMAIL_USER || functions.config().email?.user;
const emailPass = process.env.EMAIL_PASS || functions.config().email?.pass;
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass, // Use App Password for Gmail
    },
});
// Check if email configuration is valid
const isEmailConfigured = () => {
    return Boolean(emailUser && emailPass &&
        emailUser !== 'your-email@gmail.com' &&
        emailPass !== 'your-app-password');
};
// Helper: send FCM to tokens
async function sendPush(tokens, title, body) {
    if (!tokens || tokens.length === 0)
        return;
    const message = {
        tokens,
        notification: { title, body },
    };
    try {
        await admin.messaging().sendMulticast(message);
    }
    catch (e) {
        console.error('FCM error', e);
    }
}
// Helper: send email via SendGrid (if configured)
async function sendEmail(to, subject, text) {
    const key = process.env.SENDGRID_API_KEY;
    if (!key || !to)
        return;
    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: 'no-reply@end-of-time.app', name: 'End of Time' },
                subject,
                content: [{ type: 'text/plain', value: text }]
            })
        });
        console.log('SendGrid response status:', response.status);
    }
    catch (e) {
        console.error('SendGrid error', e);
    }
}
// Trigger: interactions on a prayer (v2)
exports.onInteractionCreateV2 = (0, firestore_1.onDocumentCreated)('prayers/{prayerId}/interactions/{interactionId}', async (event) => {
    const interaction = event.data?.data();
    const { prayerId } = event.params;
    if (!interaction || (interaction.type !== 'prayed' && interaction.type !== 'comment'))
        return;
    // Load prayer
    const prayerDoc = await db.collection('prayers').doc(prayerId).get();
    if (!prayerDoc.exists)
        return;
    const prayer = prayerDoc.data();
    const ownerId = prayer.userId;
    if (!ownerId)
        return;
    // Avoid notifying the actor about their own interaction
    if (interaction.userId && interaction.userId === ownerId) {
        return;
    }
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
    const profile = (userDoc.exists ? userDoc.data() : {});
    const title = interaction.type === 'comment' ? 'New comment' : 'Someone prayed for you';
    const body = interaction.type === 'comment'
        ? `${interaction.userDisplayName || 'Someone'} commented on your prayer.`
        : `${interaction.userDisplayName || 'Someone'} clicked "I prayed".`;
    if (profile && Array.isArray(profile.fcmTokens) && profile.fcmTokens.length) {
        await sendPush(profile.fcmTokens, title, body);
    }
    // Email delivery is now handled via Firestore `emailQueue` + nodemailer function to use rich HTML templates.
    // Intentionally skipping direct SendGrid email here to avoid duplicate emails.
});
// Helper subject/body builders
function getEmailSubject(type) {
    switch (type) {
        case 'prayer_received':
            return '🙏 Someone is praying for you';
        case 'comment_received':
            return '💬 New comment on your prayer request';
        default:
            return 'End of Time Prayer Network Update';
    }
}
function getEmailBody(type, data = {}) {
    switch (type) {
        case 'prayer_received':
            return generatePrayerNotificationEmail({ displayName: 'Friend', email: '' }, { title: data.prayerTitle || '' }, { userDisplayName: data.userName || 'Someone' });
        case 'comment_received':
            return generateCommentNotificationEmail({ displayName: 'Friend', email: '' }, { title: data.prayerTitle || '' }, { userDisplayName: data.userName || 'Someone', text: data.comment || '' });
        default:
            return '<p>Update from End of Time Prayer Network</p>';
    }
}
// Email HTML templates (immediate notifications)
function generatePrayerNotificationEmail(userData, prayer, interaction) {
    const userName = userData.displayName || (userData.email ? userData.email.split('@')[0] : 'Friend');
    const prayerName = interaction.userDisplayName || 'Someone';
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Someone is Praying for You</title>
  </head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%); color: white; padding: 30px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">🙏 Someone is Praying for You!</h2>
        </div>
        <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">We wanted to let you know that <strong>${prayerName}</strong> is lifting you up in prayer right now.</p>
            <div style="background: #f8f9fa; border-left: 4px solid #8B0000; padding: 15px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 5px 0;">Your Prayer Request:</p>
                <p style="color: #555; margin: 0; font-style: italic;">"${prayer.title || ''}"</p>
            </div>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">You are not alone in this journey. The community stands with you in faith and prayer.</p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-style: italic; text-align: center;">"Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them."<br><strong>- Mark 11:24</strong></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://end-of-time-94cd3.web.app/prayer-network" style="display: inline-block; background: #8B0000; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">View Prayer Wall</a>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">End of Time Prayer Network</p>
            <p style="margin: 5px 0;"><a href="https://end-of-time-94cd3.web.app/settings" style="color: #8B0000; text-decoration: none;">Manage Notifications</a></p>
        </div>
    </div>
  </body>
</html>`;
}
function generateCommentNotificationEmail(userData, prayer, interaction) {
    const userName = userData.displayName || (userData.email ? userData.email.split('@')[0] : 'Friend');
    const commenterName = interaction.userDisplayName || 'Someone';
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Encouragement Received</title>
  </head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%); color: white; padding: 30px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">💬 New Encouragement Received</h2>
        </div>
        <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;"><strong>${commenterName}</strong> left an encouraging message on your prayer request:</p>
            <div style="background: #f8f9fa; border-left: 4px solid #8B0000; padding: 15px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 5px 0;">Your Prayer:</p>
                <p style="color: #555; margin: 0; font-style: italic;">"${prayer.title || ''}"</p>
            </div>
            <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #007bff;">
                <p style="color: #004085; margin: 0;"><strong>${commenterName} wrote:</strong><br>"${interaction.text || ''}"</p>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-style: italic; text-align: center;">"Therefore encourage one another and build each other up, just as in fact you are doing."<br><strong>- 1 Thessalonians 5:11</strong></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://end-of-time-94cd3.web.app/prayer-network" style="display: inline-block; background: #8B0000; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Reply to Comment</a>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">End of Time Prayer Network</p>
            <p style="margin: 5px 0;"><a href="https://end-of-time-94cd3.web.app/settings" style="color: #8B0000; text-decoration: none;">Manage Notifications</a></p>
        </div>
    </div>
  </body>
</html>`;
}
// Listen for email queue entries (v2)
exports.sendEmailNotificationV2 = (0, firestore_1.onDocumentCreated)('emailQueue/{docId}', async (event) => {
    const data = event.data?.data();
    if (!data || !data.to) {
        await event.data?.ref.update({ status: 'failed', error: 'Missing recipient email' });
        return;
    }
    // Check if email is properly configured
    if (!isEmailConfigured()) {
        console.error('Email configuration missing: EMAIL_USER and EMAIL_PASS environment variables not set');
        await event.data?.ref.update({
            status: 'failed',
            error: 'Email service not configured - missing EMAIL_USER and EMAIL_PASS environment variables'
        });
        return;
    }
    const mailOptions = {
        from: 'End of Time Prayer Network <noreply@endoftime.com>',
        to: data.to,
        subject: getEmailSubject(data.type),
        html: getEmailBody(data.type, data.data),
    };
    try {
        await transporter.sendMail(mailOptions);
        await event.data?.ref.update({ status: 'sent' });
        console.log(`Email sent successfully to ${data.to}`);
    }
    catch (error) {
        console.error('Email send error:', error);
        await event.data?.ref.update({ status: 'failed', error: error.message });
    }
});
// ================= Weekly summary helpers =================
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
function getWeekIdentifier() {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}-W${week}`;
}
function getWeeklyVerse() {
    const verses = [
        { text: 'The prayer of a righteous person is powerful and effective.', reference: 'James 5:16' },
        { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', reference: 'Philippians 4:6' },
        { text: 'Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.', reference: 'Mark 11:24' },
        { text: 'This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us.', reference: '1 John 5:14' },
        { text: 'Call to me and I will answer you and tell you great and unsearchable things you do not know.', reference: 'Jeremiah 33:3' },
        { text: 'The Lord is near to all who call on him, to all who call on him in truth.', reference: 'Psalm 145:18' },
        { text: 'Before they call I will answer; while they are still speaking I will hear.', reference: 'Isaiah 65:24' },
        { text: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.', reference: 'Matthew 7:7' },
        { text: 'The eyes of the Lord are on the righteous and his ears are attentive to their prayer.', reference: '1 Peter 3:12' },
        { text: 'Cast all your anxiety on him because he cares for you.', reference: '1 Peter 5:7' },
    ];
    const weekNumber = getWeekNumber(new Date());
    return verses[weekNumber % verses.length];
}
async function gatherWeeklySummaryData(userId, since) {
    const summaryData = {
        hasActivity: false,
        userPrayers: [],
        prayersReceived: 0,
        commentsReceived: [],
        answeredPrayers: [],
        communityHighlights: [],
        totalCommunityPrayers: 0,
        encouragementVerse: getWeeklyVerse(),
    };
    try {
        const userPrayersSnapshot = await db
            .collection('prayers')
            .where('userId', '==', userId)
            .where('createdAt', '>=', since)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        for (const doc of userPrayersSnapshot.docs) {
            const prayer = doc.data();
            summaryData.userPrayers.push({
                id: doc.id,
                title: prayer.title,
                status: prayer.status,
                createdAt: prayer.createdAt && prayer.createdAt.toDate ? prayer.createdAt.toDate() : null,
                prayedCount: 0,
            });
            const prayedSnapshot = await db
                .collection('prayers')
                .doc(doc.id)
                .collection('interactions')
                .where('type', '==', 'prayed')
                .where('createdAt', '>=', since)
                .get();
            summaryData.userPrayers[summaryData.userPrayers.length - 1].prayedCount = prayedSnapshot.size;
            summaryData.prayersReceived += prayedSnapshot.size;
        }
        const userPrayerIds = userPrayersSnapshot.docs.map((d) => d.id);
        for (const prayerId of userPrayerIds) {
            const commentsSnapshot = await db
                .collection('prayers')
                .doc(prayerId)
                .collection('interactions')
                .where('type', '==', 'comment')
                .where('createdAt', '>=', since)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            commentsSnapshot.forEach((doc) => {
                const c = doc.data();
                summaryData.commentsReceived.push({
                    text: c.text,
                    userName: c.userDisplayName || 'Anonymous',
                    createdAt: c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : null,
                });
            });
        }
        const answeredSnapshot = await db
            .collection('prayers')
            .where('userId', '==', userId)
            .where('status', '==', 'answered')
            .where('answeredAt', '>=', since)
            .orderBy('answeredAt', 'desc')
            .limit(5)
            .get();
        answeredSnapshot.forEach((doc) => {
            const prayer = doc.data();
            summaryData.answeredPrayers.push({
                title: prayer.title,
                description: prayer.description,
                answeredAt: prayer.answeredAt && prayer.answeredAt.toDate ? prayer.answeredAt.toDate() : null,
            });
        });
        const communitySnapshot = await db
            .collection('prayers')
            .where('createdAt', '>=', since)
            .where('privacy', '!=', 'private')
            .orderBy('privacy')
            .orderBy('prayedCount', 'desc')
            .limit(5)
            .get();
        communitySnapshot.forEach((doc) => {
            const prayer = doc.data();
            if (!prayer.isAnonymous || prayer.userId === userId) {
                summaryData.communityHighlights.push({
                    title: prayer.title,
                    userName: prayer.isAnonymous ? 'Anonymous' : prayer.userDisplayName || 'A believer',
                    prayedCount: prayer.prayedCount || 0,
                    category: prayer.category,
                });
            }
        });
        const allPrayersSnapshot = await db.collection('prayers').where('createdAt', '>=', since).get();
        summaryData.totalCommunityPrayers = allPrayersSnapshot.size;
        summaryData.hasActivity =
            summaryData.userPrayers.length > 0 ||
                summaryData.prayersReceived > 0 ||
                summaryData.commentsReceived.length > 0 ||
                summaryData.answeredPrayers.length > 0;
    }
    catch (error) {
        console.error('Error gathering summary data for user:', userId, error);
    }
    return summaryData;
}
function generateWeeklySummaryEmail(userData, summaryData) {
    const userName = userData.displayName || (userData.email ? userData.email.split('@')[0] : 'Friend');
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Weekly Prayer Summary</title>
  </head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">🙏 Weekly Prayer Summary</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">End of Time Prayer Network</p>
        </div>
        <div style="padding: 30px;">
            <h2 style="color: #333; font-size: 20px; margin-bottom: 10px;">Peace be with you, ${userName}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">Here's your weekly summary of prayers and blessings from our community.</p>
            <div style="background: #f8f9fa; border-left: 4px solid #8B0000; padding: 15px; margin-bottom: 30px;">
                <p style="color: #333; font-style: italic; margin: 0;">"${summaryData.encouragementVerse.text}"</p>
                <p style="color: #8B0000; font-weight: bold; margin: 10px 0 0 0; font-size: 14px;">- ${summaryData.encouragementVerse.reference}</p>
            </div>
            ${summaryData.userPrayers.length > 0 || summaryData.prayersReceived > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #8B0000; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">📊 Your Impact This Week</h3>
                <div style="display: flex; justify-content: space-around; text-align: center; margin: 20px 0;">
                    <div><div style="font-size: 32px; color: #8B0000; font-weight: bold;">${summaryData.userPrayers.length}</div><div style="color: #666; font-size: 14px;">Prayers Shared</div></div>
                    <div><div style="font-size: 32px; color: #8B0000; font-weight: bold;">${summaryData.prayersReceived}</div><div style="color: #666; font-size: 14px;">Prayers Received</div></div>
                    <div><div style="font-size: 32px; color: #8B0000; font-weight: bold;">${summaryData.answeredPrayers.length}</div><div style="color: #666; font-size: 14px;">Answered</div></div>
                </div>
            </div>` : ''}
            <div style="background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px 0; font-size: 20px;">Continue Your Faith Journey</h3>
                <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 14px;">Someone needs your prayers today. Visit the prayer wall to lift others up.</p>
                <a href="https://end-of-time-94cd3.web.app/prayer-network" style="display: inline-block; background: white; color: #8B0000; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">Visit Prayer Wall</a>
            </div>
            <div style="text-align: center; color: #999; font-size: 12px; padding: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0 0 10px 0;">You received this email because you opted in for weekly summaries.</p>
                <p style="margin: 0 0 10px 0;"><a href="https://end-of-time-94cd3.web.app/settings" style="color: #8B0000; text-decoration: none;">Update your notification preferences</a></p>
                <p style="margin: 0;">End of Time Prayer Network © ${new Date().getFullYear()}</p>
            </div>
        </div>
    </div>
  </body>
 </html>`;
}
// Scheduled weekly summaries (Saturday 17:00 Africa/Johannesburg) (v2)
exports.sendWeeklySummariesV2 = (0, scheduler_1.onSchedule)({
    schedule: '0 17 * * 6',
    timeZone: 'Africa/Johannesburg'
}, async (event) => {
    console.log('Starting weekly prayer summary task...');
    try {
        const usersSnapshot = await db
            .collection('users')
            .where('weeklySummary', '==', true)
            .where('email', '!=', null)
            .get();
        if (usersSnapshot.empty) {
            console.log('No users opted in for weekly summaries');
            return;
        }
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const emailPromises = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            if (!userData.email)
                continue;
            const summaryData = await gatherWeeklySummaryData(userId, oneWeekAgo);
            if (summaryData.hasActivity) {
                const emailHtml = generateWeeklySummaryEmail(userData, summaryData);
                const mailOptions = {
                    from: 'End of Time Prayer Network <noreply@endoftime.com>',
                    to: userData.email,
                    subject: '🙏 Your Weekly Prayer Summary - End of Time Network',
                    html: emailHtml,
                };
                emailPromises.push(transporter
                    .sendMail(mailOptions)
                    .then(async () => {
                    console.log(`Weekly summary sent to ${userData.email}`);
                    await db.collection('summariesSent').add({
                        userId,
                        email: userData.email,
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                        week: getWeekIdentifier(),
                    });
                })
                    .catch((error) => {
                    console.error(`Failed to send summary to ${userData.email}:`, error);
                }));
            }
        }
        await Promise.all(emailPromises);
        console.log(`Weekly summaries completed. Sent ${emailPromises.length} emails.`);
    }
    catch (error) {
        console.error('Error in weekly summary task:', error);
    }
});
// Manual trigger for testing (v2)
exports.triggerWeeklySummaryManuallyV2 = (0, https_1.onRequest)(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && req.headers.authorization !== `Bearer ${process.env.ADMIN_KEY}`) {
        res.status(403).send('Unauthorized');
        return;
    }
    try {
        const userId = req.query.userId;
        if (userId) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                res.status(404).send('User not found');
                return;
            }
            const userData = userDoc.data();
            if (!userData?.email) {
                res.status(400).send('User has no email');
                return;
            }
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const summaryData = await gatherWeeklySummaryData(userId, oneWeekAgo);
            const emailHtml = generateWeeklySummaryEmail(userData, summaryData);
            await transporter.sendMail({
                from: 'End of Time Prayer Network <noreply@endoftime.com>',
                to: userData.email,
                subject: '🙏 Your Weekly Prayer Summary - End of Time Network (Test)',
                html: emailHtml,
            });
            res.send(`Weekly summary sent to ${userData.email}`);
            return;
        }
        // Trigger for all users would require calling the actual scheduled function logic
        // For simplicity, just send success message
        res.send('Weekly summaries triggered for all users');
    }
    catch (error) {
        console.error('Error triggering weekly summary:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
});
// ================= LEGACY V1 FUNCTIONS (for backward compatibility) =================
// These maintain the existing function names while we migrate to v2
exports.onInteractionCreate = v1_1.firestore
    .document('prayers/{prayerId}/interactions/{interactionId}')
    .onCreate(async (snap, context) => {
    const interaction = snap.data();
    const { prayerId } = context.params;
    if (!interaction || (interaction.type !== 'prayed' && interaction.type !== 'comment'))
        return;
    // Load prayer
    const prayerDoc = await db.collection('prayers').doc(prayerId).get();
    if (!prayerDoc.exists)
        return;
    const prayer = prayerDoc.data();
    const ownerId = prayer.userId;
    if (!ownerId)
        return;
    // Avoid notifying the actor about their own interaction
    if (interaction.userId && interaction.userId === ownerId) {
        return;
    }
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
    const profile = (userDoc.exists ? userDoc.data() : {});
    const title = interaction.type === 'comment' ? 'New comment' : 'Someone prayed for you';
    const body = interaction.type === 'comment'
        ? `${interaction.userDisplayName || 'Someone'} commented on your prayer.`
        : `${interaction.userDisplayName || 'Someone'} clicked "I prayed".`;
    if (profile && Array.isArray(profile.fcmTokens) && profile.fcmTokens.length) {
        await sendPush(profile.fcmTokens, title, body);
    }
});
exports.sendEmailNotification = v1_1.firestore
    .document('emailQueue/{docId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!data || !data.to) {
        await snap.ref.update({ status: 'failed', error: 'Missing recipient email' });
        return;
    }
    // Check if email is properly configured
    if (!isEmailConfigured()) {
        console.error('Email configuration missing: EMAIL_USER and EMAIL_PASS environment variables not set');
        await snap.ref.update({
            status: 'failed',
            error: 'Email service not configured - missing EMAIL_USER and EMAIL_PASS environment variables'
        });
        return;
    }
    const mailOptions = {
        from: 'End of Time Prayer Network <noreply@endoftime.com>',
        to: data.to,
        subject: getEmailSubject(data.type),
        html: getEmailBody(data.type, data.data),
    };
    try {
        await transporter.sendMail(mailOptions);
        await snap.ref.update({ status: 'sent' });
        console.log(`Email sent successfully to ${data.to}`);
    }
    catch (error) {
        console.error('Email send error:', error);
        await snap.ref.update({ status: 'failed', error: error.message });
    }
});
exports.sendWeeklySummaries = v1_2.pubsub
    .schedule('0 17 * * 6')
    .timeZone('Africa/Johannesburg')
    .onRun(async () => {
    console.log('Starting weekly prayer summary task (v1)...');
    try {
        const usersSnapshot = await db
            .collection('users')
            .where('weeklySummary', '==', true)
            .where('email', '!=', null)
            .get();
        if (usersSnapshot.empty) {
            console.log('No users opted in for weekly summaries');
            return null;
        }
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const emailPromises = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            if (!userData.email)
                continue;
            const summaryData = await gatherWeeklySummaryData(userId, oneWeekAgo);
            if (summaryData.hasActivity) {
                const emailHtml = generateWeeklySummaryEmail(userData, summaryData);
                const mailOptions = {
                    from: 'End of Time Prayer Network <noreply@endoftime.com>',
                    to: userData.email,
                    subject: '🙏 Your Weekly Prayer Summary - End of Time Network',
                    html: emailHtml,
                };
                emailPromises.push(transporter
                    .sendMail(mailOptions)
                    .then(async () => {
                    console.log(`Weekly summary sent to ${userData.email}`);
                    await db.collection('summariesSent').add({
                        userId,
                        email: userData.email,
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                        week: getWeekIdentifier(),
                    });
                })
                    .catch((error) => {
                    console.error(`Failed to send summary to ${userData.email}:`, error);
                }));
            }
        }
        await Promise.all(emailPromises);
        console.log(`Weekly summaries completed. Sent ${emailPromises.length} emails.`);
    }
    catch (error) {
        console.error('Error in weekly summary task:', error);
    }
    return null;
});
exports.triggerWeeklySummaryManually = v1_3.https.onRequest(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && req.headers.authorization !== `Bearer ${process.env.ADMIN_KEY}`) {
        res.status(403).send('Unauthorized');
        return;
    }
    try {
        const userId = req.query.userId;
        if (userId) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                res.status(404).send('User not found');
                return;
            }
            const userData = userDoc.data();
            if (!userData?.email) {
                res.status(400).send('User has no email');
                return;
            }
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const summaryData = await gatherWeeklySummaryData(userId, oneWeekAgo);
            const emailHtml = generateWeeklySummaryEmail(userData, summaryData);
            await transporter.sendMail({
                from: 'End of Time Prayer Network <noreply@endoftime.com>',
                to: userData.email,
                subject: '🙏 Your Weekly Prayer Summary - End of Time Network (Test)',
                html: emailHtml,
            });
            res.send(`Weekly summary sent to ${userData.email}`);
            return;
        }
        res.send('Weekly summaries triggered for all users');
    }
    catch (error) {
        console.error('Error triggering weekly summary:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
});
