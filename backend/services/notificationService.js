/**
 * AI Performance Testing Assistant
 * Notification Service — sends email/SMS alerts for performance degradation
 * 
 * Email: Nodemailer via SMTP (Gmail, SendGrid, etc.)
 * SMS: Email-to-SMS gateway or Twilio
 * 
 * To configure, set these environment variables:
 *   ALERT_EMAIL_TO=suvarnamukhy666@gmail.com
 *   ALERT_SMTP_HOST=smtp.gmail.com
 *   ALERT_SMTP_PORT=587
 *   ALERT_SMTP_USER=your-email@gmail.com
 *   ALERT_SMTP_PASS=your-app-password
 *   ALERT_SMS_GATEWAY= (optional, e.g., 1234567890@txt.att.net)
 */

const nodemailer = require('nodemailer');
const sendgridSender = require('./sendgridSender');

const CONFIG = {
  emailTo: process.env.ALERT_EMAIL_TO || 'suvarnamukhy666@gmail.com',
  smtpHost: process.env.ALERT_SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.ALERT_SMTP_PORT) || 587,
  smtpUser: process.env.ALERT_SMTP_USER || '',
  smtpPass: process.env.ALERT_SMTP_PASS || '',
  smsGateway: process.env.ALERT_SMS_GATEWAY || '',
  fromName: 'AI Performance Monitor',
  fromEmail: process.env.ALERT_FROM_EMAIL || process.env.ALERT_SMTP_USER || 'alerts@perf-monitor.local',
};

let transporter = null;

/**
 * Initialize the email transporter
 */
function initTransporter() {
  if (transporter) return transporter;

  // If no SMTP credentials are configured, create a preview-only transporter
  if (!CONFIG.smtpUser || !CONFIG.smtpPass) {
    // Use a preview transport that logs to console
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║            📨 ALERT NOTIFICATION (Preview)              ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║  To:      ${mailOptions.to.padEnd(42)}║`);
        console.log(`║  Subject: ${(mailOptions.subject || '').padEnd(42)}║`);
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║  ${mailOptions.text?.substring(0, 56).padEnd(56)}║`);
        const lines = mailOptions.text?.split('\n') || [];
        for (const line of lines) {
          if (line.trim()) {
            console.log(`║  ${line.trim().padEnd(56)}║`);
          }
        }
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('ℹ️  To send real emails, set these env vars:');
        console.log('   ALERT_SMTP_USER=your-email@gmail.com');
        console.log('   ALERT_SMTP_PASS=your-16-char-app-password');
        console.log('   (Use Gmail App Passwords: https://myaccount.google.com/apppasswords)');
        console.log('');
        return { messageId: 'preview-' + Date.now() };
      }
    };
    return transporter;
  }

  // Real SMTP transporter
  transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    secure: CONFIG.smtpPort === 465,
    auth: {
      user: CONFIG.smtpUser,
      pass: CONFIG.smtpPass,
    },
  });

  console.log('📧 Email transporter initialized for', CONFIG.emailTo);
  return transporter;
}

/**
 * Close the transporter gracefully
 */
async function closeTransporter() {
  if (transporter && transporter.close) {
    try {
      await transporter.close();
      console.log('📧 Email transporter closed');
    } catch (e) { /* ignore close errors */ }
    transporter = null;
  }
}

/**
 * Format a performance alert into a readable email body
 */
