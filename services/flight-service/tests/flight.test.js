const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'aerolink-super-secret-key';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mDocumentClient = {
    put: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    batchWrite: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  const mEventBridge = {
    putEvents: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({ Entries: [{ EventId: 'test-event-id' }] })
  };
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mDocumentClient)
    },
    EventBridge: jest.fn(() => mEventBridge),
    config: {
      update: jest.fn()
    }
  };
});

// Create a mock token for admin
const token = jwt.sign({ userId: 'admin-id', role: 'admin' }, process.env.JWT_SECRET || 'aerolink-super-secret-key', { expiresIn: '1h' });

describe('Flight API Endpoints', () => {
  const AWS = require('aws-sdk');
  const ddbMock = new AWS.DynamoDB.DocumentClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/flights', () => {
    it('should create a new flight if admin', async () => {
      ddbMock.promise.mockResolvedValueOnce({}); // Flight create
      ddbMock.promise.mockResolvedValueOnce({}); // Seat batchWrite

      const res = await request(app)
        .post('/api/v1/flights')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightNumber: 'AL101',
          departureAirport: 'JFK',
          arrivalAirport: 'LHR',
          departureDate: '2026-06-01T10:00:00Z',
          arrivalDate: '2026-06-01T22:00:00Z',
          price: 500,
          totalSeats: 180
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.flightNumber).toBe('AL101');
      expect(ddbMock.put).toHaveBeenCalled();
      expect(ddbMock.batchWrite).toHaveBeenCalled();
    });

    it('should block unauthorized users', async () => {
      const res = await request(app)
        .post('/api/v1/flights')
        .send({
          flightNumber: 'AL101'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/flights/search', () => {
    it('should search flights using scan (local fallback)', async () => {
      ddbMock.promise.mockResolvedValueOnce({
        Items: [{ flightId: 'f1', price: 400 }]
      });

      const res = await request(app)
        .get('/api/v1/flights/search?departureAirport=JFK&arrivalAirport=LHR&date=2026-06-01&maxPrice=500');

      expect(res.statusCode).toEqual(200);
      expect(res.body.count).toBe(1);
      expect(ddbMock.scan).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/flights/:id/seats/:seatId', () => {
    it('should update seat status', async () => {
      ddbMock.promise.mockResolvedValueOnce({
        Attributes: { seatId: '1A', status: 'BOOKED' }
      });

      const res = await request(app)
        .put('/api/v1/flights/flight-123/seats/1A')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'BOOKED' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.status).toBe('BOOKED');
      expect(ddbMock.update).toHaveBeenCalled();
    });
  });
});
