/**
 * AuthContext.jsx — Passwordless Google OAuth & Role-Based Profile State
 * Tracks the active Supabase `session`, authenticated `user`, and matching
 * `public.profiles` row (`full_name`, `email`, `role`, `section_name`).
 * Subscribes to `supabase.auth.onAuthStateChange` so returning from Google's
 * OAuth redirect automatically hydrates the session and `profiles` row, and
 * exposes `{ session, user, profile, isAdmin, loading, signInWithGoogle, signOut }`
 * via `useAuth()`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

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

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

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
          console.warn('[ESN Console] Failed to restore auth session:', error.message);
        }
        setSession(data?.session ?? null);
        setSessionChecked(true);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        console.warn('[ESN Console] Unexpected error restoring auth session:', error);
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

  // Fetch the authenticated user's `public.profiles` row whenever `userId` changes
  useEffect(() => {
    if (!supabase || !userId) {
      return undefined;
    }

    let isActive = true;

    supabase
      .from('profiles')
      .select('id, full_name, email, role, section_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }
        if (error) {
          console.warn('[ESN Console] Failed to load user profile:', error.message);
        }
        setProfileState({ userId, data: data ?? null });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        console.warn('[ESN Console] Unexpected error loading user profile:', error);
        setProfileState({ userId, data: null });
      });

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

  // Sign out of the active Supabase session and clear cached profile data
  const signOut = useCallback(async () => {
    setProfileState({ userId: null, data: null });
    if (!supabase) {
      setSession(null);
      return { error: null };
    }

    const result = await supabase.auth.signOut();
    if (!result.error) {
      setSession(null);
    }
    return result;
  }, []);

  // Only expose profile data matching the currently authenticated user
  const profile = userId && profileState.userId === userId ? profileState.data : null;

  // Keep loading true until both initial session and (if signed in) profile fetch resolve
  const loading = !sessionChecked || (Boolean(userId) && profileState.userId !== userId);

  // Derived Admin role boolean gating mutating UI controls (expandable for granular roles)
  const isAdmin = profile?.role === 'admin';

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      isAdmin,
      loading,
      signInWithGoogle,
      signOut,
    }),
    [session, user, profile, isAdmin, loading, signInWithGoogle, signOut]
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
