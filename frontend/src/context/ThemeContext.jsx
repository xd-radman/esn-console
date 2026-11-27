/**
 * ThemeContext.jsx — Global Light / Dark Theme & Per-User Color Palette Provider
 * Mounted inside `AuthProvider` (see `main.jsx`) so color palettes are strictly
 * scoped per authenticated user:
 * - Caches palettes in `localStorage` under `esn_palette_${user.id}` (never a shared global key).
 * - Immediately resets to ESN Official (`'esn'`) when logged out or when a fresh
 *   account has no saved `profile.preferences.palette`.
 * - Persists palette changes to Supabase via `AuthContext.updateUserPreferences(...)`
 *   (with a 300ms debounce on continuous color-wheel drags).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyPaletteToRoot,
  COLOR_PALETTE_PRESETS,
  DEFAULT_PALETTE,
  isValidHex,
  normalizePalette,
} from '../lib/colorPalettes.js';
import { useAuth } from './AuthContext.jsx';

// Theme key (device preference) and per-user palette key builder
const THEME_STORAGE_KEY = 'esn-console-theme';
const LEGACY_PALETTE_STORAGE_KEY = 'esn-console-palette';
const VALID_THEMES = new Set(['light', 'dark']);

function getUserPaletteStorageKey(userId) {
  return `esn_palette_${userId}`;
}

function buildDefaultPaletteCopy() {
  return {
    presetId: DEFAULT_PALETTE.presetId,
    colors: [...DEFAULT_PALETTE.colors],
  };
}

const ThemeContext = createContext(null);

/**
 * Reads the saved Light/Dark theme from localStorage on startup, defaulting to `"dark"`.
 */
function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'dark';
}

/**
 * Reads a user-scoped cached palette from localStorage if present.
 */
function readCachedUserPalette(userId) {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(getUserPaletteStorageKey(userId));
    if (raw) {
      return normalizePalette(JSON.parse(raw));
    }
  } catch {
    // Ignore malformed or restricted storage
  }
  return null;
}

/**
 * Writes or clears the user-scoped palette cache in localStorage.
 */
function writeCachedUserPalette(userId, nextPalette) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }
  try {
    const key = getUserPaletteStorageKey(userId);
    if (!nextPalette) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(nextPalette));
    }
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Wraps the application with Light/Dark theme + strictly per-user palette state.
 */
