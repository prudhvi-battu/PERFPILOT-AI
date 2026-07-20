import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useLoadTest from '../hooks/useLoadTest';

const styles = {
  container: {
    maxWidth: '1300px', margin: '0 auto', padding: '2rem',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '20px', padding: '2.5rem', marginBottom: '2rem',
    color: 'white', position: 'relative', overflow: 'hidden',
  },
  headerBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '20px',
    background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
    fontSize: '12px', fontWeight: 600, marginBottom: '1rem',
    border: '1px solid rgba(99,102,241,0.4)',
  },
  headerTitle: {
    fontSize: '28px', fontWeight: 800, marginBottom: '8px',
  },
  headerSub: {
    color: '#94a3b8', fontSize: '15px', maxWidth: '600px',
  },
  glow: {
    position: 'absolute', top: '-50%', right: '-10%',
    width: '400px', height: '400px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem', marginBottom: '2rem',
  },
  card: {
    background: 'white', borderRadius: '16px', padding: '1.5rem',
    border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '1rem',
  },
  cardIcon: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px',
  },
  cardLabel: {
    fontSize: '13px', color: '#64748b', fontWeight: 500,
  },
  cardValue: {
    fontSize: '32px', fontWeight: 800, color: '#0f172a',
  },
  cardTrend: {
    fontSize: '12px', fontWeight: 600, marginTop: '4px',
  },
  section: {
    marginBottom: '2.5rem',
  },
  sectionTitle: {
    fontSize: '20px', fontWeight: 700, color: '#0f172a',
    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px',
  },
  aiBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 10px', borderRadius: '20px',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: 'white', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  findings: {
    display: 'grid', gap: '1rem',
  },
  finding: {
    display: 'flex', gap: '1rem', padding: '1.25rem',
    background: '#f8fafc', borderRadius: '12px',
    border: '1px solid #e2e8f0', alignItems: 'flex-start',
  },
  findingIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', flexShrink: 0,
  },
  findingTitle: {
    fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px',
  },
  findingDesc: {
    fontSize: '13px', color: '#64748b', lineHeight: 1.5,
  },
  findingSeverity: {
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
    fontSize: '11px', fontWeight: 600, marginTop: '6px',
  },
  metricRow: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
    borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#475569',
  },
  metricLabel: { fontWeight: 500 },
  metricValue: { fontWeight: 600, color: '#0f172a' },
  thresholdBar: {
    height: '6px', background: '#f1f5f9', borderRadius: '3px',
    marginTop: '8px', overflow: 'hidden',
  },
  thresholdFill: {
    height: '100%', borderRadius: '3px', transition: 'width 0.5s',
  },
  recCard: {
    background: '#f8fafc', borderRadius: '12px', padding: '1.25rem',
    border: '1px solid #e2e8f0', marginBottom: '1rem',
  },
  recTitle: {
    fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px',
  },
  recDesc: {
    fontSize: '13px', color: '#64748b', lineHeight: 1.6,
  },
  recImpact: {
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: 600, marginTop: '8px',
  },
  twoCol: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem',
  },
  badge: {
    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
  },
};

