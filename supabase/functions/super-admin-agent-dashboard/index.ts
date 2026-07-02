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
    const { userId, userRole, organizationId } = await authenticate(supabase, authHeader);

    // Parse year from body
    const { year = new Date().getFullYear() } = await req.json().catch(() => ({}));
    const startDate = `${year}-01-01`;
    const endOfYear = `${year + 1}-01-01`; // exclusive upper bound

    // Partner Agent / Agent: dashboard is scoped to their own recorded sales only
    // (RBAC: Dashboard -> "Own sales"), not the whole partner organization.
    const isOwnSalesScope = userRole === "partner_agent" || userRole === "agent";

    if (isOwnSalesScope) {
      // Stove inventory (received/available) belongs to the partner organization —
      // a partner agent inherits visibility into their org's whole stove ledger,
      // same as the partner they're tied to. Sales-derived numbers (sold count,
      // financials, sales model, by-state) are attributed to the agent personally
      // via sold_on_behalf_of (the selling agent, not created_by the record's
      // actual creator — defaults to the creator on self-sales).
      const [receivedResult, soldCumulativeResult, salesResult] = await Promise.all([
        organizationId
          ? supabase
              .from("stove_ids")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", organizationId)
              .lt("created_at", endOfYear)
          : Promise.resolve({ count: 0 }),

        supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("sold_on_behalf_of", userId)
          .lt("sales_date", endOfYear),

        supabase
          .from("sales")
          .select("amount, total_paid, is_installment, state_backup, payment_model_id")
          .eq("sold_on_behalf_of", userId)
          .gte("sales_date", startDate)
          .lt("sales_date", endOfYear),
      ]);

      const sales = salesResult.data || [];
      const expectedReceivable = sales.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const amountReceived = sales.reduce((s, r) => {
        const paid = r.is_installment ? (Number(r.total_paid) || 0) : (Number(r.amount) || 0);
        return s + paid;
      }, 0);

      const stateMap: Record<string, number> = {};
      sales.forEach((s) => {
        const st = s.state_backup || "Unknown";
        stateMap[st] = (stateMap[st] || 0) + 1;
      });
      const byState = Object.entries(stateMap)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count);

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

      const stovesReceived = receivedResult.count ?? 0;
      const stovesSold = soldCumulativeResult.count ?? 0;

      return withCors(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              stovesReceived,
              stovesSold,
              availableStoves: Math.max(0, stovesReceived - stovesSold),
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
    }

    // Resolve org IDs assigned to this agent
    const resolved = await resolveAssignedOrgIds(supabase, userId);
    const assignedOrgIds = [...new Set([...resolved.assignedOrgIds, ...(organizationId ? [organizationId] : [])])];

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

    // Balance-sheet stove counts: cumulative as of end of selected year.
    // created_at is used for received (no transfer-date column); sales_date
    // is authoritative for sold. Financial metrics remain year-specific.
    const [receivedResult, soldCumulativeResult, salesResult] = await Promise.all([
      supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .in("organization_id", assignedOrgIds)
        .lt("created_at", endOfYear),

      supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .in("organization_id", assignedOrgIds)
        .lt("sales_date", endOfYear),

      supabase
        .from("sales")
        .select("amount, total_paid, is_installment, state_backup, payment_model_id")
        .in("organization_id", assignedOrgIds)
        .gte("sales_date", startDate)
        .lt("sales_date", endOfYear),
    ]);

    const sales = salesResult.data || [];
    const expectedReceivable = sales.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    // Outright sales are fully paid on the spot; only installment sales use total_paid
    const amountReceived = sales.reduce((s, r) => {
      const paid = r.is_installment ? (Number(r.total_paid) || 0) : (Number(r.amount) || 0);
      return s + paid;
    }, 0);

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
            stovesSold: soldCumulativeResult.count ?? 0,
            availableStoves: Math.max(0, (receivedResult.count ?? 0) - (soldCumulativeResult.count ?? 0)),
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
