/**
 * Alert Engine — monitors performance metrics and detects degradation
 * 
 * Analyzes load test results for:
 *   - Response time degradation (p95 > threshold)
 *   - Error rate spikes
 *   - Throughput drops
 *   - CPU saturation
 *   - Revenue impact estimation
 */

const { getBrowserNotifications } = require('./browserNotification');
const promClient = require('prom-client');

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  checkIntervalMs: 60000,
  cooldownMinutes: 15,

  business: {
    averageOrderValue: 127.50,
    ordersPerMinute: 2.5,
    activeUsers: 150,
    revenueTargetPerMinute: 318.75,
    targetResponseTimeMs: 2000,
    acceptableErrorRate: 0.05,
  },

  thresholds: {
    responseTimeP95: { warning: 2000, critical: 5000 },
    errorRate: { warning: 0.05, critical: 0.10 },
    throughputDrop: { warning: 0.15, critical: 0.30 },
    cpuUsage: { warning: 70, critical: 85 },
    memoryUsage: { warning: 75, critical: 90 },
  },
};

// ─── Alert Engine ─────────────────────────────────────────────────────────────

class AlertEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.monitoringInterval = null;
    this.alertHistory = [];
    this.activeAlerts = new Map();
    this.metricsSnapshot = {
      currentP95: 0,
      currentErrorRate: 0,
      currentRps: 0,
    };
    this.isRunning = false;
    this.loadTestHasRun = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🔔 Alert Engine started (checking every ' + this.config.checkIntervalMs / 1000 + 's)');
    console.log(`   Email alerts will be sent to: ${require('./notificationService').CONFIG.emailTo}`);
    console.log('   ℹ️  Alerts will only fire after a load test produces real metrics data');
    this.monitoringInterval = setInterval(() => this.checkMetrics(), this.config.checkIntervalMs);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Periodic check — logs to console and sends browser notifications only.
   * Email alerts are sent as a combined report from the load test route.
   */
  async checkMetrics() {
    try {
      const snapshot = await this.collectMetrics();
      this.metricsSnapshot = snapshot;

      if (snapshot.source !== 'live' || snapshot.totalRequests === 0 || !this.loadTestHasRun) {
        return { snapshot, findings: [] };
      }

      const findings = await this.analyzeMetrics(snapshot);

      for (const finding of findings) {
        const alertKey = finding.type + ':' + finding.metric;
        const now = Date.now();
        const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
        if (this.activeAlerts.has(alertKey) && (now - this.activeAlerts.get(alertKey)) < cooldownMs) continue;

        this.activeAlerts.set(alertKey, now);
        this.alertHistory.push({ ...finding, timestamp: now });
        if (this.alertHistory.length > 500) this.alertHistory.splice(0, this.alertHistory.length - 500);

        console.log(`\n🔔 ALERT: [${finding.severity}] ${finding.type}`);
        try { getBrowserNotifications().send(finding); } catch (e) {}
      }

      return { snapshot, findings };
    } catch (error) {
      console.error('⚠ Alert Engine check error:', error.message);
    }
  }

  async collectMetrics() {
    try {
      let timeoutId;
      const metrics = await Promise.race([
        promClient.register.getMetricsAsJSON(),
        new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('timeout')), 5000); }),
      ]);
      clearTimeout(timeoutId);

      let p95 = 0, totalRequests = 0, errorCount = 0, cpuUsage = 0, memoryUsage = 0;

      for (const metric of metrics) {
        if (metric.name === 'http_request_duration_seconds' && metric.values) {
          const buckets = metric.values.filter(v => v.labels?.le);
          const infBucket = buckets.find(b => b.labels?.le === '+Inf');
          const totalCount = infBucket ? infBucket.value : 0;
          if (totalCount > 0) {
            let cumulative = 0;
            for (const bucket of buckets) {
              cumulative += bucket.value;
              if (cumulative / totalCount >= 0.95) {
                p95 = parseFloat(bucket.labels.le) * 1000;
                break;
              }
            }
          }
        }
        if (metric.name === 'http_requests_total' && metric.values) {
          for (const v of metric.values) {
            totalRequests += v.value || 0;
            if (parseInt(v.labels?.status_code) >= 400) errorCount += v.value || 0;
          }
        }
      }

      const cpu = process.cpuUsage();
      const uptime = process.uptime();
      cpuUsage = uptime > 0 ? Math.min(100, ((cpu.user + cpu.system) / 1000000 / uptime) * 100) : 0;
      memoryUsage = (process.memoryUsage().rss / require('os').totalmem()) * 100;

      return {
        currentP95: p95,
        currentErrorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
        currentRps: parseFloat((totalRequests / uptime).toFixed(1)),
        cpuUsage,
        memoryUsage,
        totalRequests,
        errorCount,
        timestamp: new Date().toISOString(),
        source: 'live',
      };
    } catch (err) {
      return { currentP95: 0, currentErrorRate: 0, currentRps: 0, cpuUsage: 0, memoryUsage: 0, totalRequests: 0, errorCount: 0, timestamp: new Date().toISOString(), source: 'simulated-fallback' };
    }
  }

  async analyzeMetrics(snapshot) {
    const findings = [];
    const { thresholds, business } = this.config;
    const { currentP95, currentErrorRate, cpuUsage } = snapshot;

    // Response Time
    if (currentP95 > thresholds.responseTimeP95.critical) {
      const impact = this.calculateBusinessImpact('response_time', currentP95 / business.targetResponseTimeMs);
      findings.push({
        type: 'Response Time Degradation', severity: 'Critical',
        metric: 'P95 Response Time', value: `${Math.round(currentP95)}ms`,
        threshold: `< ${thresholds.responseTimeP95.critical}ms`, businessImpact: impact,
        details: `P95 response time of ${Math.round(currentP95)}ms exceeds critical threshold. Users are experiencing significant delays.`,
        recommendations: ['Scale application horizontally', 'Add database indexes on frequently queried columns', 'Implement Redis caching for product listings'],
      });
    } else if (currentP95 > thresholds.responseTimeP95.warning) {
      const impact = this.calculateBusinessImpact('response_time', currentP95 / business.targetResponseTimeMs);
      findings.push({
        type: 'Response Time Degradation', severity: 'Warning',
        metric: 'P95 Response Time', value: `${Math.round(currentP95)}ms`,
        threshold: `< ${thresholds.responseTimeP95.warning}ms`, businessImpact: impact,
        details: `P95 response time above warning threshold. Monitor closely.`,
        recommendations: ['Review recent deployments', 'Check database query performance'],
      });
    }

    // Error Rate
    if (currentErrorRate > thresholds.errorRate.critical) {
      const impact = this.calculateBusinessImpact('error_rate', currentErrorRate / thresholds.errorRate.critical);
      findings.push({
        type: 'High Error Rate', severity: 'Critical',
        metric: 'Error Rate', value: `${(currentErrorRate * 100).toFixed(1)}%`,
        threshold: `< ${(thresholds.errorRate.critical * 100)}%`, businessImpact: impact,
        details: `Error rate of ${(currentErrorRate * 100).toFixed(1)}% exceeds critical threshold. Directly impacts revenue.`,
        recommendations: ['Check API server error logs for 5xx responses', 'Verify database connection pool is not exhausted', 'Check for upstream service failures'],
      });
    } else if (currentErrorRate > thresholds.errorRate.warning) {
      const impact = this.calculateBusinessImpact('error_rate', currentErrorRate / thresholds.errorRate.warning);
      findings.push({
        type: 'Error Rate Increase', severity: 'Warning',
        metric: 'Error Rate', value: `${(currentErrorRate * 100).toFixed(1)}%`,
        threshold: `< ${(thresholds.errorRate.warning * 100)}%`, businessImpact: impact,
        details: `Error rate rising. Investigate before it escalates.`,
        recommendations: ['Review recent log entries', 'Check specific endpoint failure rates'],
      });
    }

    // CPU
    if (cpuUsage > thresholds.cpuUsage.critical) {
      const impact = this.calculateBusinessImpact('cpu', cpuUsage / 100);
      findings.push({
        type: 'CPU Saturation', severity: 'Critical',
        metric: 'CPU Usage', value: `${Math.round(cpuUsage)}%`,
        threshold: `< ${thresholds.cpuUsage.critical}%`, businessImpact: impact,
        details: `CPU at ${Math.round(cpuUsage)}% — server saturated.`,
        recommendations: ['Add more application instances', 'Check for runaway processes', 'Move compute-intensive work to background jobs'],
      });
    }

    return findings;
  }

  calculateBusinessImpact(type, severityRatio) {
    const biz = this.config.business;
    const minutes = this.config.cooldownMinutes;
    const baseRevenuePerMin = biz.averageOrderValue * biz.ordersPerMinute;
    const result = { revenueLost: 0, revenuePercent: 0, ordersLost: 0, usersAffected: 0, estimatedLossPerMin: 0 };

    let factor = 0;
    switch (type) {
      case 'response_time': factor = Math.min(0.5, (severityRatio - 1) * 0.07); break;
      case 'error_rate': factor = Math.min(1, (severityRatio - 1) * 0.1); break;
      case 'throughput': factor = severityRatio; break;
      case 'cpu': factor = severityRatio * 0.3; break;
    }

    result.revenuePercent = Math.round(factor * 100);
    result.revenueLost = Math.round(baseRevenuePerMin * minutes * factor);
    result.ordersLost = Math.round(biz.ordersPerMinute * minutes * factor);
    result.usersAffected = Math.round(biz.activeUsers * factor);
    result.estimatedLossPerMin = Math.round(baseRevenuePerMin * factor);
    return result;
  }

  getAlertHistory(limit = 50, severity = null) {
    let history = [...this.alertHistory];
    if (severity) history = history.filter(a => a.severity === severity);
    return history.slice(-limit).reverse();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: { checkIntervalMs: this.config.checkIntervalMs, cooldownMinutes: this.config.cooldownMinutes, emailTo: require('./notificationService').CONFIG.emailTo },
      lastMetrics: this.metricsSnapshot,
      activeAlertCount: this.activeAlerts.size,
      totalAlertsSent: this.alertHistory.length,
      recentAlerts: this.getAlertHistory(5),
      thresholds: this.config.thresholds,
      businessConfig: this.config.business,
    };
  }

  updateBusinessConfig(updates) {
    Object.assign(this.config.business, updates);
    return this.config.business;
  }

  markLoadTestCompleted() {
    this.loadTestHasRun = true;
  }
}

// Singleton
let engineInstance = null;
function getAlertEngine() {
  if (!engineInstance) engineInstance = new AlertEngine();
  return engineInstance;
}

module.exports = { AlertEngine, getAlertEngine, DEFAULT_CONFIG };
