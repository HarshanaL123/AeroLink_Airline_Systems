const BookingModel = require('../models/booking.model');
const BookingSaga = require('../services/saga.service');

exports.createBooking = async (req, res, next) => {
  try {
    const { flightId, seatId, price, paymentToken } = req.body;
    
    // For this assignment, we assume userId is injected by Auth middleware
    const userId = req.user ? req.user.userId : 'anonymous-user';

    if (!paymentToken) {
      return res.status(400).json({ success: false, message: 'Missing paymentToken. PCI-DSS compliance requires tokenized payment data.' });
    }

    // Execute the Saga Pattern
    const result = await BookingSaga.executeBookingFlow({
      userId,
      email: req.user ? req.user.email : null,
      flightId,
      seatId,
      price,
      paymentToken
    });
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: result.booking
    });
  } catch (error) {
    next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await BookingModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // RBAC: Ensure passenger can only view their own bookings
    if (req.user && req.user.role === 'passenger' && booking.userId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking' });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.userId : req.params.userId;
    
    // If admin/staff is querying another user, allow it. If passenger, they can only query themselves.
    if (req.user && req.user.role === 'passenger' && req.params.userId && req.params.userId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const bookings = await BookingModel.getBookingsByUser(userId);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await BookingModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // RBAC check
    if (req.user && req.user.role === 'passenger' && booking.userId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    // Execute the Cancellation Saga
    const updatedBooking = await BookingSaga.executeCancellationFlow(id, booking);
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully (Refund initiated)',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

exports.checkInBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { passportNumber } = req.body;
    
    if (!passportNumber || !/^[A-Z0-9]{8,9}$/i.test(passportNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid passport number format.' });
    }

    const booking = await BookingModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // RBAC check: only the passenger who owns the booking (or staff/admin) can check in
    if (req.user && req.user.role === 'passenger' && booking.userId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to check-in this booking' });
    }

    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, message: 'Only CONFIRMED bookings can be checked in.' });
    }

    const updatedBooking = await BookingModel.updateBookingStatus(id, 'CHECKED_IN');
    
    res.status(200).json({
      success: true,
      message: 'Check-in successful!',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};