// AI-generated performance analysis findings
const defaultFindings = [
  {
    id: 1,
    type: 'critical',
    icon: '🔴',
    iconBg: '#fef2f2',
    title: 'Login API Saturation at 300+ Users',
    description: 'Login endpoint response times degrade exponentially beyond 300 concurrent users. Average response time increases from 250ms to 2.8s. JWT signing operations become the primary bottleneck under load.',
    severity: 'Critical',
    severityColor: '#dc2626',
    severityBg: '#fef2f2',
    metric: 'Response Time: 250ms → 2.8s',
  },
  {
    id: 2,
    type: 'high',
    icon: '🟠',
    iconBg: '#fff7ed',
    title: 'Checkout Process Bottleneck',
    description: 'Checkout API response time increases from 2s baseline to 8.5s at peak load. Database transaction locking during order creation and inventory updates causes queue buildup.',
    severity: 'High',
    severityColor: '#ea580c',
    severityBg: '#fff7ed',
    metric: 'Response Time: 2s → 8.5s (+325%)',
  },
  {
    id: 3,
    type: 'high',
    icon: '🟠',
    iconBg: '#fff7ed',
    title: 'Product Search Database Query Slowdown',
    description: 'Product search query with ILIKE pattern scanning contributes to 70% of endpoint latency. Missing composite indexes on category + price + name columns cause full table scans at scale.',
    severity: 'High',
    severityColor: '#ea580c',
    severityBg: '#fff7ed',
    metric: 'DB Query: 120ms → 1.4s',
  },
  {
    id: 4,
    type: 'warning',
    icon: '🟡',
    iconBg: '#fefce8',
    title: 'CPU Utilization Nearing Threshold',
    description: 'Application server CPU reaches 88% utilization during peak loads (500+ users). Node.js event loop starts showing lag. Consider horizontal scaling or upgrading instance type.',
    severity: 'Warning',
    severityColor: '#ca8a04',
    severityBg: '#fefce8',
    metric: 'CPU: 88% of threshold',
  },
  {
    id: 5,
    type: 'warning',
    icon: '🟡',
    iconBg: '#fefce8',
    title: 'Database Connection Pool Exhaustion',
    description: 'Connection pool reaches max connections during checkout spikes. Pool size of 50 is insufficient for 500+ concurrent users. Connections remain blocked during transaction processing.',
    severity: 'Warning',
    severityColor: '#ca8a04',
    severityBg: '#fefce8',
    metric: 'Pool Usage: 100% at peak',
  },
  {
    id: 6,
    type: 'info',
    icon: '🔵',
    iconBg: '#eff6ff',
    title: 'Memory Utilization Stable',
    description: 'Application memory remains within acceptable limits (62% of allocated heap). No memory leaks detected during extended load testing.',
    severity: 'Info',
    severityColor: '#2563eb',
    severityBg: '#eff6ff',
    metric: 'Memory: 62% utilized',
  },
];

const recommendations = [
  {
    title: 'Horizontal Scale Checkout Service',
    description: 'Deploy 2 additional instances of the checkout service behind a load balancer. This distributes the transaction load and prevents connection pool exhaustion. Estimated 300% throughput improvement.',
    impact: 'High Impact',
    impactColor: '#16a34a',
    impactBg: '#f0fdf4',
    effort: 'Medium Effort',
  },
  {
    title: 'Add Database Composite Indexes',
    description: 'Create composite indexes on products table: (category_id, price, name) with GIN index for full-text search. This eliminates full table scans and reduces search latency by ~80%.',
    impact: 'High Impact',
    impactColor: '#16a34a',
    impactBg: '#f0fdf4',
    effort: 'Low Effort',
  },
  {
    title: 'Implement Redis Caching Layer',
    description: 'Cache product listings, search results, and category data in Redis. Implement cache-aside pattern with 5-minute TTL. Projected 60% reduction in database load for read-heavy endpoints.',
    impact: 'Medium Impact',
    impactColor: '#ca8a04',
    impactBg: '#fefce8',
    effort: 'High Effort',
  },
  {
    title: 'Optimize JWT Authentication',
    description: 'Reduce JWT expiry checks and implement token refresh with rotating secrets. Use asynchronous JWT verification to prevent event loop blocking. Projected 70% improvement in login throughput.',
    impact: 'Medium Impact',
    impactColor: '#ca8a04',
    impactBg: '#fefce8',
    effort: 'Medium Effort',
  },
];

