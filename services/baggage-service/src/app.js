const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

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
