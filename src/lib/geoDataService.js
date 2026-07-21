// Centralized Nigeria states + LGA data for the web app.
//
// Priority: fresh cache (localStorage, TTL) → geo-data edge function → bundled
// constant (lgaAndStates). The bundled constant is the ultimate offline / error
// fallback, so the form always has data even if Supabase is unreachable.
//
// Backend: supabase/functions/geo-data returns { states, lgas, updated_at }.

import { supabaseFunctionsUrl, supabaseAnonKey } from "./supabaseConfig";
import { lgaAndStates as bundledLgaAndStates } from "../app/constants";

const CACHE_KEY = "geo_data_cache_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week — matches the cron cadence.

/** Shape: { states: string[], lgas: { [state]: string[] } } */
function fromBundled() {
  const states = Object.keys(bundledLgaAndStates).sort();
  return { states, lgas: bundledLgaAndStates };
}

function readCache() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.data?.states?.length) return null;
    const fresh = Date.now() - parsed.savedAt < CACHE_TTL_MS;
    return { data: parsed.data, fresh };
  } catch {
    return null;
  }
}

function writeCache(data) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

async function fetchFromEdge() {
  const res = await fetch(`${supabaseFunctionsUrl}/geo-data`, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
  if (!res.ok) throw new Error(`geo-data responded ${res.status}`);
  const body = await res.json();
  if (!body?.success || !Array.isArray(body.states) || !body.states.length) {
    throw new Error("geo-data returned an empty/invalid payload");
  }
  return { states: body.states, lgas: body.lgas ?? {} };
}

/**
 * Resolve states + LGAs. Returns immediately usable data and never throws:
 * on any failure it falls back to the bundled constant.
 *
 * @param {{ force?: boolean }} [opts] force a network refresh past a fresh cache.
 * @returns {Promise<{ states: string[], lgas: Record<string,string[]>, source: 'cache'|'network'|'bundled' }>}
 */
export async function getGeoData(opts = {}) {
  const cached = readCache();
  if (cached?.fresh && !opts.force) {
    return { ...cached.data, source: "cache" };
  }

  try {
    const data = await fetchFromEdge();
    writeCache(data);
    return { ...data, source: "network" };
  } catch {
    // Network failed: prefer a stale cache over the bundled copy if we have one.
    if (cached?.data) return { ...cached.data, source: "cache" };
    return { ...fromBundled(), source: "bundled" };
  }
}

/** Synchronous best-effort (cache or bundled) for first render, no network. */
export function getGeoDataSync() {
  const cached = readCache();
  if (cached?.data) return { ...cached.data, source: "cache" };
  return { ...fromBundled(), source: "bundled" };
}
