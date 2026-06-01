const AWSXRay = require('aws-xray-sdk');
AWSXRay.setContextMissingStrategy('LOG_ERROR');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Configure AWS DynamoDB
const dynamoDbConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Use local DynamoDB if running locally
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  dynamoDbConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);
const TableName = process.env.BAGGAGE_TABLE || 'Baggage';

class Baggage {
  static async create(baggageData) {
    const params = {
      TableName,
      Item: {
        baggageId: baggageData.baggageId,
        bookingId: baggageData.bookingId,
        passengerId: baggageData.passengerId,
        flightId: baggageData.flightId,
        weight: baggageData.weight,
        status: baggageData.status || 'CHECKED_IN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await dynamoDb.put(params).promise();
    return params.Item;
  }

  static async findById(baggageId) {
    const params = {
      TableName,
      Key: {
        baggageId,
      },
    };

    const result = await dynamoDb.get(params).promise();
    return result.Item || null;
  }

  static async findByBookingId(bookingId) {
    const params = {
      TableName,
      IndexName: 'BookingBaggageIndex', // GSI for looking up baggage by booking
      KeyConditionExpression: 'bookingId = :bookingId',
      ExpressionAttributeValues: {
        ':bookingId': bookingId,
      },
    };

    const result = await dynamoDb.query(params).promise();
    return result.Items || [];
  }

  static async updateStatus(baggageId, status) {
    const params = {
      TableName,
      Key: { baggageId },
      UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params).promise();
    return result.Attributes;
  }
}

module.exports = Baggage;
