// Write operations for super-admin-agents (ACSL Agent create and update)

export async function createAgent(supabase: any, data: any, adminId: string, managerId: string | null = null) {
  console.log("➕ Creating new ACSL agent...");

  // Validate required fields
  if (!data.full_name?.trim()) throw new Error("validation: full_name is required");
  if (!data.email?.trim()) throw new Error("validation: email is required");
  if (!data.password?.trim() || data.password.length < 8) {
    throw new Error("validation: password must be at least 8 characters");
  }

  const email = data.email.trim().toLowerCase();
  // Accept both old and new role values; default to acsl_agent
  const mappedRole = data.role === "super_admin_agent" ? "acsl_agent" : data.role;
  // acsl_agent_manager can only create acsl_agent accounts (not super_admin)
  const allowedRoles = managerId ? ["acsl_agent"] : ["acsl_agent", "super_admin", "acsl_agent_manager"];
  const role = allowedRoles.includes(mappedRole) ? mappedRole : "acsl_agent";

  // Check if email already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) throw new Error("User with this email already exists");

  // Create user in Supabase Auth
  console.log("👤 Creating user in Supabase Auth...");
  const { data: createdUser, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        full_name: data.full_name.trim(),
        role,
      },
    });

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  console.log("✅ User created in Auth:", createdUser.user?.id);

  // Wait for profile trigger
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Fetch the auto-created profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at")
    .eq("id", createdUser.user?.id)
    .single();

  if (profileError) {
    // Clean up auth user if profile was not created
    await supabase.auth.admin.deleteUser(createdUser.user?.id);
    throw new Error("Failed to create user profile");
  }

  // Update profile with phone, stamp manager_id (if created by a manager), and ensure organization_id stays NULL
  await supabase
    .from("profiles")
    .update({
      ...(data.phone ? { phone: data.phone } : {}),
      ...(managerId ? { manager_id: managerId } : {}),
      organization_id: null,
      updated_by: adminId,
    })
    .eq("id", profile.id);

  // Save credentials so they appear in the credentials management page
  await supabase.from("credentials").insert({
    user_id: profile.id,
    profile_id: profile.id,
    email,
    username: email,
    password: data.password,
    partner_name: data.full_name.trim(),
    role,
    is_dummy_email: false,
    partner_id: null,
    organization_id: null,
  });

  console.log("✅ ACSL agent created successfully:", profile.id);

  return {
    message: "ACSL agent created successfully",
    data: { ...profile, phone: data.phone || profile.phone },
  };
}

export async function updateAgent(supabase: any, agentId: string, data: any, adminId: string, managerScopeId: string | null = null) {
  console.log("✏️ Updating agent:", agentId);

  // Verify agent exists; managers may only update their own agents
  let checkQuery = supabase
    .from("profiles")
    .select("id")
    .eq("id", agentId)
    .in("role", ["acsl_agent", "acsl_agent_manager", "super_admin"]);

  if (managerScopeId) checkQuery = checkQuery.eq("manager_id", managerScopeId);

  const { data: existing, error: checkError } = await checkQuery.single();

  if (checkError) {
    if (checkError.code === "PGRST116") throw new Error("Agent not found");
    throw new Error(`Database error: ${checkError.message}`);
  }

  // Build update payload (only allowed fields)
  const updates: Record<string, any> = {};
  if (data.full_name?.trim()) updates.full_name = data.full_name.trim();
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.status && ["active", "disabled"].includes(data.status)) {
    updates.status = data.status;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("validation: No valid fields to update");
  }

  // Stamp who made the change and when (only on intentional admin edits)
  updates.updated_at = new Date().toISOString();
  updates.updated_by = adminId;

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", agentId)
    .select("id, full_name, email, phone, role, status, created_at, last_login, updated_at, updated_by")
    .single();

  if (updateError) throw new Error(`Database error: ${updateError.message}`);

  // If status is being disabled, also disable in auth
  if (updates.status === "disabled") {
    await supabase.auth.admin.updateUserById(agentId, { ban_duration: "87600h" });
  } else if (updates.status === "active") {
    await supabase.auth.admin.updateUserById(agentId, { ban_duration: "none" });
  }

  // Resolve the admin's name for the response
  const { data: updater } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", adminId)
    .single();

  console.log("✅ Agent updated:", agentId);

  return {
    message: "Agent updated successfully",
    data: { ...updated, updated_by_name: updater?.full_name || updater?.email || null },
  };
}
