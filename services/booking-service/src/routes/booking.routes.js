const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Use real JWT Auth Middleware
router.use(protect);

router.post('/', bookingController.createBooking);
router.get('/user/:userId', bookingController.getUserBookings);
router.get('/:id', bookingController.getBooking);
router.put('/:id/cancel', bookingController.cancelBooking);
router.put('/:id/check-in', bookingController.checkInBooking);

module.exports = router;
