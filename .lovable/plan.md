# Access Control Plan

## Goals

- One sidebar and one dashboard shell for every role (super admin UI is the baseline).
- Every user lands on `/dashboard` after login.
- Menu items appear for all roles, but content is filtered by scope (own records, own partner, assigned partners, or global).
- Sensitive links are hard-hidden from roles that should not see them.

## Role matrix

| Menu / View | super_admin | acsl_agent_manager | acsl_agent | partner | partner_agent |
|---|---|---|---|---|---|
| Dashboard | Global | Assigned partners + their ACSL agents | Own assigned partners | Own org only | Own sales only |
| User Management → User Manager | All users | ACSL agents + assigned partners' users | — | Own partner_agents only | — |
| User Management → User Groups | ✓ | — | — | — | — |
| Partner Management | All partners | Assigned partners | Assigned partners | — | — |
| Agent Management → ACSL Agents | All | ACSL agents under them | — | — | — |
| Agent Management → Partner Agents | All | Agents at assigned partners | Agents at assigned partners | Own agents | — |
| Performance Report (ACSL Agents tab) | ✓ | ✓ (their agents) | — | — (hidden) | — |
| Performance Report (Partners tab) | ✓ | ✓ (assigned partners) | ✓ (assigned partners) | ✓ (own only) | — |
| Manage Sales (all children) | All records | Assigned-partner records | Assigned-partner records | Own org records | Own sales only |
| Stove Users Data | All | Assigned-partner records | Assigned-partner records | Own org records | Own sales only |
| Track Stoves | All | Assigned-partner stoves | Assigned-partner stoves | Own org stoves | Own assigned stoves |
| Map | ✓ | — | — | — | — |
| Settings (all children) | ✓ | — | — | — | — |

## Create User form rules

- **super_admin**: can create any role.
- **acsl_agent_manager**: can create `acsl_agent`, `partner`, `partner_agent`.
- **partner**: can create only `partner_agent`; role field locked; partner field prefilled with their org and locked.
- All other roles: no access to User Manager.

## Default landing route

`src/app/page.jsx` currently splits landing by role. Change so every authenticated user goes to `/dashboard`. The dashboard component itself renders the same layout for all — data scoping happens inside widgets.

## Implementation

### 1. `src/lib/permissions.ts`
Rewrite role permissions so every non-super role sees the shared sidebar surface, minus the restricted items:

- **acsl_agent_manager & acsl_agent**: add `dashboard`, `user-management`, `user-management-users` (manager only), `partners`, `partners-profiles`, `agents`, `agents-profiles` (manager only), `stove-management`, `stove-manager`, `sales-*`, `end-user-records`, `sales-monitoring-app`. No `map`, `settings-*`, `user-management-groups`.
- **partner**: `dashboard`, `user-management`, `user-management-users`, `agents` (partner-agents child only), `stove-management`, `stove-manager`, `sales-*`, `end-user-records`. No `partners-profiles`, no `agents-profiles`, no `map`, no `settings-*`, no `user-management-groups`.
- **partner_agent / agent**: `dashboard`, `sales`, `sales-create`, `stove-manager`, `end-user-records` (own records), `sales-monitoring-app`. Nothing else.
- Add a new route key `performance-report`. Restrict from `partner_agent`, `agent`. Available to `partner` (Partners tab only, gated inside the component).

### 2. `src/app/components/Sidebar.jsx`
- Keep single `allNavItems`. Filtering is done through `canRoute` (already in place).
- For Agent Management: filter children so `partner` only sees Partner Agents Profile.
- No change to visual structure.

### 3. Performance Report view (`src/app/agents/...`)
- Hide the "ACSL Agents" tab when `!canRoute('agents-profiles')` (i.e., partners see only the Partners tab).
- Scope data queries by role: super/manager unfiltered; acsl_agent → assigned org ids; partner → own org id.

### 4. User Management (`UserManagementContent.jsx`)
- Role dropdown options filtered by caller:
  - super_admin: all roles.
  - acsl_agent_manager: `acsl_agent`, `partner`, `partner_agent`.
  - partner: `partner_agent` only (locked select).
- Partner select:
  - partner role: prefilled with `user.organization_id`, disabled.
  - manager: limited to assigned partners.
- List view scoping mirrors the same rules.

### 5. Data-scoping helper
Add `src/lib/scope.ts` exposing:
- `getAccessibleOrgIds(user, role)` — returns `null` (all), array of org ids, or `[user.organization_id]`.
- Used by dashboard widgets, sales queries, stove queries, partner/agent lists, so scoping is centralized instead of duplicated per view.

### 6. Landing redirect
`src/app/page.jsx`: on authenticated, always `router.push('/dashboard')`.

### 7. Route guards
Route pages that previously used `requireSuperAdmin` for Map, Settings/*, User Groups: keep those guards. Add `requireSuperAdmin` (or equivalent `RoleGate`) to `/map`, `/settings/*`, `/user-management/user-groups`.

## Out of scope for this change

- Backend RLS review (assumed already scoped by org). If a scoped query returns cross-org data, that becomes a follow-up RLS ticket.
- Visual redesign — UI stays as-is.

## Confirm before I build

1. **ACSL Agent Manager creating partners** — allowed? (Table says yes; want to confirm they can create partner org owners, not just agents.)
2. **Partner viewing Performance Report** — Partners tab should show only their own org row, correct? (Effectively a self-KPI view.)
3. **Partner_agent Stove Users Data** — should they see only records tied to sales they made, or nothing at all?
