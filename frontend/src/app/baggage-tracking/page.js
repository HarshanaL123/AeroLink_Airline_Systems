'use client';

import { useState } from 'react';
import { baggageAPI } from '@/services/api';
import styles from './baggage.module.css';

const TIMELINE_STATES = ['CHECKED_IN', 'LOADING', 'IN_FLIGHT', 'ARRIVED', 'COLLECTED'];

export default function BaggageTrackingPage() {
  const [bookingId, setBookingId] = useState('');
  const [baggageList, setBaggageList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!bookingId.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setBaggageList([]);

    try {
      const response = await baggageAPI.getBaggageByBooking(bookingId.trim());
      if (response.success) {
        setBaggageList(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to find baggage records. Check your Booking ID and ensure you are logged in.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (currentStatus, stepStatus) => {
    const currentIndex = TIMELINE_STATES.indexOf(currentStatus);
    const stepIndex = TIMELINE_STATES.indexOf(stepStatus);
    
    if (stepIndex < currentIndex) return styles.completed;
    if (stepIndex === currentIndex) return styles.active;
    return styles.pending;
  };

  const formatStatusText = (status) => {
    return status.replace('_', ' ');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Track Your Baggage</h1>
        <p className={styles.subtitle}>Real-time tracking from check-in to claim</p>
      </div>

      <div className={`glass-panel ${styles.searchPanel}`}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="bookingId">Booking ID</label>
            <input 
              type="text" 
              id="bookingId"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. bkg-12345"
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.searchButton} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Track Bag'}
          </button>
        </form>
      </div>

      <div className={styles.resultsContainer}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        
        {hasSearched && !isLoading && baggageList.length === 0 && !error && (
          <div className={styles.noResults}>No baggage found for this Booking ID.</div>
        )}

        {baggageList.map((bag, index) => (
          <div key={bag.baggageId} className={`glass-panel animate-fade-in ${styles.baggageCard}`} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className={styles.baggageHeader}>
              <div className={styles.bagInfo}>
                <span className={styles.label}>Bag Tag ID</span>
                <span className={styles.value}>{bag.baggageId.split('-')[0]}...</span>
              </div>
              <div className={styles.bagInfo}>
                <span className={styles.label}>Flight ID</span>
                <span className={styles.value}>{bag.flightId}</span>
              </div>
              <div className={styles.bagInfo}>
                <span className={styles.label}>Weight</span>
                <span className={styles.value}>{bag.weight} kg</span>
              </div>
            </div>

            {/* Vertical/Horizontal Timeline */}
            <div className={styles.timelineWrapper}>
              {TIMELINE_STATES.map((state, i) => {
                const stepClass = getStepStatus(bag.status, state);
                return (
                  <div key={state} className={`${styles.timelineStep} ${stepClass}`}>
                    <div className={styles.stepCircle}>
                      {stepClass === styles.completed ? '✓' : i + 1}
                    </div>
                    <div className={styles.stepText}>
                      {formatStatusText(state)}
                    </div>
                    {i < TIMELINE_STATES.length - 1 && <div className={styles.stepLine}></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
