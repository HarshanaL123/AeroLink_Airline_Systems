const { v4: uuidv4 } = require('uuid');
const Baggage = require('../models/baggage.model');
const { publishEvent } = require('../utils/eventBridge');

// @desc    Register new baggage
// @route   POST /api/v1/baggage
// @access  Private (Staff/Admin)
const registerBaggage = async (req, res, next) => {
  try {
    const { bookingId, passengerId, flightId, weight } = req.body;

    if (!bookingId || !passengerId || !flightId || !weight) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const baggageData = {
      baggageId: uuidv4(),
      bookingId,
      passengerId,
      flightId,
      weight,
      status: 'CHECKED_IN'
    };

    const newBaggage = await Baggage.create(baggageData);

    // Publish event
    await publishEvent('aerolink.baggage', 'baggage.checked-in', newBaggage);

    res.status(201).json({
      success: true,
      data: newBaggage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get baggage by ID
// @route   GET /api/v1/baggage/:baggageId
// @access  Private
const getBaggage = async (req, res, next) => {
  try {
    const baggage = await Baggage.findById(req.params.baggageId);

    if (!baggage) {
      return res.status(404).json({ success: false, error: 'Baggage not found' });
    }

    res.status(200).json({
      success: true,
      data: baggage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all baggage for a booking
// @route   GET /api/v1/baggage/booking/:bookingId
// @access  Private
const getBaggageByBooking = async (req, res, next) => {
  try {
    const baggageList = await Baggage.findByBookingId(req.params.bookingId);

    res.status(200).json({
      success: true,
      count: baggageList.length,
      data: baggageList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update baggage status
// @route   PATCH /api/v1/baggage/:baggageId/status
// @access  Private (Staff)
const updateBaggageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['CHECKED_IN', 'LOADING', 'IN_FLIGHT', 'ARRIVED', 'COLLECTED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const baggage = await Baggage.findById(req.params.baggageId);
    if (!baggage) {
      return res.status(404).json({ success: false, error: 'Baggage not found' });
    }

    const updatedBaggage = await Baggage.updateStatus(req.params.baggageId, status);

    // Publish event
    await publishEvent('aerolink.baggage', 'baggage.status-changed', updatedBaggage);

    res.status(200).json({
      success: true,
      data: updatedBaggage
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerBaggage,
  getBaggage,
  getBaggageByBooking,
  updateBaggageStatus
};
