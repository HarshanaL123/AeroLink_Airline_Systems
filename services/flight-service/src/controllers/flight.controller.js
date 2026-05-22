const { v4: uuidv4 } = require('uuid');
const Flight = require('../models/Flight');
const Seat = require('../models/Seat');
const { publishEvent } = require('../utils/eventBridge');

// @desc    Create a new flight
// @route   POST /api/v1/flights
// @access  Private (Admin/Staff)
exports.createFlight = async (req, res, next) => {
  try {
    const { flightNumber, departureAirport, arrivalAirport, departureDate, arrivalDate, price, totalSeats } = req.body;

    if (!flightNumber || !departureAirport || !arrivalAirport || !departureDate || !arrivalDate || !price || !totalSeats) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const flightData = {
      flightId: uuidv4(),
      flightNumber,
      departureAirport,
      arrivalAirport,
      routeDate: `${departureAirport}-${arrivalAirport}#${departureDate.split('T')[0]}`,
      departureDate,
      arrivalDate,
      price: parseFloat(price),
      totalSeats: parseInt(totalSeats),
      availableSeats: parseInt(totalSeats),
      status: 'SCHEDULED', // SCHEDULED, DELAYED, CANCELLED
      createdAt: new Date().toISOString()
    };

    const newFlight = await Flight.create(flightData);

    // Initialize all seats for the new flight
    await Seat.initializeSeats(newFlight.flightId, newFlight.totalSeats);

    // Publish event
    await publishEvent('aerolink.flight', 'flight.created', newFlight);

    res.status(201).json({ success: true, data: newFlight });
  } catch (error) {
    console.error('[CREATE FLIGHT ERROR]', error);
    next(error);
  }
};

// @desc    Search flights
// @route   GET /api/v1/flights/search
// @access  Public
exports.searchFlights = async (req, res, next) => {
  try {
    const { departureAirport, arrivalAirport, date, minPrice, maxPrice } = req.query;
    const flights = await Flight.search({ departureAirport, arrivalAirport, date, minPrice, maxPrice });
    res.status(200).json({ success: true, count: flights.length, data: flights });
  } catch (error) {
    console.error('[SEARCH FLIGHTS ERROR]', error);
    next(error);
  }
};

// @desc    Get all flights
// @route   GET /api/v1/flights
// @access  Public
exports.getFlights = async (req, res, next) => {
  try {
    const flights = await Flight.findAll();
    res.status(200).json({ success: true, count: flights.length, data: flights });
  } catch (error) {
    console.error('[GET FLIGHTS ERROR]', error);
    next(error);
  }
};

// @desc    Get single flight
// @route   GET /api/v1/flights/:id
// @access  Public
exports.getFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, error: 'Flight not found' });
    }
    res.status(200).json({ success: true, data: flight });
  } catch (error) {
    console.error('[GET FLIGHT ERROR]', error);
    next(error);
  }
};

// @desc    Update flight details
// @route   PUT /api/v1/flights/:id
// @access  Private (Admin/Staff)
exports.updateFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, error: 'Flight not found' });
    }

    const updatedFlight = await Flight.update(req.params.id, req.body);
    
    // Publish event
    await publishEvent('aerolink.flight', 'flight.updated', updatedFlight);

    res.status(200).json({ success: true, data: updatedFlight });
  } catch (error) {
    console.error('[UPDATE FLIGHT ERROR]', error);
    next(error);
  }
};

// @desc    Delete flight
// @route   DELETE /api/v1/flights/:id
// @access  Private (Admin Only)
exports.deleteFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, error: 'Flight not found' });
    }

    await Flight.delete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('[DELETE FLIGHT ERROR]', error);
    next(error);
  }
};

// @desc    Get all seats for a flight
// @route   GET /api/v1/flights/:id/seats
// @access  Public
exports.getSeats = async (req, res, next) => {
  try {
    const seats = await Seat.findByFlight(req.params.id);
    res.status(200).json({ success: true, count: seats.length, data: seats });
  } catch (error) {
    console.error('[GET SEATS ERROR]', error);
    next(error);
  }
};

// @desc    Update seat status (e.g., from Booking Service)
// @route   PUT /api/v1/flights/:id/seats/:seatId
// @access  Private (Admin/Staff/System)
exports.updateSeat = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'RESERVED', 'BOOKED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid seat status' });
    }

    const updatedSeat = await Seat.updateSeatStatus(req.params.id, req.params.seatId, status);
    
    // Publish event so Booking Service knows the seat is no longer available
    await publishEvent('aerolink.flight', 'seat.updated', updatedSeat);
    
    res.status(200).json({ success: true, data: updatedSeat });
  } catch (error) {
    console.error('[UPDATE SEAT ERROR]', error);
    next(error);
  }
};
