/**
 * Alert Configuration & Monitoring API Routes
 * 
 * GET    /api/alerts/status       — Current monitoring status + latest metrics
 * GET    /api/alerts/history      — Alert history (optional ?severity=Critical&limit=50)
 * POST   /api/alerts/test         — Send a test notification email
 * POST   /api/alerts/config       — Update business configuration
 * GET    /api/alerts/config       — Get current business configuration
 * POST   /api/alerts/start        — Start the alert engine
 * POST   /api/alerts/stop         — Stop the alert engine
 * POST   /api/alerts/trigger      — Manually trigger a simulated alert (for testing)
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getAlertEngine } = require('../services/alertEngine');
const { sendTestEmail } = require('../services/notificationService');

// ─── Status ──────────────────────────────────────────────────────────────────

router.get('/status', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    const status = engine.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Alert History ───────────────────────────────────────────────────────────

router.get('/history', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity || null;
    const history = engine.getAlertHistory(limit, severity);
    res.json({ alerts: history, total: engine.alertHistory.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Send Test Email ─────────────────────────────────────────────────────────

router.post('/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await sendTestEmail();
    if (result.success) {
      res.json({ message: 'Test email sent successfully!', details: result });
    } else {
      res.status(500).json({ error: 'Failed to send test email', details: result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Update Business Config ──────────────────────────────────────────────────

router.post('/config', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    const allowedFields = [
      'averageOrderValue', 'ordersPerMinute', 'activeUsers',
      'revenueTargetPerMinute', 'targetResponseTimeMs', 'acceptableErrorRate'
    ];
    
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = parseFloat(req.body[field]);
      }
    }
    
    const updated = engine.updateBusinessConfig(updates);
    res.json({ message: 'Business config updated', config: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Business Config ─────────────────────────────────────────────────────

router.get('/config', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    res.json({ config: engine.config.business, thresholds: engine.config.thresholds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Start Alert Engine ──────────────────────────────────────────────────────

router.post('/start', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    engine.start();
    res.json({ message: 'Alert engine started', status: engine.getStatus() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Stop Alert Engine ───────────────────────────────────────────────────────

router.post('/stop', authenticate, requireAdmin, (req, res) => {
  try {
    const engine = getAlertEngine();
    engine.stop();
    res.json({ message: 'Alert engine stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Trigger Manual Alert (for testing) ──────────────────────────────────────

router.post('/trigger', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sendCombinedAlert } = require('../services/notificationService');
    const { type, severity, metric, value, threshold } = req.body;
    
    const testAlert = {
      type: type || 'Test Alert — Simulated Performance Degradation',
      severity: severity || 'Warning',
      metric: metric || 'P95 Response Time',
      value: value || '3,500ms',
      threshold: threshold || '< 2,000ms',
      businessImpact: {
        revenueLost: 12540,
        revenuePercent: 8,
        ordersLost: 98,
        usersAffected: 45,
        estimatedLossPerMin: 836,
      },
      details: 'This is a simulated alert triggered from the dashboard for testing notification delivery.',
      recommendations: [
        'Verify email delivery to stakeholder028@gmail.com',
        'Check alert formatting in your email client',
      ],
    };
    
    const result = await sendCombinedAlert([testAlert], 'Manual Test', 1, 0, null);
    
    res.json({ 
      message: 'Test alert triggered! Check your email.', 
      delivery: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
