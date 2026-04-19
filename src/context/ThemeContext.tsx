import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  themeMode: 'auto',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

// Design system tokens — aligned with index.css / global.css
const DARK_TOKENS = {
  '--bg-dark-0': '#0C0D14',
  '--bg-dark-1': '#141520',
  '--bg-dark-2': '#1C1D2E',
  '--text-primary': '#F0F0F5',
  '--text-secondary': '#8888A0',
  '--text-muted': '#55556A',
  '--brand-amber': '#d4a574',
  '--brand-cyan': '#00D4FF',
  '--border-dim': '#2A2D42',
  '--border-focus': '#3D4166',
};

const LIGHT_TOKENS = {
  '--bg-dark-0': '#F5F5F0',
  '--bg-dark-1': '#FFFFFF',
  '--bg-dark-2': '#FAFAFA',
  '--text-primary': 'rgba(0, 0, 0, 0.87)',
  '--text-secondary': 'rgba(0, 0, 0, 0.65)',
  '--text-muted': 'rgba(0, 0, 0, 0.45)',
  '--brand-amber': '#E8891C',
  '--brand-cyan': '#00A8CC',
  '--border-dim': 'rgba(0, 0, 0, 0.08)',
  '--border-focus': 'rgba(0, 0, 0, 0.15)',
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialMode: ThemeMode = savedTheme || 'auto';
    setThemeModeState(initialMode);

    const initialDarkMode = savedTheme
      ? savedTheme === 'dark' || (savedTheme === 'auto' && prefersDark)
      : prefersDark;

    setIsDarkMode(initialDarkMode);
    applyTheme(initialDarkMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (savedTheme === null || savedTheme === 'auto') {
        setIsDarkMode(e.matches);
        applyTheme(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme', mode);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const newDarkMode = mode === 'dark' || (mode === 'auto' && prefersDark);
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode);
  };

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    const tokens = dark ? DARK_TOKENS : LIGHT_TOKENS;

    // Apply design system CSS variables
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set body-level styles
    if (dark) {
      root.classList.add('dark-theme');
      document.body.style.backgroundColor = tokens['--bg-dark-0'];
      document.body.style.color = tokens['--text-primary'];
      document.body.style.backgroundImage =
        'radial-gradient(ellipse at 20% 0%, rgba(255, 159, 67, 0.08) 0%, transparent 50%), ' +
        'radial-gradient(ellipse at 80% 100%, rgba(0, 212, 255, 0.06) 0%, transparent 50%)';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      root.classList.remove('dark-theme');
      document.body.style.backgroundColor = tokens['--bg-dark-0'];
      document.body.style.color = tokens['--text-primary'];
      document.body.style.backgroundImage = 'none';
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    const newMode: ThemeMode = newDarkMode ? 'dark' : 'light';
    setIsDarkMode(newDarkMode);
    setThemeModeState(newMode);
    localStorage.setItem('theme', newMode);
    applyTheme(newDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
