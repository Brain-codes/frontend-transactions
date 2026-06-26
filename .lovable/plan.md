
# Goal

One canonical set of pages for every role. Super admin sees every link, every record, and can perform every action. Role-aware gating lives in `src/lib/permissions.ts` (routes + features) and is applied through `usePermissions`/`RoleGate`. Old duplicate trees stay reachable via thin redirects.

# 1. Canonical route map

Keep only these top-level routes; everything else becomes a redirect.

```text
/dashboard              /sales              /sales/$id
/sales/create           /sales/financial-reports
/partners               /agents             /payment-models
/stove-management       /stove-manager      /stove-transfer-history
/agreement-images       /map
/settings               /settings/credentials
/settings/system-config /settings/user-management
/settings/tools         /settings/payment-models
/profile                /login              /unauthorized
/docs (kept as-is)
```

Redirect stubs (use `<Navigate to="..." />` like existing `admin/agents/page.tsx`):

```text
/admin                       -> /dashboard
/admin/sales, /admin/sales/* -> /sales/*
/admin/partner-agents        -> /agents
/admin/branches              -> /partners
/admin/credentials           -> /settings/credentials
/admin/system-config         -> /settings/system-config
/admin/settings              -> /settings
/admin/agreement-images      -> /agreement-images
/admin/app-config            -> /settings/system-config
/super-admin-agent, /super-admin-agent/*  -> equivalent top-level route
/super-admin-agents          -> /agents
/agent                       -> /dashboard
/user-management             -> /settings/user-management
/sales/manage                -> /sales
```

# 2. Permissions: give super_admin everything

In `src/lib/permissions.ts`:
- Add every existing `RouteKey` and `FeatureKey` to `super_admin`.
- Add new feature keys for actions the UI currently checks ad-hoc:
  `impersonate`, `override-assignments`, `approve-sales`, `reset-any-password`, `edit-any-partner`, `edit-any-agent`, `view-all-records`.
- Super admin gets the full list; other roles unchanged except `acsl_agent_manager` keeps current scoped set.

In `usePermissions`, add `isSuperAdmin` short-circuit so `can()` and `canRoute()` always return `true` for super_admin. Components stop reading `isSuperAdmin`/`isPartner` directly — they use `can("feature-key")`.

# 3. Single unified content per page

Collapse duplicated role-specific content components into one:

| Page | Today | After |
|---|---|---|
| Dashboard | `SuperAdminDashboardContent`, `AcslAgentDashboardContent`, `PartnerDashboardContent`, `PartnerAgentDashboardContent` | `DashboardContent` with `<RoleGate feature="...">` sections |
| Partners | `SuperAdminPartnersContent`, `AcslAgentPartnersContent` | `PartnersContent` |
| Agents | `SuperAdminAgentsContent`, `PartnerAgentsContent` | `AgentsContent` |
| Sales | `UnifiedSalesContent` (already unified) | keep; remove role-branching dead code |
| Stove management | `SuperAdminStoveContent`, `AcslAgentStoveContent` | `StoveManagementContent` |

Each unified component fetches the broadest dataset the caller is allowed to see (super_admin = unscoped), and renders role-scoped UI via `RoleGate`/`can(...)`.

# 4. Data scoping for super_admin = "no filter"

Audit service calls (`adminSalesService`, `superAdminDashboardService`, `organizationsService`, `adminAgentService`, stove services) so that when the caller is super_admin:
- No `partner_id`/`organization_id`/`state` filter is applied.
- All list endpoints return global results.
- Edge functions already validate role server-side; no policy change needed.

Where the UI today hardcodes a "my partners" filter, swap to `can("global-filters")` (true for super_admin) to switch between scoped and unscoped fetch.

# 5. Cleanup (delete)

- `src/app/dashboard/page-old.jsx`
- `src/app/partners/page_old_backup.jsx`
- `src/app/services/adminSalesServiceOld.js`, `adminSalesServiceOld.jsx`
- `src/app/sales-monitoring-app/` (unused)
- `src/app/uitest/` (dev playground)
- Dev-only role badge in TopNavigation (the `localhost`-gated chunk)
- Duplicated role-specific content components listed in step 3, after their unified replacement lands
- Old `/admin/*`, `/super-admin-agent/*`, `/super-admin-agents/*`, `/agent/*` route files — replaced by redirect stubs

# 6. ProtectedRoute simplification

`ProtectedRoute` keeps the auth/timeout logic but delegates authorization to `usePermissions`:

```tsx
<ProtectedRoute route="sales">...</ProtectedRoute>
```

Internally: `if (!canRoute(route)) router.push("/unauthorized")`. Super_admin always passes. The `requireAdminAccess` / `requireSuperAdmin` / `allowedRoles` props are removed (call-sites updated).

# 7. Navigation menu

`TopNavigation` builds its link list from `permissions.routes` for the current role. Super_admin therefore sees every link automatically; other roles only see what `canRoute()` allows. No manual `isSuperAdmin ? ... : ...` branching in the nav.

# 8. Out of scope (call out)

- No DB schema or RLS changes. Server-side role enforcement in edge functions stays as-is.
- "Impersonation" is added as a feature flag and a UI affordance only if a server endpoint already exists; otherwise it's a permission key with no UI wired yet (flagged in code with a TODO).
- Backward-compat role aliases in `AuthContext` (`admin`, `agent`, `super_admin_agent`) stay — you chose to keep current roles.

# Order of execution

1. Expand `permissions.ts` (super_admin gets everything) + add `isSuperAdmin` short-circuit in `usePermissions`.
2. Rewrite `ProtectedRoute` to use `canRoute`; update all route page files.
3. Rebuild `TopNavigation` from permissions.
4. Collapse duplicate content components page-by-page (Dashboard → Partners → Agents → Stove).
5. Audit services for super_admin unscoped fetches.
6. Add redirect stubs for legacy URLs.
7. Delete dead files.

# Verification

- Log in as super_admin: every nav link visible, every page loads, lists are global.
- Log in as partner / partner_agent / acsl_agent / acsl_agent_manager: nav and pages match the matrix in `permissions.ts`; unauthorized routes redirect to `/unauthorized`.
- Old URLs (e.g. `/admin/sales`) redirect to canonical equivalents.
- Build is green (`tsgo`), no references to deleted files.
