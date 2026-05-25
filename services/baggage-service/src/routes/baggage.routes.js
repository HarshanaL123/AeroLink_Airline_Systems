const express = require('express');
const {
  registerBaggage,
  getBaggage,
  getBaggageByBooking,
  updateBaggageStatus
} = require('../controllers/baggage.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Register new baggage (Staff/Admin only)
router.post('/', protect, authorize('staff', 'admin'), registerBaggage);

// Get baggage by booking ID (Passenger can see their own booking's baggage, staff can see any)
// Note: In a real system, you'd verify if the passenger owns this bookingId, but for now we trust the protect middleware
router.get('/booking/:bookingId', protect, getBaggageByBooking);

// Get baggage by ID
router.get('/:baggageId', protect, getBaggage);

// Update baggage status (Staff/Admin only)
router.patch('/:baggageId/status', protect, authorize('staff', 'admin'), updateBaggageStatus);

module.exports = router;
