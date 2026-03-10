// Authentication module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";

export interface AuthResult {
  userRole: string;
  userId: string;
  userOrgId: string | null;
  assignedOrgIds?: string[]; // populated for super_admin_agent
}

export async function authenticateUser(supabase: any): Promise<AuthResult> {
  console.log("🔐 Getting user from token...");

  // Get authenticated user
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    console.log("❌ Authentication failed:", authError?.message);
    console.log("❌ Full auth error:", JSON.stringify(authError, null, 2));
    console.log("❌ User data:", JSON.stringify(userData, null, 2));
    throw new Error("Unauthorized");
  }

  console.log("✅ User authenticated:", userData.user.email);

  let userRole: string;
  let userOrgId: string | null = null;

  // Check if user email is super admin first (simpler approach)
  if (userData.user.email === "superadmin@mail.com") {
    console.log("✅ Super admin identified by email");
    userRole = "super_admin";
    userOrgId = null;
  } else {
    // For non-super admin, try to get profile without RLS dependency
    console.log("� Fetching user profile from profiles table...");

    // Use the same supabase client (already configured with service role)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      console.log("❌ Profile fetch failed:", profileError?.message);
      throw new Error("Profile not found and not super admin email");
    }

    console.log("✅ Profile fetched successfully");
    userRole = profile.role;
    userOrgId = profile.organization_id;
  }

  console.log("✅ User role determined:", { userRole, userOrgId });

  // Allow super_admin, admin, agent, and super_admin_agent roles
  if (!["super_admin", "admin", "agent", "super_admin_agent"].includes(userRole)) {
    console.log("❌ Access denied - Role:", userRole);
    throw new Error(
      "Access denied. Admin, Agent, or Super Admin role required."
    );
  }

  console.log("✅ Access confirmed for role:", userRole);

  // For super_admin_agent, resolve assigned org IDs (direct + state-based)
  let assignedOrgIds: string[] | undefined;
  if (userRole === "super_admin_agent") {
    console.log("🔗 Resolving assigned organizations for super_admin_agent...");
    const resolved = await resolveAssignedOrgIds(supabase, userData.user.id);
    assignedOrgIds = resolved.assignedOrgIds;
    console.log(
      `✅ Super admin agent: ${resolved.directOrgIds.length} direct orgs + ${resolved.assignedStates.length} states (${resolved.stateResolvedOrgIds.length} state orgs) = ${assignedOrgIds.length} total`
    );
  }

  return {
    userRole,
    userId: userData.user.id,
    userOrgId,
    assignedOrgIds,
  };
}
