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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Invalid or expired token");

    const { data: profile, error: profileError } = await supabaseClient
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
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Run stove counts and sales fetch in parallel
    const [
      receivedResult,
      soldResult,
      availableResult,
      salesResult,
    ] = await Promise.all([
      supabaseClient
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .not("organization_id", "is", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate),

      supabaseClient
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .gte("created_at", startDate)
        .lte("created_at", endDate),

      supabaseClient
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .eq("status", "available"),

      supabaseClient
        .from("sales")
        .select("id, amount, total_paid, state_backup, partner_name, retailer_branch, payment_model_id")
        .gte("sales_date", startDate)
        .lte("sales_date", endDate),
    ]);

    if (salesResult.error) throw new Error("Failed to fetch sales data");

    const sales = salesResult.data || [];

    const expectedReceivable = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const amountReceived = sales.reduce((sum, s) => sum + (Number(s.total_paid) || 0), 0);
    const outstandingBalance = expectedReceivable - amountReceived;

    // Sales by state
    const stateMap: Record<string, number> = {};
    sales.forEach((s) => {
      const st = s.state_backup || "Unknown";
      stateMap[st] = (stateMap[st] || 0) + 1;
    });
    const salesByState = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // Top 5 partners
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

    // Sales model analysis
    const modelIds = [...new Set(sales.map((s) => s.payment_model_id).filter(Boolean))];
    let modelNames: Record<string, string> = {};
    if (modelIds.length > 0) {
      const { data: models } = await supabaseClient
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
          stovesReceivedByPartners: receivedResult.count ?? 0,
          stovesSoldToEndUsers: soldResult.count ?? 0,
          availableStoves: availableResult.count ?? 0,
          expectedReceivable,
          amountReceived,
          outstandingBalance,
          salesByState,
          salesModelData,
          topPartners,
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
