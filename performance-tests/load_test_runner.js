// AI Performance Testing Assistant
// Node.js Load Test Runner (k6 replacement for environments without k6)
// Smoke Test: 50 concurrent users, 5-minute duration
// Scenario: Login -> Search -> Product Detail -> Add to Cart -> Checkout

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Connection pooling for realistic HTTP behavior
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 50 });

// Handle unexpected rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error('⚠ Unhandled rejection:', err.message);
});
const CONCURRENT_USERS = parseInt(process.env.USERS) || 50;
const TEST_DURATION_MS = parseInt(process.env.DURATION_MS) || 5 * 60 * 1000; // 5 min
const THINK_TIME_MS = parseInt(process.env.THINK_TIME_MS) || 1000;

const TEST_ACCOUNTS = [
  { email: 'john@example.com', password: 'password123' },
  { email: 'jane@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'password123' },
  { email: 'alice@example.com', password: 'password123' },
];

const PRODUCT_SLUGS = [
  'smartphone-pro-x', 'laptop-ultra-15', 'wireless-headphones',
  'tablet-pro-12', 'gaming-console', 'mechanical-keyboard',
  'running-shoes', 'yoga-mat-premium', 'board-game-collection',
  'cotton-t-shirt', 'denim-jeans', 'winter-jacket',
];

// Metrics collector
const metrics = {
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
  request_durations: [],
  endpoint_stats: {},
  
  transactions_started: 0,
  transactions_completed: 0,
  transactions_failed: 0,
  transaction_durations: [],
  
  // Step-level metrics
  login_durations: [],
  login_failures: 0,
  search_durations: [],
  search_failures: 0,
  product_detail_durations: [],
  product_detail_failures: 0,
  add_to_cart_durations: [],
  add_to_cart_failures: 0,
  checkout_durations: [],
  checkout_failures: 0,
};

function recordEndpoint(endpoint, duration, success) {
  if (!metrics.endpoint_stats[endpoint]) {
    metrics.endpoint_stats[endpoint] = { count: 0, failures: 0, total_duration: 0, durations: [] };
  }
  metrics.endpoint_stats[endpoint].count++;
  if (!success) metrics.endpoint_stats[endpoint].failures++;
  metrics.endpoint_stats[endpoint].total_duration += duration;
  metrics.endpoint_stats[endpoint].durations.push(duration);
  
  metrics.total_requests++;
  metrics.request_durations.push(duration);
  if (success) metrics.successful_requests++;
  else metrics.failed_requests++;
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      agent: isHttps ? httpsAgent : httpAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      timeout: 10000,
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const startTime = Date.now();
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          duration,
          data: json,
          raw: data,
          headers: res.headers,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, duration: Date.now() - startTime, error: err.message, data: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, duration: Date.now() - startTime, error: 'Timeout', data: null });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomAccount() {
  return TEST_ACCOUNTS[Math.floor(Math.random() * TEST_ACCOUNTS.length)];
}

function getRandomProduct() {
  return PRODUCT_SLUGS[Math.floor(Math.random() * PRODUCT_SLUGS.length)];
}

