import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/Auth.module.css';

export default function UserProfile() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className={styles.userProfile}>
      <div className={styles.userInfo}>
        <span className={styles.userEmail}>
          {currentUser.email}
        </span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          ログアウト
        </button>
      </div>
    </div>
  );
}