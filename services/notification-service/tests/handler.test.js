const { handler } = require('../src/handler');
const AWS = require('aws-sdk');

// We have to mock aws-sdk entirely before requiring the handler
const mockPut = jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) });
const mockSendEmail = jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ MessageId: 'mock-ses-123' }) });

jest.mock('aws-sdk', () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        put: (...args) => mockPut(...args)
      }))
    },
    SES: jest.fn(() => ({
      sendEmail: (...args) => mockSendEmail(...args)
    }))
  };
});

describe('Notification Service Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate test environment so we don't actually trigger real SES inside the handler logic itself,
    // though our aws-sdk mock protects us anyway.
    process.env.NODE_ENV = 'test'; 
  });

  it('should process booking.created event and save to DynamoDB', async () => {
    const mockEvent = {
      'detail-type': 'booking.created',
      detail: {
        bookingId: 'book_999',
        flightId: 'flight_123',
        seatNumber: '12A',
        passengerEmail: 'syosa920@gmail.com'
      }
    };

    const result = await handler(mockEvent);

    expect(result.statusCode).toEqual(200);
    // Since NODE_ENV is 'test', the handler should skip actual SES and only hit DynamoDB
    expect(mockPut).toHaveBeenCalled();
    const dynamoDbArg = mockPut.mock.calls[0][0];
    expect(dynamoDbArg.Item.targetEmail).toEqual('syosa920@gmail.com');
    expect(dynamoDbArg.Item.eventType).toEqual('booking.created');
  });

  it('should reject events without detail payload', async () => {
    const invalidEvent = {
      'detail-type': 'booking.created'
      // missing 'detail'
    };

    const result = await handler(invalidEvent);

    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('Missing event details');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should ignore unhandled event types', async () => {
    const unknownEvent = {
      'detail-type': 'some.random.event',
      detail: { data: 'test' }
    };

    const result = await handler(unknownEvent);

    expect(result.statusCode).toEqual(200);
    expect(result.body).toEqual('Event ignored');
    expect(mockPut).not.toHaveBeenCalled();
  });
});
