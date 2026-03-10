// Read operations for super-admin-agents

export async function listAgents(supabase: any, searchParams: URLSearchParams) {
  console.log("📋 Fetching super admin agents list...");

  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
  const offset = (page - 1) * limit;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const roleParam = searchParams.get("role") || "";

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at", { count: "exact" });

  if (roleParam && ["super_admin_agent", "super_admin"].includes(roleParam)) {
    query = query.eq("role", roleParam);
  } else {
    query = query.in("role", ["super_admin_agent", "super_admin"]);
  }

  if (status && ["active", "disabled"].includes(status)) {
    query = query.eq("status", status);
  }

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const ascending = sortOrder.toLowerCase() === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data: agents, error, count } = await query;
  if (error) throw new Error(`Database error: ${error.message}`);

  // For each agent, fetch their assigned org count + state count
  const agentsWithCounts = await Promise.all(
    (agents || []).map(async (agent: any) => {
      const [{ count: orgCount }, { count: stateCount }] = await Promise.all([
        supabase
          .from("super_admin_agent_organizations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agent.id),
        supabase
          .from("super_admin_agent_states")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agent.id),
      ]);
      return {
        ...agent,
        assigned_organizations_count: orgCount || 0,
        assigned_states_count: stateCount || 0,
      };
    })
  );

  const totalPages = Math.ceil((count || 0) / limit);

  console.log(`✅ Found ${agents?.length || 0} agents`);

  return {
    message: `Found ${count || 0} agents`,
    data: agentsWithCounts,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: count || 0,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getAgent(supabase: any, agentId: string) {
  console.log("🔍 Fetching single agent:", agentId);

  const { data: agent, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at")
    .eq("id", agentId)
    .in("role", ["super_admin_agent", "super_admin"])
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Agent not found");
    throw new Error(`Database error: ${error.message}`);
  }

  // Also fetch assigned organizations
  const { data: orgs } = await supabase
    .from("super_admin_agent_organizations")
    .select(`
      id,
      assigned_at,
      organization_id,
      organizations (
        id,
        partner_name,
        branch,
        state
      )
    `)
    .eq("agent_id", agentId);

  const assignedOrganizations = (orgs || []).map((row: any) => ({
    assignment_id: row.id,
    assigned_at: row.assigned_at,
    ...row.organizations,
  }));

  // Fetch assigned states
  const { data: stateRows } = await supabase
    .from("super_admin_agent_states")
    .select("id, state, assigned_at")
    .eq("agent_id", agentId)
    .order("state", { ascending: true });

  const assignedStates = (stateRows || []).map((r: any) => r.state);

  console.log("✅ Agent found:", agent.id);

  return {
    message: "Agent retrieved successfully",
    data: {
      ...agent,
      assigned_organizations: assignedOrganizations,
      assigned_states: assignedStates,
    },
  };
}

export async function getAgentOrganizations(supabase: any, agentId: string) {
  console.log("🔍 Fetching organizations for agent:", agentId);

  // Verify the agent exists
  const { data: agent, error: agentError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", agentId)
    .in("role", ["super_admin_agent", "super_admin"])
    .single();

  if (agentError) {
    if (agentError.code === "PGRST116") throw new Error("Agent not found");
    throw new Error(`Database error: ${agentError.message}`);
  }

  const { data: rows, error } = await supabase
    .from("super_admin_agent_organizations")
    .select(`
      id,
      assigned_at,
      assigned_by,
      organization_id,
      organizations (
        id,
        partner_name,
        branch,
        state,
        contact_person,
        contact_phone,
        email
      )
    `)
    .eq("agent_id", agentId)
    .order("assigned_at", { ascending: false });

  if (error) throw new Error(`Database error: ${error.message}`);

  // Direct org assignments — annotated with source: "direct"
  const directOrgs = (rows || []).map((row: any) => ({
    assignment_id: row.id,
    assigned_at: row.assigned_at,
    assigned_by: row.assigned_by,
    source: "direct" as const,
    ...row.organizations,
  }));

  const directOrgIds = new Set(directOrgs.map((o: any) => o.id));

  // Fetch assigned states
  const { data: stateRows } = await supabase
    .from("super_admin_agent_states")
    .select("id, state, assigned_at, assigned_by")
    .eq("agent_id", agentId)
    .order("state", { ascending: true });

  const assignedStates: string[] = (stateRows || []).map((r: any) => r.state);

  // Build a lookup: state → assignment metadata
  const stateAssignmentMap: Record<string, any> = {};
  (stateRows || []).forEach((r: any) => {
    stateAssignmentMap[r.state] = { id: r.id, assigned_at: r.assigned_at, assigned_by: r.assigned_by };
  });

  // Resolve states → organizations (excluding already-direct orgs)
  let stateOrgs: any[] = [];
  if (assignedStates.length > 0) {
    const { data: stateOrgRows } = await supabase
      .from("organizations")
      .select("id, partner_name, branch, state, contact_person, contact_phone, email")
      .in("state", assignedStates);

    stateOrgs = (stateOrgRows || [])
      .filter((o: any) => !directOrgIds.has(o.id))
      .map((o: any) => {
        const stateAssignment = stateAssignmentMap[o.state] || {};
        return {
          assignment_id: stateAssignment.id || null,
          assigned_at: stateAssignment.assigned_at || null,
          assigned_by: stateAssignment.assigned_by || null,
          source: "state" as const,
          source_state: o.state,
          ...o,
        };
      });
  }

  const allOrganizations = [...directOrgs, ...stateOrgs];

  console.log(
    `✅ Found ${directOrgs.length} direct + ${stateOrgs.length} state-resolved organizations`
  );

  return {
    message: `Found ${allOrganizations.length} assigned organizations`,
    data: allOrganizations,
    assigned_states: assignedStates,
    summary: {
      direct_count: directOrgs.length,
      state_count: assignedStates.length,
      state_resolved_org_count: stateOrgs.length,
      total_unique_orgs: allOrganizations.length,
    },
  };
}
