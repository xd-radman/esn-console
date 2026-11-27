/**
 * supabase.js — Supabase Browser Client Initialization
 * Creates and exports the singleton Supabase client configured from Vite
 * environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
 * Emits a clear console warning when either variable is missing so setup
 * issues are immediately visible without crashing the app shell.
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

// Export the configured client (or `null` when env vars are missing so AuthContext can fail gracefully)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
