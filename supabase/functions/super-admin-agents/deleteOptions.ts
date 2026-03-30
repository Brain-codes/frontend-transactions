// Delete operations for super-admin-agents

export async function deleteAgent(supabase: any, agentId: string, adminId: string) {
  console.log("🗑️ Deleting agent:", agentId);

  if (agentId === adminId) throw new Error("Cannot delete your own account");

  // Verify agent exists
  const { data: existing, error: checkError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", agentId)
    .eq("role", "acsl_agent")
    .single();

  if (checkError) {
    if (checkError.code === "PGRST116") throw new Error("Agent not found");
    throw new Error(`Database error: ${checkError.message}`);
  }

  // Remove all org assignments first (also handled by CASCADE, but explicit is safer)
  await supabase
    .from("acsl_agent_organizations")
    .delete()
    .eq("agent_id", agentId);

  // Delete from Auth (cascades to profiles)
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(agentId);

  if (authDeleteError) {
    throw new Error(`Failed to delete agent: ${authDeleteError.message}`);
  }

  // Verify profile is gone; clean up manually if needed
  const { data: stillExists } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", agentId)
    .maybeSingle();

  if (stillExists) {
    await supabase.from("profiles").delete().eq("id", agentId);
  }

  console.log("✅ Agent deleted:", agentId);

  return {
    message: "Agent deleted successfully",
    data: {
      id: agentId,
      deleted_agent: { id: existing.id, full_name: existing.full_name, email: existing.email },
    },
  };
}
