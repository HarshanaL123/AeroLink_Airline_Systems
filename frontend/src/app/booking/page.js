'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { flightAPI, bookingAPI } from '@/services/api';
import { io } from 'socket.io-client';
import styles from './booking.module.css';

function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flightId = searchParams.get('flightId');

  const [flight, setFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [paymentToken, setPaymentToken] = useState('tok_visa_simulated'); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [wsStatus, setWsStatus] = useState('Connecting...');

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
          // Sort seats so they map cleanly to a grid (e.g. 1A, 1B, 1C...)
          const sortedSeats = seatsRes.data.sort((a, b) => a.seatId.localeCompare(b.seatId));
          setSeats(sortedSeats);
        }
      } catch (err) {
        setError('Failed to load flight details or unauthorized.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [flightId, router]);

  // Real-time WebSocket logic for Seat Map
  useEffect(() => {
    if (!flightId) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    const socket = io(socketUrl);

    socket.on('connect', () => setWsStatus('Live Updates Active'));
    socket.on('disconnect', () => setWsStatus('Live Updates Paused'));

    socket.on('seat.updated', (updatedSeat) => {
      if (updatedSeat.flightId === flightId) {
        setSeats((prevSeats) => 
          prevSeats.map(seat => {
            if (seat.seatId === updatedSeat.seatId) {
              // If the seat we currently selected was just booked by someone else, deselect it!
              if (selectedSeat === updatedSeat.seatId && updatedSeat.status !== 'AVAILABLE') {
                setSelectedSeat('');
                setError(`Alert: Seat ${updatedSeat.seatId} was just booked by another user!`);
              }
              return { ...seat, status: updatedSeat.status };
            }
            return seat;
          })
        );
      }
    });

    return () => socket.disconnect();
  }, [flightId, selectedSeat]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSeat) {
      setError('Please select an available seat from the map.');
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
        <h1 className={styles.title}>Interactive Seat Selection</h1>
        <p className={styles.subtitle}>Flight {flight?.flightNumber} | {wsStatus}</p>

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

        {/* 2D Interactive Seat Map */}
        <div className={styles.seatMapContainer}>
          <div className={styles.seatMapLegend}>
            <div className={styles.legendItem}><div className={`${styles.legendBox} ${styles.seatAvailable}`}></div> Available</div>
            <div className={styles.legendItem}><div className={`${styles.legendBox} ${styles.seatSelected}`}></div> Selected</div>
            <div className={styles.legendItem}><div className={`${styles.legendBox} ${styles.seatBooked}`}></div> Booked</div>
          </div>
          
          <div className={styles.airplaneFuselage}>
            <div className={styles.cockpit}></div>
            <div className={styles.seatGrid}>
              {seats.map((seat) => {
                const isAvailable = seat.status === 'AVAILABLE';
                const isSelected = selectedSeat === seat.seatId;
                
                return (
                  <button
                    key={seat.seatId}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSeat(seat.seatId)}
                    className={`${styles.seatButton} ${
                      isSelected ? styles.seatSelected : 
                      isAvailable ? styles.seatAvailable : styles.seatBooked
                    }`}
                    title={isAvailable ? `Select Seat ${seat.seatId}` : `Seat ${seat.seatId} is taken`}
                  >
                    {seat.seatId}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleBooking} className={styles.form}>
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
            {isProcessing ? 'Processing Payment (Saga)...' : selectedSeat ? `Pay $${flight?.price} & Confirm ${selectedSeat}` : 'Select a seat to proceed'}
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
