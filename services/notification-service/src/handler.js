const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS Services
const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });

const dynamoDbConfig = { region: process.env.AWS_REGION || 'us-east-1' };
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  dynamoDbConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

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
    const detail = event.detail; // EventBridge puts the payload in the 'detail' object

    if (!detailType || !detail) {
      console.warn('Skipping event: missing detail-type or detail payload.');
      return { statusCode: 400, body: 'Missing event details' };
    }

    let toEmail = null;
    let subject = '';
    let htmlBody = '';

    // Route logic based on the specific EventBridge event
    switch (detailType) {
      case 'booking.created':
        // Expecting the booking event to include passengerEmail
        toEmail = detail.passengerEmail || detail.email; 
        subject = 'AeroLink - Booking Confirmation';
        htmlBody = `
          <h2>Thank you for booking with AeroLink!</h2>
          <p>Your booking <strong>${detail.bookingId}</strong> has been confirmed.</p>
          <p>Flight ID: ${detail.flightId}</p>
          <p>Seat: ${detail.seatNumber}</p>
          <br>
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
        toEmail = detail.passengerEmail || detail.email; // We assume the baggage event was enriched with the email, or we'd fetch it
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

    // Safety check: Ensure we have an email address dynamically extracted
    if (!toEmail) {
      console.error('No target email address found in the event payload. Cannot send email.');
      return { statusCode: 400, body: 'Missing target email address' };
    }

    // 1. Send the Email via AWS SES
    let messageId = 'mocked-message-id';
    
    // In local testing, we skip the actual SES API call unless explicitly configured
    if (process.env.NODE_ENV !== 'test' && !process.env.MOCK_SES) {
      const sesResult = await ses.sendEmail(buildEmailParams(toEmail, subject, htmlBody)).promise();
      messageId = sesResult.MessageId;
      console.log(`[SES] Email sent successfully to ${toEmail}. MessageId: ${messageId}`);
    } else {
      console.log(`[SES MOCK] Simulated sending email to ${toEmail}`);
    }

    // 2. Save Notification Record to DynamoDB for audit history
    const notificationRecord = {
      TableName,
      Item: {
        notificationId: uuidv4(),
        targetEmail: toEmail,
        eventType: detailType,
        subject: subject,
        messageId: messageId,
        status: 'SENT',
        timestamp: new Date().toISOString()
      }
    };

    await dynamoDb.put(notificationRecord).promise();
    console.log(`[DynamoDB] Saved notification record to ${TableName}`);

    return { statusCode: 200, body: 'Notification processed successfully' };

  } catch (error) {
    console.error('Error processing notification:', error);
    // Return error so EventBridge/SQS knows to retry if configured with a DLQ
    throw error;
  }
};
