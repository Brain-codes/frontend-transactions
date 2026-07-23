// Returns the END_USER_RECORDS_API_KEY value — restricted to super_admin users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function withCors(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function json(status: number, body: unknown): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response("ok", { status: 200 }));

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { success: false, error: "Unauthorized" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    let isSuperAdmin = userData.user.email === "superadmin@mail.com";
    if (!isSuperAdmin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      isSuperAdmin = profile?.role === "super_admin";
    }
    if (!isSuperAdmin) return json(403, { success: false, error: "Super admin access required" });

    const key = Deno.env.get("END_USER_RECORDS_API_KEY") || "";
    if (!key) return json(500, { success: false, error: "API key not configured" });

    return json(200, { success: true, api_key: key });
  } catch (e) {
    return json(500, { success: false, error: (e as Error).message });
  }
});
