import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import useLoadTest from '../hooks/useLoadTest';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  alertItem: {
    background: 'white',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #94a3b8',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  alertCritical: { borderLeftColor: '#ef4444', background: '#fef2f2' },
  alertWarning: { borderLeftColor: '#f59e0b', background: '#fffbeb' },
  alertInfo: { borderLeftColor: '#3b82f6', background: '#eff6ff' },
  alertTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  alertMeta: {
    fontSize: '12px',
    color: '#64748b',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeCritical: { background: '#fef2f2', color: '#dc2626' },
  badgeWarning: { background: '#fffbeb', color: '#d97706' },
  badgeInfo: { background: '#eff6ff', color: '#2563eb' },
  badgeSuccess: { background: '#f0fdf4', color: '#16a34a' },
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'white',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  configField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  configLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  configInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnPrimary: { background: '#6366f1', color: 'white' },
  btnDanger: { background: '#ef4444', color: 'white' },
  btnSuccess: { background: '#22c55e', color: 'white' },
  btnOutline: { background: 'white', color: '#6366f1', border: '2px solid #6366f1' },
  impactBox: {
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '8px',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  impactItem: {
    textAlign: 'center',
    padding: '8px 16px',
  },
  impactValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ef4444',
  },
  impactLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
  },
};

const severityStyle = (severity) => {
  if (severity === 'Critical') return styles.alertCritical;
  if (severity === 'Warning') return styles.alertWarning;
  return styles.alertInfo;
};

const badgeStyle = (severity) => {
  if (severity === 'Critical') return { ...styles.badge, ...styles.badgeCritical };
  if (severity === 'Warning') return { ...styles.badge, ...styles.badgeWarning };
  return { ...styles.badge, ...styles.badgeInfo };
};

