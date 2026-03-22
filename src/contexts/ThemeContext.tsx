import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

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

  const toggleColorScheme = useCallback(() => {
    setColorScheme((prev) => {
      const newScheme = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEYS.THEME, newScheme).catch((error) => {
        console.error('Failed to save color scheme:', error);
      });
      return newScheme;
    });
  }, []);

  const colors = colorScheme === 'light' ? theme.light : theme.dark;
  const isDark = colorScheme === 'dark';

  const value = useMemo(
    () => ({ colorScheme, toggleColorScheme, colors, isDark }),
    [colorScheme, toggleColorScheme, colors, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