function formatAlertBody(alert) {
  const { type, severity, metric, value, threshold, businessImpact, timestamp, details } = alert;
  
  let body = `🚨 AI PERFORMANCE ALERT\n`;
  body += `═══════════════════════════════════\n\n`;
  body += `Time: ${new Date(timestamp).toLocaleString()}\n`;
  body += `Severity: ${severity}\n`;
  body += `Type: ${type}\n\n`;
  body += `─── Alert Details ───\n`;
  body += `• Metric: ${metric}\n`;
  body += `• Current Value: ${value}\n`;
  body += `• Threshold: ${threshold}\n`;
  
  if (businessImpact) {
    body += `\n─── Business Impact ───\n`;
    if (businessImpact.revenueLost !== undefined) {
      body += `• 💰 Estimated Revenue Lost: $${businessImpact.revenueLost.toLocaleString()}\n`;
    }
    if (businessImpact.revenuePercent !== undefined) {
      body += `• 📉 Revenue Impact: ${businessImpact.revenuePercent}%\n`;
    }
    if (businessImpact.ordersLost !== undefined) {
      body += `• 📦 Orders Lost: ${businessImpact.ordersLost}\n`;
    }
    if (businessImpact.usersAffected !== undefined) {
      body += `• 👥 Users Affected: ${businessImpact.usersAffected}\n`;
    }
    if (businessImpact.estimatedLossPerMin !== undefined) {
      body += `• ⏱ Loss Rate: $${businessImpact.estimatedLossPerMin}/minute\n`;
    }
  }
  
  if (details) {
    body += `\n─── Technical Details ───\n${details}\n`;
  }
  
  body += `\n─── Recommended Actions ───\n`;
  body += (alert.recommendations || []).map(r => `• ${r}`).join('\n') || 'Investigate immediately.\n';
  
  body += `\n\n─── AI Performance Testing Assistant ───\n`;
  body += `This is an automated alert from your AI Performance Monitor.\n`;
  body += `View dashboard: http://localhost:3000/dashboard/alerts\n`;
  
  return body;
}

/**
 * Format a performance alert into HTML email
 */
