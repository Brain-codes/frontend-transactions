// Write operations for super-admin-agents (create and update)

export async function createAgent(supabase: any, data: any, adminId: string) {
  console.log("➕ Creating new super admin agent...");

  // Validate required fields
  if (!data.full_name?.trim()) throw new Error("validation: full_name is required");
  if (!data.email?.trim()) throw new Error("validation: email is required");
  if (!data.password?.trim() || data.password.length < 8) {
    throw new Error("validation: password must be at least 8 characters");
  }

  const email = data.email.trim().toLowerCase();
  const role = ["super_admin_agent", "super_admin"].includes(data.role)
    ? data.role
    : "super_admin_agent";

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

  // Update profile with phone if provided, and ensure organization_id stays NULL
  if (data.phone) {
    await supabase
      .from("profiles")
      .update({ phone: data.phone, organization_id: null })
      .eq("id", profile.id);
  }

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

  console.log("✅ Super admin agent created successfully:", profile.id);

  return {
    message: "Super admin agent created successfully",
    data: { ...profile, phone: data.phone || profile.phone },
  };
}

export async function updateAgent(supabase: any, agentId: string, data: any) {
  console.log("✏️ Updating agent:", agentId);

  // Verify agent exists
  const { data: existing, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", agentId)
    .in("role", ["super_admin_agent", "super_admin"])
    .single();

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

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", agentId)
    .select("id, full_name, email, phone, role, status, created_at")
    .single();

  if (updateError) throw new Error(`Database error: ${updateError.message}`);

  // If status is being disabled, also disable in auth
  if (updates.status === "disabled") {
    await supabase.auth.admin.updateUserById(agentId, { ban_duration: "87600h" });
  } else if (updates.status === "active") {
    await supabase.auth.admin.updateUserById(agentId, { ban_duration: "none" });
  }

  console.log("✅ Agent updated:", agentId);

  return {
    message: "Agent updated successfully",
    data: updated,
  };
}
