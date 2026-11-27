/**
 * supabase.js — Supabase Browser Client Initialization
 * Creates and exports the singleton Supabase client configured from Vite
 * environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) with
 * explicit `localStorage` session persistence so signed-in users stay
 * authenticated across browser restarts.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn loudly during development/deployment if Supabase credentials are not configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[ESN Console] Missing Supabase environment variables: ' +
      'VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are undefined. ' +
      'Add them to frontend/.env.local to enable authentication.'
  );
}

// Export the configured client with persistent browser sessions via localStorage
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      })
    : null;
