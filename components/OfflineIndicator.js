// components/OfflineIndicator.js
import styles from '../styles/OfflineIndicator.module.css';

export default function OfflineIndicator({ isOnline, syncQueue }) {
  if (isOnline && syncQueue.length === 0) return null;

  return (
    <div className={`${styles.indicator} ${isOnline ? styles.syncing : styles.offline}`}>
      <div className={styles.status}>
        {!isOnline ? (
          <>
            <span className={styles.dot}></span>
            オフライン - 変更は後で同期されます
          </>
        ) : syncQueue.length > 0 ? (
          <>
            <span className={styles.syncDot}></span>
            同期中... ({syncQueue.length} 件)
          </>
        ) : null}
      </div>
    </div>
  );
}