"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { processSyncQueue, getSyncQueueCount, addToSyncQueue } from "@/lib/cache";

export interface OfflineSyncState {
  isOnline:    boolean;
  pendingCount: number;
  isSyncing:   boolean;
  lastSyncAt:  Date | null;
  /** Manually trigger sync of pending queue */
  sync:         () => Promise<void>;
  /** Queue a write request for offline delivery */
  queueRequest: (url: string, method: string, body?: unknown) => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline,     setIsOnline]     = useState(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [lastSyncAt,   setLastSyncAt]   = useState<Date | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    const count = await getSyncQueueCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      await refreshPending();
      setLastSyncAt(new Date());
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPending]);

  const queueRequest = useCallback(async (url: string, method: string, body?: unknown) => {
    await addToSyncQueue({ url, method, body });
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    void refreshPending();

    function handleOnline() {
      setIsOnline(true);
      void sync();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync, refreshPending]);

  return { isOnline, pendingCount, isSyncing, lastSyncAt, sync, queueRequest };
}
