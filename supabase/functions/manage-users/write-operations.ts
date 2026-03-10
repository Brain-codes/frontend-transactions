// Write operations for users (create and update)

import {
  validateUserData,
  validateUpdateData,
  generateRandomPassword,
} from "./validate.ts";

export async function createUser(
  supabase: any,
  userData: any,
  adminId: string
) {
  console.log("➕ Creating new user...");

  try {
    // Validate input data
    const validatedData = validateUserData(userData);
    console.log("✅ User data validated");

    // Generate password if needed
    let password = validatedData.password;
    if (validatedData.auto_generate_password) {
      password = generateRandomPassword();
      console.log("🔑 Auto-generated password");
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", validatedData.email)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing user:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create user in Supabase Auth
    console.log("👤 Creating user in Supabase Auth...");
    const { data: createdUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: password,
        email_confirm: true,
        app_metadata: { role: validatedData.role },
        user_metadata: {
          full_name: validatedData.full_name,
          role: validatedData.role,
        },
      });

    if (createError) {
      console.error("❌ Failed to create user in Auth:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log("✅ User created in Auth:", createdUser.user?.id);

    // Wait for profile to be created by trigger
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, status")
      .eq("id", createdUser.user?.id)
      .single();

    if (profileError) {
      console.error("❌ Profile not created:", profileError);
      // Clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(createdUser.user?.id);
      throw new Error("Failed to create user profile");
    }

    console.log("✅ User created successfully:", profile.id);

    // Save credentials to credentials table so super admin can view them later
    const { error: credError } = await supabase.from("credentials").insert({
      user_id: profile.id,
      profile_id: profile.id,
      email: validatedData.email,
      username: validatedData.email,
      password: password,
      partner_name: validatedData.full_name,
      role: validatedData.role,
      is_dummy_email: false,
      partner_id: null,
      organization_id: null,
    });
    if (credError) {
      console.warn("⚠️ Could not save credentials record:", credError.message);
      // Non-fatal — user was created successfully
    } else {
      console.log("✅ Credentials record saved for user:", profile.id);
    }

    return {
      message: "User created successfully",
      data: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        phone: profile.phone,
        status: profile.status,
        password: validatedData.auto_generate_password ? password : undefined,
      },
    };
  } catch (error) {
    console.error("❌ Error in createUser:", error);
    throw error;
  }
}

export async function updateUser(
  supabase: any,
  userId: string,
  updateData: any,
  adminId: string
) {
  console.log("✏️ Updating user:", userId);

  try {
    // Validate update data
    const validatedData = validateUpdateData(updateData);
    console.log("✅ Update data validated");

    // Check if the user exists and is a super admin user
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("id, role, email")
      .eq("id", userId)
      .in("role", ["super_admin_agent", "super_admin"])
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        throw new Error("User not found");
      }
      console.error("❌ Error checking user:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    console.log("🔍 User found, proceeding with update");

    // Check if email is being updated and if it conflicts
    if (validatedData.email) {
      const { data: emailConflict, error: emailError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", validatedData.email)
        .neq("id", userId)
        .maybeSingle();

      if (emailError) {
        console.error("❌ Error checking email conflict:", emailError);
        throw new Error(`Database error: ${emailError.message}`);
      }

      if (emailConflict) {
        throw new Error("Email already exists for another user");
      }
    }

    // Update the profile
    const { data: updatedUser, error: updateError } = await supabase
      .from("profiles")
      .update(validatedData)
      .eq("id", userId)
      .select("id, full_name, email, phone, role, status, created_at")
      .single();

    if (updateError) {
      console.error("❌ Error updating user:", updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    // If email was updated, update it in Auth as well
    if (validatedData.email) {
      const { error: authUpdateError } =
        await supabase.auth.admin.updateUserById(userId, {
          email: validatedData.email,
        });

      if (authUpdateError) {
        console.warn(
          "⚠️ Failed to update email in Auth:",
          authUpdateError.message
        );
      }
    }

    console.log("✅ User updated successfully:", updatedUser.id);

    return {
      message: "User updated successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("❌ Error in updateUser:", error);
    throw error;
  }
}
