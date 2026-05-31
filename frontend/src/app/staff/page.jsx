"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api, { bookingAPI, baggageAPI } from "../../services/api";
import styles from "./staff.module.css";

export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Search State
  const [bookingId, setBookingId] = useState("");
  const [passengerDetails, setPassengerDetails] = useState(null);
  const [baggageError, setBaggageError] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Task 4 & 5 State
  const [baggageList, setBaggageList] = useState([]);
  const [weight, setWeight] = useState("");
  const [loadingBaggage, setLoadingBaggage] = useState(false);
  const [updatingBaggageId, setUpdatingBaggageId] = useState(null);

  const BAG_STATUSES = ['CHECKED_IN', 'LOADING', 'IN_FLIGHT', 'ARRIVED', 'COLLECTED'];

  // Authentication & Role Check
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(userStr);
    
    // Protected Route Logic: Only Staff (or Admin) can access this!
    if (userData.role.toLowerCase() !== "staff" && userData.role.toLowerCase() !== "admin") {
      router.push("/"); // Redirect passengers away from staff portal
      return;
    }

    setUser(userData);
    setLoadingAuth(false);
  }, [router]);

  const handleSearchBooking = async (e) => {
    e.preventDefault();
    setBaggageError("");
    setLoadingSearch(true);
    setPassengerDetails(null);
    setBaggageList([]);

    try {
      const response = await bookingAPI.getBooking(bookingId);
      
      if (!response || !response.data) {
        throw new Error("Booking not found");
      }
      
      const bookingData = response.data;
      
      // Ensure passenger has actually checked in first!
      if (bookingData.status !== "CHECKED_IN") {
         throw new Error(`Passenger has not checked in online yet. Current Status: ${bookingData.status}`);
      }

      setPassengerDetails(bookingData);

      // Task 4 & 5: Fetch existing baggage for this booking
      try {
        const bagRes = await baggageAPI.getBaggageByBooking(bookingData.bookingId);
        if (bagRes.success && bagRes.data) {
          setBaggageList(bagRes.data);
        }
      } catch (err) {
        // No baggage found or error, leave list empty
      }

    } catch (err) {
      console.error("Search error:", err);
      setBaggageError(err.response?.data?.message || err.message || "Could not find booking");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleRegisterBaggage = async (e) => {
    e.preventDefault();
    setLoadingBaggage(true);
    try {
      const bagData = {
        bookingId: passengerDetails.bookingId,
        passengerId: passengerDetails.userId, // from booking object
        flightId: passengerDetails.flightId,
        weight: parseFloat(weight)
      };
      const res = await baggageAPI.registerBaggage(bagData);
      if (res.success) {
        setBaggageList([...baggageList, res.data]);
        setWeight("");
      }
    } catch (err) {
      alert("Failed to register baggage: " + (err.response?.data?.error || err.message));
    } finally {
      setLoadingBaggage(false);
    }
  };

  const handleUpdateStatus = async (baggageId, newStatus) => {
    setUpdatingBaggageId(baggageId);
    try {
      const res = await baggageAPI.updateBaggageStatus(baggageId, newStatus);
      if (res.success) {
        setBaggageList(baggageList.map(b => b.baggageId === baggageId ? res.data : b));
      }
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingBaggageId(null);
    }
  };

  if (loadingAuth) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <span style={{ marginLeft: '12px' }}>Loading Secure Portal...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Staff Baggage Portal</h1>
            <p className={styles.subtitle}>AeroLink Ground Operations Dashboard</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={styles.roleBadge}>
              {user.role}
            </span>
            <p className={styles.userName}>Logged in as {user.firstName}</p>
          </div>
        </header>

        <div className={styles.grid}>
          {/* Panel 1: Search Booking (Simulates scanning boarding pass) */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <span>🔍</span> Scan Boarding Pass
            </h2>

            {baggageError && (
              <div className={styles.errorBox}>
                ⚠️ {baggageError}
              </div>
            )}

            <form onSubmit={handleSearchBooking}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Booking Reference ID
                </label>
                <input
                  type="text"
                  required
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Enter passenger's Booking ID"
                  className={styles.input}
                />
              </div>
              <button
                type="submit"
                disabled={loadingSearch}
                className={styles.button}
              >
                {loadingSearch ? "Searching..." : "Retrieve Passenger"}
              </button>
            </form>
          </div>

          {/* Panel 2: Baggage Registration & State Update (Tasks 4 & 5) */}
          <div className={styles.panel}>
            {!passengerDetails ? (
              <div className={styles.panelCenter} style={{ height: '100%' }}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🧳</div>
                  <p>Search a booking ID to register or update baggage.</p>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'left' }}>
                <h3 className={styles.successTitle}>
                  <span>✅</span> Passenger Verified
                </h3>
                <div className={styles.detailsBox}>
                  <p className={styles.detailRow}><span className={styles.detailLabel}>Booking ID:</span> {passengerDetails.bookingId}</p>
                  <p className={styles.detailRow}><span className={styles.detailLabel}>Flight ID:</span> {passengerDetails.flightId}</p>
                  <p className={styles.detailRow}><span className={styles.detailLabel}>Seat:</span> {passengerDetails.seatId}</p>
                </div>
                
                {baggageList.length === 0 ? (
                  /* Task 4: Register Baggage Form */
                  <div>
                    <h4 style={{ color: 'white', marginBottom: '16px', fontWeight: 'bold' }}>Register New Baggage</h4>
                    <form onSubmit={handleRegisterBaggage}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          min="0.1"
                          max="50"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="e.g. 23.5"
                          className={styles.input}
                          style={{ textTransform: 'none' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loadingBaggage}
                        className={styles.button}
                        style={{ backgroundColor: '#10b981' }}
                      >
                        {loadingBaggage ? "Registering..." : "Print Bag Tag & Register"}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Task 5: Baggage State Management */
                  <div>
                    <h4 style={{ color: 'white', marginBottom: '16px', fontWeight: 'bold' }}>Manage Checked Baggage</h4>
                    {baggageList.map((bag) => (
                      <div key={bag.baggageId} style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>TAG: {bag.baggageId.substring(0,8)}</span>
                          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{bag.weight} kg</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label className={styles.label}>Update Tracking Status</label>
                          <select 
                            className={styles.input}
                            value={bag.status}
                            onChange={(e) => handleUpdateStatus(bag.baggageId, e.target.value)}
                            disabled={updatingBaggageId === bag.baggageId}
                            style={{ textTransform: 'none' }}
                          >
                            {BAG_STATUSES.map(status => (
                              <option key={status} value={status}>
                                {status.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          {updatingBaggageId === bag.baggageId && (
                            <span style={{ color: '#60a5fa', fontSize: '12px' }}>Updating Global Tracker...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
