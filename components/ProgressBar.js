import styles from '../styles/Progress.module.css';

export default function ProgressBar({ completed, total, showText = true }) {
  if (total === 0) return null;

  const percentage = (completed / total) * 100;

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <span className={styles.progressText}>
          {completed}/{total}
        </span>
      )}
    </div>
  );
}