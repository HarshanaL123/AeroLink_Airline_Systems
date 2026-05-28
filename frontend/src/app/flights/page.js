'use client';

import { useState, useEffect } from 'react';
import { flightAPI } from '@/services/api';
import styles from './flights.module.css';
import { useRouter } from 'next/navigation';

export default function FlightSearchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState({
    departureAirport: '',
    arrivalAirport: '',
    date: ''
  });
  const [flights, setFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearchChange = (e) => {
    let { name, value } = e.target;
    
    // Strict enforcement: Only allow up to 3 uppercase letters for airport codes
    if (name === 'departureAirport' || name === 'arrivalAirport') {
      value = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    }
    
    setSearchParams({ ...searchParams, [name]: value });
  };

  const executeSearch = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Strip empty params so we don't send them
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v !== '')
      );
      
      // Polish: Ensure airport codes are strictly uppercase to match backend DynamoDB exactly
      if (cleanParams.departureAirport) {
        cleanParams.departureAirport = cleanParams.departureAirport.toUpperCase();
      }
      if (cleanParams.arrivalAirport) {
        cleanParams.arrivalAirport = cleanParams.arrivalAirport.toUpperCase();
      }
      
      const response = await flightAPI.searchFlights(cleanParams);
      if (response.success) {
        setFlights(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch flights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Optional: Load all flights initially if desired, but a search page usually waits for input.
  // We will load all flights initially just to show data if the user hits "Search" with empty params.

  const handleBook = (flightId) => {
    // Navigate to booking page, which we will build next
    router.push(`/booking?flightId=${flightId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Search Flights</h1>
        <p className={styles.subtitle}>Find your next destination</p>
      </div>

      {/* Search Bar Glass Panel */}
      <div className={`glass-panel ${styles.searchPanel}`}>
        <form onSubmit={executeSearch} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <label>From (Airport Code)</label>
            <input 
              type="text" 
              name="departureAirport" 
              placeholder="e.g. JFK" 
              maxLength="3"
              className={styles.input}
              value={searchParams.departureAirport}
              onChange={handleSearchChange}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>To (Airport Code)</label>
            <input 
              type="text" 
              name="arrivalAirport" 
              placeholder="e.g. LAX" 
              maxLength="3"
              className={styles.input}
              value={searchParams.arrivalAirport}
              onChange={handleSearchChange}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Date</label>
            <input 
              type="date" 
              name="date" 
              className={styles.input}
              value={searchParams.date}
              onChange={handleSearchChange}
            />
          </div>

          <button type="submit" className={styles.searchButton} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      <div className={styles.resultsContainer}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        
        {isLoading ? (
          <div className={styles.loader}>Loading flights...</div>
        ) : hasSearched && flights.length === 0 ? (
          <div className={styles.noResults}>No flights found matching your criteria.</div>
        ) : (
          <div className={styles.flightGrid}>
            {flights.map((flight, index) => (
              <div 
                key={flight.flightId} 
                className={`glass-panel animate-fade-in ${styles.flightCard}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={styles.flightHeader}>
                  <span className={styles.flightNumber}>{flight.flightNumber}</span>
                  <span className={styles.flightStatus}>{flight.status}</span>
                </div>
                
                <div className={styles.flightRoute}>
                  <div className={styles.airport}>
                    <h2>{flight.departureAirport}</h2>
                    <p>Departure</p>
                  </div>
                  <div className={styles.planeIcon}>✈️</div>
                  <div className={styles.airport}>
                    <h2>{flight.arrivalAirport}</h2>
                    <p>Arrival</p>
                  </div>
                </div>

                <div className={styles.flightDetails}>
                  <div className={styles.detail}>
                    <span className={styles.label}>Date</span>
                    <span className={styles.value}>{new Date(flight.departureDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.label}>Time</span>
                    <span className={styles.value}>
                      {new Date(flight.departureDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.label}>Seats</span>
                    <span className={styles.value}>{flight.availableSeats} / {flight.totalSeats}</span>
                  </div>
                </div>

                <div className={styles.flightFooter}>
                  <div className={styles.price}>${flight.price}</div>
                  <button 
                    className={styles.bookButton}
                    onClick={() => handleBook(flight.flightId)}
                    disabled={flight.availableSeats === 0 || flight.status === 'CANCELLED'}
                  >
                    {flight.status === 'CANCELLED' ? 'Cancelled' : flight.availableSeats === 0 ? 'Sold Out' : 'Select Flight'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
