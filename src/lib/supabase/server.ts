/**
 * Server-only Supabase client, for use in Route Handlers / server actions
 * that need elevated privileges (e.g. the admin audio-upload endpoint).
 * SUPABASE_SERVICE_ROLE_KEY must never be referenced from any file that can
 * end up in a client bundle — this file has no "use client" and should only
 * ever be imported from `src/app/**\/route.ts` or other server-only code.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null | undefined;

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    serviceClient = null;
    return serviceClient;
  }

  serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return serviceClient;
}
