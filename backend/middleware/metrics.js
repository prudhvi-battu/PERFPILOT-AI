const promClient = require('prom-client');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestInProgress = new promClient.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route']
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

const dbQueriesTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'status']
});

const errorTotal = new promClient.Counter({
  name: 'app_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'route']
});

const activeUsers = new promClient.Gauge({
  name: 'app_active_users',
  help: 'Number of active user sessions'
});

const orderTotal = new promClient.Counter({
  name: 'app_orders_total',
  help: 'Total number of orders placed'
});

const revenueTotal = new promClient.Counter({
  name: 'app_revenue_total',
  help: 'Total revenue generated',
  labelNames: ['currency']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestInProgress);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(errorTotal);
register.registerMetric(activeUsers);
register.registerMetric(orderTotal);
register.registerMetric(revenueTotal);

// Middleware to track request metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route ? req.route.path : req.path;
  
  // Track in-progress requests
  httpRequestInProgress.inc({ method: req.method, route });

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    // Record request duration
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    // Increment request count
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });

    // Decrement in-progress
    httpRequestInProgress.dec({ method: req.method, route });

    // Track errors
    if (res.statusCode >= 400) {
      errorTotal.inc({
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        route
      });
    }
  });

  next();
};

// Helper to track DB queries
const trackDbQuery = (queryType, startTime, error = false) => {
  const duration = (Date.now() - startTime) / 1000;
  dbQueryDuration.observe({ query_type: queryType }, duration);
  dbQueriesTotal.inc({ query_type: queryType, status: error ? 'error' : 'success' });
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

module.exports = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  trackDbQuery,
  activeUsers,
  orderTotal,
  revenueTotal
};
