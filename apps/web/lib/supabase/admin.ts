import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/lib/supabase/admin.ts\n" +
        "WHY: The take-storage adapter needs a service-role client to write to the private takes bucket\n" +
        "FIX: Add both to apps/web/.env (see .env.example — the service_role key is in Supabase Dashboard → Settings → API)"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Next.js dev hot-reload re-evaluates modules; the globalThis cache keeps a
// single admin client (and its fetch pool) per process instead of one per reload.
const globalForAdminClient = globalThis as unknown as {
  __colyglotSupabaseAdmin?: SupabaseClient;
};

export function getSupabaseAdmin(): SupabaseClient {
  globalForAdminClient.__colyglotSupabaseAdmin ??= createAdminClient();
  return globalForAdminClient.__colyglotSupabaseAdmin;
}
