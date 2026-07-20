/**
 * On-Demand Load Test Runner
 * 
 * POST /api/loadtest/run  — Run a load test with specified scenario
 *   Body: { users: 50, duration: 30000, scenario: "Smoke Test" }
 *   Runs the load test, analyzes results, triggers alerts, returns report
 * 
 * GET /api/loadtest/status — Check if a test is currently running
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
        // Log progress to console
        const lines = data.toString().split('\n').filter(l => l.includes('%') || l.includes('✅') || l.includes('⚠') || l.includes('📊'));
        for (const line of lines) {
          console.log(`   [LoadTest] ${line.trim()}`);
        }
      });

      child.stderr.on('data', (data) => {
        console.error(`   [LoadTest:err] ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Load test exited with code ${code}`));
        }
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

    // Check if any thresholds were exceeded
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
        cpuUsage: 0, // not measured in load test
        memoryUsage: 0,
        totalRequests: totalReqs,
        errorCount: failedReqs,
        timestamp: new Date().toISOString(),
        source: 'on-demand-load-test',
      };

      // Force the alert engine to check with these metrics
      engine.metricsSnapshot = snapshot;
      const analysisFindings = await engine.analyzeMetrics(snapshot);

      // Process findings (bypass cooldown for on-demand tests)
      for (const finding of analysisFindings) {
        findings.push(finding);
        // Clear cooldown and process
        const alertKey = finding.type + ':' + finding.metric;
        engine.activeAlerts.delete(alertKey);
        await engine.processFinding(finding);
      }

      // Also send via browser notifications
      for (const finding of findings) {
        getBrowserNotifications().send(finding);
      }
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

// ─── k6 / Gatling Engine Support ────────────────────────────────────────────

let lastK6Result = null;
let lastGatlingResult = null;

// POST /api/loadtest/run-k6
router.post('/run-k6', authenticate, requireAdmin, async (req, res) => {
  try {
    if (isTestRunning) {
      return res.status(409).json({ error: 'A load test is already running.' });
    }

    const users = Math.max(1, Math.min(req.body.users || 50, 2000));
    const duration = Math.max(5, Math.min(req.body.duration || 30, 120));

    isTestRunning = true;

    res.json({
      message: `🚀 k6 test started: ${users} users, ${duration}s`,
      engine: 'k6',
      users,
      duration,
      status: 'running',
    });

    // Run k6 in background
    const startTime = Date.now();
    const k6Script = path.join(__dirname, '..', '..', 'performance-tests', 'k6', 'smoke_test.js');
    const summaryPath = path.join(__dirname, '..', '..', 'reports', 'k6-run-summary.json');

    try {
      await new Promise((resolve, reject) => {
        const child = spawn('k6', [
          'run', k6Script,
          '--vus', String(users),
          '--duration', `${duration}s`,
          '--summary-export', summaryPath,
        ], {
          env: { ...process.env, BASE_URL: `http://localhost:${process.env.PORT || 5000}` },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';
        child.stdout.on('data', d => { output += d.toString(); });
        child.stderr.on('data', d => { output += d.toString(); });
        child.on('close', (code) => {
          // k6 exits with 99 when thresholds fail - that's still a valid test
          if (code === 0 || code === 99) resolve(output);
          else reject(new Error(`k6 exited with code ${code}`));
        });
        child.on('error', reject);
      });

      // Parse summary
      let summary = {};
      if (fs.existsSync(summaryPath)) {
        summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      lastK6Result = {
        timestamp: new Date().toISOString(),
        engine: 'k6',
        users,
        duration,
        elapsed,
        summary,
      };

      // Generate HTML report
      generateK6HtmlReport(lastK6Result);
      console.log(`✅ k6 test completed in ${elapsed}s`);

    } catch (err) {
      console.error(`❌ k6 test failed: ${err.message}`);
      lastK6Result = { timestamp: new Date().toISOString(), engine: 'k6', error: err.message };
    } finally {
      isTestRunning = false;
    }
  } catch (error) {
    isTestRunning = false;
    res.status(500).json({ error: error.message });
  }
});

// POST /api/loadtest/run-gatling
router.post('/run-gatling', authenticate, requireAdmin, async (req, res) => {
  try {
    if (isTestRunning) {
      return res.status(409).json({ error: 'A load test is already running.' });
    }

    const users = Math.max(1, Math.min(req.body.users || 50, 2000));
    const duration = Math.max(5, Math.min(req.body.duration || 30, 120));
    const gatlingHome = '/tmp/gatling310/gatling-charts-highcharts-bundle-3.10.5';
    const gatlingBin = path.join(gatlingHome, 'bin', 'gatling.sh');

    if (!fs.existsSync(gatlingBin)) {
      isTestRunning = false;
      return res.status(400).json({ 
        error: 'Gatling not installed. Download from gatling.io or run: curl -L -o /tmp/gatling.zip "https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.10.5/gatling-charts-highcharts-bundle-3.10.5-bundle.zip" && unzip -q /tmp/gatling.zip -d /tmp/gatling310',
        available: false,
      });
    }

    isTestRunning = true;

    res.json({
      message: `🚀 Gatling test started: ${users} users, ${duration}s`,
      engine: 'gatling',
      users,
      duration,
      status: 'running',
    });

    const startTime = Date.now();
    const resultsDir = path.join(__dirname, '..', '..', 'reports', 'gatling-latest');

    try {
      // Clean previous results
      if (fs.existsSync(resultsDir)) {
        fs.rmSync(resultsDir, { recursive: true });
      }

      await new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', `echo "1" | USERS=${users} DURATION_SEC=${duration} BASE_URL=http://localhost:${process.env.PORT || 5000} ${gatlingBin} --simulation simulations.ECommerceSimulation --results-folder ${resultsDir}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';
        child.stdout.on('data', d => { output += d.toString(); });
        child.stderr.on('data', d => { output += d.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve(output);
          else reject(new Error(`Gatling exited with code ${code}: ${output.slice(-500)}`));
        });
        child.on('error', reject);
      });

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      lastGatlingResult = {
        timestamp: new Date().toISOString(),
        engine: 'gatling',
        users,
        duration,
        elapsed,
        reportDir: resultsDir,
      };

      console.log(`✅ Gatling test completed in ${elapsed}s`);

    } catch (err) {
      console.error(`❌ Gatling test failed: ${err.message}`);
      lastGatlingResult = { timestamp: new Date().toISOString(), engine: 'gatling', error: err.message };
    } finally {
      isTestRunning = false;
    }
  } catch (error) {
    isTestRunning = false;
    res.status(500).json({ error: error.message });
  }
});

// GET /api/loadtest/report/k6 — Serve the k6 HTML report
router.get('/report/k6', (req, res) => {
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'k6-live-report.html');
  if (fs.existsSync(reportPath)) {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(reportPath);
  } else {
    res.status(404).json({ error: 'No k6 report available. Run a k6 test first.' });
  }
});

// GET /api/loadtest/report/gatling — Serve the Gatling HTML report directly
router.get('/report/gatling', (req, res) => {
  const resultsDir = path.join(__dirname, '..', '..', 'reports', 'gatling-latest');
  if (!fs.existsSync(resultsDir)) {
    return res.status(404).json({ error: 'No Gatling report available. Run a Gatling test first.' });
  }
  const subdirs = fs.readdirSync(resultsDir).filter(d => fs.statSync(path.join(resultsDir, d)).isDirectory());
  if (subdirs.length > 0) {
    const reportDir = path.join(resultsDir, subdirs[0]);
    const indexPath = path.join(reportDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      // Read the HTML file and rewrite relative paths to use our static route
      let html = fs.readFileSync(indexPath, 'utf-8');
      html = html.replace(/href="style\//g, 'href="/api/loadtest/report/gatling-assets/style/');
      html = html.replace(/src="js\//g, 'src="/api/loadtest/report/gatling-assets/js/');
      html = html.replace(/href="style\/favicon\.ico"/g, 'href="/api/loadtest/report/gatling-assets/style/favicon.ico"');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data:");
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  }
  res.status(404).json({ error: 'Gatling report index.html not found.' });
});

// Serve Gatling report static assets (JS, CSS, images)
router.use('/report/gatling-assets', (req, res, next) => {
  const resultsDir = path.join(__dirname, '..', '..', 'reports', 'gatling-latest');
  if (!fs.existsSync(resultsDir)) return next();
  const subdirs = fs.readdirSync(resultsDir).filter(d => fs.statSync(path.join(resultsDir, d)).isDirectory());
  if (subdirs.length > 0) {
    res.removeHeader('Content-Security-Policy');
    express.static(path.join(resultsDir, subdirs[0]))(req, res, next);
  } else {
    next();
  }
});

// GET /api/loadtest/download/gatling — Download self-contained Gatling report
router.get('/download/gatling', (req, res) => {
  const resultsDir = path.join(__dirname, '..', '..', 'reports', 'gatling-latest');
  if (!fs.existsSync(resultsDir)) {
    return res.status(404).json({ error: 'No Gatling report available.' });
  }
  const subdirs = fs.readdirSync(resultsDir).filter(d => fs.statSync(path.join(resultsDir, d)).isDirectory());
  if (subdirs.length === 0) {
    return res.status(404).json({ error: 'Gatling report not found.' });
  }
  const reportDir = path.join(resultsDir, subdirs[0]);
  const indexPath = path.join(reportDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({ error: 'Gatling report index.html not found.' });
  }

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Inline all CSS files
  html = html.replace(/<link href="style\/([^"]+)" rel="stylesheet"[^>]*>/g, (match, filename) => {
    const cssPath = path.join(reportDir, 'style', filename);
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf-8');
      return `<style>${css}</style>`;
    }
    return match;
  });

  // Inline all JS files
  html = html.replace(/<script src="js\/([^"]+)"><\/script>/g, (match, filename) => {
    const jsPath = path.join(reportDir, 'js', filename);
    if (fs.existsSync(jsPath)) {
      const js = fs.readFileSync(jsPath, 'utf-8');
      return `<script>${js}</script>`;
    }
    return match;
  });

  // Remove favicon link (won't work offline anyway)
  html = html.replace(/<link rel="shortcut icon"[^>]*>/, '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gatling-report.html"');
  res.send(html);
});

// GET /api/loadtest/engine-status — Check which engines are available
router.get('/engine-status', (req, res) => {
  const k6Available = (() => { try { require('child_process').execSync('which k6', { stdio: 'ignore' }); return true; } catch { return false; } })();
  const gatlingAvailable = fs.existsSync('/tmp/gatling310/gatling-charts-highcharts-bundle-3.10.5/bin/gatling.sh');

  res.json({
    engines: {
      node: { available: true, name: 'Node Runner', description: 'Built-in, no dependencies' },
      k6: { available: k6Available, name: 'k6', description: 'Industry standard by Grafana' },
      gatling: { available: gatlingAvailable, name: 'Gatling', description: 'Enterprise-grade, Java required' },
    },
    isRunning: isTestRunning,
    lastResults: {
      node: lastTestResult,
      k6: lastK6Result,
      gatling: lastGatlingResult,
    },
  });
});

// ─── k6 HTML Report Generator ───────────────────────────────────────────────

function generateK6HtmlReport(result) {
  const s = result.summary || {};
  const metrics = s.metrics || {};
  const httpDuration = metrics.http_req_duration || {};
  const httpFailed = metrics.http_req_failed || {};
  const httpReqs = metrics.http_reqs || {};
  const iterations = metrics.iterations || {};
  const checks = s.root_group?.groups?.['Complete Business Transaction']?.checks || {};

  const totalReqs = httpReqs.count || 0;
  const rps = (httpReqs.rate || 0).toFixed(1);
  const failRate = ((httpFailed.value || 0) * 100).toFixed(1);
  const successRate = (100 - parseFloat(failRate)).toFixed(1);
  const avgDuration = (httpDuration.avg || 0).toFixed(0);
  const medDuration = (httpDuration.med || 0).toFixed(0);
  const p90Duration = (httpDuration['p(90)'] || 0).toFixed(0);
  const p95Duration = (httpDuration['p(95)'] || 0).toFixed(0);
  const maxDuration = (httpDuration.max || 0).toFixed(0);
  const minDuration = (httpDuration.min || 0).toFixed(2);
  const iters = iterations.count || 0;

  // Check results
  const checkNames = Object.keys(checks);
  const checkData = checkNames.map(name => {
    const c = checks[name];
    return { name, passes: c.passes || 0, fails: c.fails || 0 };
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>k6 Load Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f1117;color:#e1e4e8;padding:24px}
.header{text-align:center;padding:30px 0;border-bottom:1px solid #30363d;margin-bottom:30px}
.header h1{font-size:28px;color:#58a6ff;margin-bottom:8px}
.header .sub{color:#8b949e;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;text-align:center}
.card .val{font-size:32px;font-weight:700;margin:6px 0}
.card .lbl{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px}
.card.fail .val{color:#f85149}.card.pass .val{color:#3fb950}.card.info .val{color:#58a6ff}.card.warn .val{color:#d29922}
.section{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;margin-bottom:24px}
.section h2{font-size:18px;color:#c9d1d9;margin-bottom:16px;border-bottom:1px solid #21262d;padding-bottom:8px}
.chart-box{position:relative;height:280px;margin:12px 0}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #21262d;font-size:13px}
th{color:#8b949e;font-weight:600;text-transform:uppercase;font-size:11px}
td{color:#c9d1d9}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.badge-fail{background:rgba(248,81,73,0.15);color:#f85149}
.badge-pass{background:rgba(63,185,80,0.15);color:#3fb950}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:768px){.two-col{grid-template-columns:1fr}}
.footer{text-align:center;padding:20px;color:#6e7681;font-size:12px;margin-top:20px}
</style>
</head>
<body>
<div class="header">
<h1>📊 k6 Performance Test Report</h1>
<div class="sub">${result.users} Virtual Users | ${result.duration}s Duration | Engine: k6</div>
<div style="color:#6e7681;font-size:12px;margin-top:5px">Generated: ${new Date(result.timestamp).toLocaleString()} | Elapsed: ${result.elapsed}s</div>
</div>

<div class="grid">
<div class="card info"><div class="lbl">Total Requests</div><div class="val">${totalReqs.toLocaleString()}</div></div>
<div class="card info"><div class="lbl">Throughput</div><div class="val">${rps}/s</div></div>
<div class="card ${parseFloat(failRate) > 20 ? 'fail' : parseFloat(failRate) > 5 ? 'warn' : 'pass'}"><div class="lbl">Failure Rate</div><div class="val">${failRate}%</div></div>
<div class="card ${parseInt(p95Duration) > 2000 ? 'fail' : parseInt(p95Duration) > 1000 ? 'warn' : 'pass'}"><div class="lbl">P95 Response</div><div class="val">${p95Duration}ms</div></div>
<div class="card info"><div class="lbl">Iterations</div><div class="val">${iters}</div></div>
<div class="card ${parseFloat(successRate) > 95 ? 'pass' : parseFloat(successRate) > 80 ? 'warn' : 'fail'}"><div class="lbl">Success Rate</div><div class="val">${successRate}%</div></div>
</div>

<div class="two-col">
<div class="section"><h2>Response Time Percentiles</h2><div class="chart-box"><canvas id="percChart"></canvas></div></div>
<div class="section"><h2>Check Results</h2><div class="chart-box"><canvas id="checksChart"></canvas></div></div>
</div>

<div class="section">
<h2>HTTP Timing Details</h2>
<table>
<thead><tr><th>Metric</th><th>Min</th><th>Avg</th><th>Median</th><th>P90</th><th>P95</th><th>Max</th></tr></thead>
<tbody>
<tr><td>Request Duration</td><td>${minDuration}ms</td><td>${avgDuration}ms</td><td>${medDuration}ms</td><td>${p90Duration}ms</td><td>${p95Duration}ms</td><td>${maxDuration}ms</td></tr>
</tbody>
</table>
</div>

<div class="section">
<h2>Check Breakdown</h2>
<table>
<thead><tr><th>Check</th><th>Passes</th><th>Fails</th><th>Rate</th><th>Status</th></tr></thead>
<tbody>
${checkData.map(c => {
  const rate = c.passes + c.fails > 0 ? ((c.passes / (c.passes + c.fails)) * 100).toFixed(0) : '0';
  return `<tr><td>${c.name}</td><td>${c.passes}</td><td>${c.fails}</td><td>${rate}%</td><td><span class="badge ${parseInt(rate) > 90 ? 'badge-pass' : 'badge-fail'}">${parseInt(rate) > 90 ? 'PASS' : 'FAIL'}</span></td></tr>`;
}).join('')}
</tbody>
</table>
</div>

<div class="footer">PERFPILOT-AI | k6 Engine Report | ${result.users} VUs × ${result.duration}s</div>

<script>
new Chart(document.getElementById('percChart'),{type:'line',data:{labels:['Min','Median','Avg','P90','P95','Max'],datasets:[{label:'Response Time (ms)',data:[${minDuration},${medDuration},${avgDuration},${p90Duration},${p95Duration},${maxDuration}],borderColor:'#58a6ff',backgroundColor:'rgba(88,166,255,0.1)',fill:true,tension:0.3,pointRadius:6,pointBackgroundColor:'#58a6ff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e'}}},scales:{y:{grid:{color:'#21262d'},ticks:{color:'#8b949e'}},x:{grid:{color:'#21262d'},ticks:{color:'#8b949e'}}}}});
new Chart(document.getElementById('checksChart'),{type:'bar',data:{labels:[${checkData.map(c => `'${c.name.replace(/'/g, "\\'").substring(0, 12)}'`).join(',')}],datasets:[{label:'Pass',data:[${checkData.map(c => c.passes).join(',')}],backgroundColor:'#3fb950',borderRadius:4},{label:'Fail',data:[${checkData.map(c => c.fails).join(',')}],backgroundColor:'#f85149',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e'}}},scales:{y:{stacked:true,grid:{color:'#21262d'},ticks:{color:'#8b949e'}},x:{stacked:true,grid:{color:'#21262d'},ticks:{color:'#8b949e',font:{size:10}}}}}});
<\/script>
</body></html>`;

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'k6-live-report.html');
  fs.writeFileSync(reportPath, html);
}

module.exports = router;
