import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // Resolved theme (system -> actual)
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'divvydo.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    // Default to system
    return 'system';
  });

  // Calculate the actual theme (resolve system preference)
  const actualTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (actualTheme === 'dark') {
      root.classList.add('dark');
      // Dark theme CSS custom properties (space-separated RGB values for Tailwind)
      root.style.setProperty('--background', '15 23 42');
      root.style.setProperty('--surface', '30 41 59');
      root.style.setProperty('--surface-hover', '51 65 85');
      root.style.setProperty('--card', '30 41 59');
      root.style.setProperty('--overlay', '30 41 59');

      root.style.setProperty('--foreground', '241 245 249');
      root.style.setProperty('--foreground-secondary', '148 163 184');
      root.style.setProperty('--foreground-tertiary', '100 116 139');

      root.style.setProperty('--border', '51 65 85');
      root.style.setProperty('--border-hover', '71 85 105');

      root.style.setProperty('--primary', '59 130 246');
      root.style.setProperty('--primary-hover', '37 99 235');
      root.style.setProperty('--secondary', '51 65 85');
      root.style.setProperty('--secondary-hover', '71 85 105');

      root.style.setProperty('--success', '34 197 94');
      root.style.setProperty('--warning', '245 158 11');
      root.style.setProperty('--error', '239 68 68');
      root.style.setProperty('--info', '59 130 246');

      root.style.setProperty('--shadow', '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)');
    } else {
      root.classList.remove('dark');
      // Light theme CSS custom properties
      root.style.setProperty('--background', '255 255 255');
      root.style.setProperty('--surface', '248 250 252');
      root.style.setProperty('--surface-hover', '241 245 249');
      root.style.setProperty('--card', '255 255 255');
      root.style.setProperty('--overlay', '255 255 255');

      root.style.setProperty('--foreground', '15 23 42');
      root.style.setProperty('--foreground-secondary', '71 85 105');
      root.style.setProperty('--foreground-tertiary', '148 163 184');

      root.style.setProperty('--border', '226 232 240');
      root.style.setProperty('--border-hover', '203 213 225');

      root.style.setProperty('--primary', '59 130 246');
      root.style.setProperty('--primary-hover', '37 99 235');
      root.style.setProperty('--secondary', '148 163 184');
      root.style.setProperty('--secondary-hover', '100 116 139');

      root.style.setProperty('--success', '34 197 94');
      root.style.setProperty('--warning', '245 158 11');
      root.style.setProperty('--error', '239 68 68');
      root.style.setProperty('--info', '59 130 246');

      root.style.setProperty('--shadow', '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#0f172a' : '#ffffff');
    }
  }, [actualTheme]);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render by updating a dummy state
      setThemeState('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = {
    theme,
    actualTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}