import React from 'react';
import { Palette, Check } from 'lucide-react';
import { ColorTheme } from '@/types';

interface ThemeSelectorProps {
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  availableThemes,
  onThemeChange,
  isOpen,
  onToggle
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all duration-200 hover:scale-105"
        title="テーマを変更"
      >
        <Palette size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 bg-white/95 backdrop-blur-md rounded-lg shadow-2xl p-4 min-w-48 z-50">
          <h3 className="text-gray-800 font-semibold mb-3">カラーテーマ</h3>
          <div className="space-y-2">
            {availableThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onThemeChange(theme.id);
                  onToggle();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${theme.fileManager}`}></div>
                  <span className="text-gray-700">{theme.name}</span>
                </div>
                {currentTheme.id === theme.id && (
                  <Check size={16} className="text-green-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};