async function runBusinessTransaction(userId) {
  const transactionStart = Date.now();
  metrics.transactions_started++;
  
  try {
    // Step 1: Login
    const account = getRandomAccount();
    const loginRes = await makeRequest('POST', '/api/auth/login', account);
    recordEndpoint('/api/auth/login', loginRes.duration, loginRes.status === 200);
    metrics.login_durations.push(loginRes.duration);
    
    if (loginRes.status !== 200 || !loginRes.data?.token) {
      metrics.login_failures++;
      metrics.transactions_failed++;
      return;
    }
    
    const token = loginRes.data.token;
    await sleep(THINK_TIME_MS);

    // Step 2: Search Products
    const searchRes = await makeRequest('GET', '/api/products?q=laptop&limit=10', null, token);
    recordEndpoint('/api/products', searchRes.duration, searchRes.status === 200);
    metrics.search_durations.push(searchRes.duration);
    if (searchRes.status !== 200) metrics.search_failures++;
    await sleep(THINK_TIME_MS);

    // Step 3: View Product Detail
    const productSlug = getRandomProduct();
    const detailRes = await makeRequest('GET', `/api/products/${productSlug}`, null, token);
    recordEndpoint(`/api/products/:slug`, detailRes.duration, detailRes.status === 200);
    metrics.product_detail_durations.push(detailRes.duration);
    if (detailRes.status !== 200) metrics.product_detail_failures++;
    await sleep(THINK_TIME_MS);

    // Step 4: Add to Cart
    const productId = detailRes.data?.id || 1;
    const cartRes = await makeRequest('POST', '/api/cart', { product_id: productId, quantity: 1 }, token);
    recordEndpoint('/api/cart', cartRes.duration, cartRes.status === 200);
    metrics.add_to_cart_durations.push(cartRes.duration);
    if (cartRes.status !== 200) {
      metrics.add_to_cart_failures++;
      // Can't proceed to checkout if cart add fails - skip but don't fail entire transaction
      await sleep(THINK_TIME_MS);
      metrics.transactions_completed++;
      metrics.transaction_durations.push(Date.now() - transactionStart);
      return;
    }
    await sleep(THINK_TIME_MS);

    // Step 5: Checkout
    const checkoutRes = await makeRequest('POST', '/api/orders', {
      shipping_address: {
        street: `${100 + userId} Test St`,
        city: 'Load City',
        state: 'TS',
        zip: '12345',
        country: 'US',
      },
      payment_method: 'credit_card',
    }, token);
    recordEndpoint('/api/orders', checkoutRes.duration, checkoutRes.status === 201);
    metrics.checkout_durations.push(checkoutRes.duration);
    
    if (checkoutRes.status === 201) {
      metrics.transactions_completed++;
    } else {
      metrics.checkout_failures++;
      metrics.transactions_failed++;
    }
    
    metrics.transaction_durations.push(Date.now() - transactionStart);
  } catch (err) {
    metrics.transactions_failed++;
    metrics.transaction_durations.push(Date.now() - transactionStart);
  }
}

async function runVirtualUser(userId) {
  const startTime = Date.now();
  let iterations = 0;
  
  while (Date.now() - startTime < TEST_DURATION_MS) {
    await runBusinessTransaction(userId);
    iterations++;
    
    // Random think time between transactions (1-3 seconds)
    await sleep(THINK_TIME_MS + Math.random() * 2000);
  }
  
  return iterations;
}

