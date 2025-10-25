const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// Load existing compiled TypeScript exports (e.g., onInteractionCreate)
let tsExports = {};
try {
  tsExports = require('./lib/index.js');
} catch (e) {
  console.log('TypeScript compiled functions not available, using JS-only functions:', e.message);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

// Configure email transport (Prefer dotenv/secrets env vars; fallback to legacy functions.config())
const emailCfgEnv = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,
};
const smtpCfgEnv = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
};

// Legacy config (will be removed before March 2026)
let emailCfgLegacy = {};
let smtpCfgLegacy = {};
try {
  const cfg = functions.config ? functions.config() : {};
  emailCfgLegacy = (cfg && cfg.email) || {};
  smtpCfgLegacy = (cfg && cfg.smtp) || {};
} catch (e) {
  // ignore if not available
}

function buildTransporter() {
  const useSmtpEnv = Boolean(smtpCfgEnv.host);
  const useEmailEnv = Boolean(emailCfgEnv.user && emailCfgEnv.pass);
  if (useSmtpEnv) {
    return nodemailer.createTransport({
      host: smtpCfgEnv.host,
      port: Number(smtpCfgEnv.port || 465),
      secure: String(smtpCfgEnv.secure ?? 'true') === 'true',
      auth: {
        user: emailCfgEnv.user,
        pass: emailCfgEnv.pass,
      },
    });
  }
  if (useEmailEnv) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailCfgEnv.user,
        pass: emailCfgEnv.pass,
      },
    });
  }
  if (smtpCfgLegacy.host) {
    return nodemailer.createTransport({
      host: smtpCfgLegacy.host,
      port: Number(smtpCfgLegacy.port || 465),
      secure: String(smtpCfgLegacy.secure || 'true') === 'true',
      auth: {
        user: emailCfgLegacy.user,
        pass: emailCfgLegacy.pass,
      },
    });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailCfgLegacy.user,
      pass: emailCfgLegacy.pass,
    },
  });
}

function computeFromAddress() {
  return emailCfgEnv.from
    || emailCfgLegacy.from
    || `End of Time Prayer Network <${emailCfgEnv.user || emailCfgLegacy.user || 'noreply@endoftime.com'}>`;
}

// Declare secrets and attach to functions so they load into env at runtime (1st Gen)
const SECRET_EMAIL_USER = defineSecret('EMAIL_USER');
const SECRET_EMAIL_PASS = defineSecret('EMAIL_PASS');

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
      return `
        <h2>Someone is lifting you up in prayer!</h2>
        <p>${data.message || ''}</p>
        <p>Remember: "The prayer of a righteous person is powerful and effective." - James 5:16</p>
      `;
    case 'comment_received':
      return `
        <h2>New encouragement on your prayer request</h2>
        <p><strong>${data.userName || 'Someone'}</strong> commented:</p>
        <blockquote>${data.comment || ''}</blockquote>
        <p>Prayer: "${data.prayerTitle || ''}"</p>
      `;
    default:
      return '<p>Update from End of Time Prayer Network</p>';
  }
}

// Listen for email queue entries (attach secrets so env is populated at invocation time)
const sendEmailNotification = functions
  .runWith({ secrets: [
    SECRET_EMAIL_USER,
    SECRET_EMAIL_PASS,
  ]})
  .firestore
  .document('emailQueue/{docId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data || !data.to) {
      await snap.ref.update({ status: 'failed', error: 'Missing recipient email' });
      return;
    }

    const mailOptions = {
      from: computeFromAddress(),
      to: data.to,
      subject: getEmailSubject(data.type),
      html: getEmailBody(data.type, data.data),
    };
    try {
      const transporter = buildTransporter();
      await transporter.sendMail(mailOptions);
      await snap.ref.update({ status: 'sent' });
    } catch (error) {
      console.error('Email send error:', error);
      await snap.ref.update({ status: 'failed', error: error.message });
    }
  });

// Export both TS-compiled functions (if any) and the new JS function
module.exports = {
  ...tsExports,
  sendEmailNotification,
};



// Public HTTPS function to fetch leaderboard top 100 as a fallback
// Useful when client-side Firestore reads are blocked by App Check enforcement
exports.getLeaderboardTop = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Basic CORS handling
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const snapshot = await admin
      .firestore()
      .collection('leaderboard')
      .orderBy('totalCumulativeScore', 'desc')
      .limit(100)
      .get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ items });
  } catch (e) {
    console.error('getLeaderboardTop error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});