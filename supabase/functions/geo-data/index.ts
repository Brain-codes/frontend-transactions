// geo-data — returns the centralized Nigeria states + LGA reference data.
//
// Response shape (matches what both clients need):
//   {
//     success: true,
//     states: string[],                 // sorted
//     lgas:   { [state: string]: string[] },
//     updated_at: string | null         // most recent row update (ISO)
//   }
//
// Read-only. Any authenticated caller (or the anon key, since the data is not
// sensitive) may call it. Clients cache the result and fall back to their
// bundled copy when offline / on error.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      // Service role: read is trivial and this avoids RLS edge cases when the
      // caller uses only the anon key.
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const [statesRes, lgasRes] = await Promise.all([
      supabase
        .from("nigeria_states")
        .select("name, updated_at")
        .order("name", { ascending: true }),
      supabase
        .from("nigeria_lgas")
        .select("state_name, name, updated_at")
        .order("name", { ascending: true }),
    ]);

    if (statesRes.error) throw statesRes.error;
    if (lgasRes.error) throw lgasRes.error;

    const states = (statesRes.data ?? []).map((r: any) => r.name);

    const lgas: Record<string, string[]> = {};
    for (const row of lgasRes.data ?? []) {
      (lgas[row.state_name] ??= []).push(row.name);
    }

    // Most recent update across both tables, for client cache invalidation.
    let updatedAt: string | null = null;
    for (const row of [...(statesRes.data ?? []), ...(lgasRes.data ?? [])]) {
      if (row.updated_at && (!updatedAt || row.updated_at > updatedAt)) {
        updatedAt = row.updated_at;
      }
    }

    return json({ success: true, states, lgas, updated_at: updatedAt });
  } catch (err) {
    return json(
      { success: false, error: (err as Error).message ?? "Unknown error" },
      500
    );
  }
});
