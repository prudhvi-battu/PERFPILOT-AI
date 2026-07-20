/**
 * AI Performance Testing Assistant
 * Browser Push Notification Service
 * 
 * Sends real-time alerts to connected browser dashboards via Server-Sent Events (SSE).
 * Zero credentials required — works immediately in the browser.
 */

const { EventEmitter } = require('events');

class BrowserNotificationService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.notificationHistory = [];
  }

  /**
   * Express middleware for SSE endpoint
   * Usage: app.get('/api/alerts/stream', browserNotifications.sseMiddleware)
   */
  sseMiddleware(req, res) {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Alert stream connected' })}\n\n`);

    // Add client
    this.clients.add(res);
    console.log(`🔔 Browser notification client connected (${this.clients.size} total)`);

    // Send recent notification history
    for (const notification of this.notificationHistory.slice(-10)) {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }

    // Keep alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      this.clients.delete(res);
      clearInterval(keepAlive);
      console.log(`🔔 Browser notification client disconnected (${this.clients.size} remaining)`);
    });
  }

  /**
   * Send a notification to all connected browser clients
   */
  send(alert) {
    const notification = {
      type: 'alert',
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: `[${alert.severity}] ${alert.type}`,
      body: `${alert.metric}: ${alert.value} | Threshold: ${alert.threshold}`,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      businessImpact: alert.businessImpact,
      timestamp: new Date().toISOString(),
      icon: alert.severity === 'Critical' ? '🔴' : alert.severity === 'Warning' ? '🟡' : '🔵',
    };

    // Store in history
    this.notificationHistory.push(notification);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory.splice(0, this.notificationHistory.length - 100);
    }

    // Broadcast to all connected clients
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(data);
      } catch (err) {
        this.clients.delete(client);
      }
    }

    this.emit('notification', notification);
    return notification;
  }

  /**
   * Get notification history
   */
  getHistory(limit = 20) {
    return this.notificationHistory.slice(-limit);
  }

  /**
   * Get connected client count
   */
  getClientCount() {
    return this.clients.size;
  }
}

// Singleton
let instance = null;

function getBrowserNotifications() {
  if (!instance) {
    instance = new BrowserNotificationService();
  }
  return instance;
}

module.exports = {
  BrowserNotificationService,
  getBrowserNotifications,
};
