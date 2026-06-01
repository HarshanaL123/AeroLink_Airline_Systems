const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sanitizeMiddleware = require('./middleware/sanitize');
const rateLimit = require('express-rate-limit');
const AWSXRay = require('aws-xray-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// AWS X-Ray Middleware
app.use(AWSXRay.express.openSegment('BaggageService'));

// Dynamic Enterprise CORS Policy
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /\.amazonaws\.com$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS Security Policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(helmet());
app.use(express.json());
app.use(sanitizeMiddleware); // Prevent XSS Attacks
// Add Correlation ID Middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || req.headers['x-amzn-trace-id'] || require('crypto').randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// JSON Structured Logging for HTTP Requests
morgan.token('correlation-id', function (req, res) { return req.correlationId });
app.use(morgan(function (tokens, req, res) {
  return JSON.stringify({
    service: 'baggage-service',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    response_time: tokens['response-time'](req, res) + ' ms',
    correlation_id: tokens['correlation-id'](req, res),
    timestamp: new Date().toISOString()
  });
}));

// Health Check Endpoint (Enhancement #2)
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'baggage-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API Routes (v1 — Enhancement #3)
app.use('/api/v1/baggage', require('./routes/baggage.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[BAGGAGE-SERVICE ERROR]: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server (Pro Move: Decouple from tests to prevent port collision)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✈️  Baggage Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
