import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react';
import { setCurrentUser } from '@/services/localStorageService';

type AuthMode = 'login' | 'signup';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // LocalStorage版ではメールアドレスだけでログイン
      if (!email) {
        throw new Error('メールアドレスを入力してください');
      }
      
      // 簡易的なメールアドレスの検証
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('正しいメールアドレスを入力してください');
      }
      
      // LocalStorageにユーザー情報を保存
      setCurrentUser(email);
      console.log('ログイン成功:', { email });
      
      // 成功コールバックを呼び出す
      onSuccess();
    } catch (error) {
      console.error('認証エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // LocalStorage版ではソーシャルログインは使用できません

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          AI単語帳
          <span className="text-sm font-normal block mt-2 text-gray-600">（LocalStorage版）</span>
        </h1>

        <div className="flex mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 rounded-l-lg transition-colors ${
              mode === 'login'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <LogIn className="inline-block mr-2" size={18} />
            ログイン
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-4 rounded-r-lg transition-colors ${
              mode === 'signup'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <UserPlus className="inline-block mr-2" size={18} />
            新規登録
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードは必要ありません"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-6">
          <p className="mb-2">📦 LocalStorage版の特徴:</p>
          <ul className="text-left space-y-1 text-xs max-w-sm mx-auto">
            <li>• データはこのブラウザに保存されます</li>
            <li>• パスワードは必要ありません</li>
            <li>• 他のデバイスとの同期はできません</li>
            <li>• ブラウザのデータをクリアすると失われます</li>
          </ul>
        </div>

        {mode === 'signup' && (
          <p className="mt-4 text-sm text-gray-600 text-center">
            登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        )}
      </div>
    </div>
  );
};