/**
 * On-Demand Load Test Runner (Built-in Node.js Engine)
 * 
 * POST /api/loadtest/run     — Run a load test with specified scenario
 * GET  /api/loadtest/status  — Check if a test is currently running
 * GET  /api/loadtest/report  — View the HTML report in browser
 * GET  /api/loadtest/report/download — Download the HTML report file
 * GET  /api/loadtest/engine-status   — Check engine availability
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAlertEngine } = require('../services/alertEngine');
const { getBrowserNotifications } = require('../services/browserNotification');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SCENARIOS = {
  'Smoke Test': { users: 50, duration: 30000, label: 'Smoke Test (50 users)' },
  'Average Load': { users: 200, duration: 60000, label: 'Average Load (200 users)' },
  'Peak Sale': { users: 500, duration: 90000, label: 'Peak Sale (500 users)' },
  'Black Friday': { users: 1000, duration: 120000, label: 'Black Friday (1000 users)' },
};

let isTestRunning = false;
let lastTestResult = null;

// ─── Run Load Test ──────────────────────────────────────────────────────────

router.post('/run', authenticate, requireAdmin, async (req, res) => {
  try {
    if (isTestRunning) {
      return res.status(409).json({ error: 'A load test is already running. Wait for it to complete.' });
    }

    const scenario = req.body.scenario || 'Smoke Test';
    const config = SCENARIOS[scenario];

    // Allow 'Custom Load Test' or any scenario with user-provided users/duration
    if (!config && scenario !== 'Custom Load Test') {
      return res.status(400).json({ 
        error: `Unknown scenario. Options: ${Object.keys(SCENARIOS).join(', ')}, Custom Load Test`,
        available: [...Object.keys(SCENARIOS), 'Custom Load Test'],
      });
    }

    // Allow custom overrides with safety bounds
    const defaultUsers = config ? config.users : 50;
    const defaultDuration = config ? config.duration : 30000;
    const users = Math.max(1, Math.min(req.body.users || defaultUsers, 2000));
    const durationMs = Math.min(req.body.duration || defaultDuration, 300000); // max 5 min

    isTestRunning = true;
    
    // Safety timeout — reset lock if test hangs
    const safetyTimeout = setTimeout(() => {
      if (isTestRunning) {
        console.error('⚠ Load test safety timeout triggered — resetting lock');
        isTestRunning = false;
      }
    }, durationMs + 120000); // 2 minutes beyond expected duration

    // Send immediate response, run test in background
    res.json({
      message: `🚀 Load test started: ${scenario} (${users} users, ${durationMs / 1000}s)`,
      scenario,
      users,
      durationMs,
      status: 'running',
      estimatedCompletion: new Date(Date.now() + durationMs + 15000).toISOString(),
    });

    // Run the test asynchronously
    runLoadTest(scenario, users, durationMs).then(() => {
      clearTimeout(safetyTimeout);
    }).catch(err => {
      clearTimeout(safetyTimeout);
      console.error('Load test failed:', err.message);
      isTestRunning = false;
    });

  } catch (error) {
    isTestRunning = false;
    res.status(500).json({ error: error.message });
  }
});

// ─── Check Status ───────────────────────────────────────────────────────────

router.get('/status', authenticate, requireAdmin, (req, res) => {
  res.json({
    isRunning: isTestRunning,
    lastResult: lastTestResult,
    scenarios: Object.entries(SCENARIOS).map(([name, cfg]) => ({
      name,
      ...cfg,
    })),
  });
});

// ─── View Report ────────────────────────────────────────────────────────────

router.get('/report', (req, res) => {
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'loadtest-report.html');
  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: 'No report available. Run a load test first.' });
  }
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data:");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(reportPath);
});

// ─── Download Report ────────────────────────────────────────────────────────

router.get('/report/download', (req, res) => {
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'loadtest-report.html');
  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: 'No report available. Run a load test first.' });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="loadtest-report-${Date.now()}.html"`);
  res.sendFile(reportPath);
});

// ─── Engine Status ──────────────────────────────────────────────────────────

router.get('/engine-status', (req, res) => {
  res.json({
    engines: {
      node: { available: true, name: 'PerfPilot LoadRunner', description: 'Built-in Node.js engine — no external dependencies required' },
    },
    isRunning: isTestRunning,
    lastResult: lastTestResult,
  });
});

// ─── Run Load Test (async) ─────────────────────────────────────────────────

async function runLoadTest(scenario, users, durationMs) {
  const startTime = Date.now();
  const reportsDir = path.join(__dirname, '..', '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const resultsPath = path.join(reportsDir, 'load-test-results.json');

  console.log(`\n🚀 Starting load test: ${scenario} (${users} users, ${durationMs / 1000}s)`);

  try {
    // Run the load test as a child process
    await new Promise((resolve, reject) => {
      const runnerPath = path.join(__dirname, '..', '..', 'performance-tests', 'load_test_runner.js');
      const child = spawn('node', [runnerPath], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          USERS: String(users),
          DURATION_MS: String(durationMs),
          THINK_TIME_MS: '100',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
        const lines = data.toString().split('\n').filter(l => l.includes('%') || l.includes('✅') || l.includes('⚠') || l.includes('📊'));
        for (const line of lines) {
          console.log(`   [LoadRunner] ${line.trim()}`);
        }
      });

      child.stderr.on('data', (data) => {
        console.error(`   [LoadRunner:err] ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Load test exited with code ${code}`));
      });

      child.on('error', reject);
    });

    // Read the results
    let results = null;
    if (fs.existsSync(resultsPath)) {
      results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Load test completed in ${elapsed}s`);

    // Trigger AI analysis based on results
    const engine = getAlertEngine();
    const findings = [];

    if (results) {
      const p95 = results.response_times_ms?.overall?.p95 || 0;
      const errorRate = results.summary?.success_rate 
        ? 1 - (parseFloat(results.summary.success_rate) / 100) 
        : 0;
      const failedReqs = results.summary?.failed_requests || 0;
      const totalReqs = results.summary?.total_requests || 0;

      // Build a metrics snapshot for the alert engine
      const snapshot = {
        currentP95: p95,
        currentErrorRate: errorRate,
        currentRps: parseFloat(results.summary?.requests_per_second) || 0,
        cpuUsage: 0,
        memoryUsage: 0,
        totalRequests: totalReqs,
        errorCount: failedReqs,
        timestamp: new Date().toISOString(),
        source: 'on-demand-load-test',
      };

      // Force the alert engine to check with these metrics
      engine.metricsSnapshot = snapshot;
      engine.markLoadTestCompleted();
      const analysisFindings = await engine.analyzeMetrics(snapshot);

      // Collect all findings (don't send individual emails)
      for (const finding of analysisFindings) {
        findings.push(finding);
        const alertKey = finding.type + ':' + finding.metric;
        engine.activeAlerts.delete(alertKey);
        // Log to history without sending individual emails
        engine.alertHistory.push({ ...finding, timestamp: Date.now() });
      }

      // Send a single combined email with all findings
      if (findings.length > 0) {
        const { sendCombinedAlert } = require('../services/notificationService');
        await sendCombinedAlert(findings, scenario, users, durationMs, results);
      }

      // Send browser notifications
      for (const finding of findings) {
        getBrowserNotifications().send(finding);
      }

      // Generate the HTML report
      generateHtmlReport(results, scenario, users, durationMs, elapsed, findings);
    }

    // Store last result
    lastTestResult = {
      timestamp: new Date().toISOString(),
      scenario,
      users,
      durationMs,
      elapsed,
      summary: results?.summary || null,
      responseTimes: results?.response_times_ms?.overall || null,
      findings: findings.map(f => ({ type: f.type, severity: f.severity, metric: f.metric, value: f.value })),
      allThresholdsPassed: findings.length === 0,
      reportUrl: '/api/loadtest/report',
    };

    console.log(`📊 Load test summary: ${findings.length} issues detected, ${findings.filter(f => f.severity === 'Critical').length} critical\n`);

  } catch (error) {
    console.error(`❌ Load test failed: ${error.message}`);
    lastTestResult = {
      timestamp: new Date().toISOString(),
      scenario,
      users,
      durationMs,
      elapsed: Math.round((Date.now() - startTime) / 1000),
      error: error.message,
    };
  } finally {
    isTestRunning = false;
  }
}

// ─── HTML Report Generator ──────────────────────────────────────────────────

function generateHtmlReport(results, scenario, users, durationMs, elapsed, findings) {
  const summary = results.summary || {};
  const overall = results.response_times_ms?.overall || {};
  const endpoints = results.response_times_ms?.by_endpoint || {};
  const timeline = results.timeline || [];

  const totalReqs = summary.total_requests || 0;
  const failedReqs = summary.failed_requests || 0;
  const successRate = summary.success_rate || '0%';
  const rps = summary.requests_per_second || '0';
  const errorRate = totalReqs > 0 ? ((failedReqs / totalReqs) * 100).toFixed(1) : '0';

  const p50 = overall.p50 || 0;
  const p75 = overall.p75 || 0;
  const p90 = overall.p90 || 0;
  const p95 = overall.p95 || 0;
  const p99 = overall.p99 || 0;
  const avg = overall.avg || 0;
  const min = overall.min || 0;
  const max = overall.max || 0;

  // Endpoint data for charts
  const endpointNames = Object.keys(endpoints);
  const endpointAvgs = endpointNames.map(e => endpoints[e].avg || 0);
  const endpointP95s = endpointNames.map(e => endpoints[e].p95 || 0);
  const endpointMaxs = endpointNames.map(e => endpoints[e].max || 0);
  const endpointCounts = endpointNames.map(e => endpoints[e].count || 0);
  const endpointErrors = endpointNames.map(e => endpoints[e].errors || 0);

  // Timeline data
  const timelineLabels = timeline.map((t, i) => `${i * 5}s`);
  const timelineRps = timeline.map(t => t.rps || 0);
  const timelineP95 = timeline.map(t => t.p95 || 0);
  const timelineErrors = timeline.map(t => t.errors || 0);
  const timelineActive = timeline.map(t => t.activeUsers || 0);

  // Findings for the report
  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const warningCount = findings.filter(f => f.severity === 'Warning').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PerfPilot LoadRunner Report — ${scenario}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"><\/script>
<style>
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --border: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-red: #f85149;
  --accent-yellow: #d29922;
  --accent-purple: #bc8cff;
  --accent-cyan: #39d353;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 24px;
  min-height: 100vh;
}
.container { max-width: 1400px; margin: 0 auto; }

/* Header */
.header {
  text-align: center;
  padding: 40px 0 30px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 30px;
  animation: fadeInDown 0.6s ease;
}
.header h1 { font-size: 32px; color: var(--accent-blue); margin-bottom: 8px; }
.header .badge {
  display: inline-block;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px;
}
.header .timestamp { color: var(--text-muted); font-size: 12px; margin-top: 12px; }

