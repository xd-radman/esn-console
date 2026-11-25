/**
 * LangContext.jsx — Global Bilingual (`en` / `tr`) Context & Translation Hook
 * Stores the active UI language, keeps `<html lang="...">` synchronized for
 * screen readers and hyphenation, persists the user's choice in localStorage,
 * and provides the `t(key, params)` lookup helper backed by `src/lib/i18n.js`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../lib/i18n.js';

// localStorage key and supported language codes
const LANG_STORAGE_KEY = 'esn-console-lang';
const VALID_LANGS = new Set(['en', 'tr']);

const LangContext = createContext(null);

/**
 * Reads the initial language from localStorage, defaulting to `"en"`
 * when unset or when running in non-browser/restricted environments.
 */
function getInitialLang() {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && VALID_LANGS.has(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'en';
}

/**
 * Walks a nested dictionary object using a dot-separated path (e.g. `"landing.title"`).
 * Returns `undefined` if any segment along the path does not exist.
 */
function resolveKey(dictionary, key) {
  if (!dictionary || typeof key !== 'string') {
    return undefined;
  }
  return key.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && Object.prototype.hasOwnProperty.call(acc, part)) {
      return acc[part];
    }
    return undefined;
  }, dictionary);
}

/**
 * Provides `{ lang, setLang, toggleLang, t }` to the entire React tree.
 */
export function LangProvider({ children }) {
  // Active language code (`"en"` | `"tr"`)
  const [lang, setLangState] = useState(getInitialLang);

  // Update `<html lang>` for accessibility and persist selection to localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // Language still applies to document even if storage persistence is blocked
      }
    }
  }, [lang]);

  // Keep language state synchronized across multiple open browser tabs
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleStorage = (event) => {
      if (event.key !== LANG_STORAGE_KEY) {
        return;
      }
      const next = event.newValue;
      setLangState(next && VALID_LANGS.has(next) ? next : 'en');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Explicitly select `"en"` or `"tr"`, ignoring unsupported codes
  const setLang = useCallback((nextLang) => {
    if (VALID_LANGS.has(nextLang)) {
      setLangState(nextLang);
    }
  }, []);

  // Alternate directly between English (`"en"`) and Turkish (`"tr"`)
  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'tr' : 'en'));
  }, []);

  /**
   * Resolves a dot-notation key in the active language, falls back to English
   * if missing, and interpolates `{token}` placeholders when `params` is passed.
   */
  const t = useCallback(
    (key, params) => {
      const value =
        resolveKey(translations[lang], key) ??
        resolveKey(translations.en, key) ??
        key;

      if (typeof value !== 'string') {
        return key;
      }

      if (!params) {
        return value;
      }

      return value.replace(/\{(\w+)\}/g, (_, token) =>
        Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`
      );
    },
    [lang]
  );

  // Memoize context value so consumers only re-render when `lang` changes
  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
    }),
    [lang, setLang, toggleLang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/**
 * Custom hook returning `{ lang, setLang, toggleLang, t }`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error('useLang must be used within a LangProvider');
  }
  return ctx;
}
