/**
 * config/supabase.js
 * Exports two Supabase clients:
 *   - supabase      : public / anon-key client (respects RLS)
 *   - supabaseAdmin : service-role client when configured; otherwise the
 *                     public client (which continues to respect RLS)
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
  console.error(
    '[Supabase] Missing environment variables. ' +
      'Ensure SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) are set.'
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Backend queries use the public key and remain subject to RLS; privileged operations may be denied.'
  );
}

/**
 * Regular (anon-key) client.
 * Use for operations that should respect Row-Level Security policies.
 * Auth tokens are supplied per-request via supabase.auth.setSession() or
 * by passing the JWT in the Authorization header when using the REST API.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    // Disable automatic session persistence – we manage tokens per-request
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function createPublicAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Admin (service-role) client.
 * Bypasses RLS – NEVER expose this key to the browser.
 * Use only for server-side privileged operations (admin routes, triggers, etc.).
 */
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : supabase;

module.exports = {
  supabase,
  supabaseAdmin,
  createPublicAuthClient,
  hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
};
