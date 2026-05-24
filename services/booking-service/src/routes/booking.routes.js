const express = require('express');
const bookingController = require('../controllers/booking.controller');
// In a real app we'd require the Auth middleware from a shared library or duplicate it,
// For now we'll mock it or assume it's attached if we had a shared layer.
// We will add a mock auth middleware for testing if needed.

const router = express.Router();

// Mock Auth Middleware for assignment context 
// (assuming API Gateway handles JWT or we have a local verifier)
const mockAuth = (req, res, next) => {
  // In real implementation: verify JWT and attach req.user
  req.user = {
    userId: req.headers['x-user-id'] || 'test-user-123',
    role: req.headers['x-user-role'] || 'passenger'
  };
  next();
};

router.use(mockAuth);

router.post('/', bookingController.createBooking);
router.get('/user/:userId', bookingController.getUserBookings);
router.get('/:id', bookingController.getBooking);
router.put('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
