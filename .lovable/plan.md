
## Problem

Partner Agent users now create successfully, but the Agent Profiles view shows blanks for them:
- Supervisor → empty (logic only runs for `acsl_agent`)
- States Assigned → 0
- Partners Assigned → 0

For a `partner_agent` (and `agent`) the source of truth is `profiles.organization_id` → that organization is simultaneously their Partner (supervisor), their assigned state, and their single assigned partner. Today the list endpoint never returns `organization_id`, and the UI never derives these fields for non-ACSL roles.

## Changes

### 1. `supabase/functions/manage-users/read-operations.ts`
- Add `organization_id` to the `profiles` select.
- After loading the page of users, batch-fetch organizations referenced by `partner_agent` / `agent` / `partner` rows in a single `organizations` query (`id, partner_name, state, branch`).
- Attach to each such row:
  - `organization_id`
  - `organization` (`{ id, partner_name, state, branch }`)
  - `assigned_organizations_count = 1` (when org exists)
  - `assigned_states_count = 1` (when org.state present)
- Leave `acsl_agent` / `acsl_agent_manager` behavior unchanged.
- **User must redeploy the `manage-users` edge function** for these fields to appear.

### 2. `src/app/agents/agents-profiles/AgentsProfilesContent.jsx`
- In `loadAgents`, carry `organization_id` and `organization` through into row state.
- Display logic per role:
  - **Supervisor column** — for `partner_agent` and `agent`, render `organization.partner_name` (plain text, no badge). Falls back to `—` when org missing.
  - **States Assigned** — for `partner_agent` / `agent`, show `1` when `organization.state` exists, else `0`.
  - **Partners Assigned** — for `partner_agent` / `agent`, show `1` when `organization_id` exists.
- Modal openers (`handleViewStates`, `handleViewPartners`) for these roles: skip the SAA endpoints and synthesize the list locally from `agent.organization` (one state row, one partner row) so the modals work without extra calls and without the 404s currently logged.
- No changes to ACSL Agent / Manager hydration paths.

### 3. Creation flow sanity (no behavior change unless a bug surfaces)
- Confirm `UserManagementContent.jsx` Partner Agent path sets `role: 'partner_agent'` AND `organization_id` on the profile after creation (already implemented). No new code unless verification shows it's getting cleared.

## Out of scope
- Editing the inference logic for ACSL Agents.
- Any sales/performance recalculation.
- Schema migrations (uses existing `profiles.organization_id` + `organizations`).

## Verification
1. Create a new Partner Agent assigned to Partner X (state Y).
2. Open Agent Profiles → new row shows: Supervisor = "Partner X", States Assigned = 1, Partners Assigned = 1.
3. Click the badges → modals list "Y" and "Partner X" respectively, no 404s in console.
