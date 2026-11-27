/**
 * AuthContext.jsx — Passwordless Google OAuth, Role Sync & Intent Verification
 * Tracks the active Supabase `session`, authenticated `user`, and matching
 * `public.profiles` row (`select('*')`), normalizing `isAdmin` from `profile.role`.
 * Enforces strict Sign-In ("account must exist") vs. Sign-Up ("account must not
 * exist") verification across Google OAuth redirects using `sessionStorage`'s
 * `esn_auth_intent` key, and exposes `{ session, user, profile, isAdmin, loading,
 * authError, clearAuthError, refreshProfile, signInWithGoogle, signOut }`.
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
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

// `sessionStorage` key capturing whether the user initiated Google OAuth from Sign In or Sign Up
export const AUTH_INTENT_STORAGE_KEY = 'esn_auth_intent';

/**
 * Normalizes a `public.profiles.role` string for reliable case-insensitive checks.
 */
function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function AuthProvider({ children }) {
  // Active Supabase session (`null` when signed out)
  const [session, setSession] = useState(null);

  // True once the initial `getSession()` check has resolved
  const [sessionChecked, setSessionChecked] = useState(() => !supabase);

  // Matching `public.profiles` record scoped to the user ID it was loaded for
  const [profileState, setProfileState] = useState({
    userId: null,
    data: null,
  });

  // i18n error key surfaced on `/login` when Sign-In / Sign-Up intent verification rejects a session
  const [authError, setAuthError] = useState(null);

  // Preserves `esn_auth_intent` across React StrictMode double-mounts after clearing sessionStorage
  const pendingIntentRef = useRef(null);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Restore session on mount and subscribe to Supabase OAuth redirect / auth state changes
  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }
        if (error) {
          console.error('[ESN Console] Failed to restore auth session:', error);
        }
        setSession(data?.session ?? null);
        setSessionChecked(true);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        console.error('[ESN Console] Unexpected error restoring auth session:', error);
        setSession(null);
        setSessionChecked(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession ?? null);
      setSessionChecked(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Re-fetch the current user's `public.profiles` row on demand so name/role edits sync live
  const refreshProfile = useCallback(async () => {
    if (!supabase || !userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ESN Console] Failed to refresh user profile:', error);
      return null;
    }

    setProfileState({ userId, data: data ?? null });
    return data ?? null;
  }, [userId]);

  // Fetch `public.profiles` and enforce Sign-In vs. Sign-Up OAuth intent rules whenever `userId` changes
  useEffect(() => {
    if (!supabase || !userId) {
      return undefined;
    }

    let isActive = true;

    // Read and immediately clear `esn_auth_intent` from sessionStorage (cached in ref for StrictMode)
    let intent = pendingIntentRef.current;
    if (!intent && typeof window !== 'undefined') {
      try {
        const storedIntent = window.sessionStorage.getItem(AUTH_INTENT_STORAGE_KEY);
        if (storedIntent) {
          window.sessionStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
          pendingIntentRef.current = storedIntent;
          intent = storedIntent;
        }
      } catch {
        intent = null;
      }
    }

    async function verifyAndLoadProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!isActive) {
          return;
        }

        if (error) {
          console.error('[ESN Console] Failed to load user profile:', error);
          pendingIntentRef.current = null;
          setProfileState({ userId, data: null });
          return;
        }

        const role = normalizeRole(data?.role);

        // Case A: Sign-In attempted with a brand-new Google account (`role === 'pending'`)
        if (intent === 'signin' && role === 'pending') {
          pendingIntentRef.current = null;
          setAuthError('auth.accountNotFound');
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
          }
          return;
        }

        // Case B: Sign-Up attempted with an already registered account (`member` or `admin`)
        if (intent === 'signup' && (role === 'member' || role === 'admin')) {
          pendingIntentRef.current = null;
          setAuthError('auth.accountAlreadyExists');
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
          }
          return;
        }

        // Case C: Valid new Sign-Up (`intent === 'signup'` & `role === 'pending'`) -> activate as `member`
        if (intent === 'signup' && role === 'pending') {
          const { data: activatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'member' })
            .eq('id', userId)
            .select('*')
            .maybeSingle();

          if (!isActive) {
            return;
          }

          if (updateError) {
            console.error('[ESN Console] Failed to activate new member profile:', updateError);
          }

          pendingIntentRef.current = null;
          setAuthError(null);
          setProfileState({
            userId,
            data: activatedProfile ?? (data ? { ...data, role: 'member' } : null),
          });
          return;
        }

        // Case D: Normal page reload with no OAuth intent — reject unactivated `pending` accounts
        if (!intent && role === 'pending') {
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
          }
          return;
        }

        // Valid existing `admin` or `member` session
        pendingIntentRef.current = null;
        setAuthError(null);
        setProfileState({ userId, data: data ?? null });
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('[ESN Console] Unexpected error verifying user profile:', error);
        pendingIntentRef.current = null;
        setProfileState({ userId, data: null });
      }
    }

    verifyAndLoadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  // Initiate passwordless Google OAuth flow and return to the current app origin
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      return {
        data: null,
        error: new Error('MISSING_SUPABASE_CONFIG'),
      };
    }

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  // Sign out of the active Supabase session and clear cached profile state
  const signOut = useCallback(async () => {
    pendingIntentRef.current = null;
    setProfileState({ userId: null, data: null });
    if (!supabase) {
      setSession(null);
      return { error: null };
    }

    const result = await supabase.auth.signOut();
    if (result.error) {
      console.error('[ESN Console] Sign out failed:', result.error);
    } else {
      setSession(null);
    }
    return result;
  }, []);

  // Only expose profile data matching the currently authenticated user
  const profile = userId && profileState.userId === userId ? profileState.data : null;

  // Keep loading true until both initial session and (if signed in) profile verification resolve
  const loading = !sessionChecked || (Boolean(userId) && profileState.userId !== userId);

  // Normalized Admin role boolean gating all Admin-only UI controls
  const isAdmin = normalizeRole(profile?.role) === 'admin';

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      isAdmin,
      loading,
      authError,
      clearAuthError,
      refreshProfile,
      signInWithGoogle,
      signOut,
    }),
    [
      session,
      user,
      profile,
      isAdmin,
      loading,
      authError,
      clearAuthError,
      refreshProfile,
      signInWithGoogle,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook consuming `AuthContext`. Throws if called outside `<AuthProvider>`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
