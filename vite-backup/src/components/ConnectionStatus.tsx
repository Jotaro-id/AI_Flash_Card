import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle, RefreshCw } from 'lucide-react';
import { checkSupabaseConnection } from '../utils/supabaseHelpers';

export const ConnectionStatus: React.FC = () => {
  const [connectionState, setConnectionState] = useState<{
    status: 'checking' | 'connected' | 'disconnected' | 'error';
    latency?: number;
    error?: string;
  }>({ status: 'checking' });
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnection = async () => {
    setConnectionState({ status: 'checking' });
    const result = await checkSupabaseConnection();
    
    if (result.connected) {
      setConnectionState({
        status: 'connected',
        latency: result.latency,
      });
    } else {
      setConnectionState({
        status: 'error',
        error: result.error,
      });
    }
  };

  useEffect(() => {
    checkConnection();
    
    // 定期的に接続をチェック（5分ごと）
    const interval = setInterval(checkConnection, 5 * 60 * 1000);
    
    // オンライン/オフラインイベントの監視
    const handleOnline = () => {
      console.log('オンラインに復帰しました');
      checkConnection();
    };
    
    const handleOffline = () => {
      console.log('オフラインになりました');
      setConnectionState({
        status: 'disconnected',
        error: 'インターネット接続が失われました',
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
  };

  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return <Wifi className="text-green-500" size={20} />;
      case 'disconnected':
        return <WifiOff className="text-red-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-yellow-500" size={20} />;
      default:
        return <RefreshCw className="animate-spin text-gray-500" size={20} />;
    }
  };

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected':
        return `接続済み${connectionState.latency ? ` (${connectionState.latency}ms)` : ''}`;
      case 'disconnected':
        return 'オフライン';
      case 'error':
        return '接続エラー';
      default:
        return '接続確認中...';
    }
  };

  // 接続が正常な場合は非表示
  if (connectionState.status === 'connected' && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-3 flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{getStatusText()}</p>
          {connectionState.error && (
            <p className="text-xs text-gray-600 mt-1">{connectionState.error}</p>
          )}
        </div>
        {connectionState.status === 'error' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="再接続"
          >
            <RefreshCw className={`${isRetrying ? 'animate-spin' : ''}`} size={16} />
          </button>
        )}
        {connectionState.status === 'connected' && (
          <button
            onClick={() => setShowDetails(false)}
            className="p-1 hover:bg-gray-100 rounded"
            title="非表示"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};