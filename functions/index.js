const functions = require('firebase-functions');
const admin = require('firebase-admin');
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

// Configure your email service (example with Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: functions.config().email?.pass || process.env.EMAIL_PASS || 'your-app-password', // Use App Password for Gmail
  },
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

// Listen for email queue entries
const sendEmailNotification = functions.firestore
  .document('emailQueue/{docId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data || !data.to) {
      await snap.ref.update({ status: 'failed', error: 'Missing recipient email' });
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


