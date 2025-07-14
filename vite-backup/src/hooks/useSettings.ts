import { useState, useEffect } from 'react';
import { AppSettings, getSettings, updateSetting } from '../services/settingsService';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // 初回ロード時に設定を読み込む
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  // 設定を更新する関数
  const setSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const updatedSettings = updateSetting(key, value);
    setSettings(updatedSettings);
  };

  return {
    settings,
    setSetting
  };
};