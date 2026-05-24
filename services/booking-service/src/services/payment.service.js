/**
 * Simulated Payment Gateway Service
 * Ensures PCI-DSS compliance by NEVER touching raw credit card data.
 * Accepts only pre-tokenized payment data (e.g., from Stripe/Braintree).
 */

const { v4: uuidv4 } = require('uuid');

class PaymentService {
  /**
   * Process a payment using a tokenized card
   * @param {string} bookingId - The ID of the booking to pay for
   * @param {number} amount - The amount to charge
   * @param {string} paymentToken - The secure token representing the card (e.g., 'tok_visa')
   * @returns {Promise<object>} The payment result
   */
  static async processPayment(bookingId, amount, paymentToken) {
    console.log(`[PAYMENT GATEWAY] Initiating payment of $${amount} for booking ${bookingId} using token ${paymentToken}`);

    // Simulate network delay to external gateway (Stripe/PayPal)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Basic Validation (PCI-DSS enforcement)
    if (!paymentToken || typeof paymentToken !== 'string') {
      throw new Error('Invalid payment token. Raw card details are strictly prohibited.');
    }

    // Simulate Payment Success/Failure
    // For testing Saga Pattern rollback, we can force failures using specific tokens
    if (paymentToken === 'tok_chargeDeclined') {
      console.warn(`[PAYMENT GATEWAY] Payment DECLINED for booking ${bookingId}`);
      return {
        success: false,
        error: 'Card was declined by the issuer.',
        paymentId: null
      };
    }

    if (paymentToken === 'tok_insufficientFunds') {
      console.warn(`[PAYMENT GATEWAY] Payment FAILED (Insufficient Funds) for booking ${bookingId}`);
      return {
        success: false,
        error: 'Insufficient funds.',
        paymentId: null
      };
    }

    // Default: Success (Simulates successful charge)
    const paymentId = `pi_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
    console.log(`[PAYMENT GATEWAY] Payment SUCCESSFUL. Receipt: ${paymentId}`);

    return {
      success: true,
      paymentId: paymentId,
      amountCaptured: amount,
      currency: 'USD',
      status: 'succeeded',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Refund a payment (Compensation action for Saga Pattern)
   * @param {string} paymentId - The ID of the successful payment to refund
   * @returns {Promise<object>} The refund result
   */
  static async refundPayment(paymentId) {
    console.log(`[PAYMENT GATEWAY] Initiating REFUND for payment ${paymentId}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!paymentId) {
      throw new Error('Valid paymentId required for refund.');
    }

    console.log(`[PAYMENT GATEWAY] Refund SUCCESSFUL for payment ${paymentId}`);

    return {
      success: true,
      refundId: `re_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
      status: 'refunded',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = PaymentService;