/* Summary Cards */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: fadeInUp 0.5s ease backwards;
}
.summary-card:nth-child(1) { animation-delay: 0.1s; }
.summary-card:nth-child(2) { animation-delay: 0.15s; }
.summary-card:nth-child(3) { animation-delay: 0.2s; }
.summary-card:nth-child(4) { animation-delay: 0.25s; }
.summary-card:nth-child(5) { animation-delay: 0.3s; }
.summary-card:nth-child(6) { animation-delay: 0.35s; }
.summary-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.summary-card .value { font-size: 28px; font-weight: 700; margin: 6px 0; }
.summary-card .label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
.summary-card.pass .value { color: var(--accent-green); }
.summary-card.fail .value { color: var(--accent-red); }
.summary-card.warn .value { color: var(--accent-yellow); }
.summary-card.info .value { color: var(--accent-blue); }

/* Chart Sections */
.section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  animation: fadeInUp 0.6s ease backwards;
}
.section h2 {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section h2 .icon { font-size: 20px; }
.chart-container { position: relative; height: 300px; margin: 12px 0; }
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 900px) { .chart-row { grid-template-columns: 1fr; } }

/* Tables */
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--bg-tertiary); font-size: 13px; }
th { color: var(--text-secondary); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
td { color: var(--text-primary); }
tr:hover td { background: rgba(88, 166, 255, 0.03); }
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.status-pass { background: rgba(63, 185, 80, 0.15); color: var(--accent-green); }
.status-fail { background: rgba(248, 81, 73, 0.15); color: var(--accent-red); }
.status-warn { background: rgba(210, 153, 34, 0.15); color: var(--accent-yellow); }

/* Findings */
.finding-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid var(--accent-red);
}
.finding-card.warning { border-left-color: var(--accent-yellow); }
.finding-card .title { font-weight: 600; margin-bottom: 6px; }
.finding-card .detail { color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
.finding-card .impact { margin-top: 8px; font-size: 12px; color: var(--accent-yellow); }

/* Footer */
.footer {
  text-align: center;
  padding: 30px 0;
  color: var(--text-muted);
  font-size: 12px;
  border-top: 1px solid var(--border);
  margin-top: 20px;
}

/* Animations */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.animate-pulse { animation: pulse 2s infinite; }
</style>
</head>
<body>
<div class="container">

<!-- Header -->
<div class="header">
  <h1>🚀 PerfPilot LoadRunner Report</h1>
  <div>
    <span class="badge">📋 ${scenario}</span>
    <span class="badge">👥 ${users} Virtual Users</span>
    <span class="badge">⏱ ${(durationMs / 1000)}s Duration</span>
    <span class="badge">⚡ ${elapsed}s Elapsed</span>
  </div>
  <div class="timestamp">Generated: ${new Date().toLocaleString()} | Engine: PerfPilot Node.js LoadRunner</div>
</div>

<!-- Summary Cards -->
<div class="summary-grid">
  <div class="summary-card info">
    <div class="label">Total Requests</div>
    <div class="value">${totalReqs.toLocaleString()}</div>
  </div>
  <div class="summary-card info">
    <div class="label">Throughput</div>
    <div class="value">${rps}/s</div>
  </div>
  <div class="summary-card ${parseFloat(successRate) >= 95 ? 'pass' : parseFloat(successRate) >= 80 ? 'warn' : 'fail'}">
    <div class="label">Success Rate</div>
    <div class="value">${successRate}</div>
  </div>
  <div class="summary-card ${p95 <= 2000 ? 'pass' : p95 <= 5000 ? 'warn' : 'fail'}">
    <div class="label">P95 Response</div>
    <div class="value">${Math.round(p95)}ms</div>
  </div>
  <div class="summary-card ${parseFloat(errorRate) <= 5 ? 'pass' : parseFloat(errorRate) <= 15 ? 'warn' : 'fail'}">
    <div class="label">Error Rate</div>
    <div class="value">${errorRate}%</div>
  </div>
  <div class="summary-card ${criticalCount === 0 ? 'pass' : 'fail'}">
    <div class="label">Alerts</div>
    <div class="value">${criticalCount > 0 ? criticalCount + ' Critical' : warningCount > 0 ? warningCount + ' Warning' : '✓ None'}</div>
  </div>
</div>

<!-- Timeline Charts -->
<div class="section" style="animation-delay: 0.4s">
  <h2><span class="icon">📈</span> Performance Timeline</h2>
  <div class="chart-row">
    <div class="chart-container"><canvas id="timelineRpsChart"></canvas></div>
    <div class="chart-container"><canvas id="timelineP95Chart"></canvas></div>
  </div>
</div>

<!-- Response Time Distribution -->
<div class="section" style="animation-delay: 0.5s">
  <h2><span class="icon">⏱</span> Response Time Percentiles</h2>
  <div class="chart-row">
    <div class="chart-container"><canvas id="percentileChart"></canvas></div>
    <div class="chart-container"><canvas id="endpointChart"></canvas></div>
  </div>
</div>

<!-- Error & Users -->
<div class="section" style="animation-delay: 0.6s">
  <h2><span class="icon">🎯</span> Errors & Virtual Users Over Time</h2>
  <div class="chart-row">
    <div class="chart-container"><canvas id="errorChart"></canvas></div>
    <div class="chart-container"><canvas id="usersChart"></canvas></div>
  </div>
</div>

<!-- Endpoint Breakdown Table -->
<div class="section" style="animation-delay: 0.7s">
  <h2><span class="icon">🔗</span> Endpoint Breakdown</h2>
  <table>
    <thead>
      <tr><th>Endpoint</th><th>Requests</th><th>Avg (ms)</th><th>P95 (ms)</th><th>Max (ms)</th><th>Errors</th><th>Status</th></tr>
    </thead>
    <tbody>
${endpointNames.map((name, i) => {
  const ep = endpoints[name];
  const epErrorRate = ep.count > 0 ? (ep.errors || 0) / ep.count : 0;
  const status = epErrorRate > 0.1 ? 'fail' : ep.p95 > 2000 ? 'warn' : 'pass';
  const label = status === 'pass' ? 'PASS' : status === 'warn' ? 'SLOW' : 'FAIL';
  return `      <tr>
        <td><strong>${name}</strong></td>
        <td>${(ep.count || 0).toLocaleString()}</td>
        <td>${Math.round(ep.avg || 0)}</td>
        <td>${Math.round(ep.p95 || 0)}</td>
        <td>${Math.round(ep.max || 0)}</td>
        <td>${ep.errors || 0}</td>
        <td><span class="status-badge status-${status}">${label}</span></td>
      </tr>`;
}).join('\n')}
    </tbody>
  </table>
</div>

<!-- Findings / Alerts -->
${findings.length > 0 ? `
<div class="section" style="animation-delay: 0.8s">
  <h2><span class="icon">🚨</span> Performance Alerts (${findings.length})</h2>
${findings.map(f => `
  <div class="finding-card ${f.severity === 'Warning' ? 'warning' : ''}">
    <div class="title">[${f.severity}] ${f.type}</div>
    <div class="detail">${f.details || ''}</div>
    ${f.businessImpact ? `<div class="impact">💰 Revenue Impact: $${(f.businessImpact.revenueLost || 0).toLocaleString()} | 📦 Orders Lost: ${f.businessImpact.ordersLost || 0} | 👥 Users Affected: ${f.businessImpact.usersAffected || 0}</div>` : ''}
  </div>
`).join('')}
</div>
` : ''}

<!-- Raw Metrics Table -->
<div class="section" style="animation-delay: 0.9s">
  <h2><span class="icon">📊</span> Response Time Statistics</h2>
  <table>
    <thead><tr><th>Percentile</th><th>Min</th><th>P50</th><th>P75</th><th>Avg</th><th>P90</th><th>P95</th><th>P99</th><th>Max</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Overall</strong></td>
        <td>${Math.round(min)}ms</td>
        <td>${Math.round(p50)}ms</td>
        <td>${Math.round(p75)}ms</td>
        <td>${Math.round(avg)}ms</td>
        <td>${Math.round(p90)}ms</td>
        <td>${Math.round(p95)}ms</td>
        <td>${Math.round(p99)}ms</td>
        <td>${Math.round(max)}ms</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="footer">
  PerfPilot AI Performance Testing Assistant | Built-in LoadRunner Engine<br>
  ${scenario} • ${users} VUs • ${(durationMs/1000)}s • ${new Date().toISOString()}
</div>

</div>

<script>
// Chart defaults
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#21262d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Animated chart options
const animOpts = {
  animation: { duration: 1500, easing: 'easeOutQuart' },
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { padding: 16, usePointStyle: true } } },
};