function AlertDashboard() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [config, setConfig] = useState({
    averageOrderValue: 127.50,
    ordersPerMinute: 2.5,
    activeUsers: 150,
    targetResponseTimeMs: 2000,
    acceptableErrorRate: 0.05,
  });
  const [loading, setLoading] = useState(true);
  const [engineRunning, setEngineRunning] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');
  const { status: loadTestStatus, result: loadTestResult, error: loadTestError, runLoadTest } = useLoadTest();
  const pollRef = useRef(null);
  const sseRef = useRef(null);

  // ─── Load data ─────────────────────────────────────────────────────────

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statusRes, historyRes, configRes] = await Promise.allSettled([
        api.get('/api/alerts/status', { headers }),
        api.get('/api/alerts/history?limit=100', { headers }),
        api.get('/api/alerts/config', { headers }),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
        setEngineRunning(statusRes.value.data.isRunning);
      }
      if (historyRes.status === 'fulfilled') {
        setAlerts(historyRes.value.data.alerts || []);
      }
      if (configRes.status === 'fulfilled') {
        setConfig(prev => ({ ...prev, ...configRes.value.data.config }));
      }
    } catch (err) {
      // Silent fail for demo - will show empty states
    } finally {
      setLoading(false);
    }
  };

  // ─── Connect to SSE stream for real-time browser notifications ──
  useEffect(() => {
    const connectSSE = () => {
      if (sseRef.current) sseRef.current.close();
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const eventSource = new EventSource(`${apiUrl}/api/alerts/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'alert') {
            fetchAllData(); // Refresh alert list
            
            // Show browser notification if permission granted
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(data.title, {
                body: `${data.body}\n💰 Revenue Impact: $${data.businessImpact?.revenueLost?.toLocaleString() || 'N/A'}`,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚨</text></svg>',
              });
            }
          }
        } catch (e) { /* ignore parse errors */ }
      };
      
      eventSource.onerror = () => {
        // Will auto-reconnect
      };
      
      sseRef.current = eventSource;
    };
    
    connectSSE();
    return () => {
      if (sseRef.current) sseRef.current.close();
    };
  }, []);

  useEffect(() => {
    fetchAllData();
    // Poll every 10 seconds
    pollRef.current = setInterval(fetchAllData, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleStartEngine = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post('/api/alerts/start', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEngineRunning(true);
      fetchAllData();
    } catch (err) {
      alert('Failed to start alert engine: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStopEngine = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post('/api/alerts/stop', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEngineRunning(false);
      fetchAllData();
    } catch (err) {
      alert('Failed to stop alert engine: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTestAlert = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.post('/api/alerts/trigger', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestEmailStatus('sent');
      fetchAllData();
      setTimeout(() => setTestEmailStatus(null), 5000);
    } catch (err) {
      setTestEmailStatus('error');
      setTimeout(() => setTestEmailStatus(null), 5000);
    }
  };

  const handleTestEmail = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post('/api/alerts/test', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestEmailStatus('sent');
      setTimeout(() => setTestEmailStatus(null), 5000);
    } catch (err) {
      setTestEmailStatus('error');
      setTimeout(() => setTestEmailStatus(null), 5000);
    }
  };

  const handleEnableBrowserNotifs = () => {
    if (typeof Notification === 'undefined') {
      alert('Browser notifications are not supported in this browser.');
      return;
    }
    Notification.requestPermission().then(perm => {
      setNotifPermission(perm);
      if (perm === 'granted') {
        setBrowserNotifEnabled(true);
        new Notification('✅ AI Performance Monitor', {
          body: 'Browser notifications enabled! You will receive real-time alerts when performance degrades.',
        });
      }
    });
  };

  const handleSaveConfig = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post('/api/alerts/config', config, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Configuration saved!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const formatCurrency = (n) => {
    if (!n) return '$0';
    return '$' + Number(n).toLocaleString();
  };

  // ─── Render: Status Cards ──────────────────────────────────────────────

  const renderStatusCards = () => (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={{
          ...styles.badge,
          ...(engineRunning ? styles.badgeSuccess : styles.badgeWarning),
          float: 'right',
        }}>
          {engineRunning ? '● RUNNING' : '○ STOPPED'}
        </div>
        <p style={styles.statValue}>{alerts.length}</p>
        <p style={styles.statLabel}>Total Alerts</p>
      </div>
      <div style={styles.card}>
        <p style={{ ...styles.statValue, color: '#ef4444' }}>
          {alerts.filter(a => a.severity === 'Critical').length}
        </p>
        <p style={styles.statLabel}>Critical Issues</p>
      </div>
      <div style={styles.card}>
        <p style={styles.statValue}>
          {status?.lastMetrics?.currentP95 ? `${Math.round(status.lastMetrics.currentP95)}ms` : '—'}
        </p>
        <p style={styles.statLabel}>Current P95 Response Time</p>
      </div>
      <div style={styles.card}>
        <p style={{ ...styles.statValue, color: '#f59e0b' }}>
          {status?.lastMetrics?.currentErrorRate
            ? `${(status.lastMetrics.currentErrorRate * 100).toFixed(1)}%`
            : '—'}
        </p>
        <p style={styles.statLabel}>Current Error Rate</p>
      </div>
    </div>
  );

  // ─── Render: Alert History ─────────────────────────────────────────────

  const renderAlerts = () => {
    if (alerts.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <h3 style={{ margin: '0 0 8px', color: '#64748b' }}>No Alerts Yet</h3>
          <p style={{ margin: 0 }}>The alert engine will monitor performance metrics and notify you when issues are detected. Click "Trigger Test Alert" below to verify delivery.</p>
        </div>
      );
    }

    return alerts.map((alert, i) => (
      <div
        key={i}
        style={{ ...styles.alertItem, ...severityStyle(alert.severity) }}
        onClick={() => setExpandedAlert(expandedAlert === i ? null : i)}
      >
        <div style={styles.alertTitle}>
          <span style={badgeStyle(alert.severity)}>{alert.severity}</span>
          <span>{alert.type}</span>
        </div>
        <div style={styles.alertMeta}>
          <span>📊 {alert.metric}: {alert.value}</span>
          <span>🎯 Threshold: {alert.threshold}</span>
          <span>🕐 {formatTime(alert.timestamp)}</span>
        </div>

        {expandedAlert === i && (
          <div style={{ marginTop: '12px' }}>
            {alert.businessImpact && (
              <div style={styles.impactBox}>
                {alert.businessImpact.revenueLost > 0 && (
                  <div style={styles.impactItem}>
                    <div style={styles.impactValue}>{formatCurrency(alert.businessImpact.revenueLost)}</div>
                    <div style={styles.impactLabel}>Revenue Lost</div>
                  </div>
                )}
                {alert.businessImpact.revenuePercent > 0 && (
                  <div style={styles.impactItem}>
                    <div style={styles.impactValue}>{alert.businessImpact.revenuePercent}%</div>
                    <div style={styles.impactLabel}>Revenue Impact</div>
                  </div>
                )}
                {alert.businessImpact.ordersLost > 0 && (
                  <div style={styles.impactItem}>
                    <div style={styles.impactValue}>{alert.businessImpact.ordersLost}</div>
                    <div style={styles.impactLabel}>Orders Lost</div>
                  </div>
                )}
                {alert.businessImpact.usersAffected > 0 && (
                  <div style={styles.impactItem}>
                    <div style={styles.impactValue}>{alert.businessImpact.usersAffected}</div>
                    <div style={styles.impactLabel}>Users Affected</div>
                  </div>
                )}
              </div>
            )}
            {alert.details && (
              <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0', lineHeight: '1.5' }}>
                {alert.details}
              </p>
            )}
            {alert.recommendations && alert.recommendations.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '0 0 4px' }}>
                  ✅ Recommended Actions:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {alert.recommendations.map((r, j) => (
                    <li key={j} style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    ));
  };

  // ─── Render: Configuration ─────────────────────────────────────────────

  const renderConfig = () => (
    <div style={styles.card}>
      <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '18px' }}>
        ⚙️ Business Configuration
      </h3>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
        These values are used to calculate the business impact of performance degradation.
        Adjust them to match your actual business metrics for accurate revenue loss estimates.
      </p>
      <div style={styles.configGrid}>
        <div style={styles.configField}>
          <label style={styles.configLabel}>Average Order Value ($)</label>
          <input
            style={styles.configInput}
            type="number"
            step="0.01"
            value={config.averageOrderValue}
            onChange={e => handleConfigChange('averageOrderValue', e.target.value)}
          />
        </div>
        <div style={styles.configField}>
          <label style={styles.configLabel}>Orders Per Minute</label>
          <input
            style={styles.configInput}
            type="number"
            step="0.1"
            value={config.ordersPerMinute}
            onChange={e => handleConfigChange('ordersPerMinute', e.target.value)}
          />
        </div>
        <div style={styles.configField}>
          <label style={styles.configLabel}>Active Users</label>
          <input
            style={styles.configInput}
            type="number"
            value={config.activeUsers}
            onChange={e => handleConfigChange('activeUsers', e.target.value)}
          />
        </div>
        <div style={styles.configField}>
          <label style={styles.configLabel}>Target Response Time (ms)</label>
          <input
            style={styles.configInput}
            type="number"
            value={config.targetResponseTimeMs}
            onChange={e => handleConfigChange('targetResponseTimeMs', e.target.value)}
          />
        </div>
        <div style={styles.configField}>
          <label style={styles.configLabel}>Acceptable Error Rate (%)</label>
          <input
            style={styles.configInput}
            type="number"
            step="0.01"
            value={config.acceptableErrorRate * 100}
            onChange={e => handleConfigChange('acceptableErrorRate', e.target.value / 100)}
          />
        </div>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleSaveConfig}
        >
          💾 Save Configuration
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnOutline }}
          onClick={() => {
            setConfig({
              averageOrderValue: 127.50,
              ordersPerMinute: 2.5,
              activeUsers: 150,
              targetResponseTimeMs: 2000,
              acceptableErrorRate: 0.05,
            });
          }}
        >
          ↩ Reset to Defaults
        </button>
      </div>
    </div>
  );

  // ─── Render: Controls ──────────────────────────────────────────────────

  const renderControls = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
      {engineRunning ? (
        <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={handleStopEngine}>
          ⏹ Stop Monitoring
        </button>
      ) : (
        <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={handleStartEngine}>
          ▶ Start Monitoring
        </button>
      )}

      <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleTestAlert}>
        🚨 Trigger Test Alert
      </button>

      <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={handleTestEmail}>
        📧 Send Test Email
      </button>

      <button 
        style={{ 
          ...styles.btn, 
          ...(browserNotifEnabled || notifPermission === 'granted' 
            ? { background: '#22c55e', color: 'white' } 
            : styles.btnOutline)
        }} 
        onClick={handleEnableBrowserNotifs}
        disabled={notifPermission === 'denied'}
      >
        {notifPermission === 'granted' ? '🔔 Browser Notifs On' : '🔕 Enable Browser Alerts'}
      </button>

      {testEmailStatus === 'sent' && (
        <span style={{ color: '#16a34a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✅ {engineRunning ? 'Test alert triggered!' : 'Test email sent!'} Check suvarnamukhy666@gmail.com
        </span>
      )}
      {testEmailStatus === 'error' && (
        <span style={{ color: '#dc2626', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ❌ Delivery failed. Check server console for details.
        </span>
      )}
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
          <p style={{ color: '#64748b' }}>Loading alert dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          🔔 Performance Alerts
          <span style={{
            ...styles.badge,
            ...(engineRunning ? styles.badgeSuccess : styles.badgeWarning),
            fontSize: '12px',
          }}>
            {engineRunning ? 'LIVE' : 'OFF'}
          </span>
        </div>
        <p style={styles.subtitle}>
          Real-time performance monitoring with email/SMS notifications to suvarnamukhy666@gmail.com.
          Detects degradation, calculates revenue impact, and sends automated alerts.
        </p>
      </div>

      {/* Control Buttons */}
      {renderControls()}

      {/* Status Cards */}
      {renderStatusCards()}

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'alerts' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Alert History ({alerts.length})
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'config' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuration
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'loadtest' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('loadtest')}
        >
          ⚡ Load Test
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'about' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ How It Works
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'alerts' && renderAlerts()}
      {activeTab === 'config' && renderConfig()}
      {activeTab === 'loadtest' && (
        <div>
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '18px' }}>
              ⚡ On-Demand Load Testing
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Run a performance load test with one click. The test simulates real user traffic
              (Login → Search → Product Detail → Add to Cart → Checkout) and automatically
              sends alerts to <strong>suvarnamukhy666@gmail.com</strong> with revenue impact
              calculations when bottlenecks are detected.
            </p>

            {/* Running indicator */}
            {loadTestStatus === 'running' && (
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>🔄</div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#92400e' }}>Load Test Running...</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#a16207' }}>Simulating users, analyzing metrics, and sending alerts. Check your email inbox!</p>
                </div>
              </div>
            )}

            {/* Error display */}
            {loadTestError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#dc2626', fontSize: '13px' }}>
                ❌ {loadTestError}
              </div>
            )}

            {/* Scenario buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { name: 'Smoke Test', users: 50, duration: '30s', color: '#22c55e', icon: '🌬️' },
                { name: 'Average Load', users: 200, duration: '60s', color: '#f59e0b', icon: '📊' },
                { name: 'Peak Sale', users: 500, duration: '90s', color: '#f97316', icon: '🔥' },
                { name: 'Black Friday', users: 1000, duration: '120s', color: '#ef4444', icon: '💥' },
              ].map(s => (
                <button
                  key={s.name}
                  onClick={() => runLoadTest(s.name, null, fetchAllData)}
                  disabled={loadTestStatus === 'running'}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: loadTestStatus === 'running' ? '1px solid #e2e8f0' : `1px solid ${s.color}40`,
                    background: loadTestStatus === 'running' ? '#f1f5f9' : 'white',
                    cursor: loadTestStatus === 'running' ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    opacity: loadTestStatus === 'running' ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (loadTestStatus !== 'running') { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; } }}
                  onMouseLeave={e => { if (loadTestStatus !== 'running') { e.currentTarget.style.borderColor = s.color + '40'; e.currentTarget.style.boxShadow = 'none'; } }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{s.users} users · {s.duration}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Results section */}
          {loadTestResult && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '18px' }}>
                📊 Last Load Test Results
              </h3>
              <div style={styles.grid}>
                <div style={styles.card}>
                  <p style={styles.statValue}>{loadTestResult.scenario}</p>
                  <p style={styles.statLabel}>Scenario</p>
                </div>
                <div style={styles.card}>
                  <p style={styles.statValue}>{loadTestResult.users}</p>
                  <p style={styles.statLabel}>Virtual Users</p>
                </div>
                <div style={styles.card}>
                  <p style={{ ...styles.statValue, color: loadTestResult.allThresholdsPassed ? '#16a34a' : '#dc2626' }}>
                    {loadTestResult.allThresholdsPassed ? '✅ PASS' : '❌ FAIL'}
                  </p>
                  <p style={styles.statLabel}>Thresholds</p>
                </div>
                <div style={styles.card}>
                  <p style={styles.statValue}>{loadTestResult.elapsed}s</p>
                  <p style={styles.statLabel}>Duration</p>
                </div>
              </div>
              {loadTestResult.summary && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: '0 0 8px' }}>Performance Summary</p>
                  <div style={styles.impactBox}>
                    <div style={styles.impactItem}>
                      <div style={{ ...styles.impactValue, color: '#1e293b' }}>{loadTestResult.summary.total_requests}</div>
                      <div style={styles.impactLabel}>Total Requests</div>
                    </div>
                    <div style={styles.impactItem}>
                      <div style={{ ...styles.impactValue, color: loadTestResult.summary.success_rate > 90 ? '#16a34a' : '#dc2626' }}>{loadTestResult.summary.success_rate}</div>
                      <div style={styles.impactLabel}>Success Rate</div>
                    </div>
                    <div style={styles.impactItem}>
                      <div style={{ ...styles.impactValue, color: '#1e293b' }}>{loadTestResult.summary.requests_per_second}</div>
                      <div style={styles.impactLabel}>Throughput (req/s)</div>
                    </div>
                  </div>
                </div>
              )}
              {loadTestResult.findings && loadTestResult.findings.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: '0 0 8px' }}>🔔 Alerts Triggered</p>
                  {loadTestResult.findings.map((f, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      fontSize: '13px',
                      background: f.severity === 'Critical' ? '#fef2f2' : '#fffbeb',
                      borderLeft: `3px solid ${f.severity === 'Critical' ? '#ef4444' : '#f59e0b'}`,
                    }}>
                      <strong>{f.severity === 'Critical' ? '🔴' : '🟡'} {f.type}</strong>
                      <span style={{ color: '#64748b', marginLeft: '8px' }}>{f.metric}: {f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {activeTab === 'about' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>ℹ️ How Performance Alerts Work</h3>
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <h4 style={{ color: '#6366f1', margin: '0 0 8px' }}>1️⃣ Metrics Collection</h4>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                The alert engine continuously monitors your app's Prometheus metrics — response times,
                error rates, throughput, CPU, and memory usage. It collects these every 60 seconds
                and compares them against configurable thresholds.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#6366f1', margin: '0 0 8px' }}>2️⃣ Smart Detection</h4>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                When metrics exceed warning or critical thresholds, the engine analyzes the
                severity and calculates the business impact — estimated revenue lost, orders
                affected, and users impacted — based on your configured business metrics.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#6366f1', margin: '0 0 8px' }}>3️⃣ Email & SMS Notifications</h4>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                Alerts are sent to <strong>suvarnamukhy666@gmail.com</strong> with rich HTML formatting
                showing the severity, current metrics, business impact, and recommended actions.
                SMS delivery is supported via carrier email-to-SMS gateways (e.g., number@vtext.com for Verizon).
              </p>
            </div>
            <div>
              <h4 style={{ color: '#6366f1', margin: '0 0 8px' }}>4️⃣ Anti-Flapping</h4>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                To prevent alert fatigue, the same alert type won't repeat within a 15-minute cooldown
                window. Each alert is tracked and deduplicated automatically.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#6366f1', margin: '0 0 8px' }}>5️⃣ Business Impact Formula</h4>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                Revenue loss is calculated using industry research: <em>"Every 1 second increase in
                page load time reduces conversion by 7%"</em> (Amazon/SOA Labs). The engine multiplies
                your configured average order value × order rate × degradation percentage × duration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertDashboard;
