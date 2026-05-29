'use client';

import { useState, useEffect } from 'react';
import { flightAPI } from '@/services/api';
import { io } from 'socket.io-client';
import styles from './board.module.css';

export default function LiveFlightBoard() {
  const [flights, setFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // Fetch initial flights
  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await flightAPI.getFlights();
        if (response.success) {
          setFlights(response.data);
        }
      } catch (err) {
        setError('Failed to load live flights.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlights();
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      setConnectionStatus('Connected • Live');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected • Reconnecting...');
    });

    // Listen for real-time seat updates
    socket.on('seat.updated', (updatedSeat) => {
      // Find the flight this seat belongs to and update its availableSeats
      setFlights((prevFlights) => 
        prevFlights.map(flight => {
          if (flight.flightId === updatedSeat.flightId) {
            // A visual flash animation class can be triggered here if desired
            return {
              ...flight,
              // If status is 'BOOKED' or 'RESERVED', we decrease available seats. 
              // (In a real system, the exact available count should ideally come from the backend payload.
              // For now, we simulate a simple decrement if a seat is taken).
              availableSeats: updatedSeat.status !== 'AVAILABLE' 
                ? Math.max(0, flight.availableSeats - 1)
                : flight.availableSeats + 1
            };
          }
          return flight;
        })
      );
    });

    // Listen for real-time flight status updates (e.g., DELAYED, CANCELLED)
    socket.on('flight.updated', (updatedFlight) => {
      setFlights((prevFlights) => 
        prevFlights.map(flight => 
          flight.flightId === updatedFlight.flightId ? { ...flight, ...updatedFlight } : flight
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Live Flight Board</h1>
        <p className={styles.subtitle}>Real-time global departures and arrivals</p>
        <div className={`${styles.statusBadge} ${connectionStatus.includes('Live') ? styles.statusLive : styles.statusError}`}>
          {connectionStatus}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={`glass-panel ${styles.boardWrapper}`}>
        {isLoading ? (
          <div className={styles.loader}>Initializing Live Board...</div>
        ) : (
          <table className={styles.boardTable}>
            <thead>
              <tr>
                <th>Flight</th>
                <th>Route</th>
                <th>Date / Time</th>
                <th>Available Seats</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => (
                <tr key={flight.flightId} className={styles.boardRow}>
                  <td className={styles.flightNumber}>{flight.flightNumber}</td>
                  <td>
                    <span className={styles.airportCode}>{flight.departureAirport}</span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.airportCode}>{flight.arrivalAirport}</span>
                  </td>
                  <td>
                    {new Date(flight.departureDate).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <div className={styles.seatContainer}>
                      <div 
                        className={styles.seatBar} 
                        style={{ width: `${(flight.availableSeats / flight.totalSeats) * 100}%` }}
                      ></div>
                      <span className={styles.seatText}>{flight.availableSeats} / {flight.totalSeats}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[`status_${flight.status}`]}`}>
                      {flight.status}
                    </span>
                  </td>
                </tr>
              ))}
              {flights.length === 0 && (
                <tr>
                  <td colSpan="5" className={styles.noFlights}>No active flights scheduled.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
