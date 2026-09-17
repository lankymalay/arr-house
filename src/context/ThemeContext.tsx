import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'dark';

interface ThemeContextType {
  theme: 'dark';
  setTheme: (theme: 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('arr_theme');
      } catch {
        // ignore storage errors
      }

      const root = document.documentElement;
      root.setAttribute('data-theme', 'dark');
      root.classList.remove('theme-light');
      root.classList.add('dark', 'theme-dark');
      document.body.classList.remove('theme-light');
      document.body.classList.add('dark', 'theme-dark');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme: () => {}, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  return useContext(ThemeContext);
};
