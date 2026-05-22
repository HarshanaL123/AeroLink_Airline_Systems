const express = require('express');
const { createFlight, getFlights, getFlight, updateFlight, deleteFlight, searchFlights, getSeats, updateSeat } = require('../controllers/flight.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/search', searchFlights);
router.get('/:id/seats', getSeats);
router.get('/', getFlights);
router.get('/:id', getFlight);

// Protected routes (Admin / Staff)
router.post('/', protect, authorize('admin', 'staff'), createFlight);
router.put('/:id/seats/:seatId', protect, authorize('admin', 'staff'), updateSeat);
router.put('/:id', protect, authorize('admin', 'staff'), updateFlight);
router.delete('/:id', protect, authorize('admin'), deleteFlight);

module.exports = router;
