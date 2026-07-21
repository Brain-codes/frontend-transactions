import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";
import { paginatedSelectInChunks } from "../_shared/chunkedQuery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

function jsonError(message: string, status: number): Response {
  return withCors(new Response(JSON.stringify({ success: false, message }), { status, headers: { "Content-Type": "application/json" } }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response("ok", { status: 200 }));
  if (req.method !== "GET") return jsonError("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Missing authorization header", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonError("Invalid or expired token", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const ALLOWED_ROLES = [
    "super_admin",
    "acsl_agent",
    "acsl_agent_manager",
    "super_admin_agent",
    "partner",
    "admin",
  ];
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return jsonError("Access denied.", 403);
  }

  // Row scope per RBAC matrix: super_admin → all; ACSL roles → assigned
  // partner orgs; partner → own org. Never widened by client filters.
  const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";
  let scopeOrgIds: string[] | null = null; // null = unrestricted (super_admin)
  if (role === "acsl_agent" || role === "acsl_agent_manager" || role === "super_admin_agent") {
    const resolved = await resolveAssignedOrgIds(supabase, user.id);
    scopeOrgIds = resolved.assignedOrgIds.length ? resolved.assignedOrgIds : [NO_MATCH_ID];
  } else if (role === "partner" || role === "admin") {
    scopeOrgIds = profile.organization_id ? [profile.organization_id] : [NO_MATCH_ID];
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const source = url.searchParams.get("source");
  const date_from = url.searchParams.get("date_from");
  const date_to = url.searchParams.get("date_to");
  const sort_order = url.searchParams.get("sort_order") === "asc" ? true : false;

  // Build the query WITHOUT org scoping/range; org scoping (a potentially huge
  // ACSL org list) is applied per-chunk to keep request URLs small.
  const buildBase = () => {
    let q = supabase
      .from("stove_transfer_history")
      .select("*", { count: "exact" })
      .order("transfer_date", { ascending: sort_order });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.or(
        `partner_name.ilike.${term},partner_id.ilike.${term},transaction_id.ilike.${term},state.ilike.${term}`,
      );
    }
    if (source) q = q.eq("source", source);
    if (date_from) q = q.gte("transfer_date", date_from);
    if (date_to) q = q.lte("transfer_date", date_to);
    return q;
  };

  let data: any[];
  let count: number;
  let fetchError: any;

  if (scopeOrgIds) {
    // Sort matches the DB order (transfer_date, direction per sort_order) so the
    // merged page across chunks is identical to a single query. Ties break on id.
    const compare = (a: any, b: any) => {
      const av = a?.transfer_date, bv = b?.transfer_date;
      let c = av == null && bv == null ? 0 : av == null ? 1 : bv == null ? -1 : av < bv ? -1 : av > bv ? 1 : 0;
      if (!sort_order) c = -c; // descending
      if (c !== 0) return c;
      return a?.id < b?.id ? -1 : a?.id > b?.id ? 1 : 0;
    };
    const res = await paginatedSelectInChunks(
      scopeOrgIds,
      (c) => buildBase().in("organization_id", c),
      { offset, limit, compare },
    );
    data = res.data;
    count = res.count;
    fetchError = res.error;
  } else {
    const res = await buildBase().range(offset, offset + limit - 1);
    data = res.data ?? [];
    count = res.count ?? 0;
    fetchError = res.error;
  }

  if (fetchError) return jsonError(`Failed to fetch transfer history: ${fetchError.message}`, 500);

  return withCors(
    new Response(
      JSON.stringify({
        success: true,
        data: data ?? [],
        pagination: {
          total: count ?? 0,
          limit,
          offset,
          has_more: offset + limit < (count ?? 0),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
});
