const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require('crypto');
const AWSXRay = require('aws-xray-sdk');

AWSXRay.setContextMissingStrategy('LOG_ERROR');

// Configure AWS Services (Using AWS SDK v3 for Node.js 20+)
const sesClient = AWSXRay.captureAWSv3Client(new SESClient({ region: process.env.AWS_REGION || 'us-east-1' }));

const dynamoDbConfig = { region: process.env.AWS_REGION || 'us-east-1' };
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  };
}

const dynamoDbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient(dynamoDbConfig));
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

const TableName = process.env.NOTIFICATIONS_TABLE || 'Notifications';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'syosa920@gmail.com';

/**
 * Helper to construct the email parameters
 */
const buildEmailParams = (toEmail, subject, htmlBody) => {
  return {
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
      },
      Subject: { Charset: "UTF-8", Data: subject },
    },
    Source: SENDER_EMAIL,
  };
};

/**
 * Lambda Handler for EventBridge Events
 */
exports.handler = async (event) => {
  console.log('Received Event:', JSON.stringify(event, null, 2));

  try {
    const detailType = event['detail-type'];
    const detail = event.detail;

    if (!detailType || !detail) {
      console.warn('Skipping event: missing detail-type or detail payload.');
      return { statusCode: 400, body: 'Missing event details' };
    }

    let toEmail = null;
    let subject = '';
    let htmlBody = '';

    switch (detailType) {
      case 'booking.created':
        toEmail = detail.passengerEmail || detail.email; 
        subject = 'AeroLink - Booking Confirmation';
        htmlBody = `
          <h2>Thank you for booking with AeroLink!</h2>
          <p>Your booking <strong>${detail.bookingId}</strong> has been confirmed.</p>
          <p>Flight ID: ${detail.flightId}</p>
          <p>Seat: ${detail.seatNumber || detail.seatId}</p>
          <br>
          <p><strong>IMPORTANT:</strong> Please use your Booking ID (<strong>${detail.bookingId}</strong>) to complete your Online Check-in 24 hours before your flight.</p>
          <p>We wish you a pleasant flight.</p>
        `;
        break;

      case 'booking.cancelled':
        toEmail = detail.passengerEmail || detail.email;
        subject = 'AeroLink - Booking Cancelled';
        htmlBody = `
          <h2>AeroLink Booking Cancellation</h2>
          <p>Your booking <strong>${detail.bookingId}</strong> has been successfully cancelled.</p>
          <p>A full refund has been initiated to your original payment method.</p>
        `;
        break;

      case 'baggage.checked-in':
        toEmail = detail.passengerEmail || detail.email; 
        subject = 'AeroLink - Baggage Checked In';
        htmlBody = `
          <h2>Baggage Checked In</h2>
          <p>Your baggage (ID: ${detail.baggageId}) weighing ${detail.weight}kg has been checked in.</p>
          <p>We will keep you updated on its status.</p>
        `;
        break;

      default:
        console.log(`No notification template for event type: ${detailType}`);
        return { statusCode: 200, body: 'Event ignored' };
    }

    if (!toEmail) {
      console.error('No target email address found in the event payload. Cannot send email.');
      return { statusCode: 400, body: 'Missing target email address' };
    }

    // 1. Send the Email via AWS SES SDK v3
    let messageId = 'mocked-message-id';
    
    if (process.env.NODE_ENV !== 'test' && !process.env.MOCK_SES) {
      const command = new SendEmailCommand(buildEmailParams(toEmail, subject, htmlBody));
      const sesResult = await sesClient.send(command);
      messageId = sesResult.MessageId;
      console.log(`[SES] Email sent successfully to ${toEmail}. MessageId: ${messageId}`);
    } else {
      console.log(`[SES MOCK] Simulated sending email to ${toEmail}`);
    }

    // 2. Save Notification Record to DynamoDB SDK v3
    const notificationRecord = {
      TableName,
      Item: {
        notificationId: randomUUID(),
        targetEmail: toEmail,
        eventType: detailType,
        subject: subject,
        messageId: messageId,
        status: 'SENT',
        timestamp: new Date().toISOString()
      }
    };

    const putCommand = new PutCommand(notificationRecord);
    await dynamoDb.send(putCommand);
    console.log(`[DynamoDB] Saved notification record to ${TableName}`);

    return { statusCode: 200, body: 'Notification processed successfully' };

  } catch (error) {
    console.error('Error processing notification:', error);
    throw error;
  }
};
