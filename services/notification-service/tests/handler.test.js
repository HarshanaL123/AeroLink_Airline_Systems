const mockSend = jest.fn().mockResolvedValue({});
const mockSESClient = jest.fn().mockImplementation(() => ({ send: mockSend }));
const mockDynamoDBClient = jest.fn().mockImplementation(() => ({}));
const mockFrom = jest.fn().mockImplementation(() => ({ send: mockSend }));

jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: mockSESClient,
    SendEmailCommand: jest.fn().mockImplementation((params) => params)
  };
});

jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: mockDynamoDBClient
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: mockFrom
    },
    PutCommand: jest.fn().mockImplementation((params) => params)
  };
});

const { handler } = require('../src/handler');

describe('Notification Service Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockSend).toHaveBeenCalled();
    const dynamoDbArg = mockSend.mock.calls[0][0]; // This is what was passed to PutCommand
    expect(dynamoDbArg.Item.targetEmail).toEqual('syosa920@gmail.com');
    expect(dynamoDbArg.Item.eventType).toEqual('booking.created');
  });

  it('should reject events without detail payload', async () => {
    const invalidEvent = {
      'detail-type': 'booking.created'
    };

    const result = await handler(invalidEvent);

    expect(result.statusCode).toEqual(400);
    expect(result.body).toEqual('Missing event details');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should ignore unhandled event types', async () => {
    const unknownEvent = {
      'detail-type': 'some.random.event',
      detail: { data: 'test' }
    };

    const result = await handler(unknownEvent);

    expect(result.statusCode).toEqual(200);
    expect(result.body).toEqual('Event ignored');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
