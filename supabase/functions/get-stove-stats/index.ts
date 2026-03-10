import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user role and organization from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "super_admin" && profile.role !== "admin")
    ) {
      throw new Error("Insufficient permissions");
    }

    // Get query parameters
    const url = new URL(req.url);
    let organizationIds =
      url.searchParams.get("organization_ids")?.split(",") || [];

    // For admin users, force filter to their organization only
    if (profile.role === "admin" && profile.organization_id) {
      organizationIds = [profile.organization_id];
    }

    // Get stove ID statistics using count for better performance and no row limit
    let totalQuery = supabase
      .from("stove_ids")
      .select("*", { count: "exact", head: true });

    let availableQuery = supabase
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");

    let soldQuery = supabase
      .from("stove_ids")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold");

    // If organization_ids are provided, filter by them
    // Otherwise, get stats for all organizations
    if (organizationIds.length > 0) {
      totalQuery = totalQuery.in("organization_id", organizationIds);
      availableQuery = availableQuery.in("organization_id", organizationIds);
      soldQuery = soldQuery.in("organization_id", organizationIds);
    }

    // Execute all queries in parallel
    const [totalResult, availableResult, soldResult] = await Promise.all([
      totalQuery,
      availableQuery,
      soldQuery,
    ]);

    if (totalResult.error) throw totalResult.error;
    if (availableResult.error) throw availableResult.error;
    if (soldResult.error) throw soldResult.error;

    // Get counts from results
    const total = totalResult.count || 0;
    const available = availableResult.count || 0;
    const sold = soldResult.count || 0;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          available,
          sold,
          total,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message === "Unauthorized" ? 401 : 500,
      },
    );
  }
});