// Timeline: Throughput (RPS)
new Chart(document.getElementById('timelineRpsChart'), {
  type: 'line',
  data: {
    labels: ${JSON.stringify(timelineLabels)},
    datasets: [{
      label: 'Requests/sec',
      data: ${JSON.stringify(timelineRps)},
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88,166,255,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#58a6ff',
    }]
  },
  options: { ...animOpts, scales: { y: { beginAtZero: true, title: { display: true, text: 'req/s' } }, x: { title: { display: true, text: 'Time' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'Throughput Over Time', color: '#e6edf3' } } }
});

// Timeline: P95
new Chart(document.getElementById('timelineP95Chart'), {
  type: 'line',
  data: {
    labels: ${JSON.stringify(timelineLabels)},
    datasets: [{
      label: 'P95 Response Time (ms)',
      data: ${JSON.stringify(timelineP95)},
      borderColor: '#d29922',
      backgroundColor: 'rgba(210,153,34,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#d29922',
    }]
  },
  options: { ...animOpts, scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } }, x: { title: { display: true, text: 'Time' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'P95 Response Time Over Time', color: '#e6edf3' } } }
});

// Percentile Bar Chart
new Chart(document.getElementById('percentileChart'), {
  type: 'bar',
  data: {
    labels: ['Min', 'P50', 'P75', 'Avg', 'P90', 'P95', 'P99', 'Max'],
    datasets: [{
      label: 'Response Time (ms)',
      data: [${min}, ${p50}, ${p75}, ${avg}, ${p90}, ${p95}, ${p99}, ${max}],
      backgroundColor: [
        'rgba(57,211,83,0.7)', 'rgba(88,166,255,0.7)', 'rgba(88,166,255,0.7)',
        'rgba(188,140,255,0.7)', 'rgba(210,153,34,0.7)', 'rgba(210,153,34,0.9)',
        'rgba(248,81,73,0.7)', 'rgba(248,81,73,0.9)'
      ],
      borderRadius: 6,
      borderSkipped: false,
    }]
  },
  options: { ...animOpts, scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'Response Time Distribution', color: '#e6edf3' } } }
});

