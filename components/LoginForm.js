import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/Auth.module.css';

export default function LoginForm({ onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup, loginWithGoogle, error, setError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className={styles.authInput}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className={styles.authInput}
              required
            />
          </div>

          <button type="submit" className={styles.authButton}>
            {isLogin ? 'ログイン' : '新規登録'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <button onClick={handleGoogleLogin} className={styles.googleButton}>
          <span>🔍</span>
          Googleでログイン
        </button>

        <div className={styles.authToggle}>
          {isLogin ? (
            <>
              アカウントをお持ちでない方は{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={styles.toggleButton}
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              既にアカウントをお持ちの方は{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={styles.toggleButton}
              >
                ログイン
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}