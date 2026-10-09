// A super admin cancels a purchase, and the ERP hears about it (TX-2b).
//
// The cancel itself is public.cancel_purchase, run as the signed-in person so its super-admin
// check and rules are unchanged. When the transfer came from the ERP, the ERP's
// monitoring-cancel-notice is then told, with the shared key, so it reopens the order instead of
// counting it as transferred. If the notice fails the cancel stands and the reply says the ERP was
// not updated. A cancel the ERP started (external-transfer-cancel) never comes through here.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const ERP_APPLICATION = "Atmosfair ERP System";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function tellErp(salesReference: string, reason: string, cancelledBy: string) {
  const url = (Deno.env.get("ERP_MONITORING_NOTICE_URL") ?? "").trim();
  const key = (Deno.env.get("ERP_MONITORING_NOTICE_KEY") ?? "").trim();
  if (!url || !key) return { notified: false, status: "not_configured" };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-monitoring-key": key },
      body: JSON.stringify({
        sales_reference: salesReference,
        reason,
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
      }),
    });
    let reply: any = {};
    try {
      reply = await response.json();
    } catch {
      // handled by the status below
    }
    if (!response.ok) {
      console.error(`cancel-purchase: ERP notice for ${salesReference} returned ${response.status}`, reply);
      return { notified: false, status: reply?.status ?? `http_${response.status}` };
    }
    return { notified: true, status: reply?.status ?? "ok" };
  } catch (error) {
    console.error(`cancel-purchase: ERP notice for ${salesReference} failed:`, (error as Error).message);
    return { notified: false, status: "unreachable" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, message: "Use POST." });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json(401, { success: false, message: "Your session has expired. Sign in again." });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, message: "The request body is not JSON." });
  }
  const transferId = typeof body?.transfer_id === "string" ? body.transfer_id : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!transferId) return json(400, { success: false, message: "transfer_id is required." });

  // Refuse anyone who is not a super admin before reading anything with the
  // service role. cancel_purchase checks again as the person below.
  const { data: profile } = await admin.from("profiles").select("role, full_name, email").eq("id", user.id).maybeSingle();
  if (profile?.role !== "super_admin") {
    return json(403, { success: false, message: "Only super admins can cancel purchases" });
  }

  // Read the transfer before it is deleted, to know whether the ERP sent it.
  const { data: transfer } = await admin
    .from("stove_transfer_history")
    .select("transaction_id, application_name")
    .eq("id", transferId)
    .maybeSingle();

  // The cancel runs as the person, so cancel_purchase's own super-admin check decides.
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: cancelledId, error: cancelError } = await asCaller.rpc("cancel_purchase", {
    _transfer_id: transferId,
    _reason: reason,
  });
  if (cancelError) return json(400, { success: false, message: cancelError.message });

  let erp: { notified: boolean; status: string } = { notified: false, status: "not_from_erp" };
  if (transfer?.transaction_id && String(transfer.application_name ?? "").startsWith(ERP_APPLICATION)) {
    const who = profile?.full_name || profile?.email || user.email || "a sales app administrator";
    erp = await tellErp(transfer.transaction_id, reason, who);
  }

  return json(200, {
    success: true,
    cancelled_purchase_id: cancelledId,
    sales_reference: transfer?.transaction_id ?? null,
    erp,
  });
});
