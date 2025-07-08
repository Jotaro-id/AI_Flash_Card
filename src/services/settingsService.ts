import { logger } from '../utils/logger';

const SETTINGS_KEY = 'ai-flashcard-settings';

export interface AppSettings {
  showSuggestions: boolean;
  showSpellingSuggestions: boolean;
}

const defaultSettings: AppSettings = {
  showSuggestions: true, // デフォルトでは変換候補を表示
  showSpellingSuggestions: true, // デフォルトではスペル補正も表示
};

// 設定を取得
export const getSettings = (): AppSettings => {
  try {
    const settingsStr = localStorage.getItem(SETTINGS_KEY);
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      // デフォルト設定とマージ（新しい設定項目が追加された場合の対応）
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    logger.error('Failed to load settings', error);
  }
  return defaultSettings;
};

// 設定を保存
export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    logger.info('Settings saved', settings);
  } catch (error) {
    logger.error('Failed to save settings', error);
  }
};

// 特定の設定を更新
export const updateSetting = <K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): AppSettings => {
  const currentSettings = getSettings();
  const updatedSettings = {
    ...currentSettings,
    [key]: value
  };
  saveSettings(updatedSettings);
  return updatedSettings;
};

// 設定をリセット
export const resetSettings = (): void => {
  localStorage.removeItem(SETTINGS_KEY);
  logger.info('Settings reset to defaults');
};