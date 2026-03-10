import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "./cors.ts";
import { authenticate } from "./authenticate.ts";
import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";

serve(async (req) => {
  console.log("🚀 Super Admin Agent Dashboard API started");

  if (req.method === "OPTIONS") {
    return withCors(new Response("ok", { status: 200 }));
  }

  try {
    const REQUEST_TIMEOUT = 30000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT)
    );

    const result = await Promise.race([executeMainLogic(req), timeoutPromise]);
    return result;
  } catch (error) {
    console.error("❌ Dashboard error:", error);

    let statusCode = 500;
    if (error.message?.includes("Unauthorized")) statusCode = 403;
    else if (error.message?.includes("timeout")) statusCode = 408;

    return withCors(
      new Response(
        JSON.stringify({
          success: false,
          message: error.message || "Internal server error",
          timestamp: new Date().toISOString(),
        }),
        { status: statusCode, headers: { "Content-Type": "application/json" } }
      )
    );
  }
});

async function executeMainLogic(req: Request) {
  const startTime = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const authHeader = req.headers.get("Authorization") ?? "";
  const { userId, userRole } = await authenticate(supabase, authHeader);

  console.log("📊 Fetching dashboard stats for:", userId);

  // Resolve assigned org IDs (direct + state-based)
  const resolved = await resolveAssignedOrgIds(supabase, userId);
  const assignedOrgIds = resolved.assignedOrgIds;
  const assignedPartnersCount = assignedOrgIds.length;
  const assignedStatesCount = resolved.assignedStates.length;

  console.log(
    `🔗 Resolved: ${resolved.directOrgIds.length} direct + ${assignedStatesCount} states (${resolved.stateResolvedOrgIds.length} orgs) = ${assignedPartnersCount} total`
  );

  // If no orgs assigned, return zeroed stats
  if (assignedOrgIds.length === 0) {
    return withCors(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            assignedPartnersCount: 0,
            assignedStatesCount: 0,
            totalSales: 0,
            pendingApprovals: 0,
            approvedSales: 0,
            salesCreatedByMe: 0,
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  }

  // Run all counts in parallel
  const [
    totalSalesResult,
    pendingApprovalsResult,
    approvedSalesResult,
    salesCreatedByMeResult,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .in("organization_id", assignedOrgIds),

    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .in("organization_id", assignedOrgIds)
      .eq("agent_approved", false),

    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .in("organization_id", assignedOrgIds)
      .eq("agent_approved", true),

    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
  ]);

  const stats = {
    assignedPartnersCount,
    assignedStatesCount,
    totalSales: totalSalesResult.count ?? 0,
    pendingApprovals: pendingApprovalsResult.count ?? 0,
    approvedSales: approvedSalesResult.count ?? 0,
    salesCreatedByMe: salesCreatedByMeResult.count ?? 0,
  };

  console.log("✅ Dashboard stats:", stats);
  const responseTime = Date.now() - startTime;

  return withCors(
    new Response(
      JSON.stringify({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        performance: { responseTime: `${responseTime}ms` },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    )
  );
}
