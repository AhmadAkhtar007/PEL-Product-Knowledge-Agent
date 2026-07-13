import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import tokens from './tokens.json';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState(systemColorScheme || 'dark');

  useEffect(() => {
    if (systemColorScheme) {
      setThemeName(systemColorScheme);
    }
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setThemeName(prev => prev === 'light' ? 'dark' : 'light');
  };

  const theme = {
    colors: tokens.colors[themeName] || tokens.colors.dark,
    typography: tokens.typography,
    spacing: tokens.spacing,
    radius: tokens.radius,
    isDark: themeName === 'dark',
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
