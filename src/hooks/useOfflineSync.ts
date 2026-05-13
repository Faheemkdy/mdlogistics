import { useState, useEffect } from 'react';
import { offlineSync, SyncItem } from '../lib/offlineSync';

export const useOfflineSync = () => {
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe((newQueue) => {
      setQueue([...newQueue]);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    queue,
    pendingCount: queue.length,
    isOnline,
    sync: () => offlineSync.sync()
  };
};
