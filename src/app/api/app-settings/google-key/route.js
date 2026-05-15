import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { webcrypto } from "node:crypto";

const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";

// AES-GCM encrypt payload with NEXT_PUBLIC_MAPS_CIPHER_KEY.
// Returns { encrypted: base64, iv: base64 } or null if key not configured.
async function encryptPayload(payload) {
  const cipherKeyHex = process.env.NEXT_PUBLIC_MAPS_CIPHER_KEY;
  if (!cipherKeyHex || cipherKeyHex.length < 64) return null;

  const keyBytes = Buffer.from(cipherKeyHex, "hex");
  const iv = webcrypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await webcrypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );

  return {
    encrypted: Buffer.from(ciphertext).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

// Returns both Google Places and Google Maps API keys for client-side use.
// Keys are fetched server-side (never in client bundles) and AES-GCM encrypted.
// Client must decrypt using NEXT_PUBLIC_MAPS_CIPHER_KEY before use.
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await supabase
      .from("app_settings")
      .select("google_places_api_key, google_maps_api_key")
      .eq("id", SETTINGS_ROW_ID)
      .single();

    const placesKey =
      data?.google_places_api_key ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
      null;
    const mapsKey =
      data?.google_maps_api_key ||
      process.env.GOOGLE_MAPS_API_KEY ||
      null;

    const result = await encryptPayload({ placesKey, mapsKey });

    if (result) {
      return NextResponse.json(result);
    }

    // Fallback if cipher key not configured — plain response (dev only)
    return NextResponse.json({ placesKey, mapsKey });
  } catch (err) {
    console.error("app-settings/google-key error:", err);
    return NextResponse.json({ placesKey: null, mapsKey: null }, { status: 200 });
  }
}
