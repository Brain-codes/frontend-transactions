/**
 * Shared helper: resolves the full set of organization IDs an ACSL Agent has access to.
 * Merges direct org assignments + state-based assignments (dynamic resolution).
 */

export interface ResolvedAssignments {
  /** Final merged, deduplicated org IDs */
  assignedOrgIds: string[];
  /** Org IDs from direct acsl_agent_organizations assignments */
  directOrgIds: string[];
  /** State names from acsl_agent_states */
  assignedStates: string[];
  /** Org IDs resolved from assigned states */
  stateResolvedOrgIds: string[];
  /** Org IDs inherited from subordinate acsl_agents (manager_id = agentId) */
  subordinateOrgIds: string[];
}

/**
 * Resolves the full set of organization IDs an ACSL agent (or ACSL agent
 * manager) has access to: their own direct/state assignments, plus — for
 * managers — every org assigned to the acsl_agents reporting to them
 * (profiles.manager_id = agentId). Managers rarely get direct org
 * assignments themselves; their scope is effectively the union of their
 * team's assignments.
 */
export async function resolveAssignedOrgIds(
  supabase: any,
  agentId: string
): Promise<ResolvedAssignments> {
  // 1. Fetch direct org assignments
  const { data: directAssignments } = await supabase
    .from("acsl_agent_organizations")
    .select("organization_id")
    .eq("agent_id", agentId);

  const directOrgIds: string[] = (directAssignments || []).map(
    (a: any) => a.organization_id
  );

  // 2. Fetch state assignments
  const { data: stateAssignments } = await supabase
    .from("acsl_agent_states")
    .select("state")
    .eq("agent_id", agentId);

  const assignedStates: string[] = (stateAssignments || []).map(
    (s: any) => s.state
  );

  // 3. Resolve states → org IDs
  let stateResolvedOrgIds: string[] = [];
  if (assignedStates.length > 0) {
    const { data: stateOrgs } = await supabase
      .from("organizations")
      .select("id")
      .in("state", assignedStates);

    stateResolvedOrgIds = (stateOrgs || []).map((o: any) => o.id);
  }

  // 4. Fetch subordinate acsl_agents (this agent as their manager) and
  // resolve their org + state assignments too.
  let subordinateOrgIds: string[] = [];
  const { data: subordinates } = await supabase
    .from("profiles")
    .select("id")
    .eq("manager_id", agentId)
    .eq("role", "acsl_agent");

  const subordinateIds: string[] = (subordinates || []).map((s: any) => s.id);
  if (subordinateIds.length > 0) {
    const [{ data: subOrgAssignments }, { data: subStateAssignments }] = await Promise.all([
      supabase
        .from("acsl_agent_organizations")
        .select("organization_id")
        .in("agent_id", subordinateIds),
      supabase.from("acsl_agent_states").select("state").in("agent_id", subordinateIds),
    ]);

    const subDirectOrgIds: string[] = (subOrgAssignments || []).map((a: any) => a.organization_id);
    const subStates: string[] = (subStateAssignments || []).map((s: any) => s.state);

    let subStateResolvedOrgIds: string[] = [];
    if (subStates.length > 0) {
      const { data: subStateOrgs } = await supabase
        .from("organizations")
        .select("id")
        .in("state", subStates);
      subStateResolvedOrgIds = (subStateOrgs || []).map((o: any) => o.id);
    }

    subordinateOrgIds = [...new Set([...subDirectOrgIds, ...subStateResolvedOrgIds])];
  }

  // 5. Merge and deduplicate
  const assignedOrgIds = [
    ...new Set([...directOrgIds, ...stateResolvedOrgIds, ...subordinateOrgIds]),
  ];

  return {
    assignedOrgIds,
    directOrgIds,
    assignedStates,
    stateResolvedOrgIds,
    subordinateOrgIds,
  };
}
