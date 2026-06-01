const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TableName = 'AeroLink-Users-dev';

async function createAdminUser() {
  try {
    const email = 'syosa920@gmail.com';
    const password = 'awsadmin12@1';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const params = {
      TableName,
      Item: {
        userId: uuidv4(),
        email: email,
        passwordHash: passwordHash,
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        createdAt: new Date().toISOString(),
      },
    };

    console.log('Inserting admin user into DynamoDB...');
    await dynamoDb.put(params).promise();
    console.log(`Successfully created admin user: ${email}`);
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

createAdminUser();
