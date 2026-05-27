'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { flightAPI, bookingAPI } from '@/services/api';
import styles from './booking.module.css';

function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flightId = searchParams.get('flightId');

  const [flight, setFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [paymentToken, setPaymentToken] = useState('tok_visa_simulated'); // Simulated PCI-DSS token
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    if (!flightId) {
      router.push('/flights');
      return;
    }

    const fetchDetails = async () => {
      try {
        const [flightRes, seatsRes] = await Promise.all([
          flightAPI.getFlight(flightId),
          flightAPI.getSeats(flightId)
        ]);

        if (flightRes.success && seatsRes.success) {
          setFlight(flightRes.data);
          // Only allow booking of AVAILABLE seats
          setSeats(seatsRes.data.filter(s => s.status === 'AVAILABLE'));
        }
      } catch (err) {
        setError('Failed to load flight details or you are unauthorized. Please login first.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [flightId, router]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSeat) {
      setError('Please select a seat.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await bookingAPI.createBooking({
        flightId,
        seatId: selectedSeat,
        price: flight.price,
        paymentToken
      });

      if (response.success) {
        setSuccess(true);
        setBookingDetails(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Booking failed (Saga Rollback triggered).');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loader}>Loading secure checkout...</div>;
  }

  if (success && bookingDetails) {
    return (
      <div className={styles.container}>
        <div className={`glass-panel animate-fade-in ${styles.successCard}`}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Booking Confirmed!</h1>
          <p className={styles.subtitle}>Your seat has been reserved via the Saga Pattern.</p>
          
          <div className={styles.receipt}>
            <div className={styles.receiptRow}>
              <span>Booking ID:</span>
              <strong>{bookingDetails.bookingId}</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Flight:</span>
              <strong>{flight.flightNumber}</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Seat:</span>
              <strong>{bookingDetails.seatId}</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Total Paid:</span>
              <strong>${flight.price}</strong>
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} className={styles.primaryButton}>
            View My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.checkoutCard}`}>
        <h1 className={styles.title}>Secure Checkout</h1>
        <p className={styles.subtitle}>Complete your booking for {flight?.flightNumber}</p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.flightSummary}>
          <div className={styles.summaryRoute}>
            <h2>{flight?.departureAirport}</h2>
            <span>✈️</span>
            <h2>{flight?.arrivalAirport}</h2>
          </div>
          <div className={styles.summaryPrice}>
            Total: <strong>${flight?.price}</strong>
          </div>
        </div>

        <form onSubmit={handleBooking} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="seat">Select Available Seat</label>
            <select 
              id="seat" 
              value={selectedSeat} 
              onChange={(e) => setSelectedSeat(e.target.value)}
              className={styles.input}
              required
            >
              <option value="" disabled>-- Choose a Seat --</option>
              {seats.map(seat => (
                <option key={seat.seatId} value={seat.seatId}>
                  Seat {seat.seatId} (Available)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="card">Payment Details (Simulated PCI-DSS)</label>
            <input 
              type="text" 
              id="card" 
              value="•••• •••• •••• 4242" 
              disabled 
              className={styles.input}
              title="Card data is tokenized securely"
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isProcessing || !selectedSeat}
          >
            {isProcessing ? 'Processing Payment (Saga)...' : `Pay $${flight?.price} & Confirm`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.loader}>Loading...</div></div>}>
      <BookingFlow />
    </Suspense>
  );
}
