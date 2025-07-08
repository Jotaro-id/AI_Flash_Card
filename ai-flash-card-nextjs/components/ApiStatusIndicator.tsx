import React from 'react';
import { AlertCircle } from 'lucide-react';
import { apiKeyStatus } from '@/services/aiService';

export const ApiStatusIndicator: React.FC = () => {
  if (apiKeyStatus.isValid) {
    return null; // APIキーが正常な場合は何も表示しない
  }

  return (
    <div className="fixed bottom-20 right-4 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 max-w-sm border-l-4 border-orange-500">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-orange-500 flex-shrink-0" size={24} />
        <div>
          <h4 className="font-semibold text-gray-900">AI機能が制限されています</h4>
          <p className="text-sm text-gray-600 mt-1">
            {apiKeyStatus.message}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            単語の基本情報のみ利用可能です。詳細な翻訳や例文は生成されません。
          </p>
        </div>
      </div>
    </div>
  );
};