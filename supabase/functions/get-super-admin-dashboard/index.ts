import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // === KPI: Stove counts ===

    // Stoves received by partners = all stove_ids assigned to any organization
    const { count: stovesReceivedByPartners } = await supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .not("organization_id", "is", null)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const { count: stovesSoldToEndUsers } = await supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const { count: availableStoves } = await supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    // === KPI: Financial metrics from sales ===

    const { data: salesData, error: salesError } = await supabaseClient
      .from("sales")
      .select("amount, total_paid, state_backup, payment_model_id")
      .gte("sales_date", startDate)
      .lte("sales_date", endDate);

    if (salesError) throw new Error("Failed to fetch sales data");

    const expectedReceivable = salesData?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) ?? 0;
    const amountReceived = salesData?.reduce((sum, s) => sum + (Number(s.total_paid) || 0), 0) ?? 0;
    const outstandingBalance = expectedReceivable - amountReceived;

    // Total partners
    const { count: totalPartners } = await supabaseClient
      .from("organizations")
      .select("*", { count: "exact", head: true });

    // === Sales by State ===

    const salesByStateMap: Record<string, number> = {};
    salesData?.forEach((s) => {
      if (s.state_backup) {
        salesByStateMap[s.state_backup] = (salesByStateMap[s.state_backup] || 0) + 1;
      }
    });

    const salesByState = Object.entries(salesByStateMap)
      .map(([state, count]) => ({ state, sales: count }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 15);

    // === Sales Model Analysis ===

    const modelCountMap: Record<string, number> = {};
    const modelIds = [...new Set(salesData?.map((s) => s.payment_model_id).filter(Boolean))];

    let modelNames: Record<string, string> = {};
    if (modelIds.length > 0) {
      const { data: models } = await supabaseClient
        .from("payment_models")
        .select("id, name")
        .in("id", modelIds);
      models?.forEach((m) => { modelNames[m.id] = m.name; });
    }

    salesData?.forEach((s) => {
      const label = s.payment_model_id ? (modelNames[s.payment_model_id] || "Other") : "Outright";
      modelCountMap[label] = (modelCountMap[label] || 0) + 1;
    });

    const totalSalesCount = salesData?.length || 0;
    const salesModelData = Object.entries(modelCountMap).map(([model, count]) => ({
      model,
      count,
      percentage: totalSalesCount > 0 ? (count / totalSalesCount) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          kpis: {
            stovesReceivedByPartners: stovesReceivedByPartners ?? 0,
            stovesSoldToEndUsers: stovesSoldToEndUsers ?? 0,
            availableStoves: availableStoves ?? 0,
            expectedReceivable,
            amountReceived,
            outstandingBalance,
            totalPartners: totalPartners ?? 0,
          },
          salesByState,
          salesModelData,
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
