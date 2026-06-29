## Problem

When creating an **Agent** user, two backend validation errors fire and the user ends up saved as **ACSL Agent**:

1. `POST /manage-users` with `role: "agent"` → 400 *"Role must be 'acsl_agent', 'acsl_agent_manager', or 'super_admin'"*.
2. The fallback path then creates the user as `acsl_agent`, and the subsequent `PUT /manage-users/{id}` to promote it to `agent` fails with *"Role must be ..."* and/or *"Phone number is required"*.
3. The direct `profiles` update fallback exists but is silently failing (likely RLS), so the role stays as `acsl_agent`.

The `manage-users` edge function hard-codes the allowed roles and refuses `agent` (and also `partner_agent`, `partner`). Since the user wants Agent creation to "just work" without backend restrictions, we'll bypass the edge function for the role assignment step and update the `profiles` table directly, with an RLS policy that explicitly lets super_admins do it.

## Fix

### 1. Client flow — `src/app/settings/user-management/UserManagementContent.jsx`

For any organization-bound role the edge function rejects (`agent`, `partner_agent`):

- Create the auth user via `POST /manage-users` with `role: "acsl_agent"` (the only role the function accepts that doesn't require an org).
- Skip the `PUT /manage-users/{id}` promotion (it's the source of both 400 errors).
- Directly update `public.profiles` via the Supabase client:
  ```
  supabase.from('profiles')
    .update({ role: 'agent', organization_id: partnerId, phone, full_name })
    .eq('id', newUserId)
  ```
- Clear any ACSL-style state/organization assignment rows so the Agent isn't accidentally linked to managers.
- Remove the now-obsolete `createAgentViaManageAgents` attempt and the multi-step PUT fallback for these roles (they only produce noisy errors).
- For `handleUpdateUser`, when the target role is `agent`/`partner_agent`, do the same: send a `phone` (default to empty string instead of `null` to avoid the "Phone number is required" error when the edge function is used for other fields) and update `role` + `organization_id` directly against `profiles`.

### 2. Supabase migration — allow super_admin to maintain profile roles

Add a migration that ensures super_admins can update any profile's `role`, `organization_id`, `full_name`, and `phone`:

```sql
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
CREATE POLICY "Super admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
```

(Keeps existing policies intact; adds super-admin override so direct `profiles` updates from the client succeed.)

### 3. Validation tightening

In `validateForm`, keep the existing "select exactly one partner" check for `agent`/`partner_agent`. After fix verification: create a new Agent end-to-end, confirm:
- No 400 toast appears.
- Row in User Management shows role badge "Agent".
- Agent appears under the chosen partner in Agents Profiles.

## Out of scope

- No changes to the `manage-users` edge function itself (not editable from this codebase).
- No changes to other roles' creation flows.
