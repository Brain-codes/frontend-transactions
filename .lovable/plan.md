## Goal

When a super admin (or partner) creates a **Partner Agent** from User Management, the user is created successfully and linked to **exactly one Partner** — no validation errors, no orphaned users.

## Root cause of the current 400

The shared `manage-users` edge function only accepts `acsl_agent`, `acsl_agent_manager`, and `super_admin` roles, so submitting `partner_agent` fails:

> `validation: Role must be 'acsl_agent', 'acsl_agent_manager', or 'super_admin'`

Partner Agents are created through a different backend (`manage-agents`), which scopes the new user to a partner organization. The form needs to route Partner Agent submissions to that endpoint and pass the chosen `organization_id`.

## Changes (all in `src/app/settings/user-management/UserManagementContent.jsx`)

### 1. Partner selection UI for Partner Agent
- Reuse the existing single-select partner list (radio-style, no checkboxes) that already exists for `role === "partner"`.
- Extend the "single selection" branch to also cover `role === "partner_agent"`.
- Show a clear helper line: "Select the Partner this agent belongs to." Required field.
- Update the selection counter wording for `partner_agent` ("1 partner selected").

### 2. Form validation
- In `validateForm()`, when `role === "partner_agent"`, require `selectedPartnerIds.size === 1`. Block submit with an inline toast if missing.

### 3. Create flow — route Partner Agent to `manage-agents`
In `handleCreateUser`, branch on role:
- `partner_agent` → POST `${supabaseFunctionsUrl}/manage-agents` with:
  ```
  { full_name, email, phone, password | auto_generate_password, organization_id: <selected partner id> }
  ```
  Use the single id from `selectedPartnerIds`. Skip the `setAgentStates` / `setAgentOrganizations` follow-ups (the agent is owned by the org directly on the profile row).
- Every other role → existing `manage-users` flow, unchanged.

Surface generated password the same way as today.

### 4. Edit flow — keep the link to one partner
In `openEditView` for a `partner_agent`, hydrate `selectedPartnerIds` from the user's `profile.organization_id` (single value) so the form pre-fills the current partner.

In `handleUpdateUser`, when role is `partner_agent`:
- PUT to `manage-agents/{id}` (or `manage-users/{id}` if it tolerates this role — to be confirmed at implementation; fall back to `manage-agents/{id}`) with `full_name`, `phone`, and `organization_id` from the single selected partner.
- Also update `profiles.organization_id` directly as the existing fallback pattern does for `role`, so the change is visible immediately.
- Do **not** write to `super_admin_agent_organizations` for partner agents (that table is for ACSL agents).

### 5. Cleanup of stale assignment writes
Remove `partner_agent` from the `shouldHavePartners` write path in `handleUpdateUser` (line 741) so editing a Partner Agent does not insert rows into `super_admin_agent_organizations`.

### 6. Role-change safety
If a user is edited from another role to `partner_agent`, require a partner selection before submit and only call the `manage-agents` update. If edited away from `partner_agent`, clear `organization_id` via the profile fallback so they are no longer tied to that partner.

## Acceptance checks

- Creating a Partner Agent with one selected partner returns success and the user appears in User Management with the Partner Agent badge and the correct partner.
- Submitting without a partner selected is blocked with a clear message.
- Editing a Partner Agent shows their current partner pre-selected; changing it persists and is reflected on next load.
- No 400 "Role must be …" error during create or update.
- ACSL agent / ACSL manager / Partner / Super Admin creation paths are unchanged.

## Out of scope

- Server-side changes to `manage-users` or `manage-agents` edge functions.
- Allowing more than one partner per Partner Agent.
- Changes to the Agents Profile view.
