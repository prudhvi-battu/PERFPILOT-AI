/**
 * PerfPilot LoadRunner — Built-in Node.js Load Testing Engine
 * 
 * No external dependencies required (k6, Gatling, Java, etc.)
 * 
 * Scenario: Login → Search → Product Detail → Add to Cart → Checkout
 * 
 * Environment Variables:
 *   USERS        — Concurrent virtual users (default: 50)
 *   DURATION_MS  — Test duration in ms (default: 30000)
 *   THINK_TIME_MS — Think time between steps (default: 100)
 *   BASE_URL     — Target server URL (default: http://localhost:5000)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CONCURRENT_USERS = parseInt(process.env.USERS) || 50;
const TEST_DURATION_MS = parseInt(process.env.DURATION_MS) || 30000;
const THINK_TIME_MS = parseInt(process.env.THINK_TIME_MS) || 100;
const TIMELINE_INTERVAL_MS = 5000; // Capture metrics every 5 seconds

// Connection pooling
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 200, maxFreeSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 200, maxFreeSockets: 100 });

process.on('unhandledRejection', (err) => {
  console.error('⚠ Unhandled rejection:', err.message);
});

const TEST_ACCOUNTS = [
  { email: 'john@example.com', password: 'password123' },
  { email: 'jane@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'password123' },
  { email: 'alice@example.com', password: 'password123' },
];

const PRODUCT_SLUGS = [
  'smartphone-pro-x', 'laptop-ultra-15', 'wireless-headphones',
  'smart-watch', 'tablet-pro-12', 'bluetooth-speaker',
  'gaming-console', 'digital-camera', 'portable-charger',
  'usb-c-hub', 'cotton-t-shirt', 'denim-jeans',
  'winter-jacket', 'running-shoes', 'leather-belt',
  'garden-tool-set', 'indoor-plant-pot', 'led-desk-lamp',
  'smart-thermostat', 'cookware-set', 'programming-book',
  'design-patterns', 'data-science-guide', 'business-strategy',
  'cookbook-deluxe', 'yoga-mat-premium', 'dumbbell-set-20lbs',
  'resistance-bands', 'water-bottle-insulated', 'fitness-tracker',
  'board-game-collection', 'building-blocks-500pc', 'remote-control-car',
  'puzzle-1000pc', 'stuffed-animal-bear', 'mechanical-keyboard',
  'webcam-hd-4k', 'wireless-mouse', 'monitor-27-4k',
  'ssd-1tb-external', 'wool-sweater', 'casual-sneakers',
  'formal-shirt', 'winter-gloves', 'cashmere-scarf',
  'air-purifier', 'robot-vacuum', 'coffee-maker-pro',
  'electric-kettle', 'throw-blanket',
];

// ─── Metrics Collector ──────────────────────────────────────────────────────

const metrics = {
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
  request_durations: [],
  endpoint_stats: {},
  activeUsers: 0,

  // Timeline snapshots (captured every TIMELINE_INTERVAL_MS)
  timeline: [],
  _intervalRequests: 0,
  _intervalErrors: 0,
  _intervalDurations: [],
};

function recordEndpoint(endpoint, duration, success) {
  if (!metrics.endpoint_stats[endpoint]) {
    metrics.endpoint_stats[endpoint] = { count: 0, errors: 0, durations: [] };
  }
  metrics.endpoint_stats[endpoint].count++;
  if (!success) metrics.endpoint_stats[endpoint].errors++;
  metrics.endpoint_stats[endpoint].durations.push(duration);

  metrics.total_requests++;
  metrics.request_durations.push(duration);
  metrics._intervalRequests++;
  metrics._intervalDurations.push(duration);
  if (success) metrics.successful_requests++;
  else { metrics.failed_requests++; metrics._intervalErrors++; }
}

function captureTimelineSnapshot() {
  const durations = metrics._intervalDurations.sort((a, b) => a - b);
  const elapsed = (metrics.timeline.length + 1) * (TIMELINE_INTERVAL_MS / 1000);
  const rps = metrics._intervalRequests / (TIMELINE_INTERVAL_MS / 1000);
  const p95 = calculatePercentile(durations, 95);
  const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  metrics.timeline.push({
    elapsed,
    rps: parseFloat(rps.toFixed(1)),
    p95: Math.round(p95),
    avg: Math.round(avg),
    errors: metrics._intervalErrors,
    requests: metrics._intervalRequests,
    activeUsers: metrics.activeUsers,
  });

  // Reset interval counters
  metrics._intervalRequests = 0;
  metrics._intervalErrors = 0;
  metrics._intervalDurations = [];
}

// ─── HTTP Client ────────────────────────────────────────────────────────────

function makeRequest(method, urlPath, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      agent: isHttps ? httpsAgent : httpAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      timeout: 15000,
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const startTime = Date.now();
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, duration, data: json });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, duration: Date.now() - startTime, error: err.message, data: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, duration: Date.now() - startTime, error: 'Timeout', data: null });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Business Transaction ───────────────────────────────────────────────────

async function runBusinessTransaction(userId) {
  try {
    // Step 1: Login
    const account = randomItem(TEST_ACCOUNTS);
    const loginRes = await makeRequest('POST', '/api/auth/login', account);
    recordEndpoint('POST /api/auth/login', loginRes.duration, loginRes.status === 200);

    if (loginRes.status !== 200 || !loginRes.data?.token) return;
    const token = loginRes.data.token;
    await sleep(THINK_TIME_MS);

    // Step 2: Search Products
    const searchRes = await makeRequest('GET', '/api/products?q=laptop&limit=10', null, token);
    recordEndpoint('GET /api/products', searchRes.duration, searchRes.status === 200);
    await sleep(THINK_TIME_MS);

    // Step 3: Get Categories
    const catRes = await makeRequest('GET', '/api/products/categories', null, token);
    recordEndpoint('GET /api/products/categories', catRes.duration, catRes.status === 200);
    await sleep(THINK_TIME_MS);

    // Step 4: View Product Detail
    const slug = randomItem(PRODUCT_SLUGS);
    const detailRes = await makeRequest('GET', `/api/products/${slug}`, null, token);
    recordEndpoint('GET /api/products/:slug', detailRes.duration, detailRes.status === 200 || detailRes.status === 404);
    await sleep(THINK_TIME_MS);

    // Step 5: Add to Cart
    const productId = detailRes.data?.id || Math.floor(Math.random() * 50) + 1;
    const cartRes = await makeRequest('POST', '/api/cart', { product_id: productId, quantity: 1 }, token);
    recordEndpoint('POST /api/cart', cartRes.duration, cartRes.status === 200 || cartRes.status === 201);
    await sleep(THINK_TIME_MS);

    // Step 6: View Cart
    const viewCartRes = await makeRequest('GET', '/api/cart', null, token);
    recordEndpoint('GET /api/cart', viewCartRes.duration, viewCartRes.status === 200);
    await sleep(THINK_TIME_MS);

    // Step 7: Checkout
    const checkoutRes = await makeRequest('POST', '/api/orders', {
      shipping_address: { street: `${100 + userId} Perf St`, city: 'LoadCity', state: 'TS', zip: '12345', country: 'US' },
      payment_method: 'credit_card',
    }, token);
    recordEndpoint('POST /api/orders', checkoutRes.duration, checkoutRes.status === 201);

  } catch (err) {
    // Silently count as failed
    metrics.failed_requests++;
  }
}

// ─── Virtual User Loop ──────────────────────────────────────────────────────

async function runVirtualUser(userId) {
  const startTime = Date.now();
  metrics.activeUsers++;

  while (Date.now() - startTime < TEST_DURATION_MS) {
    await runBusinessTransaction(userId);
    await sleep(THINK_TIME_MS + Math.random() * 500);
  }

  metrics.activeUsers--;
}

// ─── Percentile Calculator ──────────────────────────────────────────────────

function calculatePercentile(sortedArr, percentile) {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateReport() {
  const reqDurations = [...metrics.request_durations].sort((a, b) => a - b);
  const totalTimeSec = TEST_DURATION_MS / 1000;
  const rps = metrics.total_requests / totalTimeSec;

  // Build endpoint breakdown with full percentile data
  const byEndpoint = {};
  for (const [name, stats] of Object.entries(metrics.endpoint_stats)) {
    const sorted = [...stats.durations].sort((a, b) => a - b);
    byEndpoint[name] = {
      count: stats.count,
      errors: stats.errors,
      min: sorted[0] || 0,
      avg: parseFloat((sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1)).toFixed(1)),
      p50: calculatePercentile(sorted, 50),
      p75: calculatePercentile(sorted, 75),
      p90: calculatePercentile(sorted, 90),
      p95: calculatePercentile(sorted, 95),
      p99: calculatePercentile(sorted, 99),
      max: sorted[sorted.length - 1] || 0,
    };
  }

  return {
    test_config: {
      concurrent_users: CONCURRENT_USERS,
      duration_seconds: totalTimeSec,
      target_base_url: BASE_URL,
      think_time_ms: THINK_TIME_MS,
    },
    summary: {
      total_requests: metrics.total_requests,
      successful_requests: metrics.successful_requests,
      failed_requests: metrics.failed_requests,
      success_rate: metrics.total_requests > 0
        ? ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(2) + '%'
        : '0%',
      requests_per_second: rps.toFixed(2),
    },
    response_times_ms: {
      overall: {
        min: reqDurations[0] || 0,
        avg: parseFloat((reqDurations.reduce((a, b) => a + b, 0) / (reqDurations.length || 1)).toFixed(1)),
        p50: calculatePercentile(reqDurations, 50),
        p75: calculatePercentile(reqDurations, 75),
        p90: calculatePercentile(reqDurations, 90),
        p95: calculatePercentile(reqDurations, 95),
        p99: calculatePercentile(reqDurations, 99),
        max: reqDurations[reqDurations.length - 1] || 0,
      },
      by_endpoint: byEndpoint,
    },
    timeline: metrics.timeline,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     PerfPilot LoadRunner — Node.js Engine               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Target:       ${BASE_URL.padEnd(40)}║`);
  console.log(`║  Users:        ${String(CONCURRENT_USERS).padEnd(40)}║`);
  console.log(`║  Duration:     ${(TEST_DURATION_MS / 1000) + 's'.padEnd(39)}║`);
  console.log(`║  Scenario:     Login → Search → Detail → Cart → Checkout║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Health check
  console.log('📡 Checking backend health...');
  const healthRes = await makeRequest('GET', '/api/health');
  if (healthRes.status === 200) {
    console.log(`   ✓ Backend healthy (${healthRes.duration}ms)\n`);
  } else {
    console.error(`   ✗ Backend not responding at ${BASE_URL}`);
    process.exit(1);
  }

  console.log(`🚀 Starting load test with ${CONCURRENT_USERS} virtual users...\n`);

  const startTime = Date.now();

  // Start timeline capture
  const timelineInterval = setInterval(() => captureTimelineSnapshot(), TIMELINE_INTERVAL_MS);

  // Start virtual users
  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(runVirtualUser(i));
  }

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const total = Math.floor(TEST_DURATION_MS / 1000);
    const pct = Math.min(100, Math.floor((elapsed / total) * 100));
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    console.log(`   [${bar}] ${pct}% | Reqs: ${metrics.total_requests} | Errors: ${metrics.failed_requests} | Active: ${metrics.activeUsers}`);
  }, 3000);

  await Promise.all(promises);
  clearInterval(progressInterval);
  clearInterval(timelineInterval);

  // Capture final timeline snapshot
  captureTimelineSnapshot();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Load test complete! (${totalTime}s elapsed)`);

  // Generate report
  const report = generateReport();

  // Print summary
  const rt = report.response_times_ms.overall;
  const sm = report.summary;
  console.log('');
  console.log('📊 RESULTS');
  console.log(`   Requests:     ${sm.total_requests} total, ${sm.failed_requests} failed (${sm.success_rate} success)`);
  console.log(`   Throughput:   ${sm.requests_per_second} req/s`);
  console.log(`   Response:     avg=${rt.avg}ms, p50=${rt.p50}ms, p95=${rt.p95}ms, max=${rt.max}ms`);
  console.log('');

  // Save results
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const resultsPath = path.join(reportsDir, 'load-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
  console.log(`💾 Results saved to: reports/load-test-results.json`);
}

main().catch(err => {
  console.error('Load test failed:', err.message);
  process.exit(1);
});
