const request = require('supertest');
const app = require('../src/app');
const BookingSaga = require('../src/services/saga.service');
const BookingModel = require('../src/models/booking.model');

// Mock dependencies
jest.mock('../src/services/saga.service');
jest.mock('../src/models/booking.model');

describe('Booking API Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/bookings', () => {
    it('should block requests without a paymentToken (PCI-DSS check)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          flightId: 'flight-1',
          seatId: 'seat-1',
          price: 100
          // Missing paymentToken
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/paymentToken/);
      expect(BookingSaga.executeBookingFlow).not.toHaveBeenCalled();
    });

    it('should successfully initiate booking saga', async () => {
      BookingSaga.executeBookingFlow.mockResolvedValue({
        success: true,
        booking: { bookingId: 'b-123', status: 'CONFIRMED' }
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          flightId: 'flight-1',
          seatId: 'seat-1',
          price: 100,
          paymentToken: 'tok_visa'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(BookingSaga.executeBookingFlow).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should return 404 if booking not found', async () => {
      BookingModel.getBookingById.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/bookings/invalid-id');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return booking details', async () => {
      BookingModel.getBookingById.mockResolvedValue({
        bookingId: 'b-123',
        userId: 'test-user-123',
        status: 'CONFIRMED'
      });

      // The mock auth middleware injects 'test-user-123'
      const res = await request(app).get('/api/v1/bookings/b-123');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toBe('b-123');
    });
  });

  describe('PUT /api/v1/bookings/:id/cancel', () => {
    it('should execute cancellation flow', async () => {
      BookingModel.getBookingById.mockResolvedValue({
        bookingId: 'b-123',
        userId: 'test-user-123',
        flightId: 'f-1',
        seatId: 's-1',
        status: 'CONFIRMED'
      });

      BookingSaga.executeCancellationFlow.mockResolvedValue({
        status: 'CANCELLED'
      });

      const res = await request(app).put('/api/v1/bookings/b-123/cancel');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(BookingSaga.executeCancellationFlow).toHaveBeenCalledWith('b-123', expect.any(Object));
    });
  });
});