export function ThemeProvider({ children }) {
  const { user, profile, loading: authLoading, updateUserPreferences } = useAuth();
  const userId = user?.id ?? null;

  const [theme, setThemeState] = useState(getInitialTheme);
  const [palette, setPaletteState] = useState(buildDefaultPaletteCopy);

  const persistTimerRef = useRef(null);

  // Sync `<html data-theme>` and persist theme changes to localStorage
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

  // Apply active palette CSS variables whenever `palette` or `theme` changes
  useEffect(() => {
    applyPaletteToRoot(palette, theme);
  }, [palette, theme]);

  // Strictly scope palette state to the currently authenticated user & their Supabase profile
  useEffect(() => {
    // Clear any legacy unscoped palette key so previous accounts can never bleed through
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LEGACY_PALETTE_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }

    // Logged out: immediately reset palette & CSS tokens back to ESN Official
    if (!userId) {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      const reset = buildDefaultPaletteCopy();
      applyPaletteToRoot(reset, theme);
      queueMicrotask(() => {
        setPaletteState(reset);
      });
      return;
    }

    // While auth profile is still loading, hydrate only from this specific user's local cache
    if (authLoading && !profile) {
      const cached = readCachedUserPalette(userId) ?? buildDefaultPaletteCopy();
      applyPaletteToRoot(cached, theme);
      queueMicrotask(() => {
        setPaletteState(cached);
      });
      return;
    }

    // Profile loaded: apply saved Supabase preference or explicitly reset to ESN Official
    const savedPalette = profile?.preferences?.palette;
    if (savedPalette) {
      const normalized = normalizePalette(savedPalette);
      applyPaletteToRoot(normalized, theme);
      writeCachedUserPalette(userId, normalized);
      queueMicrotask(() => {
        setPaletteState(normalized);
      });
    } else {
      const defaultCopy = buildDefaultPaletteCopy();
      applyPaletteToRoot(defaultCopy, theme);
      writeCachedUserPalette(userId, null);
      queueMicrotask(() => {
        setPaletteState(defaultCopy);
      });
    }
  }, [userId, authLoading, profile, theme]);

  // Clear any pending Supabase palette debounce timer on unmount
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  // Cross-tab sync for theme and the currently signed-in user's scoped palette key
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        const next = event.newValue;
        setThemeState(next && VALID_THEMES.has(next) ? next : 'dark');
      } else if (userId && event.key === getUserPaletteStorageKey(userId)) {
        if (!event.newValue) {
          setPaletteState(buildDefaultPaletteCopy());
        } else {
          try {
            setPaletteState(normalizePalette(JSON.parse(event.newValue)));
          } catch {
            // Ignore malformed JSON from another tab
          }
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  // Persist palette to Supabase via `AuthContext.updateUserPreferences` (optionally debounced)
  const persistPalette = useCallback(
    async (nextPalette, debounceMs = 0) => {
      if (!userId) {
        return false;
      }

      writeCachedUserPalette(userId, nextPalette);

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }

      if (debounceMs > 0) {
        persistTimerRef.current = setTimeout(() => {
          updateUserPreferences({ palette: nextPalette });
        }, debounceMs);
        return true;
      }

      return updateUserPreferences({ palette: nextPalette });
    },
    [userId, updateUserPreferences]
  );

  // Explicitly set `"light"` or `"dark"`, syncing `data-theme` immediately for canvas reads
  const setTheme = useCallback(
    (nextTheme) => {
      if (VALID_THEMES.has(nextTheme)) {
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = nextTheme;
          applyPaletteToRoot(palette, nextTheme);
        }
        setThemeState(nextTheme);
      }
    },
    [palette]
  );

  // Flip between `"light"` and `"dark"` modes, updating `data-theme` before child re-renders
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = next;
        applyPaletteToRoot(palette, next);
      }
      return next;
    });
  }, [palette]);

  // Commit a complete staged palette object atomically (used by Account Settings Save Changes)
  const savePalette = useCallback(
    async (nextRawPalette) => {
      const normalized = normalizePalette(nextRawPalette);
      applyPaletteToRoot(normalized, theme);
      setPaletteState(normalized);
      return persistPalette(normalized, 0);
    },
    [theme, persistPalette]
  );

  // Select one of the 5 curated presets by `presetId`
  const setPresetPalette = useCallback(
    async (presetId) => {
      const preset = COLOR_PALETTE_PRESETS.find((item) => item.id === presetId);
      if (!preset) {
        return false;
      }
      const nextPalette = {
        presetId: preset.id,
        colors: [...preset.colors],
      };
      applyPaletteToRoot(nextPalette, theme);
      setPaletteState(nextPalette);
      return persistPalette(nextPalette, 0);
    },
    [theme, persistPalette]
  );

  // Override an individual color slot (`0..4`) with a custom hex color (`presetId: 'custom'`)
  const setCustomColor = useCallback(
    (index, hex) => {
      if (index < 0 || index > 4 || !isValidHex(hex)) {
        return;
      }
      const normalizedHex = hex.trim().toUpperCase();
      setPaletteState((prev) => {
        const nextColors = [...prev.colors];
        nextColors[index] = normalizedHex;
        const nextPalette = {
          presetId: 'custom',
          colors: nextColors,
        };
        applyPaletteToRoot(nextPalette, theme);
        persistPalette(nextPalette, 300);
        return nextPalette;
      });
    },
    [theme, persistPalette]
  );

  // Restore the official ESN palette in one click
  const resetPalette = useCallback(async () => {
    const nextPalette = buildDefaultPaletteCopy();
    applyPaletteToRoot(nextPalette, theme);
    setPaletteState(nextPalette);
    return persistPalette(nextPalette, 0);
  }, [theme, persistPalette]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
      palette,
      savePalette,
      setPresetPalette,
      setCustomColor,
      resetPalette,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      palette,
      savePalette,
      setPresetPalette,
      setCustomColor,
      resetPalette,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Custom hook exposing theme & per-user palette state and mutators to components.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
