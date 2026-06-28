## Problem
After creating "Partner Agent 1", the user list shows role **ACSL Agent** instead of **Partner Agent**. Cause: the current code creates the auth user via `manage-users` with `role: "acsl_agent"` and then tries to PATCH `profiles` to `role: "partner_agent"`, but the patch is silently a no-op — either because the `manage-users` POST response shape doesn't expose the new user id at `result.user?.id` / `result.data?.id` (so `newUserId` is undefined and the update is skipped), or because client-side RLS blocks updating another user's `profiles` row.

## Fix
Edit `src/app/settings/user-management/UserManagementContent.jsx`, partner-agent branch of `handleCreateUser`:

1. **Robustly extract the new user id** from the `manage-users` response, checking every plausible location (`result.user?.id`, `result.data?.id`, `result.data?.user?.id`, `result.id`). If still missing, fall back to looking it up by email via `supabase.from("profiles").select("id").eq("email", ...).single()`.
2. **Throw a clear error** if the id still cannot be determined, instead of silently skipping the role/partner binding.
3. **Verify the profile patch actually applied** by reading the row back after the update (`.select("role, organization_id").single()`); if `role !== "partner_agent"` after the update, surface a toast error explaining the role couldn't be converted (likely an RLS issue on `profiles`) so the user knows to address it instead of seeing a misleading success.
4. After a successful create + bind, refresh the user list so the row shows the correct role immediately.

No backend / edge function / RLS changes in this step — first make the failure visible and the success reliable. If step 3 reveals RLS is blocking the patch, the follow-up will be a tiny SQL migration adding a `super_admin can update profiles.role/organization_id` policy.
