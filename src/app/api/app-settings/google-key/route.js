import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";

// Returns the Google Places API key for client-side use.
// Uses service role server-side — key is never exposed in client bundles.
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from("app_settings")
      .select("google_places_api_key")
      .eq("id", SETTINGS_ROW_ID)
      .single();

    if (error) {
      console.error("Failed to fetch google places key:", error.message);
      return NextResponse.json({ key: null }, { status: 200 });
    }

    // Fall back to env var if DB key not set yet
    const key =
      data?.google_places_api_key ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
      null;

    return NextResponse.json({ key });
  } catch (err) {
    console.error("app-settings/google-key error:", err);
    return NextResponse.json({ key: null }, { status: 200 });
  }
}
