"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./checkin.module.css";
import { bookingAPI } from "../../services/api";

export default function CheckInPage() {
  const router = useRouter();
  const [bookingId, setBookingId] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Dummy Passport Regex Validation: 8-9 Alphanumeric characters
      if (!/^[A-Z0-9]{8,9}$/i.test(passportNumber)) {
        throw new Error("Invalid Passport format. Must be 8-9 alphanumeric characters.");
      }

      await bookingAPI.checkInBooking(bookingId, passportNumber);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to check-in. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✅</div>
        <h1 className={styles.title}>You're Checked In!</h1>
        <p className={styles.subtitle}>
          Your digital boarding pass has been issued. Head straight to the AeroLink Baggage Drop-off counter when you arrive at the airport.
        </p>
        <button
          onClick={() => router.push("/")}
          className={styles.button}
          style={{ maxWidth: '200px' }}
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 className={styles.formTitle}>Online Check-in</h1>
            <p className={styles.formSubtitle}>Enter your booking details to retrieve your boarding pass.</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          <form onSubmit={handleCheckIn}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Booking Reference ID
              </label>
              <input
                type="text"
                required
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="e.g. b8c3a1..."
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Passport Number
              </label>
              <input
                type="text"
                required
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="e.g. AB123456"
                className={`${styles.input} ${styles.inputUppercase}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.button}
            >
              {loading ? "Verifying..." : "Check In Now"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
