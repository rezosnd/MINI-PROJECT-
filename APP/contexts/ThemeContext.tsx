import React, { createContext, ReactNode, useContext, useState } from 'react';

interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
}

interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const defaultTheme: Theme = {
  dark: true,
  colors: {
    primary: '#0066CC',
    background: '#0A192F',
    card: '#112240',
    text: '#E6F1FF',
    border: '#233554',
    notification: '#64FFDA',
  },
};

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#0066CC',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    border: '#E2E8F0',
    notification: '#0066CC',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const toggleTheme = () => {
    setTheme(current => current.dark ? lightTheme : defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};