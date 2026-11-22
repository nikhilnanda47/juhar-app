import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ColorPalette } from './colors';

const STORAGE_KEY = 'juhar_theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  colors: ColorPalette;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark') setMode('dark');
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const value: ThemeContextValue = {
    colors: mode === 'dark' ? darkColors : lightColors,
    isDark: mode === 'dark',
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
