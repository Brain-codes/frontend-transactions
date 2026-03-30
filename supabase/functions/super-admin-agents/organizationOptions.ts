// Organization assignment operations for super-admin-agents

/**
 * Replace all org assignments for an agent.
 * Deletes existing assignments and inserts the new set.
 * Body: { organization_ids: string[] }
 */
export async function setAgentOrganizations(
  supabase: any,
  agentId: string,
  orgIds: string[],
  assignedBy: string
) {
  console.log(`🔗 Setting org assignments for agent ${agentId}:`, orgIds);

  // Verify agent exists
  const { data: agent, error: agentError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", agentId)
    .eq("role", "acsl_agent")
    .single();

  if (agentError) {
    if (agentError.code === "PGRST116") throw new Error("Agent not found");
    throw new Error(`Database error: ${agentError.message}`);
  }

  // Validate all org IDs exist
  if (orgIds.length > 0) {
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id")
      .in("id", orgIds);

    if (orgsError) throw new Error(`Database error: ${orgsError.message}`);

    if ((orgs || []).length !== orgIds.length) {
      throw new Error("validation: One or more organization IDs are invalid");
    }
  }

  // Delete all existing assignments for this agent
  const { error: deleteError } = await supabase
    .from("acsl_agent_organizations")
    .delete()
    .eq("agent_id", agentId);

  if (deleteError) throw new Error(`Failed to clear assignments: ${deleteError.message}`);

  // Insert new assignments
  if (orgIds.length > 0) {
    const inserts = orgIds.map((orgId) => ({
      agent_id: agentId,
      organization_id: orgId,
      assigned_by: assignedBy,
    }));

    const { error: insertError } = await supabase
      .from("acsl_agent_organizations")
      .insert(inserts);

    if (insertError) throw new Error(`Failed to assign organizations: ${insertError.message}`);
  }

  console.log(`✅ Assigned ${orgIds.length} organizations to agent ${agentId}`);

  // Return the updated list
  const { data: rows } = await supabase
    .from("acsl_agent_organizations")
    .select(`
      id, assigned_at,
      organizations ( id, partner_name, branch, state )
    `)
    .eq("agent_id", agentId);

  const organizations = (rows || []).map((row: any) => ({
    assignment_id: row.id,
    assigned_at: row.assigned_at,
    ...row.organizations,
  }));

  return {
    message: `Successfully assigned ${orgIds.length} organization(s)`,
    data: organizations,
  };
}

/**
 * Remove a single org assignment for an agent.
 */
export async function removeAgentOrganization(
  supabase: any,
  agentId: string,
  orgId: string
) {
  console.log(`🔗 Removing org ${orgId} from agent ${agentId}`);

  const { error } = await supabase
    .from("acsl_agent_organizations")
    .delete()
    .eq("agent_id", agentId)
    .eq("organization_id", orgId);

  if (error) throw new Error(`Failed to remove organization: ${error.message}`);

  console.log("✅ Organization removed from agent");

  return {
    message: "Organization removed from agent successfully",
    data: { agent_id: agentId, organization_id: orgId },
  };
}
