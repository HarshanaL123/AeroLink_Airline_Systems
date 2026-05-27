import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={`glass-panel animate-fade-in ${styles.heroCard}`}>
        <h1 className={styles.title}>
          Welcome to <span className={styles.highlight}>AeroLink</span>
        </h1>
        <p className={styles.subtitle}>
          The next generation of cloud-native airline reservations.
        </p>
        
        <div className={styles.actions}>
          <a href="/login" className={styles.primaryButton}>
            Login to Dashboard
          </a>
          <a href="/flights" className={styles.secondaryButton}>
            Search Flights
          </a>
        </div>
      </div>
    </main>
  );
}
