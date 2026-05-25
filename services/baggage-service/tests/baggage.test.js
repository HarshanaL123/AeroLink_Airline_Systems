const request = require('supertest');
const app = require('../src/app');
const Baggage = require('../src/models/baggage.model');
const { publishEvent } = require('../src/utils/eventBridge');

// Mock Dependencies
jest.mock('../src/models/baggage.model');
jest.mock('../src/utils/eventBridge');
jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

describe('Baggage Service API', () => {
  let staffToken = 'mock-staff-token';
  let passengerToken = 'mock-passenger-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock JWT Verification
    jwt.verify.mockImplementation((token, secret) => {
      if (token === staffToken) return { userId: 'staff123', role: 'staff' };
      if (token === passengerToken) return { userId: 'pass123', role: 'passenger' };
      throw new Error('Invalid token');
    });
  });

  describe('POST /api/v1/baggage', () => {
    it('should register new baggage and publish event if staff', async () => {
      const mockBaggage = {
        baggageId: 'bag123',
        bookingId: 'book123',
        passengerId: 'pass123',
        flightId: 'flight123',
        weight: 23,
        status: 'CHECKED_IN'
      };

      Baggage.create.mockResolvedValue(mockBaggage);
      publishEvent.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/v1/baggage')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          bookingId: 'book123',
          passengerId: 'pass123',
          flightId: 'flight123',
          weight: 23
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(Baggage.create).toHaveBeenCalled();
      expect(publishEvent).toHaveBeenCalledWith('aerolink.baggage', 'baggage.checked-in', mockBaggage);
    });

    it('should deny registration if passenger', async () => {
      const res = await request(app)
        .post('/api/v1/baggage')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          bookingId: 'book123',
          passengerId: 'pass123',
          flightId: 'flight123',
          weight: 23
        });

      expect(res.statusCode).toEqual(403);
      expect(Baggage.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/baggage/:baggageId/status', () => {
    it('should update status to IN_FLIGHT and publish event', async () => {
      Baggage.findById.mockResolvedValue({ baggageId: 'bag123', status: 'CHECKED_IN' });
      
      const updatedBaggage = { baggageId: 'bag123', status: 'IN_FLIGHT' };
      Baggage.updateStatus.mockResolvedValue(updatedBaggage);
      publishEvent.mockResolvedValue(true);

      const res = await request(app)
        .patch('/api/v1/baggage/bag123/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'IN_FLIGHT' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.status).toEqual('IN_FLIGHT');
      expect(publishEvent).toHaveBeenCalledWith('aerolink.baggage', 'baggage.status-changed', updatedBaggage);
    });

    it('should reject invalid statuses', async () => {
      const res = await request(app)
        .patch('/api/v1/baggage/bag123/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'LOST' }); // Not a valid status enum

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Invalid status');
    });
  });
});
