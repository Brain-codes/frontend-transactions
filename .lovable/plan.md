## Problem

On the Agents Performance Report, the **Total Agents** KPI shows `387` while the per-role breakdown badges below it show small numbers like `Partner: 6, Partner Agent: 2`. The two never tally.

Root cause (in `src/app/agents/components/SuperAdminAgentsContent.tsx`, around lines 1944–1990):

- `totalAgents` is read from `pagination.totalItems` returned by the paged `manage-users` request → represents **all users in the system** (≈387).
- The role breakdown badges are computed from the local `agents` array, which only contains the **current page** (e.g. 10 rows). So the badges only describe whatever happened to land on page 1.
- `partner` is also included in the breakdown even though Partner records are intentionally hidden elsewhere (User Management view).

## Fix

Make the headline KPI and the breakdown describe the same population, computed across **all matching users** (respecting the active filters: search, status, dateFrom, dateTo, selectedRoles), not just the current page.

1. In `SuperAdminAgentsContent.tsx`, add a new state `roleTotals: Record<string, number>` and a `fetchRoleTotals()` helper.
2. `fetchRoleTotals()` issues one lightweight `manage-users?role=<role>&limit=1&...filters` request per visible role in parallel and reads `pagination.totalItems` from each response. Visible roles: `super_admin`, `acsl_agent_manager`, `acsl_agent`, `partner_agent`, `agent` (exclude `partner` and `admin` to match the rest of the app).
3. It applies the same filters currently sent by `fetchAgents` (`search`, `status`, `date_from`, `date_to`) so totals stay in sync with the table when the user filters; if `selectedRoles` is non-empty, only fetch counts for those roles.
4. Call `fetchRoleTotals()` from the same `useEffect` that calls `fetchAgents` (same dependency list).
5. In the KPI block:
   - Replace `totalAgents = pagination?.totalItems ?? agents.length` with `totalAgents = Object.values(roleTotals).reduce((a,b)=>a+b, 0)` (fall back to `agents.length` while loading).
   - Replace the page-derived `roleCounts` with `roleTotals` for the breakdown badges, using the same `ROLE_LABELS` mapping. Drop any `partner` entry defensively.
   - Sort badges by count desc, hide zero-count roles.

After this, the big number equals the sum of the badges, and both reflect the true counts under the current filters.

## Files touched

- `src/app/agents/components/SuperAdminAgentsContent.tsx` (KPI block + new role-totals fetch)

No backend / edge function changes.
