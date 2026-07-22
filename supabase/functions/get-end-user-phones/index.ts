// Returns ONLY the end-user phone numbers of every sale, as normalized 10-digit
// keys — nothing else.
//
// Why this exists: the mobile app must reject a duplicate end-user phone while
// OFFLINE, which means the whole set has to be cached on the device. Caching
// full sale rows for that would be enormous (20k+ sales); a bare list of digit
// strings is a few hundred KB and loads in one pass.
//
// Deliberately NOT scoped to the caller's organization. Uniqueness is global —
// a phone used by any partner blocks it for every other partner — so a
// per-agent view would let two agents register the same customer. Only phone
// digits are returned, so this exposes no sale, customer, or partner detail
// beyond "this number is taken".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/// Comparison key: last 10 digits. Must match `PhoneUtils.normalizePhone`
/// (mobile) and the digits-only tail comparison in `create-sale`.
function normalizePhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    // Any authenticated user may read this — every role can create a sale, so
    // every role needs to know which numbers are taken.
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData?.user) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Page through in slices to stay under PostgREST's row cap. The client
    // makes one call and gets everything; paging is internal.
    const PAGE = 1000;
    const MAX_ROWS = 200_000; // hard stop so a runaway table can't hang the fn
    const seen = new Set<string>();
    let from = 0;
    let scanned = 0;
    let truncated = false;

    while (true) {
      const { data, error } = await supabase
        .from("sales")
        .select("phone")
        .not("phone", "is", null)
        .range(from, from + PAGE - 1);

      if (error) {
        console.error("❌ Phone fetch failed:", error.message);
        return json({ success: false, error: "Failed to fetch phone numbers" }, 500);
      }

      const rows = data ?? [];
      for (const row of rows) {
        const key = normalizePhone((row as { phone: unknown }).phone);
        if (key) seen.add(key);
      }
      scanned += rows.length;

      if (rows.length < PAGE) break;
      if (scanned >= MAX_ROWS) {
        truncated = true;
        console.warn(`⚠️ Stopped at ${MAX_ROWS} rows — raise MAX_ROWS`);
        break;
      }
      from += PAGE;
    }

    // `truncated` matters to the caller: a partial set would silently let
    // duplicates through offline, so the client can choose not to trust it.
    return json({
      success: true,
      data: [...seen],
      count: seen.size,
      scanned,
      truncated,
    });
  } catch (error) {
    console.error("❌ get-end-user-phones error:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
