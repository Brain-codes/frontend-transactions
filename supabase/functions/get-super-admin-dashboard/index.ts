import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    // Get user role
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // Check if user is super admin
    if (profile.role !== "super_admin") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Super admin access required",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body for filters
    const {
      date_from,
      date_to,
      organization_ids,
      customer_state,
      period = "6months",
    } = await req.json().catch(() => ({}));

    // Helper function to get date range based on period
    const getDateRange = (period: string) => {
      const now = new Date();
      const ranges: any = {
        "7days": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        "30days": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        "3months": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        "6months": new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        "1year": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      };
      return ranges[period] || ranges["6months"];
    };

    const startDate =
      date_from || getDateRange(period).toISOString().split("T")[0];
    const endDate = date_to || new Date().toISOString().split("T")[0];

    // === 1. KPI METRICS ===

    // Get total organizations
    let orgQuery = supabaseClient
      .from("organizations")
      .select("id", { count: "exact", head: true });
    if (customer_state) {
      orgQuery = orgQuery.eq("state", customer_state);
    }
    const { count: totalOrganizations } = await orgQuery;

    // Get stove inventory metrics using COUNT aggregation (scalable for any number of records)
    // First, get organization IDs that match the state filter if needed
    let filteredOrgIds = organization_ids;

    if (customer_state && !filteredOrgIds) {
      // Get all organization IDs for this state
      const { data: orgsInState } = await supabaseClient
        .from("organizations")
        .select("id")
        .eq("state", customer_state);
      filteredOrgIds = orgsInState?.map((o) => o.id) || [];

      // If no organizations found for this state, return zero counts
      if (filteredOrgIds.length === 0) {
        filteredOrgIds = [-1]; // Use invalid ID to return 0 results
      }
    } else if (customer_state && filteredOrgIds && filteredOrgIds.length > 0) {
      // Filter the provided org IDs to only those in the selected state
      const { data: orgsInState } = await supabaseClient
        .from("organizations")
        .select("id")
        .eq("state", customer_state)
        .in("id", filteredOrgIds);
      filteredOrgIds = orgsInState?.map((o) => o.id) || [];

      if (filteredOrgIds.length === 0) {
        filteredOrgIds = [-1]; // Use invalid ID to return 0 results
      }
    }

    // Build base filter function
    const buildStoveFilters = (query: any) => {
      if (filteredOrgIds && filteredOrgIds.length > 0) {
        query = query.in("organization_id", filteredOrgIds);
      }
      return query;
    };

    // Get total stoves count
    let totalStovesQuery = supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true });
    totalStovesQuery = buildStoveFilters(totalStovesQuery);
    const { count: totalStoves } = await totalStovesQuery;

    // Get received stoves count
    let receivedStovesQuery = supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "received");
    receivedStovesQuery = buildStoveFilters(receivedStovesQuery);
    const { count: receivedStoves } = await receivedStovesQuery;

    // Get sold stoves count
    let soldStovesQuery = supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold");
    soldStovesQuery = buildStoveFilters(soldStovesQuery);
    const { count: soldStoves } = await soldStovesQuery;

    // Get available stoves count
    let availableStovesQuery = supabaseClient
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");
    availableStovesQuery = buildStoveFilters(availableStovesQuery);
    const { count: availableStoves } = await availableStovesQuery;

    // For monthly trends, we need actual data (but only created_at and status)
    let stoveDataQuery = supabaseClient
      .from("stove_ids")
      .select("created_at, status");

    if (filteredOrgIds && filteredOrgIds.length > 0) {
      stoveDataQuery = stoveDataQuery.in("organization_id", filteredOrgIds);
    }
    if (startDate) stoveDataQuery = stoveDataQuery.gte("created_at", startDate);
    if (endDate) stoveDataQuery = stoveDataQuery.lte("created_at", endDate);

    const { data: stoveDataForTrends } = await stoveDataQuery;

    // Get sales metrics
    let salesQuery = supabaseClient
      .from("sales")
      .select("id, sales_date, amount, organization_id, state_backup");

    if (filteredOrgIds && filteredOrgIds.length > 0) {
      salesQuery = salesQuery.in("organization_id", filteredOrgIds);
    }
    if (customer_state) {
      salesQuery = salesQuery.eq("state_backup", customer_state);
    }
    if (startDate) salesQuery = salesQuery.gte("sales_date", startDate);
    if (endDate) salesQuery = salesQuery.lte("sales_date", endDate);

    const { data: salesData, error: salesError } = await salesQuery;
    if (salesError) {
      console.error("Sales query error:", salesError);
      throw new Error("Failed to fetch sales data");
    }

    const totalSales = salesData?.length || 0;
    const totalRevenue =
      salesData?.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0) ||
      0;
    const avgSaleAmount = totalSales > 0 ? totalRevenue / totalSales : 0;

    // === 2. MONTHLY TRENDS ===

    // Group sales by month
    const monthlySales: any = {};
    const monthlyRevenue: any = {};
    const monthlyStoves: any = {};

    salesData?.forEach((sale) => {
      if (sale.sales_date) {
        const month = sale.sales_date.substring(0, 7); // YYYY-MM
        monthlySales[month] = (monthlySales[month] || 0) + 1;
        monthlyRevenue[month] =
          (monthlyRevenue[month] || 0) + (Number(sale.amount) || 0);
      }
    });

    stoveDataForTrends?.forEach((stove) => {
      if (stove.created_at) {
        const month = stove.created_at.substring(0, 7);
        monthlyStoves[month] = (monthlyStoves[month] || 0) + 1;
      }
    });

    // Generate last 6 months data
    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const monthKey = d.toISOString().substring(0, 7);
      const monthName = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      months.push({
        month: monthName,
        monthKey: monthKey,
        sales: monthlySales[monthKey] || 0,
        revenue: monthlyRevenue[monthKey] || 0,
        stoves: monthlyStoves[monthKey] || 0,
      });
    }

    // === 3. TOP PERFORMING ORGANIZATIONS ===

    const orgPerformance: any = {};

    salesData?.forEach((sale) => {
      if (sale.organization_id) {
        if (!orgPerformance[sale.organization_id]) {
          orgPerformance[sale.organization_id] = {
            sales: 0,
            revenue: 0,
          };
        }
        orgPerformance[sale.organization_id].sales += 1;
        orgPerformance[sale.organization_id].revenue +=
          Number(sale.amount) || 0;
      }
    });

    // Get organization details for top performers
    const topOrgIds = Object.keys(orgPerformance)
      .sort((a, b) => orgPerformance[b].sales - orgPerformance[a].sales)
      .slice(0, 10);

    let topOrgsData = [];
    if (topOrgIds.length > 0) {
      const { data: orgsDetails } = await supabaseClient
        .from("organizations")
        .select("id, partner_name, state, branch")
        .in("id", topOrgIds);

      topOrgsData =
        orgsDetails
          ?.map((org) => ({
            id: org.id,
            name: org.partner_name,
            branch: org.branch,
            state: org.state,
            sales: orgPerformance[org.id].sales,
            revenue: orgPerformance[org.id].revenue,
          }))
          .sort((a, b) => b.sales - a.sales) || [];
    }

    // === 4. SALES BY STATE ===

    const salesByState: any = {};
    salesData?.forEach((sale) => {
      if (sale.state_backup) {
        if (!salesByState[sale.state_backup]) {
          salesByState[sale.state_backup] = {
            count: 0,
            revenue: 0,
          };
        }
        salesByState[sale.state_backup].count += 1;
        salesByState[sale.state_backup].revenue += Number(sale.amount) || 0;
      }
    });

    const stateData = Object.keys(salesByState)
      .map((state) => ({
        state,
        sales: salesByState[state].count,
        revenue: salesByState[state].revenue,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // === 5. STOVE STATUS DISTRIBUTION ===

    const stoveStatusData = [
      {
        status: "Available",
        count: availableStoves,
        percentage: totalStoves > 0 ? (availableStoves / totalStoves) * 100 : 0,
      },
      {
        status: "Sold",
        count: soldStoves,
        percentage: totalStoves > 0 ? (soldStoves / totalStoves) * 100 : 0,
      },
      {
        status: "Received",
        count: receivedStoves,
        percentage: totalStoves > 0 ? (receivedStoves / totalStoves) * 100 : 0,
      },
    ];

    // === 6. GROWTH METRICS (compare with previous period) ===

    // Get previous period data for comparison
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 6);
    const prevPeriodEnd = new Date(startDate);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);

    let prevSalesQuery = supabaseClient
      .from("sales")
      .select("id, amount", { count: "exact" });
    if (filteredOrgIds && filteredOrgIds.length > 0) {
      prevSalesQuery = prevSalesQuery.in("organization_id", filteredOrgIds);
    }
    if (customer_state) {
      prevSalesQuery = prevSalesQuery.eq("state_backup", customer_state);
    }
    prevSalesQuery = prevSalesQuery
      .gte("sales_date", prevPeriodStart.toISOString().split("T")[0])
      .lte("sales_date", prevPeriodEnd.toISOString().split("T")[0]);

    const { data: prevSalesData } = await prevSalesQuery;
    const prevSalesCount = prevSalesData?.length || 0;
    const prevRevenue =
      prevSalesData?.reduce(
        (sum, sale) => sum + (Number(sale.amount) || 0),
        0,
      ) || 0;

    const salesGrowth =
      prevSalesCount > 0
        ? ((totalSales - prevSalesCount) / prevSalesCount) * 100
        : 0;
    const revenueGrowth =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Get unique states
    const { data: statesData } = await supabaseClient
      .from("organizations")
      .select("state")
      .order("state");
    const uniqueStates = [...new Set(statesData?.map((s) => s.state))]
      .filter(Boolean)
      .sort();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          // KPIs
          kpis: {
            totalOrganizations: totalOrganizations || 0,
            totalStoves,
            receivedStoves,
            soldStoves,
            availableStoves,
            totalSales,
            totalRevenue,
            avgSaleAmount,
            salesGrowth,
            revenueGrowth,
          },
          // Trends
          monthlyTrends: months,
          // Top Performers
          topOrganizations: topOrgsData,
          // Geographic Distribution
          salesByState: stateData,
          // Inventory Status
          stoveStatus: stoveStatusData,
          // Filter Options
          states: uniqueStates,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in get-super-admin-dashboard:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
