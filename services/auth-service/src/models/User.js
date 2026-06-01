const AWSXRay = require('aws-xray-sdk');
AWSXRay.setContextMissingStrategy('LOG_ERROR');
const rawAWS = require('aws-sdk');
const AWS = process.env.NODE_ENV === 'test' ? rawAWS : AWSXRay.captureAWS(rawAWS);

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
const TableName = process.env.USERS_TABLE || 'Users';

class User {
  static async create(userData) {
    const params = {
      TableName,
      Item: {
        userId: userData.userId,
        email: userData.email,
        passwordHash: userData.passwordHash,
        role: userData.role || 'passenger',
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date().toISOString(),
      },
    };

    await dynamoDb.put(params).promise();
    return params.Item;
  }

  static async findByEmail(email) {
    const params = {
      TableName,
      IndexName: 'EmailIndex', // Ensure we use the GSI created in Terraform
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    };

    const result = await dynamoDb.query(params).promise();
    return result.Items.length > 0 ? result.Items[0] : null;
  }

  static async findById(userId) {
    const params = {
      TableName,
      Key: {
        userId: userId,
      },
    };

    const result = await dynamoDb.get(params).promise();
    return result.Item || null;
  }

  static async delete(userId) {
    const params = {
      TableName,
      Key: {
        userId: userId,
      },
    };

    await dynamoDb.delete(params).promise();
    return true;
  }
}

module.exports = User;
