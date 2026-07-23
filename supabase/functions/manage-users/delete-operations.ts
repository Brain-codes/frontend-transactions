// Delete operations for users

import { userInScope, CallerContext, CallerScope } from "./scope.ts";
import { cleanupUserDependencies, deleteProfileAndAuthUser } from "../_shared/deleteUserCleanup.ts";

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

    await cleanupUserDependencies(supabase, {
      userId,
      replacementUserId: caller.id,
      email: existingUser.email,
    });

    await deleteProfileAndAuthUser(supabase, userId);

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
