/**
 * Notification Service — sends combined email alerts via SendGrid
 * 
 * Configuration (backend/.env):
 *   SENDGRID_API_KEY=SG.xxxxx
 *   ALERT_EMAIL_TO=stakeholder028@gmail.com
 *   ALERT_FROM_EMAIL=stakeholder028@gmail.com
 */

const sendgridSender = require('./sendgridSender');

const CONFIG = {
  emailTo: process.env.ALERT_EMAIL_TO || 'stakeholder028@gmail.com',
  fromEmail: process.env.ALERT_FROM_EMAIL || 'stakeholder028@gmail.com',
  fromName: 'AI Performance Monitor',
};

/**
 * Send a single combined email with all findings from a load test run
 */
async function sendCombinedAlert(findings, scenario, users, durationMs, results) {
  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const warningCount = findings.filter(f => f.severity === 'Warning').length;
  const totalRevenueLost = findings.reduce((sum, f) => sum + (f.businessImpact?.revenueLost || 0), 0);

  const subject = `[Load Test Report] ${scenario} — ${criticalCount} Critical, ${warningCount} Warning alerts (${users} users)`;

  const successRate = results?.summary?.success_rate || '0%';
  const rps = results?.summary?.requests_per_second || '0';
  const p95 = results?.response_times_ms?.overall?.p95 || 0;

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
  .container { max-width: 640px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px 24px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 20px; }
  .header .sub { color: #94a3b8; font-size: 13px; margin-top: 8px; }
  .summary-table { width: 100%; border-collapse: collapse; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .summary-table td { padding: 18px 12px; text-align: center; border-right: 1px solid #e2e8f0; }
  .summary-table td:last-child { border-right: none; }
  .summary-table .num { font-size: 20px; font-weight: 700; color: #1e293b; display: block; }
  .summary-table .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-top: 4px; }
  .body { padding: 24px; }
  .alert-card { border-left: 4px solid #ef4444; background: #fef2f2; padding: 16px 18px; border-radius: 8px; margin-bottom: 16px; }
  .alert-card.warning { border-left-color: #f59e0b; background: #fffbeb; }
  .alert-card .title { font-weight: 600; font-size: 15px; color: #1e293b; margin-bottom: 6px; }
  .alert-card .meta { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .alert-card .impact { font-size: 13px; color: #dc2626; margin-bottom: 8px; }
  .alert-card .actions { font-size: 12px; color: #475569; margin: 0; padding-left: 18px; }
  .alert-card .actions li { margin: 4px 0; line-height: 1.5; }
  .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🚨 PerfPilot Load Test Alert Report</h1>
    <div class="sub">${scenario} &nbsp;|&nbsp; ${users} Users &nbsp;|&nbsp; ${(durationMs/1000)}s Duration</div>
  </div>
  <table class="summary-table">
    <tr>
      <td><span class="num">${findings.length}</span><span class="lbl">Alerts</span></td>
      <td><span class="num">${successRate}</span><span class="lbl">Success Rate</span></td>
      <td><span class="num">${Math.round(p95)}ms</span><span class="lbl">P95 Response</span></td>
      <td><span class="num">${rps}/s</span><span class="lbl">Throughput</span></td>
      <td><span class="num" style="color:#dc2626;">$${totalRevenueLost.toLocaleString()}</span><span class="lbl">Revenue Impact</span></td>
    </tr>
  </table>
  <div class="body">
    <h3 style="font-size:14px; color:#1e293b; margin: 0 0 16px;">Performance Issues Detected:</h3>`;

  for (const finding of findings) {
    if (finding.type.includes('COMPOSITE')) continue;
    const isWarning = finding.severity === 'Warning';
    html += `
    <div class="alert-card ${isWarning ? 'warning' : ''}">
      <div class="title">[${finding.severity}] ${finding.type}</div>
      <div class="meta">${finding.metric}: <strong>${finding.value}</strong> &nbsp;(threshold: ${finding.threshold})</div>
      ${finding.businessImpact ? `<div class="impact">💰 Revenue Lost: <strong>$${(finding.businessImpact.revenueLost || 0).toLocaleString()}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; 👥 Users Affected: <strong>${finding.businessImpact.usersAffected || 0}</strong></div>` : ''}
      ${finding.recommendations ? `<ul class="actions">${finding.recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
    </div>`;
  }

  html += `
  </div>
  <div class="footer">
    PerfPilot AI Performance Testing Assistant — Automated Report
  </div>
</div>
</body>
</html>`;

  // Plain text fallback
  let text = `PerfPilot Load Test Alert Report\n${scenario} | ${users} Users | ${(durationMs/1000)}s\nSuccess Rate: ${successRate} | P95: ${Math.round(p95)}ms | Throughput: ${rps}/s\n\n`;
  for (const finding of findings) {
    if (finding.type.includes('COMPOSITE')) continue;
    text += `[${finding.severity}] ${finding.type} — ${finding.metric}: ${finding.value}\n`;
    if (finding.businessImpact?.revenueLost) text += `  Revenue Lost: $${finding.businessImpact.revenueLost}\n`;
    text += '\n';
  }

  // Send via SendGrid
  if (process.env.SENDGRID_API_KEY) {
    console.log('   📧 Sending combined alert email via SendGrid...');
    const sgResult = await sendgridSender.sendAlert(subject, html, text);
    if (sgResult.success) {
      console.log(`   ✅ Alert email sent to ${CONFIG.emailTo} (${findings.length} findings)`);
      return sgResult;
    }
    console.log('   ⚠️  SendGrid failed:', sgResult.error);
  }

  console.log('   ⚠️  No email provider configured. Set SENDGRID_API_KEY in .env');
  return { success: false, error: 'No email provider configured' };
}

/**
 * Send a test email to verify configuration
 */
async function sendTestEmail() {
  if (process.env.SENDGRID_API_KEY) {
    return await sendgridSender.sendTestEmail();
  }
  return { success: false, error: 'SENDGRID_API_KEY not set' };
}

module.exports = {
  sendCombinedAlert,
  sendTestEmail,
  CONFIG,
};
