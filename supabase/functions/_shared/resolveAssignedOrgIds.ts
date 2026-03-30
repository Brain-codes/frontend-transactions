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
}

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

  // 4. Merge and deduplicate
  const assignedOrgIds = [
    ...new Set([...directOrgIds, ...stateResolvedOrgIds]),
  ];

  return {
    assignedOrgIds,
    directOrgIds,
    assignedStates,
    stateResolvedOrgIds,
  };
}