function formatAlertHtml(alert) {
  const { type, severity, metric, value, threshold, businessImpact, timestamp, details } = alert;
  const severityColor = severity === 'Critical' ? '#ef4444' : severity === 'Warning' ? '#f59e0b' : '#3b82f6';
  const severityBg = severity === 'Critical' ? '#fef2f2' : severity === 'Warning' ? '#fffbeb' : '#eff6ff';
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .header .badge { display: inline-block; background: ${severityColor}; color: white; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .body { padding: 24px; }
    .metric-box { background: ${severityBg}; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .metric-box .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-box .value { font-size: 24px; font-weight: 700; color: #1e293b; margin: 4px 0; }
    .metric-box .threshold { font-size: 13px; color: #64748b; }
    .impact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .impact-card { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .impact-card .num { font-size: 22px; font-weight: 700; color: #ef4444; }
    .impact-card .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .details { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #475569; line-height: 1.5; white-space: pre-wrap; }
    .actions { background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .actions li { margin: 8px 0; font-size: 13px; color: #166534; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 AI Performance Alert</h1>
      <div class="badge">${severity.toUpperCase()}</div>
    </div>
    <div class="body">
      <p style="color:#64748b;font-size:14px;margin:0;">
        ${new Date(timestamp).toLocaleString()}
      </p>
      <h2 style="color:#1e293b;font-size:18px;margin:12px 0 4px;">${type}</h2>
      <div class="metric-box">
        <div class="label">${metric}</div>
        <div class="value">${value}</div>
        <div class="threshold">Threshold: ${threshold}</div>
      </div>`;

  if (businessImpact) {
    html += `
      <h3 style="font-size:14px;color:#1e293b;margin:16px 0 8px;">📊 Business Impact</h3>
      <div class="impact-grid">`;
    if (businessImpact.revenueLost !== undefined) {
      html += `<div class="impact-card"><div class="num">$${businessImpact.revenueLost.toLocaleString()}</div><div class="lbl">Revenue Lost</div></div>`;
    }
    if (businessImpact.revenuePercent !== undefined) {
      html += `<div class="impact-card"><div class="num" style="color:${severityColor}">${businessImpact.revenuePercent}%</div><div class="lbl">Revenue Drop</div></div>`;
    }
    if (businessImpact.ordersLost !== undefined) {
      html += `<div class="impact-card"><div class="num">${businessImpact.ordersLost}</div><div class="lbl">Orders Lost</div></div>`;
    }
    if (businessImpact.usersAffected !== undefined) {
      html += `<div class="impact-card"><div class="num">${businessImpact.usersAffected}</div><div class="lbl">Users Affected</div></div>`;
    }
    if (businessImpact.estimatedLossPerMin !== undefined) {
      html += `<div class="impact-card"><div class="num">$${businessImpact.estimatedLossPerMin}/min</div><div class="lbl">Loss Rate</div></div>`;
    }
    html += `</div>`;
  }

  if (details) {
    html += `<div class="details">${details}</div>`;
  }

  html += `
      <h3 style="font-size:14px;color:#1e293b;margin:16px 0 8px;">✅ Recommended Actions</h3>
      <div class="actions"><ul>`;
  (alert.recommendations || ['Investigate immediately.']).forEach(r => {
    html += `<li>${r}</li>`;
  });
  html += `</ul></div>
    </div>
    <div class="footer">
      AI Performance Testing Assistant — Automated Alert<br>
      <a href="http://localhost:3000/dashboard/alerts" style="color:#3b82f6;">View Dashboard</a>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Send an alert notification via email (and optionally SMS)
 * 
 * @param {Object} alert - The alert object with type, severity, metric, value, threshold, businessImpact
 * @returns {Promise<Object>} - Result of the send operation
 */
async function sendAlert(alert) {
  const subject = `[${alert.severity}] ${alert.type} — ${alert.metric}: ${alert.value}`;
  const text = formatAlertBody(alert);
  const html = formatAlertHtml(alert);

  // Try SendGrid first (API key, no password needed)
  if (process.env.SENDGRID_API_KEY) {
    console.log('   📧 Trying SendGrid...');
    const sgResult = await sendgridSender.sendAlert(subject, html, text);
    if (sgResult.success) {
      logAlertToDb(alert, 'sendgrid', 'sent');
      return sgResult;
    }
    console.log('   ⚠️  SendGrid failed, falling back to preview:', sgResult.error);
  }

  // Fall back to SMTP or preview mode
  const tr = initTransporter();
  const mailOptions = {
    from: `"${CONFIG.fromName}" <${CONFIG.fromEmail}>`,
    to: CONFIG.emailTo,
    subject: subject.substring(0, 78),
    text: text,
    html: html,
  };

  if (CONFIG.smsGateway) {
    mailOptions.to += `, ${CONFIG.smsGateway}`;
  }

  try {
    const info = await tr.sendMail(mailOptions);
    const channel = CONFIG.smsGateway ? 'email+sms' : 'email';
    const mode = CONFIG.smtpUser ? 'email' : 'preview';
    console.log(`✅ ${mode === 'email' ? 'Email' : 'Preview'} sent to ${CONFIG.emailTo}${CONFIG.smsGateway ? ' + SMS' : ''}`);
    console.log(`   Subject: ${subject.substring(0, 60)}...`);
    logAlertToDb(alert, channel, 'sent');
    return { success: true, messageId: info.messageId, mode };
  } catch (error) {
    console.error(`❌ Failed to send alert: ${error.message}`);
    logAlertToDb(alert, 'email', 'failed', error.message);
    return { success: false, error: error.message };
  }
}

function logAlertToDb(alert, channel, status, errorMsg) {
  try {
    const db = require('../db').getDb();
    const sql = errorMsg
      ? `INSERT INTO alert_log (type, severity, metric, value, threshold, business_impact, notification_channel, notification_status, error_message, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      : `INSERT INTO alert_log (type, severity, metric, value, threshold, business_impact, notification_channel, notification_status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    const params = [alert.type, alert.severity, alert.metric, String(alert.value), String(alert.threshold), JSON.stringify(alert.businessImpact || {}), channel, status];
    if (errorMsg) params.push(errorMsg);
    db.prepare(sql).run(...params);
  } catch (e) { /* non-critical */ }
}

/**
 * Test email configuration by sending a test message
 */
async function sendTestEmail() {
  // Try SendGrid first
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Testing SendGrid delivery...');
    const sgResult = await sendgridSender.sendTestEmail();
    if (sgResult.success) return sgResult;
    console.log('   ⚠️ SendGrid test failed:', sgResult.error);
  }

  const tr = initTransporter();
  try {
    const info = await tr.sendMail({
      from: `"${CONFIG.fromName}" <${CONFIG.fromEmail}>`,
      to: CONFIG.emailTo,
      subject: '🔔 AI Performance Monitor — Test Notification',
      text: 'This is a test notification from your AI Performance Testing Assistant.\n\nIf you received this, email notifications are configured correctly!',
      html: `
        <div style="font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:18px;">✅ AI Performance Monitor</h1>
          </div>
          <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
            <h2 style="color:#16a34a;font-size:16px;">Test Notification Successful!</h2>
            <p style="color:#475569;">Your email configuration is working correctly.</p>
            <p style="color:#64748b;font-size:13px;">You will now receive alerts when performance degradation is detected.</p>
          </div>
        </div>`
    });
    console.log('✅ Test email sent successfully to', CONFIG.emailTo);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAlert,
  sendTestEmail,
  initTransporter,
  closeTransporter,
  CONFIG,
};
