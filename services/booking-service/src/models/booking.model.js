const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
});

const dynamoDb = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined
});

const TABLE_NAME = process.env.BOOKINGS_TABLE || 'Bookings';

class BookingModel {
  /**
   * Create a new booking
   */
  static async createBooking(bookingData) {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        ...bookingData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    try {
      await dynamoDb.put(params).promise();
      return params.Item;
    } catch (error) {
      console.error('DynamoDB CreateBooking Error:', error);
      throw new Error('Could not create booking in database');
    }
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(bookingId) {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        bookingId: bookingId
      }
    };

    try {
      const data = await dynamoDb.get(params).promise();
      return data.Item;
    } catch (error) {
      console.error('DynamoDB GetBookingById Error:', error);
      throw new Error('Could not fetch booking from database');
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(bookingId, status) {
    const params = {
      TableName: TABLE_NAME,
      Key: { bookingId },
      UpdateExpression: 'set #status = :s, updatedAt = :u',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':s': status,
        ':u': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    try {
      const data = await dynamoDb.update(params).promise();
      return data.Attributes;
    } catch (error) {
      console.error('DynamoDB UpdateBookingStatus Error:', error);
      throw new Error('Could not update booking status');
    }
  }

  /**
   * Get all bookings for a user
   */
  static async getBookingsByUser(userId) {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    try {
      const data = await dynamoDb.scan(params).promise();
      return data.Items;
    } catch (error) {
      console.error('DynamoDB GetBookingsByUser Error:', error);
      throw new Error('Could not fetch user bookings');
    }
  }
}

module.exports = BookingModel;