// Endpoint Comparison
new Chart(document.getElementById('endpointChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(endpointNames.map(n => n.length > 20 ? n.substring(0, 20) + '...' : n))},
    datasets: [
      { label: 'Avg (ms)', data: ${JSON.stringify(endpointAvgs.map(v => Math.round(v)))}, backgroundColor: 'rgba(88,166,255,0.7)', borderRadius: 4 },
      { label: 'P95 (ms)', data: ${JSON.stringify(endpointP95s.map(v => Math.round(v)))}, backgroundColor: 'rgba(210,153,34,0.7)', borderRadius: 4 },
    ]
  },
  options: { ...animOpts, indexAxis: 'y', scales: { x: { beginAtZero: true, title: { display: true, text: 'ms' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'Endpoint Response Times', color: '#e6edf3' } } }
});

// Errors over time
new Chart(document.getElementById('errorChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(timelineLabels)},
    datasets: [{
      label: 'Errors',
      data: ${JSON.stringify(timelineErrors)},
      backgroundColor: 'rgba(248,81,73,0.6)',
      borderRadius: 4,
    }]
  },
  options: { ...animOpts, scales: { y: { beginAtZero: true, title: { display: true, text: 'Errors' } }, x: { title: { display: true, text: 'Time' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'Errors Over Time', color: '#e6edf3' } } }
});

// Active Users over time
new Chart(document.getElementById('usersChart'), {
  type: 'line',
  data: {
    labels: ${JSON.stringify(timelineLabels)},
    datasets: [{
      label: 'Active Virtual Users',
      data: ${JSON.stringify(timelineActive)},
      borderColor: '#bc8cff',
      backgroundColor: 'rgba(188,140,255,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#bc8cff',
    }]
  },
  options: { ...animOpts, scales: { y: { beginAtZero: true, title: { display: true, text: 'Users' } }, x: { title: { display: true, text: 'Time' } } }, plugins: { ...animOpts.plugins, title: { display: true, text: 'Virtual Users Over Time', color: '#e6edf3' } } }
});
<\/script>
</body>
</html>`;

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'loadtest-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`📄 HTML report generated: ${reportPath}`);
}

module.exports = router;
