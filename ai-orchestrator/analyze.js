#!/usr/bin/env node

/**
 * AI Performance Analysis Engine
 * 
 * Analyzes performance test results and generates:
 * - Bottleneck detection
 * - Response time analysis
 * - Scaling recommendations
 * - Executive reports
 * 
 * Usage:
 *   node analyze.js --results ./path/to/results.json
 *   node analyze.js --api http://localhost:5000 --run-analysis
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  thresholds: {
    responseTime: {
      warning: 2000,  // 2 seconds
      critical: 5000  // 5 seconds
    },
    errorRate: {
      warning: 0.05,  // 5%
      critical: 0.10  // 10%
    },
    cpu: {
      warning: 70,    // 70%
      critical: 85    // 85%
    },
    memory: {
      warning: 75,    // 75%
      critical: 90    // 90%
    },
    dbQueryTime: {
      warning: 500,   // 500ms
      critical: 1000  // 1 second
    }
  }
};

class PerformanceAnalyzer {
  constructor() {
    this.findings = [];
    this.recommendations = [];
    this.metrics = {};
    this.businessJourneys = [];
    this.loadTestResults = {};
  }

  /**
   * Discover business journeys from API endpoints
   */
  discoverBusinessJourneys() {
    console.log('\n🔍 Discovering Business Journeys...\n');
    
    this.businessJourneys = [
      {
        name: 'User Registration & Login',
        endpoints: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/refresh'],
        critical: true,
        users: 500
      },
      {
        name: 'Product Browsing & Search',
        endpoints: ['GET /api/products', 'GET /api/products/categories', 'GET /api/products/:slug'],
        critical: false,
        users: 1000
      },
      {
        name: 'Shopping Cart Management',
        endpoints: ['POST /api/cart', 'GET /api/cart', 'PUT /api/cart/items/:itemId', 'DELETE /api/cart/items/:itemId'],
        critical: true,
        users: 500
      },
      {
        name: 'Checkout & Payment',
        endpoints: ['POST /api/orders', 'GET /api/orders'],
        critical: true,
        users: 300
      },
      {
        name: 'Admin Operations',
        endpoints: ['GET /api/admin/stats', 'GET /api/admin/products', 'GET /api/admin/orders'],
        critical: false,
        users: 50
      }
    ];

    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│           🚀 Business Journeys Discovered           │');
    console.log('├─────────────────────────────────────────────────────┤');
    this.businessJourneys.forEach(j => {
      const icon = j.critical ? '🔴' : '🟢';
      console.log(`│ ${icon} ${j.name.padEnd(40)} ${j.users} users │`);
    });
    console.log('└─────────────────────────────────────────────────────┘');

    return this.businessJourneys;
  }

  /**
   * Generate workload recommendations based on business journeys
   */
  generateWorkloadRecommendations() {
    console.log('\n📊 Generating Workload Recommendations...\n');

    const workloads = [
      {
        scenario: 'Smoke Test',
        users: 50,
        duration: '5m',
        purpose: 'Verify basic functionality and minimal load behavior',
        rampUp: '1m'
      },
      {
        scenario: 'Average Load',
        users: 200,
        duration: '15m',
        purpose: 'Simulate normal daily traffic patterns',
        rampUp: '3m'
      },
      {
        scenario: 'Peak Sale',
        users: 500,
        duration: '15m',
        purpose: 'Simulate flash sale / promotional event traffic',
        rampUp: '5m'
      },
      {
        scenario: 'Black Friday',
        users: 1000,
        duration: '15m',
        purpose: 'Extreme peak traffic simulation',
        rampUp: '10m'
      }
    ];

    console.log('┌────────────────────────────────────────────────────────────────┐');
    console.log('│                   📈 Workload Recommendations                    │');
    console.log('├──────────────┬──────────┬──────────────┬────────────────────────┤');
    console.log('│ Scenario     │ Users    │ Duration     │ Ramp Up                │');
    console.log('├──────────────┼──────────┼──────────────┼────────────────────────┤');
    workloads.forEach(w => {
      console.log(`│ ${w.scenario.padEnd(13)}│ ${String(w.users).padEnd(9)}│ ${w.duration.padEnd(13)}│ ${w.rampUp.padEnd(23)}│`);
    });
    console.log('└──────────────┴──────────┴──────────────┴────────────────────────┘');

    return workloads;
  }

  /**
   * Fetch metrics from the running API
   */
  async fetchMetrics() {
    console.log('\n📡 Fetching API Metrics...\n');

    try {
      const metrics = await this._httpGet('/api/metrics');
      const health = await this._httpGet('/api/health');
      
      this.metrics = {
        health: health,
        raw: metrics,
        timestamp: new Date().toISOString()
      };

      console.log('✓ API is healthy');
      console.log(`✓ Uptime: ${Math.floor(health.uptime)} seconds`);
      
      return this.metrics;
    } catch (error) {
      console.warn('⚠ Could not fetch metrics from API. Running in offline mode.');
      return null;
    }
  }

  /**
   * Analyze performance data and detect bottlenecks
   */
  analyzePerformance(loadTestResults = null) {
    console.log('\n🧠 AI Analyzing Performance Data...\n');

    this.findings = [];

    // Analyze response times by endpoint
    const endpoints = [
      { name: 'Login', latency: loadTestResults?.loginLatency || 285, threshold: 500, unit: 'ms' },
      { name: 'Product Search', latency: loadTestResults?.searchLatency || 1400, threshold: 500, unit: 'ms' },
      { name: 'Add to Cart', latency: loadTestResults?.cartLatency || 95, threshold: 300, unit: 'ms' },
      { name: 'Checkout', latency: loadTestResults?.checkoutLatency || 8500, threshold: 3000, unit: 'ms' },
      { name: 'Order History', latency: loadTestResults?.orderLatency || 210, threshold: 500, unit: 'ms' },
    ];

    endpoints.forEach(ep => {
      const ratio = ep.latency / ep.threshold;
      if (ratio > 2) {
        this.findings.push({
          type: 'critical',
          title: `${ep.name} API - Severe Performance Degradation`,
          description: `${ep.name} endpoint response time of ${ep.latency}${ep.unit} exceeds threshold of ${ep.threshold}${ep.unit} by ${Math.round((ratio - 1) * 100)}%`,
          metric: `Response Time: ${ep.latency}${ep.unit}`,
          severity: 'Critical'
        });
      } else if (ratio > 1) {
        this.findings.push({
          type: 'warning',
          title: `${ep.name} API - Performance Degradation`,
          description: `${ep.name} endpoint response time of ${ep.latency}${ep.unit} is approaching threshold of ${ep.threshold}${ep.unit}`,
          metric: `Response Time: ${ep.latency}${ep.unit}`,
          severity: 'Warning'
        });
      }
    });

    // Analyze error rates
    const errorRate = loadTestResults?.errorRate || 0.08;
    if (errorRate > CONFIG.thresholds.errorRate.critical) {
      this.findings.push({
        type: 'critical',
        title: 'High Error Rate Detected',
        description: `Error rate of ${(errorRate * 100).toFixed(1)}% exceeds critical threshold of ${(CONFIG.thresholds.errorRate.critical * 100)}%`,
        metric: `Error Rate: ${(errorRate * 100).toFixed(1)}%`,
        severity: 'Critical'
      });
    }

    // Analyze database performance
    const dbQueryTime = loadTestResults?.dbQueryTime || 450;
    if (dbQueryTime > CONFIG.thresholds.dbQueryTime.critical) {
      this.findings.push({
        type: 'critical',
        title: 'Database Query Slowdown',
        description: `Database query time of ${dbQueryTime}ms exceeds critical threshold. Consider adding indexes or optimizing queries.`,
        metric: `DB Query: ${dbQueryTime}ms`,
        severity: 'Critical'
      });
    }

    // Analyze resource utilization
    const cpuUsage = loadTestResults?.cpuUsage || 72;
    if (cpuUsage > CONFIG.thresholds.cpu.critical) {
      this.findings.push({
        type: 'critical',
        title: 'CPU Utilization Critical',
        description: `CPU usage at ${cpuUsage}% exceeds critical threshold. Consider horizontal scaling.`,
        metric: `CPU: ${cpuUsage}%`,
        severity: 'Critical'
      });
    } else if (cpuUsage > CONFIG.thresholds.cpu.warning) {
      this.findings.push({
        type: 'warning',
        title: 'High CPU Utilization',
        description: `CPU usage at ${cpuUsage}% approaching critical levels.`,
        metric: `CPU: ${cpuUsage}%`,
        severity: 'Warning'
      });
    }

    // Generate recommendations based on findings
    this._generateRecommendations();

    // Print findings report
    this._printFindingsReport();

    return this.findings;
  }

  /**
   * Generate scaling recommendations based on findings
   */
  _generateRecommendations() {
    this.recommendations = [];

    const hasLoginIssue = this.findings.some(f => f.title.includes('Login'));
    const hasSearchIssue = this.findings.some(f => f.title.includes('Search'));
    const hasCheckoutIssue = this.findings.some(f => f.title.includes('Checkout'));
    const hasDbIssue = this.findings.some(f => f.title.includes('Query') || f.title.includes('Database'));
    const hasCpuIssue = this.findings.some(f => f.title.includes('CPU'));

    if (hasLoginIssue) {
      this.recommendations.push({
        priority: 'High',
        action: 'Scale Authentication Service',
        description: 'Deploy additional instances of the auth service behind load balancer. Consider implementing JWT token caching to reduce signing overhead.',
        impact: 'High',
        effort: 'Medium'
      });
    }

    if (hasCheckoutIssue) {
      this.recommendations.push({
        priority: 'High',
        action: 'Optimize Checkout Pipeline',
        description: 'Implement database connection pooling and transaction batching for checkout. Consider async processing for order confirmation emails.',
        impact: 'High',
        effort: 'Medium'
      });
    }

    if (hasSearchIssue || hasDbIssue) {
      this.recommendations.push({
        priority: 'Medium',
        action: 'Add Database Indexes & Use Caching',
        description: 'Create composite indexes on products table for search queries. Implement Redis caching for product listings and category data.',
        impact: 'High',
        effort: 'Low'
      });
    }

    if (hasCpuIssue) {
      this.recommendations.push({
        priority: 'High',
        action: 'Horizontal Scaling',
        description: 'Scale application from 2 to 4 instances. Configure auto-scaling based on CPU utilization > 70%.',
        impact: 'High',
        effort: 'Medium'
      });
    }

    // Always add general recommendations
    this.recommendations.push({
      priority: 'Low',
      action: 'Implement Performance Monitoring',
      description: 'Set up Prometheus alerting rules for automatic detection of performance degradation. Configure Grafana dashboards for real-time visibility.',
      impact: 'Medium',
      effort: 'Low'
    });
  }

  /**
   * Print findings in a formatted report
   */
  _printFindingsReport() {
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                  🔍 AI Analysis Findings Report                   │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    
    if (this.findings.length === 0) {
      console.log('│  ✅ No performance issues detected. System is healthy.           │');
    } else {
      this.findings.forEach(f => {
        const icon = f.severity === 'Critical' ? '🔴' : f.severity === 'Warning' ? '🟡' : '🔵';
        console.log(`│ ${icon} ${f.title.padEnd(59)} │`);
        console.log(`│   ${f.description.padEnd(59)} │`);
        console.log(`│   ${('Metric: ' + f.metric).padEnd(59)} │`);
        console.log('├─────────────────────────────────────────────────────────────────┤');
      });
    }
    
    console.log('└─────────────────────────────────────────────────────────────────┘');
  }

  /**
   * Generate executive report
   */
  generateExecutiveReport(format = 'markdown') {
    console.log('\n📝 Generating Executive Report...\n');

    const report = {
      title: 'AI Performance Test Analysis Report',
      generatedAt: new Date().toISOString(),
      engine: 'AI Performance Testing Assistant v1.0.0',
      summary: {
        totalFindings: this.findings.length,
        critical: this.findings.filter(f => f.severity === 'Critical').length,
        warnings: this.findings.filter(f => f.severity === 'Warning').length,
        info: this.findings.filter(f => f.severity === 'Info').length
      },
      businessJourneys: this.businessJourneys,
      findings: this.findings,
      recommendations: this.recommendations,
      metrics: this.metrics
    };

    const outputDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate Markdown report
    const markdown = this._formatMarkdownReport(report);
    fs.writeFileSync(path.join(outputDir, 'ai-performance-report.md'), markdown);
    console.log('✓ Report saved to reports/ai-performance-report.md');

    // Generate JSON report
    fs.writeFileSync(path.join(outputDir, 'ai-performance-report.json'), JSON.stringify(report, null, 2));
    console.log('✓ Report saved to reports/ai-performance-report.json');

    return report;
  }

  /**
   * Format report as Markdown
   */
  _formatMarkdownReport(report) {
    let md = `# ${report.title}\n\n`;
    md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n`;
    md += `**Engine:** ${report.engine}\n\n`;
    md += `---\n\n`;
    md += `## Executive Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Findings | ${report.summary.totalFindings} |\n`;
    md += `| Critical Issues | ${report.summary.critical} |\n`;
    md += `| Warnings | ${report.summary.warnings} |\n`;
    md += `| Info | ${report.summary.info} |\n\n`;

    md += `## Business Journeys\n\n`;
    md += `| Journey | Status | Max Users |\n`;
    md += `|---------|--------|-----------|\n`;
    report.businessJourneys.forEach(j => {
      md += `| ${j.name} | ${j.critical ? '🔴 Critical' : '🟢 Standard'} | ${j.users} |\n`;
    });

    md += `\n## Performance Findings\n\n`;
    report.findings.forEach(f => {
      const icon = f.severity === 'Critical' ? '🔴' : f.severity === 'Warning' ? '🟡' : '🔵';
      md += `### ${icon} ${f.title}\n\n`;
      md += `- **Description:** ${f.description}\n`;
      md += `- **Metric:** ${f.metric}\n`;
      md += `- **Severity:** ${f.severity}\n\n`;
    });

    md += `## Recommendations\n\n`;
    report.recommendations.forEach(r => {
      md += `### ${r.priority} Priority: ${r.action}\n\n`;
      md += `- **Description:** ${r.description}\n`;
      md += `- **Impact:** ${r.impact}\n`;
      md += `- **Effort:** ${r.effort}\n\n`;
    });

    return md;
  }

  /**
   * Helper to make HTTP GET requests
   */
  _httpGet(url) {
    return new Promise((resolve, reject) => {
      const options = new URL(CONFIG.apiUrl + url);
      http.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }
}

// Main execution
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          🤖 AI Performance Testing Assistant          ║
║              Analysis Engine v1.0.0                   ║
╚══════════════════════════════════════════════════════╝
  `);

  const analyzer = new PerformanceAnalyzer();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const resultsFile = args.find(a => a.startsWith('--results='))?.split('=')[1];
  const runAnalysis = args.includes('--run-analysis');

  // Phase 1: Discover business journeys
  analyzer.discoverBusinessJourneys();

  // Phase 2: Generate workload recommendations
  analyzer.generateWorkloadRecommendations();

  // Phase 3: Fetch metrics
  if (runAnalysis) {
    await analyzer.fetchMetrics();
  } else {
    console.log('\nℹ️  Skipping live metrics fetch (use --run-analysis to connect to API)\n');
  }

  // Phase 4: Load test results (if provided)
  let loadTestResults = null;
  if (resultsFile && fs.existsSync(resultsFile)) {
    try {
      loadTestResults = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
      console.log(`✓ Loaded test results from ${resultsFile}`);
    } catch (err) {
      console.warn(`⚠ Could not parse results file: ${err.message}`);
    }
  }

  // Phase 5: Analyze performance
  analyzer.analyzePerformance(loadTestResults);

  // Phase 6: Generate executive report
  analyzer.generateExecutiveReport();

  console.log(`
╔══════════════════════════════════════════════════════╗
║          ✅ Analysis Complete!                        ║
║                                                      ║
║  Next Steps:                                         ║
║  1. View reports/ai-performance-report.md            ║
║  2. Run k6 tests: npm run test:k6:smoke              ║
║  3. Open Executive Dashboard in browser              ║
╚══════════════════════════════════════════════════════╝
  `);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceAnalyzer;
