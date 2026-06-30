## Goal

In the Agents Performance view, the "Partners Assigned" badge for ACSL Agents and ACSL Agent Managers must equal the count shown in the User Manager — i.e. only partners the admin explicitly picked for that user. State-derived partners should no longer inflate the badge. The view must also pick up changes immediately after a save in the User Manager.

## Changes

### 1. Use the direct partner count in the Agents Performance table
File: `src/app/agents/components/SuperAdminAgentsContent.tsx`

In the hydration effect (around lines 1603–1704):
- When calling `superAdminAgentService.getAgentOrganizations(a.id)`, filter the returned orgs to only those with `source === "direct"` (or missing `source`, treating that as direct). State-resolved entries are excluded from the count.
- Set both `assigned_organizations_count` and `total_partners_count` to the size of that filtered direct list for ACSL roles.
- Keep the stove "received / sold / available" aggregation using the full org set (direct + state) so sales/stove KPIs remain accurate — only the *partner count* changes.

The badge rendering at lines ~2222–2226 and the modal (`AgentPartnersModal`) will then show the direct partners only, matching the User Manager.

### 2. Same fix in the ACSL Agents Profile view
File: `src/app/agents/agents-profiles/AgentsProfilesContent.jsx`

In `hydrateAgentCounts` (around line 291), apply the same direct-only filter so the Partners Assigned column on `/agents/profiles` matches.

### 3. Refresh after edits in the User Manager
When a user is saved in `UserManagementContent.jsx`, the Agents Performance view does not currently know to refetch. Two-part fix:
- After a successful save in `UserManagementContent.jsx`, dispatch a lightweight browser event, e.g. `window.dispatchEvent(new CustomEvent("acsl:user-updated", { detail: { id } }))`.
- In `SuperAdminAgentsContent.tsx` and `AgentsProfilesContent.jsx`, add a `useEffect` that listens for `acsl:user-updated` and calls the existing `fetchAgents()` / refresh function. This guarantees that changing partner assignments in the User Manager and switching back to the Performance view shows the updated count without a hard reload.

### 4. Modal consistency
The "Partners Assigned" badge opens `AgentPartnersModal`. Confirm the modal also filters to direct assignments so the list length matches the badge (one-line change in the modal's data prep, if needed).

## Out of scope

- No change to state assignment semantics — managers still retain reporting access to all partners in their assigned states; only the badge/count definition changes.
- No edge-function changes required; the existing `getAgentOrganizations` endpoint already tags entries with `source`, so the filter is purely client-side.
- Stove/sales KPI math is unchanged.

## Verification

1. In User Manager, set an ACSL Agent Manager to 1 direct partner + 1 state. Save.
2. Open Agents Performance — badge shows `1`. Click it — modal lists that 1 partner.
3. Edit the same user, change to 3 direct partners. Save. Performance view badge updates to `3` on return without a manual refresh.
4. ACSL Agents Profile view shows the same `3`.
5. Stoves/Sold/Records counts remain unaffected.
