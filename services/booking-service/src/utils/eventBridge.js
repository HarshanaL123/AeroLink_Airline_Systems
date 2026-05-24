const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
});

// If using LocalStack or a custom endpoint for local testing
const eventBridge = new AWS.EventBridge({
  endpoint: process.env.EVENTBRIDGE_ENDPOINT || undefined
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'aerolink-event-bus';

/**
 * Publishes an event to AWS EventBridge
 * @param {string} source - The source of the event (e.g., 'aerolink.booking')
 * @param {string} detailType - The type of event (e.g., 'booking.created')
 * @param {object} detail - The event payload (data)
 */
const publishEvent = async (source, detailType, detail) => {
  const params = {
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME,
        Time: new Date()
      }
    ]
  };

  try {
    const result = await eventBridge.putEvents(params).promise();
    if (result.FailedEntryCount > 0) {
      console.error(`[EventBridge] Failed to publish ${detailType}:`, result.Entries[0]);
    } else {
      console.log(`[EventBridge] Successfully published event: ${detailType} (ID: ${result.Entries[0].EventId})`);
    }
    return result;
  } catch (error) {
    console.error(`[EventBridge Error] Could not publish ${detailType}:`, error.message);
    // In a real system, we might want to throw here or queue to a dead letter table for retry.
    // For now, we just log it so the main Saga transaction doesn't crash if EventBridge is temporarily down.
  }
};

module.exports = {
  publishEvent
};
