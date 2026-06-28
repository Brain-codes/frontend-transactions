## Goal
Make Partner Agent creation work seamlessly from the Create New User form — same path as every other user group — and associate the new user with the selected Partner. Remove the failing `manage-agents` edge function call (which rejects with "Insufficient permissions to create agents") from this flow.

## Root cause
`handleCreateUser` has a special-case branch for `partner_agent` that calls `adminAgentService.createAgent()` → `POST /functions/v1/manage-agents`. That edge function enforces its own role check and returns `500 Insufficient permissions to create agents` for the super admin. Every other role goes through `POST /functions/v1/manage-users`, which works.

## Fix (frontend-only, no edge function changes)
In `src/app/settings/user-management/UserManagementContent.jsx`:

1. **Remove the `partner_agent` special branch** in `handleCreateUser` that calls `adminAgentService.createAgent`.
2. **Use the same `manage-users` POST path** all other roles use. Send the payload with `role: "acsl_agent"` as the create-time role (known-accepted by the edge function) — this gives us a fresh auth user + profile row.
3. **Immediately patch the profile** of the new user via `supabase.from("profiles").update({ role: "partner_agent", organization_id: <selectedPartnerId> }).eq("id", newUserId)`. This converts the role and binds them to exactly one partner — matching "just create the user and associate with a partner".
4. Skip the `setAgentStates` / `setAgentOrganizations` / supervisor-marker calls for `partner_agent` (not relevant; association is the single `organization_id`).
5. Keep all existing UI validation: exactly one partner selected, single-select partner list for the `partner_agent` role.
6. Leave `handleUpdateUser`'s existing direct-profile update for `partner_agent` as-is — it already works and matches this pattern.

Drop the now-unused `adminAgentService` import if no other code in the file references it after the edit.

## Result
- Super admin (and anyone who can create other users) can create Partner Agents from the same form, same way, with no edge-function permission errors.
- New Partner Agent is created, role is set to `partner_agent`, and `organization_id` is bound to the chosen partner.
- No backend / edge function / RLS changes required.
