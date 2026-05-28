'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  // Re-check authentication state every time the route changes
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  // Don't show navbar on auth pages for a cleaner look
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <nav className={`glass-panel ${styles.navbar}`}>
      <div className={styles.logoContainer}>
        <Link href="/" className={styles.logo}>
          ✈️ AeroLink
        </Link>
      </div>

      <div className={styles.navLinks}>
        {user ? (
          <>
            <span className={styles.welcomeText}>
              Welcome, {user.firstName}
              <span className={styles.roleBadge}>{user.role}</span>
            </span>

            {/* Admin/Staff Specific Links */}
            {(user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'staff') && (
              <Link href="/admin" className={pathname === '/admin' ? styles.active : ''}>
                Admin Dashboard
              </Link>
            )}

            {/* Passenger Specific Links */}
            {user.role.toLowerCase() === 'passenger' && (
              <>
                <Link href="/dashboard" className={pathname === '/dashboard' ? styles.active : ''}>
                  My Dashboard
                </Link>
                <Link href="/flights" className={pathname === '/flights' ? styles.active : ''}>
                  Search Flights
                </Link>
                <Link href="/baggage-tracking" className={pathname === '/baggage-tracking' ? styles.active : ''}>
                  Track Baggage
                </Link>
              </>
            )}

            {/* Universal Logout Button */}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={styles.loginLink}>Login</Link>
            <Link href="/register" className={styles.registerLink}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
