/**
 * LoginPage.jsx — Passwordless Google-Only OAuth Screen (`/login`)
 * Renders a centered Swiss × Bento authentication card with `/esnstar_logo.png`,
 * bilingual `EN | TR` and Light/Dark toggles, an accessible **Sign In | Sign Up**
 * segmented mode selector (`authMode` state), a primary Google OAuth action
 * button with an inline SVG Google "G" mark, OAuth error handling, and automatic
 * redirect to `/` for already-authenticated users. Zero passwords are collected.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { AUTH_INTENT_STORAGE_KEY, useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * Crisp inline SVG official Google "G" mark rendered alongside Google OAuth CTAs.
 */
function GoogleMark() {
  return (
    <svg
      className="auth-google-mark"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3a7.17 7.17 0 0 1-10.67-3.76H1.39v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.39 14.33a7.21 7.21 0 0 1 0-4.66V6.58H1.39a12 12 0 0 0 0 10.84l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.39 6.58l4 3.09A7.15 7.15 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

/**
 * Reads any OAuth error parameter returned by Supabase/Google in the redirect URL.
 */
function readRedirectOAuthError(search, hash) {
  const searchParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  return Boolean(
    searchParams.get('error') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      hashParams.get('error_description')
  );
}

export default function LoginPage() {
  const { user, loading, authError, clearAuthError, signInWithGoogle } = useAuth();
  const { lang, setLang, t } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Active segmented mode (`'signin'` or `'signup'`)
  const [authMode, setAuthMode] = useState('signin');

  // Pending OAuth redirect state and local error key (merged with AuthContext `authError`)
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState(() =>
    readRedirectOAuthError(location.search, location.hash) ? 'auth.oauthError' : null
  );

  const activeErrorKey = localErrorKey || authError;

  // Stable IDs associating the Sign In / Sign Up tabs with the visible panel
  const signInTabId = useId();
  const signUpTabId = useId();
  const signInTabRef = useRef(null);
  const signUpTabRef = useRef(null);

  // Keep browser tab title localized on `/login`
  useEffect(() => {
    document.title = t('auth.pageTitle');
  }, [t]);

  // Wait for initial session check before deciding whether to redirect or show login
  if (loading) {
    return (
      <main className="auth-stage">
        <div className="bento-card auth-loading-card" role="status" aria-live="polite">
          <LoaderCircle
            size={20}
            strokeWidth={1.5}
            aria-hidden="true"
            className="auth-spinner"
          />
          <span className="font-mono-label">{t('auth.checkingSession')}</span>
        </div>
      </main>
    );
  }

  // Redirect already-authenticated users straight to the Project Directory
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Keyboard navigation (`ArrowLeft` / `ArrowRight` / `Home` / `End`) for the mode tablist
  const handleTabKeyDown = (event) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      let nextMode;
      if (event.key === 'Home') {
        nextMode = 'signin';
      } else if (event.key === 'End') {
        nextMode = 'signup';
      } else {
        nextMode = authMode === 'signin' ? 'signup' : 'signin';
      }
      setAuthMode(nextMode);
      setLocalErrorKey(null);
      clearAuthError();
      if (nextMode === 'signin') {
        signInTabRef.current?.focus();
      } else {
        signUpTabRef.current?.focus();
      }
    }
  };

  // Persist tab intent (`'signin'` | `'signup'`) before triggering passwordless Google OAuth
  const handleGoogleAuth = async () => {
    setLocalErrorKey(null);
    clearAuthError();
    setIsRedirecting(true);

    try {
      window.sessionStorage.setItem(AUTH_INTENT_STORAGE_KEY, authMode);
    } catch {
      // Proceed even if sessionStorage is restricted
    }

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        try {
          window.sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
        } catch {
          // Ignore storage cleanup errors
        }
        setLocalErrorKey(
          error.message === 'MISSING_SUPABASE_CONFIG'
            ? 'auth.missingConfig'
            : 'auth.oauthError'
        );
        setIsRedirecting(false);
      }
    } catch {
      try {
        window.sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup errors
      }
      setLocalErrorKey('auth.oauthError');
      setIsRedirecting(false);
    }
  };

  const isSignIn = authMode === 'signin';
  const activeTabId = isSignIn ? signInTabId : signUpTabId;

  return (
    <main className="auth-stage">
      <article className="bento-card elevated auth-card">
        {/* Top utility bar: ESN Star brand mark on left, EN|TR and theme toggles on right */}
        <header className="auth-toolbar hairline-bottom">
          <div className="auth-brand-lockup">
            <img
              src="/esnstar_logo.png"
              alt=""
              width="28"
              height="28"
              className="auth-brand-logo"
            />
            <span className="font-editorial auth-brand-name">{t('brand')}</span>
          </div>

          <div className="auth-utility-controls">
            {/* Segmented bilingual switcher (`EN | TR`) */}
            <div
              className="segmented-control"
              role="group"
              aria-label={t('lang.switcherLabel')}
            >
              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
              >
                {t('lang.en')}
                <span className="visually-hidden"> (English)</span>
              </button>
              <button
                type="button"
                aria-pressed={lang === 'tr'}
                onClick={() => setLang('tr')}
              >
                {t('lang.tr')}
                <span className="visually-hidden"> (Türkçe)</span>
              </button>
            </div>

            {/* Light / Dark theme toggle */}
            <button
              type="button"
              className="btn auth-theme-btn"
              onClick={toggleTheme}
              aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {isDark ? (
                <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {/* Main authentication body */}
        <div className="auth-body">
          {/* Accessible Sign In | Sign Up segmented mode selector */}
          <div
            className="auth-mode-tabs"
            role="tablist"
            aria-label={t('auth.modeSwitcherLabel')}
            onKeyDown={handleTabKeyDown}
          >
            <button
              ref={signInTabRef}
              id={signInTabId}
              type="button"
              role="tab"
              aria-selected={isSignIn}
              tabIndex={isSignIn ? 0 : -1}
              className="auth-mode-tab"
              onClick={() => {
                setAuthMode('signin');
                setLocalErrorKey(null);
                clearAuthError();
              }}
            >
              {t('auth.signInTab')}
            </button>

            <button
              ref={signUpTabRef}
              id={signUpTabId}
              type="button"
              role="tab"
              aria-selected={!isSignIn}
              tabIndex={!isSignIn ? 0 : -1}
              className="auth-mode-tab"
              onClick={() => {
                setAuthMode('signup');
                setLocalErrorKey(null);
                clearAuthError();
              }}
            >
              {t('auth.signUpTab')}
            </button>
          </div>

          {/* Active tab panel containing localized heading, OAuth CTA, and security note */}
          <div
            className="auth-panel"
            role="tabpanel"
            aria-labelledby={activeTabId}
          >
            <div className="auth-intro">
              <span className="mono-tag">{t('auth.kicker')}</span>
              <h1 className="font-editorial auth-title">
                {isSignIn ? t('auth.signInTitle') : t('auth.signUpTitle')}
              </h1>
              <p className="auth-subtitle">
                {isSignIn ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
              </p>
            </div>

            {/* Inline alert banner shown for OAuth failures or Sign-In/Sign-Up intent mismatches */}
            {activeErrorKey && (
              <div className="auth-error-banner" role="alert" aria-live="assertive">
                <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{t(activeErrorKey)}</span>
              </div>
            )}

            {/* Primary Google OAuth action button (passwordless) */}
            <button
              type="button"
              className="btn auth-google-btn"
              disabled={isRedirecting}
              onClick={handleGoogleAuth}
            >
              {isRedirecting ? (
                <>
                  <LoaderCircle
                    size={17}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="auth-spinner"
                  />
                  <span>{t('auth.redirectingToGoogle')}</span>
                </>
              ) : (
                <>
                  <GoogleMark />
                  <span>
                    {isSignIn
                      ? t('auth.continueWithGoogle')
                      : t('auth.signUpWithGoogle')}
                  </span>
                </>
              )}
            </button>

            {/* Concise Swiss inset note explaining passwordless Google SSO & Member default */}
            <div className="auth-note-box">
              <ShieldCheck size={15} strokeWidth={1.5} aria-hidden="true" />
              <p>{t('auth.googleOnlyNote')}</p>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
