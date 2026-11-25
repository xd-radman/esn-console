/**
 * ThemeContext.jsx — Global Light / Dark Theme State Provider
 * Manages `"light"` ("Swiss Studio") and `"dark"` ("Warm Carbon Ink") themes,
 * reflects the active scheme onto `<html data-theme="...">` so CSS tokens in
 * `tokens.css` switch immediately, and persists user preference in localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// localStorage key and allowlist of supported theme identifiers
const THEME_STORAGE_KEY = 'esn-console-theme';
const VALID_THEMES = new Set(['light', 'dark']);

const ThemeContext = createContext(null);

/**
 * Reads the saved theme from localStorage on startup, safely falling back
 * to `"light"` during SSR or when storage access is restricted.
 */
function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }
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
 * Wraps the application with theme state and cross-tab synchronization.
 */
export function ThemeProvider({ children }) {
  // Active theme identifier (`"light"` | `"dark"`)
  const [theme, setThemeState] = useState(getInitialTheme);

  // Sync `<html data-theme>` for CSS selectors and persist changes to localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Theme still applies to document even if storage persistence is blocked
      }
    }
  }, [theme]);

  // Listen for `storage` events so toggling theme in one tab updates other open tabs
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }
      const next = event.newValue;
      setThemeState(next && VALID_THEMES.has(next) ? next : 'light');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Explicitly set `"light"` or `"dark"`, ignoring unrecognized values
  const setTheme = useCallback((nextTheme) => {
    if (VALID_THEMES.has(nextTheme)) {
      setThemeState(nextTheme);
    }
  }, []);

  // Flip between `"light"` and `"dark"` modes
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Memoize context payload to avoid unnecessary re-renders in consumer components
  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Custom hook exposing `{ theme, isDark, setTheme, toggleTheme }` to components.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