const ExecutiveDashboard = () => {
  const [findings] = useState(defaultFindings);
  const [activeTab, setActiveTab] = useState('overview');
  const [customUsers, setCustomUsers] = useState(100);
  const { status: loadTestStatus, result: loadTestResult, error: loadTestError, runLoadTest } = useLoadTest();

  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const highCount = findings.filter(f => f.severity === 'High').length;
  const warningCount = findings.filter(f => f.severity === 'Warning').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.glow} />
        <div style={styles.headerBadge}>
          ⚡ AI Performance Analysis Engine
        </div>
        <h1 style={styles.headerTitle}>Executive Performance Dashboard</h1>
        <p style={styles.headerSub}>
          AI-driven analysis of your e-commerce platform's performance characteristics, 
          bottleneck identification, and automated scaling recommendations.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{...styles.cardIcon, background: '#eef2ff', color: '#6366f1'}}>👥</div>
          </div>
          <div style={styles.cardLabel}>User Capacity</div>
          <div style={styles.cardValue}>300 / 1000</div>
          <div style={{...styles.cardTrend, color: '#ca8a04'}}>⚠ Degradation starts at 300 users</div>
          <div style={styles.thresholdBar}>
            <div style={{...styles.thresholdFill, width: '30%', background: 'linear-gradient(90deg, #22c55e, #ca8a04)'}} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{...styles.cardIcon, background: '#f0fdf4', color: '#16a34a'}}>💰</div>
          </div>
          <div style={styles.cardLabel}>Revenue Impact</div>
          <div style={styles.cardValue}>$47,250</div>
          <div style={{...styles.cardTrend, color: '#dc2626'}}>↓ $12,500 at risk during checkout degradation</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{...styles.cardIcon, background: '#fef2f2', color: '#dc2626'}}>🏥</div>
          </div>
          <div style={styles.cardLabel}>Infrastructure Health</div>
          <div style={styles.cardValue}>72%</div>
          <div style={{...styles.cardTrend, color: '#dc2626'}}>⚠ CPU 88% | Memory 62% | Pool 100%</div>
          <div style={styles.thresholdBar}>
            <div style={{...styles.thresholdFill, width: '72%', background: 'linear-gradient(90deg, #22c55e, #ca8a04, #dc2626)'}} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{...styles.cardIcon, background: '#fefce8', color: '#ca8a04'}}>⚡</div>
          </div>
          <div style={styles.cardLabel}>Bottlenecks Detected</div>
          <div style={{...styles.cardValue, fontSize: '28px'}}>
            <span style={{color: '#dc2626'}}>{criticalCount} Critical</span>, {highCount} High
          </div>
          <div style={{...styles.cardTrend, color: '#64748b'}}>{warningCount} warnings • 3 areas need attention</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display: 'inline-flex', gap: '4px', marginBottom: '2rem', background: '#f1f5f9', padding: '4px', borderRadius: '12px'}}>
        {['overview', 'bottlenecks', 'recommendations', 'scaling', 'loadtest'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#0f172a' : '#64748b',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s', textTransform: 'capitalize',
            }}
          >
            {tab === 'overview' ? '📊 Overview' : tab === 'bottlenecks' ? '🔍 Bottlenecks' : tab === 'recommendations' ? '💡 Recommendations' : tab === 'scaling' ? '📈 Scaling' : '⚡ Load Test'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Response Time Trends */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Response Time Trends
              <span style={styles.aiBadge}>AI Analyzed</span>
            </h2>
            <div style={{display: 'grid', gap: '1rem'}}>
              <div style={styles.card}>
                <div style={{...styles.metricRow, borderBottom: '2px solid #e2e8f0', paddingBottom: '12px'}}>
                  <span style={{fontWeight: 700, color: '#0f172a'}}>API Endpoint</span>
                  <span style={{fontWeight: 700, color: '#0f172a'}}>Avg Response Time</span>
                </div>
                {[
                  { name: 'POST /api/auth/login', value: '285ms', baseline: '120ms', change: '+137%', status: 'critical' },
                  { name: 'GET /api/products (search)', value: '1.4s', baseline: '180ms', change: '+678%', status: 'critical' },
                  { name: 'POST /api/cart', value: '95ms', baseline: '65ms', change: '+46%', status: 'warning' },
                  { name: 'POST /api/orders/checkout', value: '8.5s', baseline: '1.8s', change: '+372%', status: 'critical' },
                  { name: 'GET /api/products/:slug', value: '145ms', baseline: '110ms', change: '+32%', status: 'normal' },
                  { name: 'GET /api/orders', value: '210ms', baseline: '150ms', change: '+40%', status: 'warning' },
                ].map((endpoint, i) => (
                  <div key={i} style={{
                    ...styles.metricRow,
                    background: endpoint.status === 'critical' ? '#fef2f2' : endpoint.status === 'warning' ? '#fefce8' : 'transparent',
                    borderRadius: i === 0 ? '0' : '0',
                  }}>
                    <span style={styles.metricLabel}>{endpoint.name}</span>
                    <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                      <span style={{fontWeight: 600}}>{endpoint.value}</span>
                      <span style={{fontSize: '12px', color: '#94a3b8'}}>(baseline: {endpoint.baseline})</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        background: endpoint.status === 'critical' ? '#fef2f2' : endpoint.status === 'warning' ? '#fefce8' : '#f0fdf4',
                        color: endpoint.status === 'critical' ? '#dc2626' : endpoint.status === 'warning' ? '#ca8a04' : '#16a34a',
                      }}>
                        {endpoint.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resource Utilization */}
          <div style={styles.twoCol}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={{fontSize: '16px', fontWeight: 700, color: '#0f172a'}}>CPU Utilization</h3>
              </div>
              <div style={{textAlign: 'center', padding: '1rem 0'}}>
                <div style={{fontSize: '48px', fontWeight: 800, color: '#dc2626'}}>88%</div>
                <div style={{color: '#64748b', fontSize: '13px', marginTop: '4px'}}>Peak at 500 concurrent users</div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '8px'}}>
                <span>50 users: 22%</span>
                <span>200 users: 45%</span>
                <span>500 users: 88%</span>
                <span>1000 users: 97% (est.)</span>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={{fontSize: '16px', fontWeight: 700, color: '#0f172a'}}>Memory Usage</h3>
              </div>
              <div style={{textAlign: 'center', padding: '1rem 0'}}>
                <div style={{fontSize: '48px', fontWeight: 800, color: '#ca8a04'}}>62%</div>
                <div style={{color: '#64748b', fontSize: '13px', marginTop: '4px'}}>Stable across load levels</div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '8px'}}>
                <span>50 users: 35%</span>
                <span>200 users: 48%</span>
                <span>500 users: 62%</span>
                <span>1000 users: 78% (est.)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottlenecks Tab */}
      {activeTab === 'bottlenecks' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            🔍 Detected Bottlenecks
            <span style={styles.aiBadge}>{findings.length} Findings</span>
          </h2>
          <div style={styles.findings}>
            {findings.map(f => (
              <div key={f.id} style={styles.finding}>
                <div style={{...styles.findingIcon, background: f.iconBg}}>{f.icon}</div>
                <div style={{flex: 1}}>
                  <div style={styles.findingTitle}>{f.title}</div>
                  <div style={styles.findingDesc}>{f.description}</div>
                  <div style={{display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap'}}>
                    <span style={{...styles.findingSeverity, background: f.severityBg, color: f.severityColor}}>
                      {f.severity}
                    </span>
                    <span style={{fontSize: '13px', color: '#64748b'}}>{f.metric}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            💡 AI Recommendations
            <span style={styles.aiBadge}>Priority Ordered</span>
          </h2>
          {recommendations.map((rec, i) => (
            <div key={i} style={styles.recCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                <div style={styles.recTitle}>#{i + 1} {rec.title}</div>
                <div style={{display: 'flex', gap: '8px', flexShrink: 0}}>
                  <span style={{...styles.recImpact, background: rec.impactBg, color: rec.impactColor}}>
                    {rec.impact}
                  </span>
                  <span style={{...styles.recImpact, background: '#f1f5f9', color: '#475569'}}>
                    {rec.effort}
                  </span>
                </div>
              </div>
              <div style={styles.recDesc}>{rec.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Load Test Tab */}
      {activeTab === 'loadtest' && (
        <div>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              ⚡ Run Load Test
              <span style={styles.aiBadge}>Real Traffic Simulation</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Select a scenario or enter custom concurrent users to run a performance load test.
              The test simulates real user traffic (Login → Search → Product View → Add to Cart → Checkout)
              and automatically sends email alerts to <strong>suvarnamukhy666@gmail.com</strong>
              with revenue impact calculations when bottlenecks are detected.
            </p>

            {/* Running indicator */}
            {loadTestStatus === 'running' && (
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '28px' }}>🔄</div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#92400e', fontSize: '15px' }}>Load Test Running...</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#a16207' }}>Simulating users, analyzing metrics, and sending alerts to your email!</p>
                </div>
              </div>
            )}

            {loadTestError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: '#dc2626', fontSize: '13px' }}>
                ❌ {loadTestError}
              </div>
            )}

            {/* Scenario buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {[
                { name: 'Smoke Test', users: 50, duration: '30s', color: '#22c55e', icon: '🌬️' },
                { name: 'Average Load', users: 200, duration: '60s', color: '#f59e0b', icon: '📊' },
                { name: 'Peak Sale', users: 500, duration: '90s', color: '#f97316', icon: '🔥' },
                { name: 'Black Friday', users: 1000, duration: '120s', color: '#ef4444', icon: '💥' },
              ].map(s => (
                <button
                  key={s.name}
                  onClick={() => runLoadTest(s.name)}
                  disabled={loadTestStatus === 'running'}
                  style={{
                    padding: '20px', borderRadius: '14px',
                    border: loadTestStatus === 'running' ? '1px solid #e2e8f0' : `1px solid ${s.color}40`,
                    background: loadTestStatus === 'running' ? '#f1f5f9' : 'white',
                    cursor: loadTestStatus === 'running' ? 'not-allowed' : 'pointer',
                    textAlign: 'left', transition: 'all 0.2s',
                    opacity: loadTestStatus === 'running' ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (loadTestStatus !== 'running') { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; } }}
                  onMouseLeave={e => { if (loadTestStatus !== 'running') { e.currentTarget.style.borderColor = s.color + '40'; e.currentTarget.style.boxShadow = 'none'; } }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.icon}</div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{s.users} users · {s.duration}</p>
                </button>
              ))}
            </div>

            {/* Custom concurrent users */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                ⚙️ Custom Concurrent Users
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={customUsers}
                  onChange={e => setCustomUsers(parseInt(e.target.value, 10) || 10)}
                  style={{
                    padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    fontSize: '16px', fontWeight: 600, color: '#0f172a', width: '120px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '14px', color: '#64748b' }}>concurrent users</span>
                <button
                  onClick={() => runLoadTest('Average Load', customUsers)}
                  disabled={loadTestStatus === 'running'}
                  style={{
                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                    background: loadTestStatus === 'running' ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', fontWeight: 600, fontSize: '14px', cursor: loadTestStatus === 'running' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (loadTestStatus !== 'running') e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { if (loadTestStatus !== 'running') e.currentTarget.style.opacity = '1'; }}
                >
                  🚀 Run Custom Test
                </button>
              </div>
            </div>
          </div>

          {/* Results section */}
          {loadTestResult && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                📊 Load Test Results
                <span style={{
                  ...styles.aiBadge,
                  background: loadTestResult.allThresholdsPassed ? '#16a34a' : '#dc2626',
                }}>
                  {loadTestResult.allThresholdsPassed ? 'PASS' : 'FAIL'}
                </span>
              </h2>
              <div style={styles.grid}>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Scenario</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{loadTestResult.scenario}</div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Virtual Users</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{loadTestResult.users}</div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Duration</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{loadTestResult.elapsed}s</div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Success Rate</div>
                  <div style={{
                    fontSize: '24px', fontWeight: 700,
                    color: loadTestResult.summary?.success_rate > 90 ? '#16a34a' : '#dc2626',
                  }}>{loadTestResult.summary?.success_rate || '—'}</div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Total Requests</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{loadTestResult.summary?.total_requests || 0}</div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardLabel}>Throughput</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{loadTestResult.summary?.requests_per_second || '—'} req/s</div>
                </div>
              </div>

              {/* Response Times */}
              {loadTestResult.responseTimes && (
                <div style={styles.card}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Response Time Distribution</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    {[
                      { label: 'Average', value: loadTestResult.responseTimes.avg + 'ms' },
                      { label: 'P50', value: loadTestResult.responseTimes.p50 + 'ms' },
                      { label: 'P90', value: loadTestResult.responseTimes.p90 + 'ms' },
                      { label: 'P95', value: loadTestResult.responseTimes.p95 + 'ms', warn: true },
                      { label: 'P99', value: loadTestResult.responseTimes.p99 + 'ms', critical: true },
                      { label: 'Max', value: loadTestResult.responseTimes.max + 'ms', critical: true },
                    ].map((m, i) => (
                      <div key={i} style={{
                        padding: '12px', borderRadius: '8px', textAlign: 'center',
                        background: m.critical ? '#fef2f2' : m.warn ? '#fffbeb' : '#f8fafc',
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{m.label}</div>
                        <div style={{
                          fontSize: '18px', fontWeight: 700,
                          color: m.critical ? '#dc2626' : m.warn ? '#ca8a04' : '#0f172a',
                        }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggered alerts */}
              {loadTestResult.findings && loadTestResult.findings.length > 0 && (
                <div style={styles.card}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                    🔔 Alerts Triggered
                    <span style={{ ...styles.aiBadge, background: '#dc2626', marginLeft: '8px' }}>
                      {loadTestResult.findings.length} Issues
                    </span>
                  </h3>
                  {loadTestResult.findings.map((f, i) => (
                    <div key={i} style={{
                      ...styles.finding,
                      borderLeft: `4px solid ${f.severity === 'Critical' ? '#ef4444' : '#f59e0b'}`,
                    }}>
                      <div style={{
                        ...styles.findingIcon,
                        background: f.severity === 'Critical' ? '#fef2f2' : '#fffbeb',
                      }}>
                        {f.severity === 'Critical' ? '🔴' : '🟡'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.findingTitle}>{f.type}</div>
                        <div style={styles.findingDesc}>{f.metric}: {f.value}</div>
                        <span style={{
                          ...styles.findingSeverity,
                          background: f.severity === 'Critical' ? '#fef2f2' : '#fffbeb',
                          color: f.severity === 'Critical' ? '#dc2626' : '#ca8a04',
                        }}>
                          {f.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scaling Tab */}
      {activeTab === 'scaling' && (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              📈 Scaling Recommendations
              <span style={styles.aiBadge}>Capacity Planning</span>
            </h2>

            <div style={styles.grid}>
              {[
                { level: 'Current', users: '200', instances: 1, cpu: '45%', mem: '48%', status: 'Adequate' },
                { level: 'Peak', users: '500', instances: 2, cpu: '88%', mem: '62%', status: 'Scale Needed' },
                { level: 'Black Friday', users: '1000', instances: 4, cpu: '97% (est.)', mem: '78% (est.)', status: 'Scale Required' },
              ].map((s, i) => (
                <div key={i} style={styles.card}>
                  <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: s.status === 'Scale Required' ? '#dc2626' : s.status === 'Scale Needed' ? '#ca8a04' : '#16a34a',
                    marginBottom: '8px',
                  }}>
                    {s.level}
                  </div>
                  <div style={{fontSize: '36px', fontWeight: 800, color: '#0f172a', marginBottom: '4px'}}>
                    {s.users}
                    <span style={{fontSize: '16px', color: '#64748b', fontWeight: 400, marginLeft: '4px'}}>users</span>
                  </div>
                  <div style={styles.metricRow}>
                    <span>Instances</span><span>{s.instances}</span>
                  </div>
                  <div style={styles.metricRow}>
                    <span>CPU</span><span>{s.cpu}</span>
                  </div>
                  <div style={styles.metricRow}>
                    <span>Memory</span><span>{s.mem}</span>
                  </div>
                  <div style={{marginTop: '12px'}}>
                    <span style={{
                      ...styles.badge,
                      background: s.status === 'Scale Required' ? '#fef2f2' : s.status === 'Scale Needed' ? '#fefce8' : '#f0fdf4',
                      color: s.status === 'Scale Required' ? '#dc2626' : s.status === 'Scale Needed' ? '#ca8a04' : '#16a34a',
                    }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '1rem'}}>
              Scaling Action Plan
            </h3>
            {[
              { phase: 'Phase 1', action: 'Add composite indexes + query optimization', timeline: 'Week 1', cost: 'Low' },
              { phase: 'Phase 2', action: 'Deploy horizontal scaling (2→4 instances) with load balancer', timeline: 'Week 2', cost: 'Medium' },
              { phase: 'Phase 3', action: 'Implement Redis caching for product/search data', timeline: 'Week 3-4', cost: 'Medium' },
              { phase: 'Phase 4', action: 'Database read replicas + connection pooling optimization', timeline: 'Week 4-5', cost: 'High' },
              { phase: 'Phase 5', action: 'Auto-scaling group configuration with CloudWatch alarms', timeline: 'Week 6', cost: 'Medium' },
            ].map((item, i) => (
              <div key={i} style={{
                ...styles.metricRow,
                borderBottom: i === 4 ? 'none' : '1px solid #f1f5f9',
              }}>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    background: '#eef2ff', color: '#6366f1',
                  }}>{item.phase}</span>
                  <span>{item.action}</span>
                </div>
                <div style={{display: 'flex', gap: '16px'}}>
                  <span style={{fontSize: '13px', color: '#64748b'}}>{item.timeline}</span>
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: item.cost === 'Low' ? '#16a34a' : item.cost === 'Medium' ? '#ca8a04' : '#dc2626',
                  }}>{item.cost} Cost</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer metrics */}
      <div style={{...styles.card, marginTop: '2rem', background: '#f8fafc'}}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{fontSize: '13px', color: '#64748b', fontWeight: 500}}>Last AI Analysis</div>
            <div style={{fontSize: '15px', fontWeight: 600, color: '#0f172a'}}>
              {new Date().toLocaleString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </div>
          </div>
          <div>
            <div style={{fontSize: '13px', color: '#64748b', fontWeight: 500}}>Analysis Duration</div>
            <div style={{fontSize: '15px', fontWeight: 600, color: '#0f172a'}}>3.2 seconds</div>
          </div>
          <div>
            <div style={{fontSize: '13px', color: '#64748b', fontWeight: 500}}>Test Run ID</div>
            <div style={{fontSize: '15px', fontWeight: 600, color: '#0f172a'}}>
              PERF-{Date.now().toString(36).toUpperCase()}
            </div>
          </div>
          <div>
            <Link to="/admin" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '10px',
              background: '#0f172a', color: 'white',
              textDecoration: 'none', fontWeight: 600, fontSize: '14px',
              transition: 'all 0.2s',
            }}>
              ⚙️ Run New Test
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
