const AWS = require('aws-sdk');

// Configure EventBridge (In local development we just mock it, but we prepare the code for prod)
const eventBridge = new AWS.EventBridge({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.EVENTBRIDGE_ENDPOINT && {
    endpoint: process.env.EVENTBRIDGE_ENDPOINT,
  }),
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'AeroLink-EventBus-dev';

/**
 * Publish an event to AWS EventBridge
 * @param {string} source - The microservice emitting the event (e.g., 'aerolink.flight')
 * @param {string} detailType - The event name (e.g., 'flight.created')
 * @param {Object} detail - The JSON payload of the event
 */
const publishEvent = async (source, detailType, detail) => {
  try {
    const params = {
      Entries: [
        {
          EventBusName: EVENT_BUS_NAME,
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
          Time: new Date()
        }
      ]
    };

    // If we are running tests, we don't actually want to hit AWS EventBridge
    if (process.env.NODE_ENV !== 'test') {
      const result = await eventBridge.putEvents(params).promise();
      console.log(`[EventBridge] Published ${detailType}:`, result.Entries[0].EventId || 'Mocked');
    }
    
    return true;
  } catch (error) {
    console.error(`[EventBridge] Failed to publish ${detailType}:`, error);
    // We don't throw the error so that the main API request still succeeds even if notifications fail
    return false;
  }
};

module.exports = {
  publishEvent
};
