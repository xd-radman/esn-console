/**
 * AuthContext.jsx — Passwordless Google OAuth, Dynamic Roles & Permissions
 * Tracks the active Supabase `session`, authenticated `user`, matching
 * `public.profiles` row, and the live `public.roles` hierarchy table.
 * Enforces strict Sign-In vs. Sign-Up intent verification across Google OAuth
 * redirects (activating new signups as `'new_member'`), computes effective
 * per-user permissions via `resolveUserPermissions()`, and exposes
 * `{ session, user, profile, role, roleMeta, roleLevel, roles, rolesMap,
 * refreshRoles, permissions, hasPermission, isOwner, isLimbo, isAdmin,
 * loading, authError, clearAuthError, refreshProfile, signInWithGoogle, signOut }`.
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
import {
  getRoleLevel,
  getRoleMeta,
  normalizeRoleSlug,
  resolveUserPermissions,
} from '../lib/roleHierarchy.js';

const AuthContext = createContext(null);

// `sessionStorage` key capturing whether the user initiated Google OAuth from Sign In or Sign Up
export const AUTH_INTENT_STORAGE_KEY = 'esn_auth_intent';

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

  // Live `public.roles` table rows scoped to the authenticated session
  const [rolesState, setRolesState] = useState({
    userId: null,
    list: [],
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

  // Re-fetch the `public.roles` table ordered by `level` descending
  const refreshRoles = useCallback(async () => {
    if (!supabase || !userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: false });

    if (error) {
      console.error('[ESN Console] Failed to fetch roles:', error);
      setRolesState((prev) => ({ userId, list: prev.userId === userId ? prev.list : [] }));
      return [];
    }

    const nextList = data ?? [];
    setRolesState({ userId, list: nextList });
    return nextList;
  }, [userId]);

  // Re-fetch the current user's `public.profiles` row (and roles) on demand
  const refreshProfile = useCallback(async () => {
    if (!supabase || !userId) {
      return null;
    }

    const [{ data, error }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      refreshRoles(),
    ]);

    if (error) {
      console.error('[ESN Console] Failed to refresh user profile:', error);
      return null;
    }

    setProfileState({ userId, data: data ?? null });
    return data ?? null;
  }, [userId, refreshRoles]);

  // Load `public.roles`, fetch `public.profiles`, and enforce Sign-In vs. Sign-Up OAuth intent
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

    async function hydrateAuthIdentity() {
      try {
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('roles').select('*').order('level', { ascending: false }),
        ]);

        if (!isActive) {
          return;
        }

        if (rolesRes.error) {
          console.error('[ESN Console] Failed to load roles table:', rolesRes.error);
        }
        setRolesState({ userId, list: rolesRes.data ?? [] });

        if (profileRes.error) {
          console.error('[ESN Console] Failed to load user profile:', profileRes.error);
          pendingIntentRef.current = null;
          setProfileState({ userId, data: null });
          return;
        }

        const data = profileRes.data;
        const currentRole = normalizeRoleSlug(data?.role);

        // Case A: Sign-In attempted with a brand-new Google account (`role === 'pending'`)
        if (intent === 'signin' && currentRole === 'pending') {
          pendingIntentRef.current = null;
          setAuthError('auth.accountNotFound');
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
            setRolesState({ userId: null, list: [] });
          }
          return;
        }

        // Case B: Sign-Up attempted with an already registered account (any active role != 'pending')
        if (intent === 'signup' && currentRole && currentRole !== 'pending') {
          pendingIntentRef.current = null;
          setAuthError('auth.accountAlreadyExists');
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
            setRolesState({ userId: null, list: [] });
          }
          return;
        }

        // Case C: Valid new Sign-Up (`intent === 'signup'` & `role === 'pending'`) -> activate as `'new_member'`
        if (intent === 'signup' && currentRole === 'pending') {
          const { data: activatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'new_member' })
            .eq('id', userId)
            .select('*')
            .maybeSingle();

          if (!isActive) {
            return;
          }

          if (updateError) {
            console.error('[ESN Console] Failed to activate new_member profile:', updateError);
          }

          pendingIntentRef.current = null;
          setAuthError(null);
          setProfileState({
            userId,
            data: activatedProfile ?? (data ? { ...data, role: 'new_member' } : null),
          });
          return;
        }

        // Case D: Normal page reload with no OAuth intent — reject unactivated `pending` accounts
        if (!intent && currentRole === 'pending') {
          await supabase.auth.signOut();
          if (isActive) {
            setSession(null);
            setProfileState({ userId: null, data: null });
            setRolesState({ userId: null, list: [] });
          }
          return;
        }

        // Valid existing profile session
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
        setRolesState({ userId, list: [] });
      }
    }

    hydrateAuthIdentity();

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

  // Sign out of the active Supabase session and clear cached profile/roles state
  const signOut = useCallback(async () => {
    pendingIntentRef.current = null;
    setProfileState({ userId: null, data: null });
    setRolesState({ userId: null, list: [] });
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

  // Only expose profile & roles data matching the currently authenticated user
  const profile = userId && profileState.userId === userId ? profileState.data : null;
  const roles = useMemo(
    () => (userId && rolesState.userId === userId ? rolesState.list : []),
    [userId, rolesState]
  );

  // Build `{ [slug]: roleRow }` lookup from live `public.roles` rows
  const rolesMap = useMemo(() => {
    const map = {};
    for (const item of roles) {
      const slug = normalizeRoleSlug(item?.slug);
      if (slug) {
        map[slug] = item;
      }
    }
    return map;
  }, [roles]);

  // Keep loading true until session, profile verification, and roles fetch resolve
  const loading =
    !sessionChecked ||
    (Boolean(userId) && (profileState.userId !== userId || rolesState.userId !== userId));

  // Derived role metadata & effective permissions
  const role = normalizeRoleSlug(profile?.role);
  const roleMeta = useMemo(() => getRoleMeta(role, rolesMap), [role, rolesMap]);
  const roleLevel = useMemo(() => getRoleLevel(role, rolesMap), [role, rolesMap]);
  const permissions = useMemo(
    () => resolveUserPermissions(profile, rolesMap),
    [profile, rolesMap]
  );

  const hasPermission = useCallback(
    (key) => Boolean(permissions[key]),
    [permissions]
  );

  const isOwner = role === 'owner';
  const isLimbo = !permissions.view_workspace;
  // Backward-compatible alias for project-management admin privileges
  const isAdmin = Boolean(permissions.manage_projects);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      roleMeta,
      roleLevel,
      roles,
      rolesMap,
      refreshRoles,
      permissions,
      hasPermission,
      isOwner,
      isLimbo,
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
      role,
      roleMeta,
      roleLevel,
      roles,
      rolesMap,
      refreshRoles,
      permissions,
      hasPermission,
      isOwner,
      isLimbo,
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
