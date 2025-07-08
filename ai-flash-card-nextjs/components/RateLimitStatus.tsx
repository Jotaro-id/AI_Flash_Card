import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { geminiRateLimiter } from '@/utils/rateLimiter';

export const RateLimitStatus: React.FC = () => {
  const [status, setStatus] = useState(geminiRateLimiter.getStatus());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = geminiRateLimiter.getStatus();
      setStatus(newStatus);
      
      // レート制限に近づいたら表示
      setVisible(newStatus.remainingRequests < 5 || newStatus.queueLength > 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const isLimited = status.remainingRequests === 0;
  const isQueued = status.queueLength > 0;

  return (
    <div className={`fixed bottom-20 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm ${
      isLimited ? 'border-2 border-red-500' : 'border border-gray-200'
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`${isLimited ? 'text-red-500' : 'text-yellow-500'}`}>
          {isLimited ? <AlertCircle size={20} /> : <Clock size={20} />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">
            {isLimited ? 'レート制限中' : 'API使用状況'}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            残りリクエスト: {status.remainingRequests}回
          </p>
          {status.resetIn > 0 && (
            <p className="text-xs text-gray-600">
              リセットまで: {status.resetIn}秒
            </p>
          )}
          {isQueued && (
            <p className="text-xs text-orange-600 mt-1">
              待機中: {status.queueLength}件
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            ※1分間に20回までのAPI制限があります
          </p>
        </div>
      </div>
    </div>
  );
};