const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sanitizeMiddleware = require('./middleware/sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());

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

app.use(express.json());
app.use(sanitizeMiddleware); // Prevent XSS Attacks
app.use(morgan('combined'));

// Health Check Endpoint (Enhancement #2)
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Rate Limiter Setup (Enhancement #4)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes by default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes (v1 — Enhancement #3)
app.use('/api/v1/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/v1/users', authLimiter, require('./routes/user.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[AUTH-SERVICE ERROR]: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server only if not imported by tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✈️  Auth Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
