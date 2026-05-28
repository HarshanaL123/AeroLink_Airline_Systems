/**
 * Flight Service Client
 * Handles synchronous REST calls from Booking Service to Flight Service
 * Used by the Saga Orchestrator for distributed transactions
 */
const jwt = require('jsonwebtoken');

const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://aerolink-flight:3002/api/v1/flights';

/**
 * Generate a short-lived internal service token to bypass Flight Service RBAC
 */
const getInternalToken = () => {
  return jwt.sign(
    { userId: 'booking-service-internal', role: 'admin' }, 
    process.env.JWT_SECRET || 'secret_key_123', 
    { expiresIn: '5m' }
  );
};

class FlightClient {
  /**
   * Reserve a seat temporarily during the booking process
   * @param {string} flightId 
   * @param {string} seatId 
   */
  static async reserveSeat(flightId, seatId) {
    try {
      const response = await fetch(`${FLIGHT_SERVICE_URL}/${flightId}/seats/${seatId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getInternalToken()}`
        },
        body: JSON.stringify({ status: 'RESERVED' })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reserve seat');
      }

      return data.data;
    } catch (error) {
      console.error('[FlightClient] reserveSeat Error:', error.message);
      throw error;
    }
  }

  /**
   * Confirm a seat permanently after successful payment
   * @param {string} flightId 
   * @param {string} seatId 
   */
  static async confirmSeat(flightId, seatId) {
    try {
      const response = await fetch(`${FLIGHT_SERVICE_URL}/${flightId}/seats/${seatId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getInternalToken()}`
        },
        body: JSON.stringify({ status: 'BOOKED' })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm seat');
      }

      return data.data;
    } catch (error) {
      console.error('[FlightClient] confirmSeat Error:', error.message);
      throw error;
    }
  }

  /**
   * Release a seat back to available (Compensation action in Saga)
   * @param {string} flightId 
   * @param {string} seatId 
   */
  static async releaseSeat(flightId, seatId) {
    try {
      const response = await fetch(`${FLIGHT_SERVICE_URL}/${flightId}/seats/${seatId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getInternalToken()}`
        },
        body: JSON.stringify({ status: 'AVAILABLE' })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to release seat');
      }

      return data.data;
    } catch (error) {
      console.error('[FlightClient] releaseSeat Error:', error.message);
      throw error;
    }
  }
}

module.exports = FlightClient;
