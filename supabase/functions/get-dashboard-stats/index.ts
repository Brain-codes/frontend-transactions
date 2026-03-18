import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function withCors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCors(
      new Response("ok", {
        status: 200,
      })
    );
  }

  // Parse optional date filters from body
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    dateFrom = body.date_from || null;
    dateTo = body.date_to || null;
  } catch (_) {
    // ignore parse errors
  }

  // Create client for user authentication
  const userSupabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    }
  );

  // Create service client for data operations (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user with user client
    const { data: userData, error: authError } =
      await userSupabase.auth.getUser();
    if (authError || !userData?.user) {
      return withCors(
        new Response(
          JSON.stringify({ success: false, message: "Unauthorized" }),
          { status: 401 }
        )
      );
    }

    // Get user profile and organization using service client
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            message: "Profile not found",
          }),
          { status: 404 }
        )
      );
    }

    // Allow admin and agent users to access dashboard stats
    if (!["admin", "agent"].includes(profile.role)) {
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            message: "Admin or Agent access required",
          }),
          { status: 403 }
        )
      );
    }

    const organizationId = profile.organization_id;

    if (!organizationId) {
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            message: "User has no organization assigned",
          }),
          { status: 403 }
        )
      );
    }

    // Get stove inventory stats for the organization
    // Total stoves received
    const { count: totalStovesReceived, error: stovesReceivedError } =
      await supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

    if (stovesReceivedError) {
      console.error(
        "Error fetching total stoves received:",
        stovesReceivedError
      );
    }

    // Total stoves sold (status = 'sold')
    const { count: totalStovesSold, error: stovesSoldError } = await supabase
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "sold");

    if (stovesSoldError) {
      console.error("Error fetching total stoves sold:", stovesSoldError);
    }

    // Total stoves available (status = 'available')
    const { count: totalStovesAvailable, error: stovesAvailableError } =
      await supabase
        .from("stove_ids")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "available");

    if (stovesAvailableError) {
      console.error(
        "Error fetching total stoves available:",
        stovesAvailableError
      );
    }

    // Get total sales count for the organization
    const { count: totalSalesCount, error: salesCountError } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (salesCountError) {
      console.error("Error fetching sales count:", salesCountError);
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            message: "Error fetching sales data",
          }),
          { status: 500 }
        )
      );
    }

    // Get sales agents count for the organization
    const { count: salesAgentsCount, error: agentsCountError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "agent");

    if (agentsCountError) {
      console.error("Error fetching agents count:", agentsCountError);
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            message: "Error fetching agents data",
          }),
          { status: 500 }
        )
      );
    }

    // Get sales with completed status count
    const { count: completedSalesCount, error: completedCountError } =
      await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "completed");

    if (completedCountError) {
      console.error(
        "Error fetching completed sales count:",
        completedCountError
      );
    }

    // Get sales with landmarks count (sales that have address with non-null coordinates)
    const { count: salesWithLandmarkCount, error: landmarkCountError } =
      await supabase
        .from("sales")
        .select(
          `
        id,
        address:addresses!inner(
          latitude,
          longitude
        )
      `,
          { count: "exact", head: true }
        )
        .eq("organization_id", organizationId)
        .not("address.latitude", "is", null)
        .not("address.longitude", "is", null);

    if (landmarkCountError) {
      console.error(
        "Error fetching sales with landmark count:",
        landmarkCountError
      );
    }

    // Get pending sales count (incomplete or pending status)
    const { count: pendingSalesCount, error: pendingCountError } =
      await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["incomplete", "pending"]);

    if (pendingCountError) {
      console.error("Error fetching pending sales count:", pendingCountError);
    }

    // Get financial aggregation data (with optional date filters)
    let financialQuery = supabase
      .from("sales")
      .select("amount, total_paid, is_installment, payment_status")
      .eq("organization_id", organizationId)
      .not("amount", "is", null);

    if (dateFrom) financialQuery = financialQuery.gte("sales_date", dateFrom);
    if (dateTo) financialQuery = financialQuery.lte("sales_date", dateTo + "T23:59:59");

    const { data: financialData, error: financialError } = await financialQuery;

    let totalSalesAmount = 0;
    let totalAmountPaid = 0;
    let totalAmountOwed = 0;
    let customersOwing = 0;

    if (!financialError && financialData) {
      for (const sale of financialData) {
        const amount = sale.amount || 0;
        const paid = sale.is_installment ? (sale.total_paid || 0) : amount;
        totalSalesAmount += amount;
        totalAmountPaid += paid;
        if (sale.is_installment && sale.payment_status !== "fully_paid") {
          customersOwing += 1;
        }
      }
      totalAmountOwed = totalSalesAmount - totalAmountPaid;
    }

    // Return dashboard statistics
    const dashboardStats = {
      totalSales: totalSalesCount || 0,
      salesAgents: salesAgentsCount || 0,
      completedSales: completedSalesCount || 0,
      stovesWithLandmark: salesWithLandmarkCount || 0,
      pendingSales: pendingSalesCount || 0,
      totalSalesAmount: totalSalesAmount,
      // Financial summary fields
      totalExpectedAmount: totalSalesAmount,
      totalAmountPaid: totalAmountPaid,
      totalAmountOwed: totalAmountOwed,
      totalCustomers: totalSalesCount || 0,
      customersOwing: customersOwing,
      organizationId: organizationId,
      totalStovesReceived: totalStovesReceived || 0,
      totalStovesSold: totalStovesSold || 0,
      totalStovesAvailable: totalStovesAvailable || 0,
    };

    return withCors(
      new Response(
        JSON.stringify({
          success: true,
          data: dashboardStats,
          message: "Dashboard statistics retrieved successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Error in get-dashboard-stats:", error);
    return withCors(
      new Response(
        JSON.stringify({
          success: false,
          message: "Internal server error",
        }),
        { status: 500 }
      )
    );
  }
});
