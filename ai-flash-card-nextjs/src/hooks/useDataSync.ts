import { useState, useEffect, useCallback } from 'react';
import { dataSyncService } from '../services/dataSyncService';

interface SyncStatus {
  lastSyncTime: string | null;
  isSyncing: boolean;
  pendingChanges: number;
  errors: string[];
}

interface SyncResult {
  success: boolean;
  syncedItems: {
    wordBooks: number;
    wordCards: number;
    conjugationHistory: number;
    settings: number;
  };
  errors: string[];
}

export const useDataSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    isSyncing: false,
    pendingChanges: 0,
    errors: []
  });

  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // 同期状態を更新
  const updateSyncStatus = useCallback(() => {
    const status = dataSyncService.getSyncStatus();
    setSyncStatus(status);
  }, []);

  // 手動同期
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    updateSyncStatus();
    const result = await dataSyncService.syncAllData();
    setLastSyncResult(result);
    updateSyncStatus();
    return result;
  }, [updateSyncStatus]);

  // 定期同期の開始
  const startPeriodicSync = useCallback(() => {
    dataSyncService.startPeriodicSync();
    updateSyncStatus();
  }, [updateSyncStatus]);

  // 定期同期の停止
  const stopPeriodicSync = useCallback(() => {
    dataSyncService.stopPeriodicSync();
    updateSyncStatus();
  }, [updateSyncStatus]);

  // エラーをクリア
  const clearErrors = useCallback(() => {
    dataSyncService.clearErrors();
    updateSyncStatus();
  }, [updateSyncStatus]);

  // 保留中の変更数を増やす
  const incrementPendingChanges = useCallback(() => {
    dataSyncService.incrementPendingChanges();
    updateSyncStatus();
  }, [updateSyncStatus]);

  // 初期化時と定期的に同期状態を更新
  useEffect(() => {
    updateSyncStatus();
    
    // 定期的に同期状態を更新（UI反映のため）
    const statusInterval = setInterval(updateSyncStatus, 5000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [updateSyncStatus]);

  // アプリ開始時に定期同期を開始
  useEffect(() => {
    startPeriodicSync();
    
    // アプリ終了時に定期同期を停止
    return () => {
      stopPeriodicSync();
    };
  }, [startPeriodicSync, stopPeriodicSync]);

  return {
    syncStatus,
    lastSyncResult,
    syncNow,
    startPeriodicSync,
    stopPeriodicSync,
    clearErrors,
    incrementPendingChanges
  };
};