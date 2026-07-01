## Problem

On **Agents Profile**, the ACSL Agent shows 3 assigned partners (ABUBAKAR ISYAKU AHMED (DCS), Adamu Muhammad Garki, Abdullahi Said). On **Partner Profiles** those same 3 partners show 0 assigned agents. Both views read from the same two assignment tables (`super_admin_agent_organizations` and `acsl_agent_organizations`), so the mismatch is a query/lookup asymmetry — not missing data.

## Likely root causes (to confirm during implementation)

1. **Column-resolution asymmetry.** `resolveAgentCol()` in `PartnerProfilesContent.jsx` picks the first candidate column that doesn't error. If both `agent_id` and `user_id` exist on a table but only one is actually populated, the wrong column can be picked and every `.eq(col, agentId)` returns 0 rows. The Agent view resolves the column against `super_admin_agent_organizations` only, so it can succeed while the Partner view silently picks the wrong column on the sibling table.
2. **Partner-side query direction.** Partner view filters assignment rows by `organization_id`; agent view filters by `agent_id`. Any soft-delete / active flag (e.g. `is_active`, `deleted_at`, `unassigned_at`) on the assignment row would be invisible from one side but not the other. Need to inspect the actual row for one of those 3 partners.
3. **Cache staleness.** `agentCounts` is populated lazily per visible page and never invalidated after an assignment is made in the ACSL Agents modal, so a freshly-assigned partner keeps its stale 0.

## Fix

### 1. Diagnose against live data (before code changes)

Run against Supabase for one of the 3 partners (e.g. Abdullahi Said) and the ACSL Agent's id:

```sql
-- Confirm the assignment rows exist and see every column
select * from public.super_admin_agent_organizations
 where organization_id = '<partner_id>';
select * from public.acsl_agent_organizations
 where organization_id = '<partner_id>';

-- Confirm which columns actually hold the agent id
select column_name, data_type
  from information_schema.columns
 where table_schema='public'
   and table_name in ('super_admin_agent_organizations','acsl_agent_organizations')
 order by table_name, ordinal_position;
```

This tells us definitively (a) which column stores the agent id per table, and (b) whether there's an `is_active`/`deleted_at` column the Partner view is ignoring.

### 2. Rewrite the Partner-side agent lookup so it mirrors the Agent view exactly

In `src/app/user-management/partner-profiles/PartnerProfilesContent.jsx`:

- Replace `resolveAgentCol()` with a **fixed, per-table column map** derived from the SQL check above (no more "first column that doesn't error" heuristic).
- In `fetchAssignedAgentIdsFromTable`, honour any active/deleted flag the schema uses (e.g. `.is('deleted_at', null)`) so partner-side counts match agent-side counts.
- After building the merged agent list, log a one-line diagnostic when both tables return 0 for an org id that the Agents Profile view says has an assigned agent — this catches future drift early.

### 3. Add a bidirectional consistency guarantee

Reuse the exact same helper the Agent Profile view uses (`fetchDirectPartnerList` in `AgentsProfilesContent.jsx`) by extracting it into a shared module `src/app/services/agentAssignmentQueries.js` with two symmetric functions:

- `getPartnerIdsForAgent(agentId)` — used by Agents Profile.
- `getAgentIdsForPartner(orgId)` — used by Partner Profiles.

Both call the same underlying assignment-table query (same columns, same filters), so the two views can never disagree again.

### 4. Invalidate the partner-side cache on assignment events

- Listen for the existing `acsl:user-updated` event in `PartnerProfilesContent.jsx` and clear `agentCounts` for the affected org ids (or all, when unknown) so newly-assigned partners refresh their badge immediately.
- Trigger `acsl:user-updated` from `AssignOrganizationsModal` after a successful save (if not already), so both views react.

### 5. Verify

- Reload Partner Profiles: the 3 partners now show a count ≥ 1.
- Open the Assigned Agents modal on each: the ACSL Agent appears.
- Open the ACSL Agent's Partners modal on Agents Profile: same 3 partners.
- Re-assign / un-assign via the modal and confirm both views update without a manual refresh.

### Files to touch

- `src/app/user-management/partner-profiles/PartnerProfilesContent.jsx` — fixed column map, active-flag filter, shared helper, cache invalidation on event.
- `src/app/agents/agents-profiles/AgentsProfilesContent.jsx` — swap local `fetchDirectPartner*` for the shared helper.
- `src/app/services/agentAssignmentQueries.js` — new shared module (single source of truth).
- `src/app/super-admin-agents/components/AssignOrganizationsModal.tsx` — emit `acsl:user-updated` on success if missing.

No schema changes, no migrations, no backend/edge-function changes.
