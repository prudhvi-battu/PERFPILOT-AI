/**
 * SendGrid Email Sender
 * 
 * Uses SendGrid API (free tier: 100 emails/day).
 * 
 * Configuration (backend/.env):
 *   SENDGRID_API_KEY=SG.xxxxx
 *   ALERT_EMAIL_TO=stakeholder028@gmail.com
 *   ALERT_FROM_EMAIL=stakeholder028@gmail.com
 */

const CONFIG = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  emailTo: process.env.ALERT_EMAIL_TO || 'stakeholder028@gmail.com',
  fromEmail: process.env.ALERT_FROM_EMAIL || 'stakeholder028@gmail.com',
  fromName: 'AI Performance Monitor',
};

let sgMail = null;

function initSendGrid() {
  if (sgMail) return sgMail;

  if (!CONFIG.apiKey || !CONFIG.apiKey.startsWith('SG.')) {
    return null;
  }

  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(CONFIG.apiKey);
    console.log('   📧 SendGrid initialized');
    return sgMail;
  } catch (err) {
    console.log(`   ❌ SendGrid init failed: ${err.message}`);
    return null;
  }
}

/**
 * Send an alert email via SendGrid
 */
async function sendAlert(subject, htmlBody, textBody) {
  const client = initSendGrid();
  if (!client) {
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    await client.send({
      to: CONFIG.emailTo,
      from: { email: CONFIG.fromEmail, name: CONFIG.fromName },
      subject: subject.substring(0, 78),
      text: textBody,
      html: htmlBody,
    });
    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    let errMsg = error.message;
    if (error.response?.body?.errors) {
      errMsg = error.response.body.errors.map(e => e.message).join('; ');
    }
    if (error.code === 401) errMsg = 'Invalid API key.';
    if (error.code === 403) errMsg = `From address (${CONFIG.fromEmail}) not verified in SendGrid.`;
    console.error(`   ❌ SendGrid failed: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

/**
 * Send a test email
 */
async function sendTestEmail() {
  const client = initSendGrid();
  if (!client) {
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    await client.send({
      to: CONFIG.emailTo,
      from: { email: CONFIG.fromEmail, name: CONFIG.fromName },
      subject: '🔔 PerfPilot — Test Notification',
      text: 'Email delivery is working correctly.',
      html: '<h2 style="color:#16a34a;">PerfPilot - Email Working!</h2><p>You will receive alerts when performance issues are detected.</p>',
    });
    console.log(`✅ Test email sent to ${CONFIG.emailTo}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Test email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { sendAlert, sendTestEmail, initSendGrid, CONFIG };
