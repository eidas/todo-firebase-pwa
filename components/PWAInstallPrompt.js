// components/PWAInstallPrompt.js
import { useState, useEffect } from 'react';
import styles from '../styles/PWAInstallPrompt.module.css';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (!showInstallButton) return null;

  return (
    <div className={styles.installPrompt}>
      <div className={styles.promptContent}>
        <span className={styles.promptIcon}>📱</span>
        <span className={styles.promptText}>アプリをインストールしますか？</span>
        <button onClick={handleInstallClick} className={styles.installButton}>
          インストール
        </button>
        <button 
          onClick={() => setShowInstallButton(false)} 
          className={styles.dismissButton}
        >
          ×
        </button>
      </div>
    </div>
  );
}