## Problem

Creating a **Partner Agent** currently fails or produces a wrong-role user. Root causes (verified in code):

1. `supabase/functions/manage-users/validate.ts` only allows roles `acsl_agent`, `acsl_agent_manager`, `super_admin_agent`, `super_admin`. Anything else returns `400 "Role must be ..."`.
2. The same validator has no concept of `organization_id`, so the partner binding never reaches the profile.
3. `validateUpdateData` doesn't accept `role` or `organization_id` either, and `updateUser` filters profiles by a hard-coded role list — so post-create "promotion" PUTs also fail for `partner_agent`/`agent`.
4. The current client workaround in `UserManagementContent.jsx` (`handleCreateUser`, lines ~824–876) creates the user as `acsl_agent` then patches `profiles` directly. When the direct patch is blocked by RLS the user is left with the wrong role and a misleading "email already in use" error on retry.

## Fix

Make the edge function the single source of truth for any role — including `partner_agent` and `agent` — and let the client call it the same way it does for every other role.

### 1. Edge function: `supabase/functions/manage-users/`

**`validate.ts` – `validateUserData`**
- Expand allowed roles to:
  `["super_admin", "acsl_agent_manager", "acsl_agent", "partner", "partner_agent", "agent"]`.
- Accept optional `organization_id` (string UUID or null); include it in the returned object.
- Keep `phone` optional (do not add a "phone required" rule).

**`validate.ts` – `validateUpdateData`**
- Accept optional `role` (same allowed list) and optional `organization_id`.
- Include both in `validatedData` when present.

**`write-operations.ts` – `createUser`**
- Pass `role` through to `app_metadata` / `user_metadata` as today.
- After the profile row exists, update it with `{ role, organization_id }` from the validated payload (the DB trigger may default the role, so we explicitly set the final role + partner binding here).
- Save credentials row with the real role and `organization_id`.

**`write-operations.ts` – `updateUser`**
- Remove the `.in("role", [...])` filter so users of any role can be updated.
- Allow `role` and `organization_id` in the update payload (already covered once `validateUpdateData` accepts them).

### 2. Client: `src/app/settings/user-management/UserManagementContent.jsx`

- Delete the "create as acsl_agent then patch profile" fallback in `handleCreateUser` (lines ~824–876).
- For every role, send one POST to `manage-users` with `{ ...basePayload, role: targetRole, organization_id: partnerId || null }`.
  - `partnerId` = the single selected partner for `partner_agent` / `agent` / `partner`, otherwise `null`.
- Same simplification in `handleUpdateUser`: one PUT with `{ full_name, phone, role, organization_id }`.
- Keep the existing UI rule that `partner_agent` / `agent` / `partner` show a single-select partner picker and require one partner before submit.
- Continue clearing ACSL state/manager assignments for organization-bound roles after a successful create (already implemented).

### 3. Verification

- Create a Partner Agent end-to-end: user appears in User Management with role **Partner Agent** and is bound to the chosen partner.
- Repeat for **Agent**, **Partner**, **ACSL Agent**, **ACSL Agent Manager**, **Super Admin** — all succeed with no fallback path.
- Edit a Partner Agent's role/partner and confirm the change persists.

No schema migration is required; only the edge function and client are changed.
