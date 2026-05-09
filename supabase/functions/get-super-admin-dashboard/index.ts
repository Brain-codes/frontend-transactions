import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // User client — for auth verification only
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service-role client — bypasses RLS for data queries (profiles, etc.)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Invalid or expired token");

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error("Failed to fetch user profile");

    if (profile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { year = new Date().getFullYear() } = await req.json().catch(() => ({}));

    // Stove KPIs use a balance-sheet (snapshot) model: cumulative totals as of
    // the END of the selected year. This gives different numbers per year while
    // keeping Available = Received − Sold logically consistent.
    // stove_ids has no transfer-date column; created_at is used as the best proxy.
    //
    // Financial metrics (amount, etc.) remain year-specific via sales_date.
    const startDate = `${year}-01-01`;
    const endOfYear = `${year + 1}-01-01`; // exclusive — captures all of Dec 31

    const [receivedResult, soldCumulativeResult, salesResult] = await Promise.all([
      // Stoves received by any partner as of end of selected year
      serviceClient
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .not("organization_id", "is", null)
        .lt("created_at", endOfYear),

      // Total stoves sold to end users as of end of selected year (sales_date is authoritative)
      serviceClient
        .from("sales")
        .select("*", { count: "exact", head: true })
        .lt("sales_date", endOfYear),

      // Year-only sales for financial metrics and charts
      serviceClient
        .from("sales")
        .select("id, amount, total_paid, state_backup, partner_name, retailer_branch, payment_model_id, created_by")
        .gte("sales_date", startDate)
        .lt("sales_date", endOfYear),
    ]);

    if (salesResult.error) throw new Error("Failed to fetch sales data");

    const stovesReceivedByPartners = receivedResult.count ?? 0;
    const stovesSoldToEndUsers = soldCumulativeResult.count ?? 0; // cumulative as of year end
    // Available = received up to year end minus sold up to year end
    const availableStoves = Math.max(0, stovesReceivedByPartners - stovesSoldToEndUsers);

    const sales = salesResult.data || [];

    const expectedReceivable = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const amountReceived = sales.reduce((sum, s) => sum + (Number(s.total_paid) || 0), 0);
    const outstandingBalance = expectedReceivable - amountReceived;

    // Sales by state (year-filtered)
    const stateMap: Record<string, number> = {};
    sales.forEach((s) => {
      const st = s.state_backup || "Unknown";
      stateMap[st] = (stateMap[st] || 0) + 1;
    });
    const salesByState = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // Top 5 partners by sales (year-filtered)
    const partnerMap: Record<string, { name: string; branch: string | null; count: number }> = {};
    sales.forEach((s) => {
      const name = (s.partner_name || "Unknown").trim();
      const branch = s.retailer_branch ? s.retailer_branch.trim() : null;
      const key = `${name}|||${branch || ""}`;
      if (!partnerMap[key]) partnerMap[key] = { name, branch, count: 0 };
      partnerMap[key].count += 1;
    });
    const totalSales = sales.length;
    const topPartners = Object.values(partnerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        percentage: totalSales > 0 ? ((p.count / totalSales) * 100).toFixed(1) : "0",
      }));

    // Top 5 agents by sales count (year-filtered)
    const agentCountMap: Record<string, number> = {};
    sales.forEach((s) => {
      if (s.created_by) agentCountMap[s.created_by] = (agentCountMap[s.created_by] || 0) + 1;
    });
    const topAgentIds = Object.entries(agentCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    let agentNames: Record<string, string> = {};
    if (topAgentIds.length > 0) {
      const { data: agentProfiles } = await serviceClient
        .from("profiles")
        .select("id, full_name, email, username")
        .in("id", topAgentIds);
      agentProfiles?.forEach((p) => { agentNames[p.id] = p.full_name || p.username || p.email || "Unknown"; });
    }
    const topAgents = topAgentIds.map((id) => ({
      name: agentNames[id] || "Unknown",
      count: agentCountMap[id],
      percentage: totalSales > 0 ? ((agentCountMap[id] / totalSales) * 100).toFixed(1) : "0",
    }));

    // Sales model analysis (year-filtered)
    const modelIds = [...new Set(sales.map((s) => s.payment_model_id).filter(Boolean))];
    let modelNames: Record<string, string> = {};
    if (modelIds.length > 0) {
      const { data: models } = await serviceClient
        .from("payment_models")
        .select("id, name")
        .in("id", modelIds);
      models?.forEach((m) => { modelNames[m.id] = m.name; });
    }

    const modelCountMap: Record<string, number> = {};
    sales.forEach((s) => {
      const label = s.payment_model_id ? (modelNames[s.payment_model_id] || "Other") : "Outright";
      modelCountMap[label] = (modelCountMap[label] || 0) + 1;
    });
    const salesModelData = Object.entries(modelCountMap)
      .map(([model, count]) => ({
        model,
        count,
        percentage: totalSales > 0 ? (count / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          stovesReceivedByPartners,
          stovesSoldToEndUsers,
          availableStoves,
          expectedReceivable,
          amountReceived,
          outstandingBalance,
          salesByState,
          salesModelData,
          topPartners,
          topAgents,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in get-super-admin-dashboard:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
