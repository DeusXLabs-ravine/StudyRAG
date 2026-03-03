const { Resend } = require('resend');
const { resendApiKey } = require('../config/env');

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_DOMAIN = process.env.EMAIL_DOMAIN || 'studyrag.co';

if (!resend) {
  console.warn('[Email] RESEND_API_KEY not set — email sending disabled');
}

// ─── Core Send ──────────────────────────────────────────────

async function sendEmail({ from, to, subject, html, text, replyTo, headers }) {
  if (!resend) throw new Error('Email service not configured');

  const { data, error } = await resend.emails.send({
    from: from || `StudyRAG <noreply@${FROM_DOMAIN}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    reply_to: replyTo,
    headers,
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  console.log(`[Email] Sent to ${to}: "${subject}" (id: ${data.id})`);
  return data;
}

// ─── Reply ──────────────────────────────────────────────────

async function replyToEmail(original, replyHtml, replyText) {
  if (!resend) throw new Error('Email service not configured');

  const fromAddr = original.recipient || `support@${FROM_DOMAIN}`;
  const fromName = fromAddr.split('@')[0];
  const fromFormatted = `${fromName.charAt(0).toUpperCase() + fromName.slice(1)} at StudyRAG <${fromAddr}>`;

  const headers = {};
  if (original.message_id) {
    headers['In-Reply-To'] = original.message_id;
    headers['References'] = original.message_id;
  }

  const replySubject = original.subject?.startsWith('Re:')
    ? original.subject
    : `Re: ${original.subject || '(no subject)'}`;

  return sendEmail({
    from: fromFormatted,
    to: original.sender_email,
    subject: replySubject,
    html: replyHtml,
    text: replyText,
    headers,
  });
}

// ─── Transactional Emails ───────────────────────────────────

async function sendWelcomeEmail(to, displayName) {
  return sendEmail({
    to,
    subject: 'Welcome to StudyRAG',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">
          Welcome${displayName ? `, ${displayName}` : ''}
        </h1>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Your account is ready. Upload your study materials and let AI transform them into
          personalized learning modules, quizzes, and flashcards.
        </p>
        <a href="https://studyrag.co/documents" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
          Start Learning
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">StudyRAG</p>
      </div>
    `,
  });
}

async function sendNudgeEmail(to, displayName, daysMissed) {
  return sendEmail({
    to,
    subject: `${displayName || 'Hey'}, your study materials miss you`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">
          It's been ${daysMissed} days
        </h1>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Your study modules are waiting. Even 10 minutes of review helps retention.
        </p>
        <a href="https://studyrag.co/learn" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
          Resume Studying
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">StudyRAG</p>
      </div>
    `,
  });
}

module.exports = { sendEmail, replyToEmail, sendWelcomeEmail, sendNudgeEmail };
