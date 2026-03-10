// Delete operations for users

export async function deleteUser(
  supabase: any,
  userId: string,
  adminId: string
) {
  console.log("🗑️ Deleting user:", userId);

  try {
    // Prevent deleting self
    if (userId === adminId) {
      throw new Error("Cannot delete your own account");
    }

    // Check if the user exists and is super_admin_agent
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", userId)
      .eq("role", "super_admin_agent")
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        throw new Error("User not found or not a super_admin_agent");
      }
      console.error("❌ Error checking user:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    console.log("🔍 User found, proceeding with deletion");

    // Delete from Auth (this should cascade to profiles due to foreign key constraints)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      userId
    );

    if (authDeleteError) {
      console.error("❌ Error deleting user from Auth:", authDeleteError);
      throw new Error(`Failed to delete user: ${authDeleteError.message}`);
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
