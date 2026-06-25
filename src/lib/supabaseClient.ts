import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Env: Lovable injects VITE_* vars. Fall back to NEXT_PUBLIC_* / REACT_APP_* names
// so existing references keep working during the port.
const env = import.meta.env as Record<string, string | undefined>;

const SUPABASE_URL =
  env.VITE_SUPABASE_URL ??
  env.NEXT_PUBLIC_SUPABASE_URL ??
  env.REACT_APP_SUPABASE_URL ??
  "";

const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.REACT_APP_SUPABASE_ANON_KEY ??
  "";

// Placeholder fallbacks so importing a service module never throws before the
// Supabase env vars are configured (e.g. during SSR/build). Real network calls
// will fail until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
const RESOLVED_URL = SUPABASE_URL || "https://placeholder.supabase.co";
const RESOLVED_ANON_KEY = SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — using placeholders. Configure them in your environment.",
  );
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(RESOLVED_URL, RESOLVED_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

// Drop-in replacement for @supabase/auth-helpers-nextjs `createClientComponentClient()`.
// Returns the shared browser singleton so existing call sites work unchanged.
export function createClientComponentClient(): SupabaseClient {
  return getSupabase();
}

export default getSupabase;
