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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInteractionCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Admin is initialized in index.js
const db = admin.firestore();
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
        await (0, node_fetch_1.default)('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: 'no-reply@end-of-time.app', name: 'End of Time' },
                subject,
                content: [{ type: 'text/plain', value: text }]
            })
        });
    }
    catch (e) {
        console.error('SendGrid error', e);
    }
}
// Trigger: interactions on a prayer
exports.onInteractionCreate = functions.firestore
    .document('prayers/{prayerId}/interactions/{interactionId}')
    .onCreate(async (snap, ctx) => {
    const interaction = snap.data();
    const { prayerId } = ctx.params;
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
    const body = interaction.type === 'comment' ? `${interaction.userDisplayName || 'Someone'} commented on your prayer.` : `${interaction.userDisplayName || 'Someone'} clicked "I prayed".`;
    if (profile && Array.isArray(profile.fcmTokens) && profile.fcmTokens.length) {
        await sendPush(profile.fcmTokens, title, body);
    }
    if (profile && profile.notifyEmail && profile.email) {
        await sendEmail(profile.email, title, body);
    }
});
