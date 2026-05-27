'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { flightAPI } from '@/services/api';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [flights, setFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Flight Form State
  const [formData, setFormData] = useState({
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDate: '',
    arrivalDate: '',
    price: '',
    totalSeats: '12' // Map to our 2D grid structure perfectly
  });

  // 1. Role-Based Route Guard
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined') {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin' && user.role !== 'staff') {
      router.push('/dashboard'); // Kick out normal passengers
      return;
    }

    setIsAdmin(true);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const flightRes = await flightAPI.getFlights();
      if (flightRes.success) {
        setFlights(flightRes.data);
      }
    } catch (err) {
      setError('Failed to fetch system data. Ensure backend services are running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateFlight = async (e) => {
    e.preventDefault();
    try {
      const res = await flightAPI.createFlight(formData);
      if (res.success) {
        // Clear form and refresh data
        setFormData({
          flightNumber: '', departureAirport: '', arrivalAirport: '',
          departureDate: '', arrivalDate: '', price: '', totalSeats: '12'
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create flight');
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm('WARNING: Are you sure you want to cancel this flight? This triggers the massive Saga cancellation and EventBridge fan-out.')) {
      return;
    }
    
    try {
      await flightAPI.deleteFlight(flightId);
      fetchData(); // Refresh the grid
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel flight');
    }
  };

  if (!isAdmin) return null; // Prevent UI flash before redirect

  // Calculate System Stats
  const totalFlights = flights.length;
  const totalRevenue = flights.reduce((sum, f) => sum + ((f.totalSeats - f.availableSeats) * f.price), 0);
  const activeBookings = flights.reduce((sum, f) => sum + (f.totalSeats - f.availableSeats), 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Control Center</h1>
        <p className={styles.subtitle}>Manage cloud microservices and flight schedules</p>
      </div>

      {/* System Stats Row */}
      <div className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Active Flights</h3>
          <div className={styles.statValue}>{totalFlights}</div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Active Bookings</h3>
          <div className={styles.statValue}>{activeBookings}</div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Total Revenue</h3>
          <div className={styles.statValue}>${totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Create Flight Form */}
        <div className={`glass-panel ${styles.formPanel}`}>
          <h2>Schedule New Flight</h2>
          <form onSubmit={handleCreateFlight} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Flight Number</label>
              <input name="flightNumber" value={formData.flightNumber} onChange={handleInputChange} className={styles.input} required placeholder="e.g. FL-101" />
            </div>
            
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Departure Airport</label>
                <input name="departureAirport" value={formData.departureAirport} onChange={handleInputChange} className={styles.input} required placeholder="JFK" />
              </div>
              <div className={styles.inputGroup}>
                <label>Arrival Airport</label>
                <input name="arrivalAirport" value={formData.arrivalAirport} onChange={handleInputChange} className={styles.input} required placeholder="LAX" />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Departure Date</label>
                <input type="datetime-local" name="departureDate" value={formData.departureDate} onChange={handleInputChange} className={styles.input} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Arrival Date</label>
                <input type="datetime-local" name="arrivalDate" value={formData.arrivalDate} onChange={handleInputChange} className={styles.input} required />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Price ($)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} className={styles.input} required min="1" />
              </div>
              <div className={styles.inputGroup}>
                <label>Total Seats</label>
                <input type="number" name="totalSeats" value={formData.totalSeats} onChange={handleInputChange} className={styles.input} required min="4" />
              </div>
            </div>

            <button type="submit" className={styles.submitButton}>Provision Flight to AWS</button>
          </form>
        </div>

        {/* Flight Management List */}
        <div className={`glass-panel ${styles.listPanel}`}>
          <h2>Active Flights Management</h2>
          {isLoading ? (
            <div className={styles.loader}>Fetching cloud data...</div>
          ) : error ? (
            <div className={styles.errorBanner}>{error}</div>
          ) : (
            <div className={styles.flightList}>
              {flights.map(flight => (
                <div key={flight.flightId} className={styles.flightItem}>
                  <div className={styles.flightInfo}>
                    <strong>{flight.flightNumber}</strong>
                    <span>{flight.departureAirport} ✈️ {flight.arrivalAirport}</span>
                    <span className={styles.seatsBadge}>{flight.availableSeats} / {flight.totalSeats} Seats Open</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteFlight(flight.flightId)} 
                    className={styles.deleteButton}
                    title="Triggers EventBridge Cancellation Saga"
                  >
                    Cancel Flight
                  </button>
                </div>
              ))}
              {flights.length === 0 && <p className={styles.noData}>No active flights in the database.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
