const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

/**
 * AeroLink Notification Service (AWS Lambda)
 * 
 * Listens to EventBridge events and creates notification records.
 * Events handled:
 * - booking.created
 * - booking.cancelled
 * - baggage.status-changed
 * - flight.updated
 */

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.NOTIFICATIONS_TABLE || 'Notifications';

exports.handler = async (event) => {
  console.log('📨 Notification Service received event:', JSON.stringify(event, null, 2));

  try {
    const eventDetail = event.detail || {};
    const eventType = event['detail-type'] || 'unknown';

    const notification = {
      notificationId: uuidv4(),
      eventType: eventType,
      userId: eventDetail.userId || 'system',
      message: generateMessage(eventType, eventDetail),
      channel: 'email', // email, sms, push
      status: 'sent',
      metadata: eventDetail,
      createdAt: new Date().toISOString()
    };

    // Store notification in DynamoDB
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: notification
    }).promise();

    console.log(`✅ Notification created: ${notification.notificationId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        notificationId: notification.notificationId
      })
    };
  } catch (error) {
    console.error('❌ Notification Service error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Generate human-readable notification message based on event type
 */
function generateMessage(eventType, detail) {
  const messages = {
    'booking.created': `Your booking ${detail.bookingId || ''} has been confirmed.`,
    'booking.cancelled': `Your booking ${detail.bookingId || ''} has been cancelled.`,
    'payment.processed': `Payment of $${detail.amount || '0'} has been processed.`,
    'baggage.checked-in': `Your baggage ${detail.baggageId || ''} has been checked in.`,
    'baggage.status-changed': `Baggage ${detail.baggageId || ''} status: ${detail.status || 'updated'}.`,
    'flight.updated': `Flight ${detail.flightNumber || ''} schedule has been updated.`,
    'flight.created': `New flight ${detail.flightNumber || ''} has been added.`
  };

  return messages[eventType] || `Notification: ${eventType}`;
}