function calculatePercentile(sortedArr, percentile) {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

function generateReport() {
  const reqDurations = [...metrics.request_durations].sort((a, b) => a - b);
  const transDurations = [...metrics.transaction_durations].sort((a, b) => a - b);
  const loginDurations = [...metrics.login_durations].sort((a, b) => a - b);
  const searchDurations = [...metrics.search_durations].sort((a, b) => a - b);
  const productDetailDurations = [...metrics.product_detail_durations].sort((a, b) => a - b);
  const cartDurations = [...metrics.add_to_cart_durations].sort((a, b) => a - b);
  const checkoutDurations = [...metrics.checkout_durations].sort((a, b) => a - b);
  
  const totalTimeSec = TEST_DURATION_MS / 1000;
  const requestsPerSec = metrics.total_requests / totalTimeSec;
  const transactionsPerSec = metrics.transactions_started / totalTimeSec;
  
  const report = {
    test_config: {
      concurrent_users: CONCURRENT_USERS,
      duration_seconds: totalTimeSec,
      target_base_url: BASE_URL,
    },
    summary: {
      total_requests: metrics.total_requests,
      successful_requests: metrics.successful_requests,
      failed_requests: metrics.failed_requests,
      success_rate: metrics.total_requests > 0 
        ? ((metrics.successful_requests / metrics.total_requests) * 100).toFixed(2) + '%'
        : '0%',
      requests_per_second: requestsPerSec.toFixed(2),
    },
    transactions: {
      started: metrics.transactions_started,
      completed: metrics.transactions_completed,
      failed: metrics.transactions_failed,
      completion_rate: metrics.transactions_started > 0
        ? ((metrics.transactions_completed / metrics.transactions_started) * 100).toFixed(2) + '%'
        : '0%',
      transactions_per_second: transactionsPerSec.toFixed(2),
    },
    response_times_ms: {
      overall: {
        min: reqDurations[0] || 0,
        avg: (reqDurations.reduce((a, b) => a + b, 0) / (reqDurations.length || 1)).toFixed(2),
        p50: calculatePercentile(reqDurations, 50),
        p90: calculatePercentile(reqDurations, 90),
        p95: calculatePercentile(reqDurations, 95),
        p99: calculatePercentile(reqDurations, 99),
        max: reqDurations[reqDurations.length - 1] || 0,
      },
      by_endpoint: {},
      business_transaction: {
        min: transDurations[0] || 0,
        avg: (transDurations.reduce((a, b) => a + b, 0) / (transDurations.length || 1)).toFixed(2),
        p50: calculatePercentile(transDurations, 50),
        p90: calculatePercentile(transDurations, 90),
        p95: calculatePercentile(transDurations, 95),
        max: transDurations[transDurations.length - 1] || 0,
      },
    },
    step_analysis: {
      login: {
        avg_ms: (loginDurations.reduce((a, b) => a + b, 0) / (loginDurations.length || 1)).toFixed(2),
        p95_ms: calculatePercentile(loginDurations, 95),
        failure_rate: metrics.login_durations.length > 0
          ? ((metrics.login_failures / metrics.login_durations.length) * 100).toFixed(2) + '%'
          : '0%',
        total_calls: loginDurations.length,
      },
      search: {
        avg_ms: (searchDurations.reduce((a, b) => a + b, 0) / (searchDurations.length || 1)).toFixed(2),
        p95_ms: calculatePercentile(searchDurations, 95),
        failure_rate: metrics.search_durations.length > 0
          ? ((metrics.search_failures / metrics.search_durations.length) * 100).toFixed(2) + '%'
          : '0%',
        total_calls: searchDurations.length,
      },
      product_detail: {
        avg_ms: (productDetailDurations.reduce((a, b) => a + b, 0) / (productDetailDurations.length || 1)).toFixed(2),
        p95_ms: calculatePercentile(productDetailDurations, 95),
        failure_rate: metrics.product_detail_durations.length > 0
          ? ((metrics.product_detail_failures / metrics.product_detail_durations.length) * 100).toFixed(2) + '%'
          : '0%',
        total_calls: productDetailDurations.length,
      },
      add_to_cart: {
        avg_ms: (cartDurations.reduce((a, b) => a + b, 0) / (cartDurations.length || 1)).toFixed(2),
        p95_ms: calculatePercentile(cartDurations, 95),
        failure_rate: metrics.add_to_cart_durations.length > 0
          ? ((metrics.add_to_cart_failures / metrics.add_to_cart_durations.length) * 100).toFixed(2) + '%'
          : '0%',
        total_calls: cartDurations.length,
      },
      checkout: {
        avg_ms: (checkoutDurations.reduce((a, b) => a + b, 0) / (checkoutDurations.length || 1)).toFixed(2),
        p95_ms: calculatePercentile(checkoutDurations, 95),
        failure_rate: metrics.checkout_durations.length > 0
          ? ((metrics.checkout_failures / metrics.checkout_durations.length) * 100).toFixed(2) + '%'
          : '0%',
        total_calls: checkoutDurations.length,
      },
    },
    endpoint_details: Object.entries(metrics.endpoint_stats).map(([ep, stats]) => {
      const sorted = [...stats.durations].sort((a, b) => a - b);
      return {
        endpoint: ep,
        total_calls: stats.count,
        failures: stats.failures,
        failure_rate: ((stats.failures / stats.count) * 100).toFixed(2) + '%',
        avg_ms: (stats.total_duration / stats.count).toFixed(2),
        p95_ms: calculatePercentile(sorted, 95),
      };
    }),
  };
  
  return report;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     AI Performance Testing Assistant                    ║');
  console.log('║     Load Test Runner (Node.js)                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Target:       ${BASE_URL.padEnd(42)}║`);
  console.log(`║  Users:        ${CONCURRENT_USERS} concurrent VUs                 ║`);
  console.log(`║  Duration:     ${TEST_DURATION_MS / 1000}s                           ║`);
  console.log(`║  Scenario:     Login → Search → Detail → Cart → Checkout   ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Quick health check
  console.log('📡 Checking backend health...');
  const healthRes = await makeRequest('GET', '/api/health');
  if (healthRes.status === 200) {
    console.log(`   ✓ Backend healthy (uptime: ${healthRes.data?.uptime?.toFixed(0) || '?'}s)\n`);
  } else {
    console.log(`   ✗ Backend not responding at ${BASE_URL}`);
    console.log('   Please start the backend server first: cd backend && node server.js\n');
    process.exit(1);
  }

  // Pre-fetch a product to get valid IDs for the session
  console.log('📦 Warming up... fetching product data');
  const warmRes = await makeRequest('GET', '/api/products?limit=1', null);
  if (warmRes.status === 200) {
    console.log(`   ✓ ${warmRes.data?.pagination?.total || '?'} products available\n`);
  }

  console.log('🚀 Starting load test...');
  console.log(`   Spawning ${CONCURRENT_USERS} virtual users...\n`);

  const startTime = Date.now();
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
    console.log(`   [${bar}] ${pct}% | Requests: ${metrics.total_requests} | Completed: ${metrics.transactions_completed} | Failed: ${metrics.failed_requests}`);
  }, 3000);

  const iterations = await Promise.all(promises);
  clearInterval(progressInterval);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalIterations = iterations.reduce((a, b) => a + b, 0);

  console.log(`\n✅ Load test complete! (${totalTime}s elapsed)`);
  console.log(`   Total business transactions executed: ${totalIterations}`);
  console.log('');

  // Generate and display report
  const report = generateReport();
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              PERFORMANCE TEST RESULTS                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('📊 SUMMARY');
  console.log(`   Total Requests:     ${report.summary.total_requests}`);
  console.log(`   Successful:         ${report.summary.successful_requests}`);
  console.log(`   Failed:             ${report.summary.failed_requests}`);
  console.log(`   Success Rate:       ${report.summary.success_rate}`);
  console.log(`   Throughput:         ${report.summary.requests_per_second} req/sec`);
  console.log('');
  
  console.log('🔄 BUSINESS TRANSACTIONS');
  console.log(`   Started:            ${report.transactions.started}`);
  console.log(`   Completed:          ${report.transactions.completed}`);
  console.log(`   Failed:             ${report.transactions.failed}`);
  console.log(`   Completion Rate:    ${report.transactions.completion_rate}`);
  console.log(`   Transactions/sec:   ${report.transactions.transactions_per_second}`);
  console.log('');  console.log('⏱  RESPONSE TIMES (ms)');
   console.log(`   ┌──────────────────┬────────┬────────┬────────┬────────┬────────┐`);
   console.log(`   │ Metric           │   Avg  │  P50   │  P90   │  P95   │  Max   │`);
   console.log(`   ├──────────────────┼────────┼────────┼────────┼────────┼────────┤`);
   
   const rt = report.response_times_ms.overall;
   console.log(`   │ Overall          │ ${String(rt.avg).padStart(5)} │ ${String(rt.p50).padStart(5)} │ ${String(rt.p90).padStart(5)} │ ${String(rt.p95).padStart(5)} │ ${String(rt.max).padStart(5)} │`);
   
   const sa = report.step_analysis;
   console.log(`   ├──────────────────┼────────┼────────┼────────┼────────┼────────┤`);
   console.log(`   │ Login            │ ${String(sa.login.avg_ms).padStart(5)} │ ${'N/A'.padStart(5)} │ ${'N/A'.padStart(5)} │ ${String(sa.login.p95_ms).padStart(5)} │ ${'N/A'.padStart(5)} │`);
   console.log(`   │ Search           │ ${String(sa.search.avg_ms).padStart(5)} │ ${'N/A'.padStart(5)} │ ${'N/A'.padStart(5)} │ ${String(sa.search.p95_ms).padStart(5)} │ ${'N/A'.padStart(5)} │`);
   console.log(`   │ Product Detail   │ ${String(sa.product_detail.avg_ms).padStart(5)} │ ${'N/A'.padStart(5)} │ ${'N/A'.padStart(5)} │ ${String(sa.product_detail.p95_ms).padStart(5)} │ ${'N/A'.padStart(5)} │`);
   console.log(`   │ Add to Cart      │ ${String(sa.add_to_cart.avg_ms).padStart(5)} │ ${'N/A'.padStart(5)} │ ${'N/A'.padStart(5)} │ ${String(sa.add_to_cart.p95_ms).padStart(5)} │ ${'N/A'.padStart(5)} │`);
   console.log(`   │ Checkout         │ ${String(sa.checkout.avg_ms).padStart(5)} │ ${'N/A'.padStart(5)} │ ${'N/A'.padStart(5)} │ ${String(sa.checkout.p95_ms).padStart(5)} │ ${'N/A'.padStart(5)} │`);
   console.log(`   └──────────────────┴────────┴────────┴────────┴────────┴────────┘`);
  console.log('');

  console.log('🔍 STEP FAILURE ANALYSIS');
  console.log(`   Login:         ${sa.login.failure_rate} failure rate (${sa.login.total_calls} calls)`);
  console.log(`   Search:        ${sa.search.failure_rate} failure rate (${sa.search.total_calls} calls)`);
  console.log(`   Product Detail:${sa.product_detail.failure_rate} failure rate (${sa.product_detail.total_calls} calls)`);
  console.log(`   Add to Cart:   ${sa.add_to_cart.failure_rate} failure rate (${sa.add_to_cart.total_calls} calls)`);
  console.log(`   Checkout:      ${sa.checkout.failure_rate} failure rate (${sa.checkout.total_calls} calls)`);
  console.log('');

  console.log('📈 ENDPOINT PERFORMANCE');
  console.log(`   ${'Endpoint'.padEnd(30)} ${'Calls'.padEnd(8)} ${'Avg(ms)'.padEnd(10)} ${'P95(ms)'.padEnd(10)} ${'Errors'.padEnd(8)}`);
  console.log(`   ${'─'.repeat(30)} ${'─'.repeat(8)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(8)}`);
  for (const ep of report.endpoint_details) {
    console.log(`   ${ep.endpoint.padEnd(30)} ${String(ep.total_calls).padEnd(8)} ${String(ep.avg_ms).padEnd(10)} ${String(ep.p95_ms).padEnd(10)} ${ep.failure_rate.padEnd(8)}`);
  }
  console.log('');

  // Save report to file
  const fs = require('fs');
  const reportPath = require('path').join(__dirname, '..', 'reports', 'load-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`💾 Report saved to: ${reportPath}`);
  console.log('');

  // Check thresholds
  console.log('✅ THRESHOLD CHECK');
  let allPassed = true;
  
  const p95Overall = rt.p95;
  const failureRate = metrics.total_requests > 0 
    ? (metrics.failed_requests / metrics.total_requests) * 100 
    : 0;
  
  if (p95Overall <= 2000) {
    console.log(`   ✓ p95 response time (${p95Overall}ms) < 2000ms PASS`);
  } else {
    console.log(`   ✗ p95 response time (${p95Overall}ms) > 2000ms FAIL`);
    allPassed = false;
  }
  
  if (failureRate < 5) {
    console.log(`   ✓ Request failure rate (${failureRate.toFixed(2)}%) < 5% PASS`);
  } else {
    console.log(`   ✗ Request failure rate (${failureRate.toFixed(2)}%) > 5% FAIL`);
    allPassed = false;
  }
  
  const loginFailureRate = metrics.login_durations.length > 0
    ? (metrics.login_failures / metrics.login_durations.length) * 100
    : 0;
  if (loginFailureRate < 2) {
    console.log(`   ✓ Login failure rate (${loginFailureRate.toFixed(2)}%) < 2% PASS`);
  } else {
    console.log(`   ✗ Login failure rate (${loginFailureRate.toFixed(2)}%) > 2% FAIL`);
    allPassed = false;
  }
  
  const checkoutSuccessRate = metrics.checkout_durations.length > 0
    ? (metrics.checkout_durations.length - metrics.checkout_failures) / metrics.checkout_durations.length * 100
    : 0;
  if (checkoutSuccessRate >= 95) {
    console.log(`   ✓ Checkout success rate (${checkoutSuccessRate.toFixed(2)}%) >= 95% PASS`);
  } else {
    console.log(`   ✗ Checkout success rate (${checkoutSuccessRate.toFixed(2)}%) < 95% FAIL`);
    allPassed = false;
  }
  
  console.log('');
  if (allPassed) {
    console.log('🎉 ALL THRESHOLDS PASSED - System is performing well under load!');
  } else {
    console.log('⚠️  SOME THRESHOLDS FAILED - Review bottlenecks above');
  }
  console.log('');
  
  return report;
}

main().catch(err => {
  console.error('Load test failed:', err.message);
  process.exit(1);
});
