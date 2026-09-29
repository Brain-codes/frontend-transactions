// The ERP cancels a transfer it sent (TX-2a). A transferred order deleted in the ERP asks
// here first; this app records the cancel in cancelled_purchases and removes the unsold
// stoves, or refuses when a stove is tied to an active sale, and the ERP stops its delete.
// Authenticated like external-csv-sync, with the application token and secret; no user
// session. The rules live in public.cancel_purchase_from_erp.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { validateExternalToken } from "../_shared/externalAppToken.ts";

// Matches the application_name the ERP's transfers carry, as cancel_purchase_from_erp does.
const ERP_APPLICATION = "Atmosfair ERP System";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return json(405, { success: false, status: "error", message: "Use POST." });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, status: "error", message: "The request body is not JSON." });
  }

  const { token, secret_key, application_name, origin_url, sales_reference, reason, requested_by } = body ?? {};
  if (!token || !secret_key || !application_name || !sales_reference) {
    return json(400, {
      success: false,
      status: "error",
      message: "token, secret_key, application_name and sales_reference are required.",
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const auth = await validateExternalToken(supabase, token, secret_key, application_name, origin_url);
  if (!auth.isValid) return json(401, { success: false, status: "error", message: auth.error });

  // Only the ERP's own token may cancel ERP transfers; another application's
  // valid token (the NABDA Portal's) is refused here.
  if (!String(auth.token_data?.application_name ?? "").startsWith(ERP_APPLICATION)) {
    return json(403, { success: false, status: "error", message: "Only the ERP can cancel its transfers." });
  }

  const { data, error } = await supabase.rpc("cancel_purchase_from_erp", {
    _transaction_id: String(sales_reference),
    _reason: String(reason ?? ""),
    _requested_by: String(requested_by ?? ""),
  });

  if (error) {
    const refused = /tied to active sales/i.test(error.message);
    console.error(`external-transfer-cancel ${sales_reference}:`, error.message);
    return json(refused ? 409 : 500, {
      success: false,
      status: refused ? "refused" : "error",
      message: refused
        ? `The monitoring system refused: ${error.message}`
        : "The monitoring system could not cancel this transfer.",
    });
  }

  return json(200, { success: true, ...(data as Record<string, unknown>) });
});
