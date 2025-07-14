import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserMenuProps {
  user: {
    email?: string;
    id: string;
  };
  onSignOut: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onSignOut();
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  };

  // メールアドレスから表示名を生成（@より前の部分）
  const displayName = user.email?.split('@')[0] || 'ユーザー';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
          <User size={18} />
        </div>
        <span className="font-medium">{displayName}</span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">ログイン中</p>
            <p className="font-medium text-gray-800 truncate">{user.email}</p>
          </div>
          
          <div className="p-2">
            <button
              onClick={() => {
                // 将来的に設定画面を実装
                alert('設定機能は開発中です');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-gray-700 transition-colors"
            >
              <Settings size={18} />
              設定
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-lg flex items-center gap-2 text-red-600 transition-colors"
            >
              <LogOut size={18} />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
};