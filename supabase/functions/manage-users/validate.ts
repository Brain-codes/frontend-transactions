// Validation module for user data

export function validateUserData(data: any) {
  console.log("🔍 Validating user data...");

  if (!data || typeof data !== "object") {
    throw new Error("validation: Invalid data format");
  }

  const errors: string[] = [];

  // Required fields validation
  if (!data.email || typeof data.email !== "string" || !data.email.trim()) {
    errors.push("Email is required");
  } else if (!isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  // Password validation - either auto-generate or provide password
  if (data.auto_generate_password !== true) {
    if (
      !data.password ||
      typeof data.password !== "string" ||
      data.password.length < 8
    ) {
      errors.push(
        "Password is required and must be at least 8 characters (or set auto_generate_password to true)"
      );
    }
  }

  if (
    !data.full_name ||
    typeof data.full_name !== "string" ||
    !data.full_name.trim()
  ) {
    errors.push("Full name is required");
  }

  // Role validation - allow super_admin_agent and super_admin
  if (!data.role || !["super_admin_agent", "super_admin"].includes(data.role)) {
    errors.push("Role must be 'super_admin_agent' or 'super_admin'");
  }

  // Optional fields validation
  if (data.phone && typeof data.phone !== "string") {
    errors.push("Phone must be a string");
  }

  if (errors.length > 0) {
    throw new Error(`validation: ${errors.join(", ")}`);
  }

  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
    full_name: data.full_name.trim(),
    phone: data.phone?.trim() || null,
    role: data.role,
    auto_generate_password: data.auto_generate_password || false,
  };
}

export function validateUpdateData(data: any) {
  console.log("🔍 Validating update data...");

  if (!data || typeof data !== "object") {
    throw new Error("validation: Invalid data format");
  }

  const errors: string[] = [];
  const validatedData: any = {};

  // Email validation (optional for updates)
  if (data.email !== undefined) {
    if (!data.email || typeof data.email !== "string" || !data.email.trim()) {
      errors.push("Email cannot be empty");
    } else if (!isValidEmail(data.email)) {
      errors.push("Invalid email format");
    } else {
      validatedData.email = data.email.trim().toLowerCase();
    }
  }

  // Full name validation (optional for updates)
  if (data.full_name !== undefined) {
    if (
      !data.full_name ||
      typeof data.full_name !== "string" ||
      !data.full_name.trim()
    ) {
      errors.push("Full name cannot be empty");
    } else {
      validatedData.full_name = data.full_name.trim();
    }
  }

  // Phone validation (optional for updates)
  if (data.phone !== undefined) {
    if (data.phone && typeof data.phone !== "string") {
      errors.push("Phone must be a string");
    } else {
      validatedData.phone = data.phone?.trim() || null;
    }
  }

  // Status validation (active/disabled)
  if (data.status !== undefined) {
    if (!["active", "disabled"].includes(data.status)) {
      errors.push("Status must be either 'active' or 'disabled'");
    } else {
      validatedData.status = data.status;
    }
  }

  if (errors.length > 0) {
    throw new Error(`validation: ${errors.join(", ")}`);
  }

  // Ensure at least one field is being updated
  if (Object.keys(validatedData).length === 0) {
    throw new Error(
      "validation: At least one field must be provided for update"
    );
  }

  return validatedData;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate random password
export function generateRandomPassword(): string {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}
