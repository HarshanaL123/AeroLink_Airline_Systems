const BookingModel = require('../models/booking.model');
const FlightClient = require('./flight.client');
const PaymentService = require('./payment.service');
const { publishEvent } = require('../utils/eventBridge');
const { v4: uuidv4 } = require('uuid');

class BookingSaga {
  /**
   * Execute the booking saga
   * @param {object} param0 
   */
  static async executeBookingFlow({ userId, flightId, seatId, price, paymentToken }) {
    console.log(`[SAGA START] Initiating Booking Saga for User: ${userId}, Flight: ${flightId}`);

    // Step 1: Create Booking in PENDING state (Local Transaction)
    console.log('[SAGA STEP 1] Creating pending booking in DynamoDB...');
    const bookingId = uuidv4();
    const bookingData = {
      bookingId,
      userId,
      flightId,
      seatId,
      price,
      status: 'PENDING'
    };
    await BookingModel.createBooking(bookingData);

    let seatReserved = false;
    let paymentResult = null;

    try {
      // Step 2: Reserve Seat (Remote Transaction to Flight Service)
      console.log(`[SAGA STEP 2] Reserving seat ${seatId}...`);
      await FlightClient.reserveSeat(flightId, seatId);
      seatReserved = true;

      // Step 3: Process Payment (Remote Transaction to Payment Gateway)
      console.log(`[SAGA STEP 3] Processing payment...`);
      paymentResult = await PaymentService.processPayment(bookingId, price, paymentToken);

      if (!paymentResult.success) {
        throw new Error(`Payment Failed: ${paymentResult.error}`);
      }

      // Publish payment processed event
      await publishEvent('aerolink.booking', 'payment.processed', {
        bookingId,
        paymentId: paymentResult.paymentId,
        amount: price,
        status: 'SUCCESS'
      });

      // Step 4: Confirm Seat and Booking (Completion)
      console.log(`[SAGA STEP 4] Payment successful. Confirming seat and booking...`);
      await FlightClient.confirmSeat(flightId, seatId);
      
      // We will need to save the paymentId to the booking, so we do a custom update
      // For simplicity, we just update status. In a real system, we'd add paymentId to the record.
      const updatedBooking = await BookingModel.updateBookingStatus(bookingId, 'CONFIRMED');
      // Note: Ideally, we'd add paymentId to the DB. For now, status update is fine.
      
      // Publish booking created event (Notification Service + Baggage Service will listen)
      await publishEvent('aerolink.booking', 'booking.created', {
        bookingId,
        userId,
        flightId,
        seatId,
        price,
        status: 'CONFIRMED'
      });

      console.log(`[SAGA SUCCESS] Booking ${bookingId} confirmed!`);
      return {
        success: true,
        booking: { ...updatedBooking, paymentId: paymentResult.paymentId }
      };

    } catch (error) {
      console.error(`[SAGA FAILED] Error: ${error.message}`);
      
      // BEGIN SAGA ROLLBACK (COMPENSATION)
      console.log(`[SAGA ROLLBACK] Initiating compensation steps...`);

      // 1. Release Seat if it was reserved
      if (seatReserved) {
        try {
          console.log(`[SAGA ROLLBACK] Releasing seat ${seatId}...`);
          await FlightClient.releaseSeat(flightId, seatId);
        } catch (releaseError) {
          console.error(`[SAGA CRITICAL] Failed to release seat during rollback: ${releaseError.message}`);
          // In a real system, send to a Dead Letter Queue (DLQ) for manual intervention
        }
      }

      // 2. Refund Payment if it somehow succeeded but the saga failed later
      if (paymentResult && paymentResult.success) {
        try {
          console.log(`[SAGA ROLLBACK] Refunding payment ${paymentResult.paymentId}...`);
          await PaymentService.refundPayment(paymentResult.paymentId);
        } catch (refundError) {
          console.error(`[SAGA CRITICAL] Failed to refund payment during rollback: ${refundError.message}`);
          // Send to DLQ
        }
      }

      // 3. Mark booking as FAILED
      await BookingModel.updateBookingStatus(bookingId, 'FAILED');
      
      throw new Error(`Booking Failed: ${error.message}`);
    }
  }

  /**
   * Execute the cancellation saga
   * @param {string} bookingId 
   * @param {object} booking 
   */
  static async executeCancellationFlow(bookingId, booking) {
    console.log(`[SAGA CANCEL START] Initiating Cancellation Saga for Booking: ${bookingId}`);

    // Step 1: Mark booking as CANCELLED locally
    const updatedBooking = await BookingModel.updateBookingStatus(bookingId, 'CANCELLED');

    // Step 2: Release seat in Flight Service
    try {
      console.log(`[SAGA CANCEL STEP 2] Releasing seat ${booking.seatId}...`);
      await FlightClient.releaseSeat(booking.flightId, booking.seatId);
    } catch (error) {
      console.error(`[SAGA CANCEL WARN] Failed to release seat. Need manual sync.`);
      // In a real app, queue a retry
    }

    // Step 3: Refund payment (Simulated)
    try {
      console.log(`[SAGA CANCEL STEP 3] Refunding customer...`);
      // Assuming we had a paymentId saved. We mock it here.
      await PaymentService.refundPayment('mock_payment_id');
    } catch (error) {
      console.error(`[SAGA CANCEL WARN] Failed to refund. Need manual sync.`);
    }

    // Publish booking cancelled event
    await publishEvent('aerolink.booking', 'booking.cancelled', {
      bookingId,
      userId: booking.userId,
      flightId: booking.flightId,
      seatId: booking.seatId,
      status: 'CANCELLED'
    });

    console.log(`[SAGA CANCEL SUCCESS] Booking ${bookingId} cancelled!`);
    return updatedBooking;
  }
}

module.exports = BookingSaga;
