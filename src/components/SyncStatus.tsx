import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { syncAll, getSyncStatus, addSyncListener, SyncStatus } from '../services/syncService';

const SyncStatusComponent: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // 同期状態の変更を監視
    const unsubscribe = addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const handleSync = async () => {
    try {
      await syncAll();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('同期エラー:', error);
    }
  };

  const formatLastSyncTime = (timestamp: string | null) => {
    if (!timestamp) return '未同期';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-3">
        {/* オンライン/オフライン状態 */}
        <div className="flex items-center gap-2">
          {syncStatus.isOnline ? (
            <Cloud className="w-5 h-5 text-green-400" />
          ) : (
            <CloudOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm">
            {syncStatus.isOnline ? 'オンライン' : 'オフライン'}
          </span>
        </div>

        {/* 同期ボタン */}
        <button
          onClick={handleSync}
          disabled={!syncStatus.isOnline || syncStatus.isSyncing}
          className={`
            px-3 py-1 rounded-md flex items-center gap-2 text-sm transition-all
            ${syncStatus.isOnline && !syncStatus.isSyncing
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
            }
          `}
        >
          <RefreshCw 
            className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} 
          />
          {syncStatus.isSyncing ? '同期中...' : '同期'}
        </button>

        {/* 最終同期時刻 */}
        <div className="text-xs text-gray-400">
          最終同期: {formatLastSyncTime(syncStatus.lastSyncedAt)}
        </div>

        {/* エラー表示 */}
        {syncStatus.syncError && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">エラー</span>
          </div>
        )}

        {/* 成功表示 */}
        {showSuccess && (
          <div className="flex items-center gap-1 text-green-400 animate-fade-in">
            <Check className="w-4 h-4" />
            <span className="text-xs">同期完了</span>
          </div>
        )}
      </div>

      {/* エラー詳細 */}
      {syncStatus.syncError && (
        <div className="mt-2 text-xs text-red-300">
          {syncStatus.syncError}
        </div>
      )}

      {/* 保留中の変更数 */}
      {syncStatus.pendingChanges > 0 && (
        <div className="mt-2 text-xs text-yellow-300">
          {syncStatus.pendingChanges}件の未同期の変更があります
        </div>
      )}
    </div>
  );
};

export default SyncStatusComponent;