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
const TABLE_NAME = process.env.FLIGHTS_TABLE || process.env.DYNAMODB_TABLE_FLIGHTS || 'AeroLink-Flights-dev';

class Flight {
  /**
   * Create a new flight
   * @param {Object} flightData 
   */
  static async create(flightData) {
    const params = {
      TableName: TABLE_NAME,
      Item: flightData,
    };

    await dynamoDB.put(params).promise();
    return flightData;
  }

  /**
   * Find a flight by ID
   * @param {string} flightId 
   */
  static async findById(flightId) {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        flightId,
      },
    };

    const result = await dynamoDB.get(params).promise();
    return result.Item;
  }

  /**
   * Update a flight
   * @param {string} flightId 
   * @param {Object} updateData 
   */
  static async update(flightId, updateData) {
    // Generate UpdateExpression dynamically
    const updateKeys = Object.keys(updateData);
    if (updateKeys.length === 0) return null;

    const UpdateExpression = 'SET ' + updateKeys.map((k) => `#${k} = :${k}`).join(', ');
    
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    
    updateKeys.forEach(k => {
      ExpressionAttributeNames[`#${k}`] = k;
      ExpressionAttributeValues[`:${k}`] = updateData[k];
    });

    const params = {
      TableName: TABLE_NAME,
      Key: { flightId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDB.update(params).promise();
    return result.Attributes;
  }

  /**
   * Delete a flight
   * @param {string} flightId 
   */
  static async delete(flightId) {
    const params = {
      TableName: TABLE_NAME,
      Key: { flightId },
    };

    await dynamoDB.delete(params).promise();
    return true;
  }

  /**
   * Atomically increment or decrement availableSeats
   * @param {string} flightId 
   * @param {number} amount (+1 or -1)
   */
  static async updateAvailableSeats(flightId, amount) {
    const params = {
      TableName: TABLE_NAME,
      Key: { flightId },
      UpdateExpression: 'ADD availableSeats :val',
      ExpressionAttributeValues: {
        ':val': amount
      },
      ReturnValues: 'UPDATED_NEW'
    };

    const result = await dynamoDB.update(params).promise();
    return result.Attributes;
  }

  /**
   * Find all flights (Note: scanning is expensive in prod, but fine for small catalogs/dev)
   */
  static async findAll() {
    const params = {
      TableName: TABLE_NAME,
    };

    const result = await dynamoDB.scan(params).promise();
    return result.Items;
  }
  /**
   * Search flights by route, date, and price range
   */
  static async search({ departureAirport, arrivalAirport, date, minPrice, maxPrice }) {
      // Fallback to scan with filters since docker-compose did not create the GSI
      let filterExp = [];
      let expValues = {};

      if (departureAirport) { filterExp.push('departureAirport = :dep'); expValues[':dep'] = departureAirport; }
      if (arrivalAirport) { filterExp.push('arrivalAirport = :arr'); expValues[':arr'] = arrivalAirport; }
      if (minPrice) { filterExp.push('price >= :min'); expValues[':min'] = parseFloat(minPrice); }
      if (maxPrice) { filterExp.push('price <= :max'); expValues[':max'] = parseFloat(maxPrice); }

      const params = {
        TableName: TABLE_NAME,
      };

      if (filterExp.length > 0) {
        params.FilterExpression = filterExp.join(' AND ');
        params.ExpressionAttributeValues = expValues;
      }

      const result = await dynamoDB.scan(params).promise();
      return result.Items;
  }
}

module.exports = Flight;
