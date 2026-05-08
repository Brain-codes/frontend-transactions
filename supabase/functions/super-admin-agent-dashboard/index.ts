import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "./cors.ts";
import { authenticate } from "./authenticate.ts";
import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCors(new Response("ok", { status: 200 }));
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const { userId } = await authenticate(supabase, authHeader);

    // Parse year from body
    const { year = new Date().getFullYear() } = await req.json().catch(() => ({}));
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Resolve org IDs assigned to this agent
    const resolved = await resolveAssignedOrgIds(supabase, userId);
    const assignedOrgIds = resolved.assignedOrgIds;

    if (assignedOrgIds.length === 0) {
      return withCors(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              stovesReceived: 0, stovesSold: 0, availableStoves: 0,
              expectedReceivable: 0, amountReceived: 0, outstandingBalance: 0,
              byState: [], salesModelData: [],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }

    // Stove counts (scoped to assigned orgs)
    const [receivedResult, soldResult, availableResult, salesResult] = await Promise.all([
      supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .in("organization_id", assignedOrgIds)
        .gte("created_at", startDate)
        .lte("created_at", endDate),

      supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .in("organization_id", assignedOrgIds)
        .eq("status", "sold")
        .gte("created_at", startDate)
        .lte("created_at", endDate),

      supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .in("organization_id", assignedOrgIds)
        .eq("status", "available"),

      supabase
        .from("sales")
        .select("amount, total_paid, state_backup, payment_model_id")
        .in("organization_id", assignedOrgIds)
        .gte("sales_date", startDate)
        .lte("sales_date", endDate),
    ]);

    const sales = salesResult.data || [];
    const expectedReceivable = sales.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const amountReceived = sales.reduce((s, r) => s + (Number(r.total_paid) || 0), 0);

    // Sales by state
    const stateMap: Record<string, number> = {};
    sales.forEach((s) => {
      const st = s.state_backup || "Unknown";
      stateMap[st] = (stateMap[st] || 0) + 1;
    });
    const byState = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // Sales model analysis
    const modelIds = [...new Set(sales.map((s) => s.payment_model_id).filter(Boolean))];
    let modelNames: Record<string, string> = {};
    if (modelIds.length > 0) {
      const { data: models } = await supabase.from("payment_models").select("id, name").in("id", modelIds);
      models?.forEach((m) => { modelNames[m.id] = m.name; });
    }
    const modelCountMap: Record<string, number> = {};
    sales.forEach((s) => {
      const label = s.payment_model_id ? (modelNames[s.payment_model_id] || "Other") : "Outright";
      modelCountMap[label] = (modelCountMap[label] || 0) + 1;
    });
    const totalSales = sales.length;
    const salesModelData = Object.entries(modelCountMap)
      .map(([model, count]) => ({ model, count, percentage: totalSales > 0 ? (count / totalSales) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    return withCors(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            stovesReceived: receivedResult.count ?? 0,
            stovesSold: soldResult.count ?? 0,
            availableStoves: availableResult.count ?? 0,
            expectedReceivable,
            amountReceived,
            outstandingBalance: expectedReceivable - amountReceived,
            byState,
            salesModelData,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  } catch (error: any) {
    console.error("ACSL agent dashboard error:", error);
    let statusCode = 500;
    if (error.message?.includes("Unauthorized")) statusCode = 403;
    return withCors(
      new Response(
        JSON.stringify({ success: false, message: error.message || "Internal server error" }),
        { status: statusCode, headers: { "Content-Type": "application/json" } }
      )
    );
  }
});
