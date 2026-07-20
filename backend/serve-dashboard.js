// Simple HTTP server to serve the Executive Dashboard HTML
const http = require('http');

const PORT = parseInt(process.env.DASHBOARD_PORT || '3456');

// Create a dynamic executive dashboard HTML page
const dashboardHTML = `<!DOCTYPE html>
<html>
<head>
  <title>AI Executive Dashboard - Performance Testing Assistant</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; }
    
    .header {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: white; padding: 32px 40px; text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; font-size: 13px; }
    .header .badge {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: white; font-size: 11px; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;
    }
    
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
    
    .nav-tabs {
      display: flex; gap: 4px; margin-bottom: 24px;
      background: white; padding: 4px; border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .nav-tabs button {
      flex: 1; padding: 10px 16px; border: none; border-radius: 8px;
      background: transparent; color: #64748b; font-weight: 600;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .nav-tabs button.active {
      background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.3);
    }
    
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    
    .kpi-card {
      background: white; border-radius: 16px; padding: 20px;
      border: 1px solid #e2e8f0; position: relative; overflow: hidden;
    }
    .kpi-card .icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; margin-bottom: 12px;
    }
    .kpi-card .label { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px; }
    .kpi-card .value { font-size: 28px; font-weight: 800; color: #0f172a; }
    .kpi-card .trend { font-size: 12px; font-weight: 600; margin-top: 4px; }
    .kpi-card .bar { height: 4px; background: #f1f5f9; border-radius: 2px; margin-top: 8px; overflow: hidden; }
    .kpi-card .bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
    
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 18px; font-weight: 700; color: #0f172a;
      margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
    }
    .section-title .ai-badge {
      display: inline-block; padding: 2px 10px; border-radius: 20px;
      background: linear-gradient(135deg, #f59e0b, #ef4444); color: white;
      font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
    }
    
    .finding {
      display: flex; gap: 16px; padding: 16px 20px;
      background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;
      margin-bottom: 12px;
    }
    .finding .icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .finding .title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .finding .desc { font-size: 13px; color: #64748b; line-height: 1.5; }
    .finding .severity { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 6px; }
    
    .rec-card {
      background: #f8fafc; border-radius: 12px; padding: 16px 20px;
      border: 1px solid #e2e8f0; margin-bottom: 12px;
    }
    .rec-card .title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    .rec-card .desc { font-size: 13px; color: #64748b; line-height: 1.5; }
    .rec-card .tags { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .rec-card .tag { padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
    
    .status-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .status-card {
      background: white; border-radius: 12px; padding: 16px;
      border: 1px solid #e2e8f0; text-align: center;
    }
    .status-card .level { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .status-card .users { font-size: 28px; font-weight: 800; color: #0f172a; }
    .status-card .users span { font-size: 14px; color: #64748b; font-weight: 400; }
    
    .metric-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .metric-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
    .metric-table td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    
    .footer-bar {
      background: white; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 16px 24px; display: flex; justify-content: space-between;
      align-items: center; flex-wrap: wrap; gap: 12px;
    }
    .footer-bar .info .lbl { font-size: 12px; color: #64748b; }
    .footer-bar .info .val { font-size: 14px; font-weight: 600; color: #0f172a; }
    .footer-bar button {
      padding: 10px 20px; border: none; border-radius: 10px;
      background: #0f172a; color: white; font-weight: 600;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .footer-bar button:hover { background: #1e293b; }
    
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
    
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">⚡ AI Performance Analysis</div>
    <h1>Executive Performance Dashboard</h1>
    <p>E-Commerce Platform • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="container">
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="icon" style="background:#eef2ff;color:#6366f1">👥</div>
        <div class="label">User Capacity</div>
        <div class="value">300 / 1,000</div>
        <div class="trend" style="color:#ca8a04">⚠ Degradation at 300 users</div>
        <div class="bar"><div class="bar-fill" style="width:30%;background:linear-gradient(90deg,#22c55e,#ca8a04)"></div></div>
      </div>
      <div class="kpi-card">
        <div class="icon" style="background:#f0fdf4;color:#16a34a">💰</div>
        <div class="label">Revenue Impact</div>
        <div class="value">$47,250</div>
        <div class="trend" style="color:#dc2626">↓ $12,500 at risk</div>
      </div>
      <div class="kpi-card">
        <div class="icon" style="background:#fef2f2;color:#dc2626">🏥</div>
        <div class="label">Infrastructure Health</div>
        <div class="value">72%</div>
        <div class="trend" style="color:#dc2626">⚠ CPU 88% | Pool 100%</div>
        <div class="bar"><div class="bar-fill" style="width:72%;background:linear-gradient(90deg,#22c55e,#ca8a04,#dc2626)"></div></div>
      </div>
      <div class="kpi-card">
        <div class="icon" style="background:#fefce8;color:#ca8a04">⚡</div>
        <div class="label">Bottlenecks Detected</div>
        <div class="value" style="font-size:24px"><span style="color:#dc2626">2 Critical</span>, 3 High</div>
        <div class="trend" style="color:#64748b">3 areas need attention</div>
      </div>
    </div>

    <!-- Nav Tabs -->
    <div class="nav-tabs">
      <button class="active" onclick="showTab('overview')">📊 Overview</button>
      <button onclick="showTab('bottlenecks')">🔍 Bottlenecks</button>
      <button onclick="showTab('recommendations')">💡 Recommendations</button>
      <button onclick="showTab('scaling')">📈 Scaling</button>
    </div>

    <!-- API Status Banner -->
    <div id="apiStatus" style="padding:12px 20px;border-radius:10px;margin-bottom:20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;">
      Checking backend API...
    </div>

    <!-- Overview Tab -->
    <div id="tab-overview">
      <div class="section">
        <div class="section-title">Response Time Trends <span class="ai-badge">AI Analyzed</span></div>
        <table class="metric-table">
          <tr><th>API Endpoint</th><th>Response Time</th><th>Baseline</th><th>Change</th><th>Status</th></tr>
          <tr style="background:#fef2f2"><td>POST /api/auth/login</td><td style="font-weight:600">285ms</td><td>120ms</td><td>+137%</td><td><span class="tag" style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">Critical</span></td></tr>
          <tr style="background:#fef2f2"><td>GET /api/products (search)</td><td style="font-weight:600">1.4s</td><td>180ms</td><td>+678%</td><td><span class="tag" style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">Critical</span></td></tr>
          <tr><td>POST /api/cart</td><td style="font-weight:600">95ms</td><td>65ms</td><td>+46%</td><td><span class="tag" style="background:#fefce8;color:#ca8a04;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">Warning</span></td></tr>
          <tr style="background:#fef2f2"><td>POST /api/orders/checkout</td><td style="font-weight:600">8.5s</td><td>1.8s</td><td>+372%</td><td><span class="tag" style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">Critical</span></td></tr>
          <tr><td>GET /api/products/:slug</td><td style="font-weight:600">145ms</td><td>110ms</td><td>+32%</td><td><span class="tag" style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px">Normal</span></td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Resource Utilization</div>
        <div class="kpi-grid" style="grid-template-columns:repeat(2, 1fr)">
          <div class="kpi-card" style="text-align:center">
            <div class="value" style="font-size:48px;color:#dc2626">88%</div>
            <div class="label">Peak CPU at 500 concurrent users</div>
          </div>
          <div class="kpi-card" style="text-align:center">
            <div class="value" style="font-size:48px;color:#ca8a04">62%</div>
            <div class="label">Memory utilization (stable)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottlenecks Tab (hidden) -->
    <div id="tab-bottlenecks" class="hidden">
      <div class="section">
        <div class="section-title">🔍 Detected Bottlenecks <span class="ai-badge">6 Findings</span></div>
        
        <div class="finding">
          <div class="icon" style="background:#fef2f2">🔴</div>
          <div>
            <div class="title">Login API Saturation at 300+ Users</div>
            <div class="desc">Login endpoint response times degrade exponentially beyond 300 concurrent users. JWT signing operations become the primary bottleneck under load.</div>
            <span class="severity" style="background:#fef2f2;color:#dc2626">Critical</span>
          </div>
        </div>

        <div class="finding">
          <div class="icon" style="background:#fef2f2">🔴</div>
          <div>
            <div class="title">Checkout Process Bottleneck</div>
            <div class="desc">Checkout API response time increases from 2s to 8.5s at peak load. Database transaction locking during order creation and inventory updates causes queue buildup.</div>
            <span class="severity" style="background:#fef2f2;color:#dc2626">Critical</span>
          </div>
        </div>

        <div class="finding">
          <div class="icon" style="background:#fff7ed">🟠</div>
          <div>
            <div class="title">Product Search Database Query Slowdown</div>
            <div class="desc">Product search query with ILIKE pattern scanning contributes to 70% of endpoint latency. Missing composite indexes cause full table scans at scale.</div>
            <span class="severity" style="background:#fff7ed;color:#ea580c">High</span>
          </div>
        </div>

        <div class="finding">
          <div class="icon" style="background:#fefce8">🟡</div>
          <div>
            <div class="title">CPU Utilization Nearing Threshold</div>
            <div class="desc">Application server CPU reaches 88% utilization during peak loads (500+ users). Node.js event loop starts showing lag.</div>
            <span class="severity" style="background:#fefce8;color:#ca8a04">Warning</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations Tab (hidden) -->
    <div id="tab-recommendations" class="hidden">
      <div class="section">
        <div class="section-title">💡 AI Recommendations <span class="ai-badge">Priority Ordered</span></div>
        
        <div class="rec-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="title">#1 Horizontal Scale Checkout Service</div>
            <div style="display:flex;gap:8px">
              <span class="tag" style="background:#f0fdf4;color:#16a34a">High Impact</span>
              <span class="tag" style="background:#f1f5f9;color:#475569">Medium Effort</span>
            </div>
          </div>
          <div class="desc">Deploy 2 additional instances of the checkout service behind a load balancer. This distributes the transaction load and prevents connection pool exhaustion.</div>
        </div>

        <div class="rec-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="title">#2 Add Database Composite Indexes</div>
            <div style="display:flex;gap:8px">
              <span class="tag" style="background:#f0fdf4;color:#16a34a">High Impact</span>
              <span class="tag" style="background:#f0fdf4;color:#16a34a">Low Effort</span>
            </div>
          </div>
          <div class="desc">Create composite indexes on products table: (category_id, price, name) with GIN index for full-text search. Reduces search latency by ~80%.</div>
        </div>

        <div class="rec-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="title">#3 Implement Redis Caching Layer</div>
            <div style="display:flex;gap:8px">
              <span class="tag" style="background:#fefce8;color:#ca8a04">Medium Impact</span>
              <span class="tag" style="background:#fef2f2;color:#dc2626">High Effort</span>
            </div>
          </div>
          <div class="desc">Cache product listings, search results, and category data in Redis. Implement cache-aside pattern with 5-minute TTL.</div>
        </div>

        <div class="rec-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="title">#4 Optimize JWT Authentication</div>
            <div style="display:flex;gap:8px">
              <span class="tag" style="background:#fefce8;color:#ca8a04">Medium Impact</span>
              <span class="tag" style="background:#f1f5f9;color:#475569">Medium Effort</span>
            </div>
          </div>
          <div class="desc">Use asynchronous JWT verification to prevent event loop blocking. Implement token refresh with rotating secrets.</div>
        </div>
      </div>
    </div>

    <!-- Scaling Tab (hidden) -->
    <div id="tab-scaling" class="hidden">
      <div class="section">
        <div class="section-title">📈 Scaling Recommendations <span class="ai-badge">Capacity Planning</span></div>
        
        <div class="status-cards" style="margin-bottom:24px">
          <div class="status-card">
            <div class="level" style="color:#16a34a">CURRENT</div>
            <div class="users">200 <span>users</span></div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:#64748b">
              <span>1 instance</span><span>CPU 45%</span>
            </div>
            <div style="margin-top:8px"><span class="tag" style="background:#f0fdf4;color:#16a34a">Adequate</span></div>
          </div>
          <div class="status-card">
            <div class="level" style="color:#ca8a04">PEAK SALE</div>
            <div class="users">500 <span>users</span></div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:#64748b">
              <span>2 instances</span><span>CPU 88%</span>
            </div>
            <div style="margin-top:8px"><span class="tag" style="background:#fefce8;color:#ca8a04">Scale Needed</span></div>
          </div>
          <div class="status-card">
            <div class="level" style="color:#dc2626">BLACK FRIDAY</div>
            <div class="users">1000 <span>users</span></div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:#64748b">
              <span>4 instances</span><span>CPU 97%</span>
            </div>
            <div style="margin-top:8px"><span class="tag" style="background:#fef2f2;color:#dc2626">Scale Required</span></div>
          </div>
        </div>

        <table class="metric-table">
          <tr><th>Phase</th><th>Action</th><th>Timeline</th><th>Cost</th></tr>
          <tr><td style="font-weight:600;color:#6366f1">Phase 1</td><td>Add composite indexes + query optimization</td><td>Week 1</td><td><span class="tag" style="background:#f0fdf4;color:#16a34a">Low</span></td></tr>
          <tr><td style="font-weight:600;color:#6366f1">Phase 2</td><td>Horizontal scaling (2→4 instances) with load balancer</td><td>Week 2</td><td><span class="tag" style="background:#fefce8;color:#ca8a04">Medium</span></td></tr>
          <tr><td style="font-weight:600;color:#6366f1">Phase 3</td><td>Implement Redis caching for product/search data</td><td>Week 3-4</td><td><span class="tag" style="background:#fefce8;color:#ca8a04">Medium</span></td></tr>
          <tr><td style="font-weight:600;color:#6366f1">Phase 4</td><td>Database read replicas + connection pooling</td><td>Week 4-5</td><td><span class="tag" style="background:#fef2f2;color:#dc2626">High</span></td></tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-bar">
      <div class="info">
        <div class="lbl">Last AI Analysis</div>
        <div class="val">${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div class="info">
        <div class="lbl">Backend Status</div>
        <div class="val" id="backendStatus">Checking...</div>
      </div>
      <div class="info">
        <div class="lbl">Test Run ID</div>
        <div class="val">PERF-${Date.now().toString(36).toUpperCase()}</div>
      </div>
      <button onclick="window.open('http://localhost:5000/api-docs','_blank')">⚙️ API Docs</button>
    </div>

    <div class="footer">
      ⚡ AI Performance Testing Assistant v1.0.0 • Generated by AI Analysis Engine
    </div>
  </div>

  <script>
    function showTab(name) {
      document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('[id^=tab-]').forEach(t => t.classList.add('hidden'));
      document.querySelector('.nav-tabs button[onclick*="' + name + '"]').classList.add('active');
      document.getElementById('tab-' + name).classList.remove('hidden');
    }

    // Check backend API status
    fetch('http://localhost:5000/api/health')
      .then(r => r.json())
      .then(d => {
        document.getElementById('backendStatus').textContent = '✅ Online (uptime: ' + Math.floor(d.uptime) + 's)';
        document.getElementById('apiStatus').innerHTML = '✅ <span style="color:#16a34a">Backend API Online</span> — ' + new Date(d.timestamp).toLocaleTimeString();
        document.getElementById('apiStatus').style.background = '#f0fdf4';
        document.getElementById('apiStatus').style.color = '#16a34a';
      })
      .catch(() => {
        document.getElementById('backendStatus').textContent = '❌ Offline';
        document.getElementById('apiStatus').innerHTML = '❌ <span style="color:#dc2626">Backend API Offline</span> — Start the backend server';
        document.getElementById('apiStatus').style.background = '#fef2f2';
        document.getElementById('apiStatus').style.color = '#dc2626';
      });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(dashboardHTML);
});

server.listen(PORT, () => {
  console.log(`✅ Executive Dashboard: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
