type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  name?: string;
};

type CleanupOptions = {
  userId: string;
  replacementUserId: string;
  email?: string | null;
};

const IGNORABLE_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

function errorText(error: SupabaseError): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" | ") || error.name || JSON.stringify(error);
}

function isSchemaDrift(error: SupabaseError): boolean {
  const message = errorText(error).toLowerCase();
  return (
    IGNORABLE_SCHEMA_CODES.has(error.code || "") ||
    message.includes("could not find the table") ||
    message.includes("could not find the column") ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("cannot delete from view") ||
    message.includes("cannot update view") ||
    message.includes("is not updatable")
  );
}

function buildCleanupError(action: string, table: string, column: string, error: SupabaseError): Error {
  return new Error(`${action} failed on ${table}.${column}: ${errorText(error)}`);
}

async function deleteRowsByColumn(supabase: any, table: string, column: string, value: string) {
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error && !isSchemaDrift(error)) throw buildCleanupError("Dependency cleanup", table, column, error);
}

async function nullifyColumn(supabase: any, table: string, column: string, userId: string) {
  const { error } = await supabase.from(table).update({ [column]: null }).eq(column, userId);
  if (error && !isSchemaDrift(error)) throw buildCleanupError("Reference cleanup", table, column, error);
}

async function reassignColumn(
  supabase: any,
  table: string,
  column: string,
  userId: string,
  replacementUserId: string,
) {
  const { error } = await supabase.from(table).update({ [column]: replacementUserId }).eq(column, userId);
  if (error && !isSchemaDrift(error)) throw buildCleanupError("Reference reassignment", table, column, error);
}

async function deleteProfileRow(supabase: any, userId: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error && !isSchemaDrift(error)) {
    throw new Error(`Profile deletion is blocked by a related record: ${errorText(error)}`);
  }
}

function authUserMissing(error: SupabaseError): boolean {
  const message = errorText(error).toLowerCase();
  return message.includes("user not found") || message.includes("not found");
}

export async function cleanupUserDependencies(supabase: any, options: CleanupOptions) {
  const { userId, replacementUserId, email } = options;

  if (!replacementUserId || replacementUserId === userId) {
    throw new Error("A different active user is required to preserve historical records before deletion");
  }

  // Remove login credentials first; these commonly reference both auth.users and profiles.
  await Promise.all([
    deleteRowsByColumn(supabase, "credentials", "user_id", userId),
    deleteRowsByColumn(supabase, "credentials", "profile_id", userId),
    email ? deleteRowsByColumn(supabase, "credentials", "email", email) : Promise.resolve(),
    email ? deleteRowsByColumn(supabase, "credentials", "username", email) : Promise.resolve(),
  ]);

  // Delete the target user's direct ACSL assignments, including legacy table/column names.
  const assignmentTables = [
    "acsl_agent_organizations",
    "acsl_agent_states",
    "super_admin_agent_organizations",
    "super_admin_agent_states",
  ];
  const assignmentIdColumns = ["agent_id", "super_admin_agent_id", "user_id"];
  await Promise.all(
    assignmentTables.flatMap((table) =>
      assignmentIdColumns.map((column) => deleteRowsByColumn(supabase, table, column, userId)),
    ),
  );

  // Nullable references can be cleared without changing historical ownership.
  await Promise.all([
    nullifyColumn(supabase, "profiles", "manager_id", userId),
    nullifyColumn(supabase, "profiles", "updated_by", userId),
    nullifyColumn(supabase, "sales", "agent_approved_by", userId),
    nullifyColumn(supabase, "sales", "sold_on_behalf_of", userId),
    nullifyColumn(supabase, "sales", "updated_by", userId),
    nullifyColumn(supabase, "sales", "cancelled_by", userId),
    nullifyColumn(supabase, "organizations", "updated_by", userId),
  ]);

  // Non-null audit references must be reassigned so business records remain intact.
  await Promise.all([
    reassignColumn(supabase, "sales", "created_by", userId, replacementUserId),
    reassignColumn(supabase, "sales_history", "performed_by", userId, replacementUserId),
    reassignColumn(supabase, "installment_payments", "recorded_by", userId, replacementUserId),
    reassignColumn(supabase, "payment_models", "created_by", userId, replacementUserId),
    reassignColumn(supabase, "organization_payment_models", "assigned_by", userId, replacementUserId),
    reassignColumn(supabase, "acsl_agent_organizations", "assigned_by", userId, replacementUserId),
    reassignColumn(supabase, "acsl_agent_states", "assigned_by", userId, replacementUserId),
    reassignColumn(supabase, "super_admin_agent_organizations", "assigned_by", userId, replacementUserId),
    reassignColumn(supabase, "super_admin_agent_states", "assigned_by", userId, replacementUserId),
    reassignColumn(supabase, "uploads", "created_by", userId, replacementUserId),
    reassignColumn(supabase, "organizations", "created_by", userId, replacementUserId),
    reassignColumn(supabase, "app_settings", "updated_by", userId, replacementUserId),
    reassignColumn(supabase, "email_config", "updated_by", userId, replacementUserId),
  ]);
}

export async function deleteProfileAndAuthUser(supabase: any, userId: string) {
  // Delete profile first so any remaining FK blocker returns the real table/field.
  await deleteProfileRow(supabase, userId);

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError && !authUserMissing(authDeleteError)) {
    throw new Error(`Auth account deletion failed after profile cleanup: ${errorText(authDeleteError)}`);
  }

  const { data: stillExists, error: verifyError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (verifyError && !isSchemaDrift(verifyError)) {
    throw new Error(`Could not verify profile deletion: ${errorText(verifyError)}`);
  }

  if (stillExists) await deleteProfileRow(supabase, userId);
}