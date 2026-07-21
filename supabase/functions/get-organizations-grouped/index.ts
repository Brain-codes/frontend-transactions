import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Group organizations by EXACT (case/whitespace-normalized) partner_name.
//
// We deliberately do NOT fuzzy-merge names that merely "look similar". An older
// version ran a second pass that merged any two partner names sharing ≥50% of
// their words, then picked one label via a findBaseName() heuristic. That silently
// hid legitimately distinct partners — e.g. "Swali Global Multi Concept" and
// "Swali Global Multi Concept (Amina Sales Model)" collapsed into one, dropping the
// Amina variant (and all its stoves) from every screen that reads this function.
//
// partner_name is authoritative: a parenthetical suffix, payment-model tag, or
// spelling difference IS a different partner record with its own stove inventory.
// Rows with the identical name are still grouped (their branches roll up under one
// entry). If genuine duplicates appear afterward, the fix is a data cleanup in the
// organizations table — not re-introducing fuzzy grouping here.
function groupOrganizations(organizations: any[]): any[] {
  const groups: Map<string, any> = new Map();

  for (const org of organizations) {
    const key = (org.partner_name || "").toLowerCase().trim();
    if (!groups.has(key)) {
      groups.set(key, {
        base_name: org.partner_name,
        branches: [],
        organization_ids: [],
        branch_count: 0,
      });
    }

    const group = groups.get(key)!;
    group.branches.push({
      id: org.id,
      branch: org.branch || "Main Branch",
      state: org.state,
      full_name: org.partner_name,
      partner_type: org.partner_type,
    });
    group.organization_ids.push(org.id);
    group.branch_count = group.branches.length;
  }

  // Sort alphabetically by base_name (unchanged response shape).
  return Array.from(groups.values()).sort((a, b) =>
    a.base_name.localeCompare(b.base_name)
  );
}

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

    // Get user role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      throw new Error("Insufficient permissions");
    }

    // Get query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "30");

    // Build query
    let query = supabase
      .from("organizations")
      .select("id, partner_name, branch, state, partner_type", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.ilike("partner_name", `%${search}%`);
    }

    // Execute query
    const { data: organizations, error, count } = await query;

    if (error) {
      throw error;
    }

    // Group similar organizations
    const groupedOrgs = groupOrganizations(organizations || []);

    // Apply pagination to grouped results
    const totalGroups = groupedOrgs.length;
    const totalPages = Math.ceil(totalGroups / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = groupedOrgs.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedGroups,
        pagination: {
          page,
          page_size: pageSize,
          total_count: totalGroups,
          total_pages: totalPages,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
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
      }
    );
  }
});
