const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sanitizeMiddleware = require('./middleware/sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const AWSXRay = require('aws-xray-sdk');

const app = express();
const PORT = process.env.PORT || 3002;

// Local WebSocket Server (Mocking AWS API Gateway WebSockets for Day 7 Frontend Development)
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
  });
});

// AWS X-Ray Middleware
app.use(AWSXRay.express.openSegment('FlightService'));

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

app.use(helmet());
app.use(express.json());
app.use(sanitizeMiddleware); // Prevent XSS Attacks
app.use(morgan('combined'));

// Health Check Endpoint (Enhancement #2)
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'flight-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Rate Limiter Setup (Enhancement #4)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // Flights allow a bit more traffic than Auth
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes (v1)
app.use('/api/v1/flights', apiLimiter, require('./routes/flight.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[FLIGHT-SERVICE ERROR]: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`✈️  Flight Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 Local WebSocket Server running on ws://localhost:${PORT}`);
  });
}

module.exports = app;
