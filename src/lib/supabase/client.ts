"use client";

/**
 * Browser Supabase client. Uses ONLY the public anon key — never import
 * SUPABASE_SERVICE_ROLE_KEY here or anywhere under src/app or src/components.
 * Returns null when Supabase isn't configured so callers (supabaseProvider)
 * fail predictably instead of throwing on module load.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    client = null;
    return client;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
