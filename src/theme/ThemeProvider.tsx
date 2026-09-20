import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, themes } from './tokens';

const ThemeContext = createContext<Theme>(themes.light);

/** Follows the system light/dark setting. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? themes.dark : themes.light;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
