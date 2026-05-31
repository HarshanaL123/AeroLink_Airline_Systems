'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/services/api';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  const handleDownloadData = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      const response = await userAPI.downloadData();
      
      if (response.success) {
        // Create a blob from the JSON response
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `aerolink_personal_data_${user.userId.substring(0,8)}.json`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: This action is permanent and cannot be undone. Are you sure you want to delete your account and all associated data?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const response = await userAPI.deleteAccount();
      
      if (response.success) {
        // Log out the user by clearing localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Your account has been permanently deleted.');
        router.push('/');
      }
    } catch (err) {
      setError('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your privacy, security, and personal data.</p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.settingsGrid}>
        
        <div className={`glass-panel animate-fade-in ${styles.settingsCard}`}>
          <div className={styles.cardHeader}>
            <h2>Profile Information</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.detailRow}>
              <span>Name</span>
              <strong>{user.firstName} {user.lastName}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Role</span>
              <strong style={{textTransform: 'capitalize'}}>{user.role}</strong>
            </div>
          </div>
        </div>

        <div className={`glass-panel animate-fade-in ${styles.settingsCard}`}>
          <div className={styles.cardHeader}>
            <h2>GDPR Compliance (Privacy)</h2>
          </div>
          <div className={styles.cardBody}>
            <p className={styles.descriptionText}>
              In accordance with European Union GDPR laws, you have the right to access a copy of all your personal data stored by AeroLink.
            </p>
            <button 
              onClick={handleDownloadData} 
              disabled={isDownloading}
              className={styles.primaryButton}
            >
              {isDownloading ? 'Exporting...' : '📥 Download My Data (JSON)'}
            </button>
          </div>
        </div>

        <div className={`glass-panel animate-fade-in ${styles.dangerCard}`}>
          <div className={styles.dangerHeader}>
            <h2>Danger Zone (Right to be Forgotten)</h2>
          </div>
          <div className={styles.cardBody}>
            <p className={styles.descriptionText}>
              Permanently delete your account and all associated personal data from our servers. This action cannot be reversed.
            </p>
            <button 
              onClick={handleDeleteAccount} 
              disabled={isDeleting}
              className={styles.dangerButton}
            >
              {isDeleting ? 'Deleting...' : '🗑️ Permanently Delete Account'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
