const BookingSaga = require('../src/services/saga.service');
const BookingModel = require('../src/models/booking.model');
const FlightClient = require('../src/services/flight.client');
const PaymentService = require('../src/services/payment.service');
const { publishEvent } = require('../src/utils/eventBridge');

// Mock Dependencies
jest.mock('../src/models/booking.model');
jest.mock('../src/services/flight.client');
jest.mock('../src/services/payment.service');
jest.mock('../src/utils/eventBridge');

describe('Booking Saga Orchestrator', () => {
  const mockBookingRequest = {
    userId: 'user-123',
    flightId: 'flight-456',
    seatId: 'seat-789',
    price: 150.00,
    paymentToken: 'tok_visa'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete the saga successfully when all steps pass', async () => {
    // Arrange: Mock success responses
    BookingModel.createBooking.mockResolvedValue();
    FlightClient.reserveSeat.mockResolvedValue();
    PaymentService.processPayment.mockResolvedValue({
      success: true,
      paymentId: 'pi_12345'
    });
    FlightClient.confirmSeat.mockResolvedValue();
    BookingModel.updateBookingStatus.mockResolvedValue({ status: 'CONFIRMED' });
    publishEvent.mockResolvedValue();

    // Act
    const result = await BookingSaga.executeBookingFlow(mockBookingRequest);

    // Assert: Check that all happy-path functions were called
    expect(BookingModel.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', userId: 'user-123' })
    );
    expect(FlightClient.reserveSeat).toHaveBeenCalledWith('flight-456', 'seat-789');
    expect(PaymentService.processPayment).toHaveBeenCalled();
    expect(FlightClient.confirmSeat).toHaveBeenCalledWith('flight-456', 'seat-789');
    expect(BookingModel.updateBookingStatus).toHaveBeenCalledWith(expect.any(String), 'CONFIRMED');
    
    // Check EventBridge publishing
    expect(publishEvent).toHaveBeenCalledWith(
      'aerolink.booking', 'payment.processed', expect.any(Object)
    );
    expect(publishEvent).toHaveBeenCalledWith(
      'aerolink.booking', 'booking.created', expect.any(Object)
    );

    expect(result.success).toBe(true);
    expect(result.booking.paymentId).toBe('pi_12345');
  });

  it('should trigger Compensation (Rollback) when payment fails', async () => {
    // Arrange: Mock successful DB/Flight, but FAILED payment
    BookingModel.createBooking.mockResolvedValue();
    FlightClient.reserveSeat.mockResolvedValue();
    
    PaymentService.processPayment.mockResolvedValue({
      success: false,
      error: 'Insufficient funds'
    });

    BookingModel.updateBookingStatus.mockResolvedValue({ status: 'FAILED' });
    FlightClient.releaseSeat.mockResolvedValue();

    // Act & Assert
    await expect(BookingSaga.executeBookingFlow({
      ...mockBookingRequest,
      paymentToken: 'tok_insufficientFunds'
    })).rejects.toThrow('Payment Failed: Insufficient funds');

    // Assert Compensation steps occurred
    expect(FlightClient.releaseSeat).toHaveBeenCalledWith('flight-456', 'seat-789');
    expect(BookingModel.updateBookingStatus).toHaveBeenCalledWith(expect.any(String), 'FAILED');
    
    // Ensure confirm was NEVER called
    expect(FlightClient.confirmSeat).not.toHaveBeenCalled();
    // Ensure success event was NEVER published
    expect(publishEvent).not.toHaveBeenCalledWith(
      'aerolink.booking', 'booking.created', expect.any(Object)
    );
  });

  it('should trigger Cancellation flow successfully', async () => {
    // Arrange
    BookingModel.updateBookingStatus.mockResolvedValue({ status: 'CANCELLED' });
    FlightClient.releaseSeat.mockResolvedValue();
    PaymentService.refundPayment.mockResolvedValue();
    publishEvent.mockResolvedValue();

    const mockBookingData = {
      userId: 'user-123',
      flightId: 'flight-456',
      seatId: 'seat-789'
    };

    // Act
    const result = await BookingSaga.executeCancellationFlow('book-123', mockBookingData);

    // Assert
    expect(BookingModel.updateBookingStatus).toHaveBeenCalledWith('book-123', 'CANCELLED');
    expect(FlightClient.releaseSeat).toHaveBeenCalledWith('flight-456', 'seat-789');
    expect(PaymentService.refundPayment).toHaveBeenCalled();
    expect(publishEvent).toHaveBeenCalledWith(
      'aerolink.booking', 'booking.cancelled', expect.any(Object)
    );
    expect(result.status).toBe('CANCELLED');
  });
});
