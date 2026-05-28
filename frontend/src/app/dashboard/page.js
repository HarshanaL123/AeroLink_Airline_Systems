'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingAPI } from '@/services/api';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function PassengerDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);

    const fetchBookings = async () => {
      try {
        const response = await bookingAPI.getUserBookings(parsedUser.userId);
        if (response.success) {
          // Sort by creation date descending
          const sortedBookings = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setBookings(sortedBookings);
        }
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
        setError('Could not load your bookings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await bookingAPI.cancelBooking(bookingId);
      if (response.success) {
        // Update local state to show cancelled status
        setBookings(prevBookings => 
          prevBookings.map(b => 
            b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b
          )
        );
        alert('Booking cancelled successfully. Saga rollback initiated.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  if (isLoading) {
    return <div className={styles.container}><div className={styles.loader}>Loading your dashboard...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Passenger Dashboard</h1>
        <p className={styles.subtitle}>Welcome back, {user?.firstName}! Here are your travel itineraries.</p>
      </div>

      {error && <div style={{color: '#ff4757', textAlign: 'center', marginBottom: '2rem'}}>{error}</div>}

      {bookings.length === 0 && !error ? (
        <div className={`glass-panel animate-fade-in ${styles.emptyState}`}>
          <h2>No Bookings Found</h2>
          <p>You haven't booked any flights with AeroLink yet.</p>
          <Link href="/flights" className={styles.bookButton}>
            Find a Flight
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {bookings.map((booking) => (
            <div key={booking.bookingId} className={`glass-panel animate-fade-in ${styles.bookingCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.flightInfo}>
                  <h2>Flight {booking.flightId.substring(0, 8).toUpperCase()}</h2>
                  <span className={styles.flightId}>Ref: {booking.bookingId.substring(0, 8)}...</span>
                </div>
                <span className={`${styles.statusBadge} ${
                  booking.status === 'CONFIRMED' ? styles.statusConfirmed :
                  booking.status === 'CANCELLED' ? styles.statusCancelled : styles.statusPending
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.detailRow}>
                  <span>Seat</span>
                  <strong>{booking.seatId}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Price Paid</span>
                  <strong>${booking.price}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Booked On</span>
                  <strong>{new Date(booking.createdAt).toLocaleDateString()}</strong>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button 
                  onClick={() => router.push(`/baggage-tracking?bookingId=${booking.bookingId}`)}
                  className={styles.trackButton}
                >
                  Track Baggage
                </button>
                <button 
                  onClick={() => handleCancelBooking(booking.bookingId)}
                  disabled={booking.status === 'CANCELLED'}
                  className={styles.cancelButton}
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
