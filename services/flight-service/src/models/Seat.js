const AWSXRay = require('aws-xray-sdk');
AWSXRay.setContextMissingStrategy('LOG_ERROR');
const rawAWS = require('aws-sdk');
const AWS = process.env.NODE_ENV === 'test' ? rawAWS : AWSXRay.captureAWS(rawAWS);

// Configure AWS to use our local DynamoDB simulator
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.SEATS_TABLE || process.env.DYNAMODB_TABLE_SEATS || 'AeroLink-Seats-dev';

class Seat {
  /**
   * Initialize all seats for a newly created flight
   * @param {string} flightId 
   * @param {number} totalSeats 
   */
  static async initializeSeats(flightId, totalSeats) {
    // Generate an array of seat IDs like "1A", "1B", "2A", etc.
    const rows = Math.ceil(totalSeats / 6);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    const putRequests = [];
    let seatCount = 0;

    for (let i = 1; i <= rows; i++) {
      for (const letter of letters) {
        if (seatCount >= totalSeats) break;
        
        const seatId = `${i}${letter}`;
        putRequests.push({
          PutRequest: {
            Item: {
              flightId,
              seatId,
              status: 'AVAILABLE', // AVAILABLE, RESERVED, BOOKED
              class: i <= 3 ? 'BUSINESS' : 'ECONOMY', // Simple logic: first 3 rows are business
              priceMultiplier: i <= 3 ? 2.0 : 1.0,
            }
          }
        });
        seatCount++;
      }
    }

    // DynamoDB batchWriteItem can only handle 25 requests at a time
    // We chunk the putRequests array into groups of 25
    for (let i = 0; i < putRequests.length; i += 25) {
      const chunk = putRequests.slice(i, i + 25);
      const params = {
        RequestItems: {
          [TABLE_NAME]: chunk
        }
      };
      await dynamoDB.batchWrite(params).promise();
    }
  }

  /**
   * Get all seats for a specific flight
   * @param {string} flightId 
   */
  static async findByFlight(flightId) {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'flightId = :flightId',
      ExpressionAttributeValues: {
        ':flightId': flightId
      }
    };

    const result = await dynamoDB.query(params).promise();
    return result.Items;
  }

  /**
   * Update the status of a specific seat
   * @param {string} flightId 
   * @param {string} seatId 
   * @param {string} status 
   */
  static async updateSeatStatus(flightId, seatId, status) {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        flightId,
        seatId
      },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    return result.Attributes;
  }
}

module.exports = Seat;
