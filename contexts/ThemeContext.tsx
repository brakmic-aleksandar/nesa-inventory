import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../constants';
import { theme } from '../constants/theme';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  colors: typeof theme.light;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  useEffect(() => {
    loadColorScheme();
  }, []);

  const loadColorScheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light') {
        setColorScheme(saved);
      }
    } catch (error) {
      console.error('Failed to load color scheme:', error);
    }
  };

  const toggleColorScheme = async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, newScheme);
    } catch (error) {
      console.error('Failed to save color scheme:', error);
    }
  };

  const colors = colorScheme === 'light' ? theme.light : theme.dark;
  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
