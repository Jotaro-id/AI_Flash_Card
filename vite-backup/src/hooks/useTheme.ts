import { useState } from 'react';
import { ColorTheme, colorThemes } from '../types';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(() => {
    try {
      const savedTheme = localStorage.getItem('vocabulary-app-theme');
      if (savedTheme) {
        const themeId = JSON.parse(savedTheme);
        return colorThemes.find(theme => theme.id === themeId) || colorThemes[0];
      }
      return colorThemes[0];
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      return colorThemes[0];
    }
  });

  const setTheme = (themeId: string) => {
    const theme = colorThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      try {
        localStorage.setItem('vocabulary-app-theme', JSON.stringify(themeId));
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
    }
  };

  return { currentTheme, setTheme, availableThemes: colorThemes };
}