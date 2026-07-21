// refresh-geo-data — weekly cron target. Pulls Nigeria states + LGAs from an
// external source, VALIDATES the payload, and only then upserts it into the
// nigeria_states / nigeria_lgas tables.
//
// Safety guarantees (this is the whole point of the design):
//   • If the source is down, returns non-2xx JSON, or fails to parse → we DO
//     NOT touch the tables. The existing (good) data stays intact.
//   • If the parsed payload is too small (< MIN_STATES states or < MIN_LGAS
//     LGAs) we treat it as untrustworthy and skip the write.
//   • Writes are ADDITIVE (upsert). We never delete existing rows, so a source
//     that merely drops a few entries can't shrink the table.
//
// Auth: cron sends the service-role key as the Bearer token; we require the
// Bearer to equal SUPABASE_SERVICE_ROLE_KEY so the endpoint can't be triggered
// by arbitrary callers.
//
// Source: https://github.com/xosasx/nigerian-local-government-areas — a flat
// array of all 774 LGAs, each { name, state_name, ... }. Pinned to the raw file
// on `master`.
//
// Config (env):
//   GEO_SOURCE_URL  — override the endpoint. Accepted JSON shapes:
//                     • flat array of { name, state_name }  ← the source above
//                     • array of { state, lgas: string[] }
//                     • object { [state]: string[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/xosasx/nigerian-local-government-areas/master/lgas.json";
const MIN_STATES = 37;
const MIN_LGAS = 700; // Nigeria has 774; allow a small tolerance.

/// Canonical state-name aliases. The upstream source spells the capital
/// territory "Federal Capital Territory", but every existing sale record and
/// both client fallbacks use "FCT". Without this mapping a refresh would add a
/// SECOND capital-territory state and split the LGA list across the two.
const STATE_ALIASES: Record<string, string> = {
  "federal capital territory": "FCT",
  "abuja federal capital territory": "FCT",
  abuja: "FCT",
};

function canonicalState(name: string): string {
  const trimmed = name.trim();
  return STATE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normalize any of the accepted source shapes into { [state]: string[] }. */
function normalize(raw: unknown): Record<string, string[]> {
  const acc: Record<string, Set<string>> = {};

  const addOne = (state: unknown, lga: unknown) => {
    if (typeof state !== "string" || !state.trim()) return;
    if (typeof lga !== "string" || !lga.trim()) return;
    (acc[canonicalState(state)] ??= new Set()).add(lga.trim());
  };

  const addMany = (state: unknown, lgas: unknown) => {
    if (!Array.isArray(lgas)) return;
    for (const l of lgas) addOne(state, l);
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (Array.isArray(e.lgas ?? e.lgs ?? e.locals)) {
        // Grouped shape: { state, lgas: [...] }
        addMany(e.state ?? e.state_name ?? e.name, e.lgas ?? e.lgs ?? e.locals);
      } else {
        // Flat shape: { name, state_name } — one row per LGA.
        addOne(e.state_name ?? e.state, e.name ?? e.lga);
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [state, lgas] of Object.entries(raw as Record<string, unknown>)) {
      addMany(state, lgas);
    }
  }

  const out: Record<string, string[]> = {};
  for (const [state, set] of Object.entries(acc)) {
    out[state] = Array.from(set).sort();
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!serviceKey || bearer !== serviceKey) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const sourceUrl = Deno.env.get("GEO_SOURCE_URL") ?? DEFAULT_SOURCE_URL;

    // 1) Fetch — any failure here must leave the table untouched.
    let parsed: unknown;
    try {
      const res = await fetch(sourceUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`source responded ${res.status}`);
      parsed = await res.json();
    } catch (fetchErr) {
      return json({
        success: false,
        skipped: true,
        reason: "source_unavailable",
        detail: (fetchErr as Error).message,
        message: "Source unavailable — existing data left intact.",
      });
    }

    // 2) Validate.
    const map = normalize(parsed);
    const states = Object.keys(map);
    const totalLgas = states.reduce((n, s) => n + map[s].length, 0);

    if (states.length < MIN_STATES || totalLgas < MIN_LGAS) {
      return json({
        success: false,
        skipped: true,
        reason: "payload_below_threshold",
        got: { states: states.length, lgas: totalLgas },
        expected: { states: `>=${MIN_STATES}`, lgas: `>=${MIN_LGAS}` },
        message: "Payload failed validation — existing data left intact.",
      });
    }

    // 3) Upsert (additive; never deletes).
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    const now = new Date().toISOString();

    const stateRows = states.map((name) => ({ name, updated_at: now }));
    const { error: stErr } = await supabase
      .from("nigeria_states")
      .upsert(stateRows, { onConflict: "name" });
    if (stErr) throw stErr;

    const lgaRows = states.flatMap((state_name) =>
      map[state_name].map((name) => ({ state_name, name, updated_at: now }))
    );
    // Chunk to stay within request limits.
    for (let i = 0; i < lgaRows.length; i += 500) {
      const { error: lgErr } = await supabase
        .from("nigeria_lgas")
        .upsert(lgaRows.slice(i, i + 500), { onConflict: "state_name,name" });
      if (lgErr) throw lgErr;
    }

    return json({
      success: true,
      message: "Geo data refreshed.",
      counts: { states: states.length, lgas: totalLgas },
      source: sourceUrl,
    });
  } catch (err) {
    // A write-phase error is reported but, being upsert-only, cannot corrupt
    // existing rows.
    return json(
      { success: false, error: (err as Error).message ?? "Unknown error" },
      500
    );
  }
});
