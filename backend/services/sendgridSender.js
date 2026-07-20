/**
 * AI Performance Testing Assistant
 * SendGrid Email Sender
 * 
 * Uses SendGrid API key instead of SMTP password.
 * Free tier: 100 emails/day — no credit card needed.
 * 
 * To use:
 *   1. Sign up at https://sendgrid.com (free, no credit card)
 *   2. Create an API key with "Mail Send" permission
 *   3. Set in backend/.env:
 *        SENDGRID_API_KEY=SG.xxxxx
 *        ALERT_EMAIL_TO=suvarnamukhy666@gmail.com
 */

const CONFIG = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  emailTo: process.env.ALERT_EMAIL_TO || 'suvarnamukhy666@gmail.com',
  fromEmail: process.env.ALERT_FROM_EMAIL || 'alerts@perf-monitor.local',
  fromName: 'AI Performance Monitor',
};

let sgMail = null;
let initialized = false;

/**
 * Initialize the SendGrid client
 */
function initSendGrid() {
  if (initialized) return sgMail;
  
  if (!CONFIG.apiKey) {
    console.log('   ℹ️  SendGrid not configured. Set SENDGRID_API_KEY in .env');
    return null;
  }
  
  // Check if API key looks valid (starts with SG.)
  if (!CONFIG.apiKey.startsWith('SG.')) {
    console.log('   ⚠️  SendGrid API key should start with "SG.". Check your key.');
    return null;
  }
  
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(CONFIG.apiKey);
    initialized = true;
    console.log('   📧 SendGrid initialized (free tier: 100 emails/day)');
    return sgMail;
  } catch (err) {
    console.log(`   ❌ SendGrid init failed: ${err.message}`);
    return null;
  }
}

/**
 * Send an alert via SendGrid
 */
async function sendAlert(subject, htmlBody, textBody) {
  const client = initSendGrid();
  if (!client) {
    return { success: false, error: 'SendGrid not configured', provider: 'sendgrid' };
  }
  
  const msg = {
    to: CONFIG.emailTo,
    from: {
      email: CONFIG.fromEmail,
      name: CONFIG.fromName,
    },
    subject: subject.substring(0, 78),
    text: textBody,
    html: htmlBody,
  };
  
  // Add SMS gateway if configured
  if (process.env.ALERT_SMS_GATEWAY) {
    msg.to = [CONFIG.emailTo, process.env.ALERT_SMS_GATEWAY];
  }
  
  try {
    await client.send(msg);
    console.log(`   ✅ SendGrid: Alert sent to ${CONFIG.emailTo}`);
    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    // SendGrid error details
    let errMsg = error.message;
    if (error.response?.body?.errors) {
      errMsg = error.response.body.errors.map(e => e.message).join('; ');
    }
    if (error.code === 401) {
      errMsg = 'Invalid API key. Check your SENDGRID_API_KEY.';
    } else if (error.code === 403) {
      // 403 usually means unverified sender or insufficient permissions
      if (errMsg.includes('verified Sender Identity')) {
        errMsg = `The from address (${CONFIG.fromEmail}) is not verified in SendGrid.`;
        errMsg += ' Please verify this email at https://app.sendgrid.com/settings/sender_auth';
      } else {
        errMsg = 'Access denied. Verify API key has "Mail Send" permission.';
      }
    }
    console.error(`   ❌ SendGrid failed: ${errMsg}`);
    return { success: false, error: errMsg, provider: 'sendgrid' };
  }
}

/**
 * Test the SendGrid configuration
 */
async function sendTestEmail() {
  const client = initSendGrid();
  if (!client) {
    return { success: false, error: 'SendGrid not configured. Set SENDGRID_API_KEY in .env' };
  }
  
  const msg = {
    to: CONFIG.emailTo,
    from: { email: CONFIG.fromEmail, name: CONFIG.fromName },
    subject: '🔔 AI Performance Monitor — Test Notification',
    text: 'This is a test notification from your AI Performance Testing Assistant.\n\nIf you received this, email notifications are configured correctly via SendGrid!',
    html: `
      <div style="font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:18px;">✅ AI Performance Monitor (SendGrid)</h1>
        </div>
        <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
          <h2 style="color:#16a34a;font-size:16px;">Test Notification Successful!</h2>
          <p style="color:#475569;">SendGrid email delivery is working correctly.</p>
          <p style="color:#64748b;font-size:13px;">You will now receive real-time alerts when performance degradation is detected.</p>
          <p style="color:#94a3b8;font-size:12px;">Sent via SendGrid API (no password needed)</p>
        </div>
      </div>`,
  };
  
  try {
    await client.send(msg);
    console.log(`✅ SendGrid test email sent to ${CONFIG.emailTo}`);
    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    console.error(`❌ SendGrid test failed: ${error.message}`);
    return { success: false, error: error.message, provider: 'sendgrid' };
  }
}

module.exports = {
  sendAlert,
  sendTestEmail,
  initSendGrid,
  CONFIG,
};
