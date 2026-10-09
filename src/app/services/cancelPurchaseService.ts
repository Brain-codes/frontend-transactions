import { createClientComponentClient } from "@/lib/supabaseClient";

export interface BlockingSale {
  stove_serial_no: string | null;
  sales_reference: string | null;
  sales_date: string | null;
  partner_name: string | null;
  sale_id: string;
}

export async function checkPurchaseCancellable(transferId: string): Promise<BlockingSale[]> {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase.rpc("check_purchase_cancellable", {
    _transfer_id: transferId,
  });
  if (error) throw new Error(error.message);
  return (data || []) as BlockingSale[];
}

export interface CancelPurchaseResult {
  cancelledPurchaseId: string;
  salesReference: string | null;
  // For a transfer the ERP sent: whether the ERP reopened the order (TX-2b).
  erp: { notified: boolean; status: string };
}

// Runs through the cancel-purchase function, which cancels as the signed-in
// person and then tells the ERP when the ERP sent the transfer.
export async function cancelPurchase(transferId: string, reason: string): Promise<CancelPurchaseResult> {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase.functions.invoke("cancel-purchase", {
    body: { transfer_id: transferId, reason },
  });
  if (error) {
    let message = error.message;
    try {
      const ctx = await (error as any)?.context?.json?.();
      if (ctx?.message) message = ctx.message;
    } catch {
      // keep the plain message
    }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.message || "Failed to cancel purchase");
  return {
    cancelledPurchaseId: data.cancelled_purchase_id,
    salesReference: data.sales_reference ?? null,
    erp: data.erp ?? { notified: false, status: "unknown" },
  };
}

export interface CancelledPurchaseRecord {
  id: string;
  original_transfer_id: string | null;
  transaction_id: string | null;
  organization_id: string | null;
  partner_id: string | null;
  partner_name: string | null;
  state: string | null;
  branch: string | null;
  sales_factory: string | null;
  sales_date: string | null;
  transfer_date: string | null;
  stove_count: number;
  stove_ids_snapshot: Array<{ stove_id: string; factory?: string; sales_reference?: string }>;
  cancellation_reason: string;
  cancelled_by: string | null;
  cancelled_at: string;
}

export async function listCancelledPurchases(): Promise<CancelledPurchaseRecord[]> {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase
    .from("cancelled_purchases")
    .select("*")
    .order("cancelled_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data || []) as CancelledPurchaseRecord[];
}
