import { useState, useEffect } from 'react';

interface Settings {
  showSuggestions: boolean;
  showSpellingSuggestions: boolean;
}

const SETTINGS_KEY = 'ai-flashcard-settings';

const defaultSettings: Settings = {
  showSuggestions: true,
  showSpellingSuggestions: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 設定を読み込む
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // 設定を更新する
  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, setSetting };
}