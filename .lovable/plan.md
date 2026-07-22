## Problem

Deleting the ACSL agent "ACSL Agent From Manager" from User Management returns:

```
Edge function returned 500: "Failed to delete user: {}"
```

The empty `{}` is the stringified error from `supabase.auth.admin.deleteUser(userId)` inside `supabase/functions/manage-users/delete-operations.ts`. That path deletes the auth user directly and relies on cascade — but this agent has related rows the current code never cleans up:

- `acsl_agent_organizations` rows (`agent_id = <userId>`) — the agent is assigned to 1 organization.
- Possibly `profiles.manager_id` pointing at this user (unlikely here, but the sibling `super-admin-agents` delete flow already handles the org rows explicitly for exactly this reason).

The sibling function `supabase/functions/super-admin-agents/deleteOptions.ts` already does the right thing (removes `acsl_agent_organizations` first, then deletes the auth user). `manage-users/delete-operations.ts` is missing that step, and its error is also serialized poorly (`${error.message}` on an object → `{}`).

## Fix

Update **only** `supabase/functions/manage-users/delete-operations.ts`:

1. Before calling `auth.admin.deleteUser`, when the target role is `acsl_agent` or `acsl_agent_manager`, delete their `acsl_agent_organizations` rows (matches the working super-admin-agents flow).
2. For `acsl_agent_manager` targets, also null out `profiles.manager_id` on any subordinate agents so the FK doesn't block deletion.
3. Improve error reporting: when `authDeleteError` is present, include `authDeleteError.message || authDeleteError.name || JSON.stringify(authDeleteError, Object.getOwnPropertyNames(authDeleteError))` so future failures surface a readable reason instead of `{}`.

No schema changes, no UI changes, no changes to other roles' delete paths.

## Verification

- Retry deleting "ACSL Agent From Manager" from `/user-management/users` — expect success and the row to disappear from the ACSL agents list.
- Confirm the agent's row in `acsl_agent_organizations` is gone.
- Delete a different role (e.g. partner_agent) to confirm behavior is unchanged.