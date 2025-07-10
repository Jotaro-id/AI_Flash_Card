import React, { useEffect } from 'react';
import { useDataSync } from '@/hooks/useDataSync';
import { RotateCw, CheckCircle, AlertCircle, Clock, WifiOff } from 'lucide-react';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { 
    syncStatus, 
    lastSyncResult, 
    syncNow, 
    clearErrors,
    startPeriodicSync,
    stopPeriodicSync 
  } = useDataSync();

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '未同期';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '1分前';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  };

  const getSyncIcon = () => {
    if (syncStatus.isSyncing) {
      return <RotateCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (syncStatus.errors.length > 0) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (syncStatus.lastSyncTime) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <WifiOff className="w-4 h-4 text-gray-400" />;
  };

  const getSyncStatusText = () => {
    if (syncStatus.isSyncing) {
      return '同期中...';
    }
    
    if (syncStatus.errors.length > 0) {
      return `エラー (${syncStatus.errors.length}件)`;
    }
    
    if (syncStatus.lastSyncTime) {
      return `最終同期: ${formatTime(syncStatus.lastSyncTime)}`;
    }
    
    return '未同期';
  };

  // Supabaseユーザーのみ定期同期を開始
  useEffect(() => {
    console.log('[SyncStatus] コンポーネントがマウントされました');
    console.log('[SyncStatus] 定期同期を開始します');
    startPeriodicSync();
    
    // コンポーネントのアンマウント時に停止
    return () => {
      console.log('[SyncStatus] コンポーネントがアンマウントされます');
      console.log('[SyncStatus] 定期同期を停止します');
      stopPeriodicSync();
    };
  }, [startPeriodicSync, stopPeriodicSync]);

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('手動同期エラー:', error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 同期アイコンとステータス */}
      <div className="flex items-center gap-2">
        {getSyncIcon()}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getSyncStatusText()}
        </span>
      </div>

      {/* 保留中の変更数 */}
      {syncStatus.pendingChanges > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-orange-500" />
          <span className="text-xs text-orange-600 dark:text-orange-400">
            {syncStatus.pendingChanges}件保留中
          </span>
        </div>
      )}

      {/* 詳細情報 */}
      {showDetails && (
        <div className="flex items-center gap-2">
          {/* 手動同期ボタン */}
          <button
            onClick={handleSyncNow}
            disabled={syncStatus.isSyncing}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            title="今すぐ同期"
          >
            <RotateCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* エラークリアボタン */}
          {syncStatus.errors.length > 0 && (
            <button
              onClick={clearErrors}
              className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
              title="エラーをクリア"
            >
              エラークリア
            </button>
          )}
        </div>
      )}

      {/* エラー詳細 */}
      {showDetails && syncStatus.errors.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
            同期エラー:
          </div>
          <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
            {syncStatus.errors.map((error, index) => (
              <li key={index} className="truncate">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 最終同期結果 */}
      {showDetails && lastSyncResult && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            最終同期結果:
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>単語帳: {lastSyncResult.syncedItems.wordBooks}件</div>
            <div>単語カード: {lastSyncResult.syncedItems.wordCards}件</div>
            <div>活用履歴: {lastSyncResult.syncedItems.conjugationHistory}件</div>
            {lastSyncResult.errors.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                エラー: {lastSyncResult.errors.length}件
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};