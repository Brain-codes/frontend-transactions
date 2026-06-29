## Problem

Two issues when creating Partner Agent / Agent users:

1. **Creation error** — `manage-users` edge function returns an error. Even when the user is actually created in Auth, the response is treated as failure by the client and a retry produces "email already in use".
2. **Users invisible in User Management** — newly-created Partner Agent and Agent users never show up in the list view, even on refresh.

### Root causes (verified in code)

- `supabase/functions/manage-users/read-operations.ts` `getUsers()` hard-codes the role filter:
  ```
  .in("role", ["acsl_agent", "acsl_agent_manager", "super_admin_agent", "super_admin"])
  ```
  Partner / Partner Agent / Agent rows are filtered out of every list response, so the table can never show them.
- The same file restricts the `role` query param to the same legacy set, so the role dropdown can't filter to the new roles either.
- The edge function changes from the previous plan (allow `partner` / `partner_agent` / `agent`, accept `organization_id`, set role explicitly after create) were written into the repo but **not deployed** to the user's Supabase project. Until deploy, `validate.ts` on the server still rejects `partner_agent` and `agent` with `"Role must be ..."`, which is what the client surfaces as the creation error.
- After a rejected `partner_agent` POST, the older client fallback (now removed in repo, but still the deployed behavior of any earlier session) sometimes created the auth user as `acsl_agent`, which is why retries hit "email already in use" while the orphan never appears in the (still role-filtered) list.

## Fix

### 1. `supabase/functions/manage-users/read-operations.ts`

- Replace the hard-coded role list everywhere in `getUsers()` with the full supported set:
  `["super_admin", "acsl_agent_manager", "acsl_agent", "partner", "partner_agent", "agent", "super_admin_agent"]`
  (keep `super_admin_agent` for backward-compat with any legacy rows.)
- Apply the same allowed list to the `role` query-param branch so the dropdown can filter by Partner / Partner Agent / Agent.
- Leave the assigned-state / assigned-org count logic alone (it's role-gated and doesn't need to change).

### 2. Confirm edge-function payload contract is consistent

- `validate.ts`, `write-operations.ts`, and `route-handler.ts` already accept `partner` / `partner_agent` / `agent` and `organization_id` (from the previous plan). No further code change there — just make sure the deployed function matches the repo.

### 3. Client — `src/app/settings/user-management/UserManagementContent.jsx`

- No new logic. Confirm `handleCreateUser` / `handleUpdateUser` send a single POST/PUT to `manage-users` with `{ role, organization_id }` and no fallback paths (already in place from the previous plan).
- After the list-query fix above, the new users will show up immediately on the next list refresh.

### 4. Deploy + verify

This project uses your own Supabase, not Lovable Cloud, so the updated `manage-users` function must be redeployed by you:

- Supabase Dashboard → Edge Functions → `manage-users` → Deploy (or `supabase functions deploy manage-users` via CLI).

After deploy, verify end-to-end:
- Create a Partner Agent bound to one partner → success, appears in User Management with role **Partner Agent**.
- Create an Agent bound to one partner → success, appears with role **Agent**.
- Filter the User Management table by role = Partner Agent / Agent → rows show.
- Edit either user → role and partner persist.

No schema migration is required.
