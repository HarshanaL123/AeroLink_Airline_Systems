const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TableName = 'AeroLink-Users-dev';

async function createStaffUser() {
  try {
    const email = 'lakindumudannayaka@gmail.com';
    const password = 'lakindu123@123';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const params = {
      TableName,
      Item: {
        userId: uuidv4(),
        email: email,
        passwordHash: passwordHash,
        role: 'staff',
        firstName: 'Lakindu',
        lastName: 'Mudannayaka',
        createdAt: new Date().toISOString(),
      },
    };

    console.log('Inserting staff user into DynamoDB...');
    await dynamoDb.put(params).promise();
    console.log(`Successfully created staff user: ${email}`);
  } catch (err) {
    console.error('Error creating staff user:', err);
  }
}

createStaffUser();
