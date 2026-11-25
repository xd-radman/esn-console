import { createContext, useContext, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'esn-console-theme';
const VALID_THEMES = new Set(['light', 'dark']);

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'light';
}

/**
 * Manages Light ("Swiss Studio") and Dark ("Warm Carbon Ink") theme state,
 * syncing `data-theme` on `document.documentElement` and persisting to localStorage.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors in restricted environments
    }
  }, [theme]);

  const setTheme = (nextTheme) => {
    if (VALID_THEMES.has(nextTheme)) {
      setThemeState(nextTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Returns theme state and helpers (`theme`, `isDark`, `setTheme`, `toggleTheme`).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
