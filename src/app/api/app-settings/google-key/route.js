import { NextResponse } from "next/server";
import { webcrypto } from "node:crypto";

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
// Keys are fetched server-side via the get-google-keys edge function and
// AES-GCM encrypted before sending to the client.
// Client must decrypt using NEXT_PUBLIC_MAPS_CIPHER_KEY before use.
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("app-settings/google-key: missing SUPABASE env vars");
      return NextResponse.json({ placesKey: null, mapsKey: null });
    }

    // Proxy to the get-google-keys edge function using service role as auth token
    const res = await fetch(`${supabaseUrl}/functions/v1/get-google-keys`, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });

    const edgeData = await res.json();
    const placesKey = edgeData?.placesKey ?? null;
    const mapsKey = edgeData?.mapsKey ?? null;

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
