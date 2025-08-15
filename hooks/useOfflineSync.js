// hooks/useOfflineSync.js
import { useState, useEffect } from 'react';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState([]);

  useEffect(() => {
    // オンライン状態の監視
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 初期状態を設定
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // オフライン時のデータをキューに追加
  const addToSyncQueue = (action, data) => {
    if (!isOnline) {
      setSyncQueue(prev => [...prev, { action, data, timestamp: Date.now() }]);
      return true; // オフラインでキューに追加
    }
    return false; // オンラインなので直接実行
  };

  // オンライン復帰時の同期処理
  const processSyncQueue = async (syncFunction) => {
    if (isOnline && syncQueue.length > 0) {
      for (const item of syncQueue) {
        try {
          await syncFunction(item);
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }
      setSyncQueue([]); // キューをクリア
    }
  };

  return {
    isOnline,
    syncQueue,
    addToSyncQueue,
    processSyncQueue
  };
}