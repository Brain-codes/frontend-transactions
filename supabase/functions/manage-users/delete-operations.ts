// Delete operations for users

import { userInScope, CallerContext, CallerScope } from "./scope.ts";

export async function deleteUser(
  supabase: any,
  userId: string,
  caller: CallerContext,
  scope: CallerScope
) {
  console.log("🗑️ Deleting user:", userId);

  try {
    // Prevent deleting self
    if (userId === caller.id) {
      throw new Error("Cannot delete your own account");
    }

    // Check if the user exists and is a manageable role
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email, organization_id, manager_id")
      .eq("id", userId)
      .in("role", [
        "acsl_agent",
        "acsl_agent_manager",
        "super_admin_agent",
        "partner",
        "partner_agent",
        "agent",
      ])
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        throw new Error("User not found or not a manageable user");
      }
      console.error("❌ Error checking user:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    // Target must be inside the caller's scope.
    if (!userInScope(scope, existingUser, caller.id)) {
      throw new Error("User not found or not a manageable user");
    }

    console.log("🔍 User found, proceeding with deletion");

    // Clean up dependent rows that would otherwise block auth deletion.
    if (
      existingUser.role === "acsl_agent" ||
      existingUser.role === "acsl_agent_manager"
    ) {
      const { error: orgAssignError } = await supabase
        .from("acsl_agent_organizations")
        .delete()
        .eq("agent_id", userId);
      if (orgAssignError) {
        console.warn(
          "⚠️ Failed to remove acsl_agent_organizations rows:",
          orgAssignError.message
        );
      }
    }

    // If this user manages other agents, clear subordinates' manager_id first.
    if (existingUser.role === "acsl_agent_manager") {
      const { error: clearMgrError } = await supabase
        .from("profiles")
        .update({ manager_id: null })
        .eq("manager_id", userId);
      if (clearMgrError) {
        console.warn(
          "⚠️ Failed to clear subordinate manager_id:",
          clearMgrError.message
        );
      }
    }

    // Delete from Auth (this should cascade to profiles due to foreign key constraints)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      userId
    );

    if (authDeleteError) {
      console.error("❌ Error deleting user from Auth:", authDeleteError);
      const authErrMsg =
        (authDeleteError as any)?.message ||
        (authDeleteError as any)?.name ||
        JSON.stringify(
          authDeleteError,
          Object.getOwnPropertyNames(authDeleteError as any)
        );
      throw new Error(`Failed to delete user: ${authErrMsg}`);
    }

    console.log("✅ User deleted successfully from Auth");

    // Verify deletion from profiles table
    const { data: stillExists, error: verifyError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (verifyError) {
      console.warn("⚠️ Error verifying deletion:", verifyError.message);
    }

    if (stillExists) {
      // If profile still exists, delete it manually
      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteError) {
        console.error("❌ Error deleting profile:", profileDeleteError);
        throw new Error(
          `Failed to delete user profile: ${profileDeleteError.message}`
        );
      }
    }

    console.log("✅ User completely deleted:", userId);

    return {
      message: "User deleted successfully",
      data: {
        id: userId,
        deleted_user: {
          id: existingUser.id,
          full_name: existingUser.full_name,
          email: existingUser.email,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error in deleteUser:", error);
    throw error;
  }
}
