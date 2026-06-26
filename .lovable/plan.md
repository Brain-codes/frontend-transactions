## Why navigation feels like a full reload

Every authenticated page component wraps its own UI in `<ProtectedRoute><DashboardLayout>…</DashboardLayout></ProtectedRoute>`. Because the shell lives **inside** each page, routing between pages unmounts and remounts:

- `DashboardLayout`, `TopNavigation`, `Sidebar`
- `TopNavigation`'s `useEffect` that calls `manage-profile`
- `ProtectedRoute`'s auth check spinner

That's why you see `manage-profile` fired repeatedly on every nav and a perceptible flash. TanStack `<Link>` is doing SPA navigation correctly — the perceived "reload" is the shell tearing down.

## Fix: hoist the shell into the root layout (rendered once)

Mount `ProtectedRoute` + `DashboardLayout` **once** inside `src/routes/__root.tsx`, around `<Outlet />`. Then strip the per-page wrappers so only page content swaps on navigation.

### Steps

1. **`src/routes/__root.tsx`** — add an `AppShell` that reads the current pathname and:
   - For public routes (`/login`, `/unauthorized`, `/download`, `/`-when-unauth, `/sales-monitoring-app` public viewer, etc.): render `<Outlet />` directly.
   - For everything else: render `<ProtectedRoute><DashboardLayout><Outlet /></DashboardLayout></ProtectedRoute>`.
   - Use `useRouterState({ select: s => s.location.pathname })` so the shell itself never unmounts on nav; only `<Outlet />` swaps.

2. **Strip wrappers from page components** (14 files identified):
   - `src/app/dashboard/components/UnifiedDashboardContent.tsx`
   - `src/app/partners/components/PartnersContent.jsx`
   - `src/app/sales/components/UnifiedSalesContent.tsx`
   - `src/app/sales/financial-reports/page.tsx`
   - `src/app/agents/components/SuperAdminAgentsContent.tsx`
   - `src/app/agents/components/PartnerAgentsContent.tsx`
   - `src/app/stove-management/components/StoveManagementContent.jsx`
   - `src/app/settings/user-management/UserManagementContent.jsx`
   - `src/app/user-management/user-groups/UserGroupsContent.tsx`
   - `src/app/settings/tools/ToolsContent.tsx`
   - `src/app/settings/payment-models/PaymentModelsContent.tsx`
   - `src/app/settings/system-config/SystemConfigContent.jsx`
   - `src/app/settings/credentials/CredentialsContent.tsx`
   - `src/app/profile/page.tsx`

   In each: remove the outer `<ProtectedRoute>` and `<DashboardLayout>` wrappers and drop the now-unused imports. Page returns just its own content.

3. **`src/app/components/TopNavigation.jsx`** — stop refetching profile on every nav:
   - Only fetch when `authUser?.id` changes (not on every `isAuthenticated` reference change), and skip if already loaded for that id.
   - Add a module-level cache (or React Query `useQuery` with `staleTime: 5 * 60_000`) keyed by user id so the call is at most once per session.

4. **`src/app/components/ProtectedRoute.tsx`** — confirm it short-circuits when a cached user exists (already done in earlier work) so the gate at the root doesn't flash a spinner on each navigation. If it currently renders a spinner while `loading`, gate the spinner behind "no cached user".

### Out of scope
- No route-file moves (no `_authenticated/` migration). The pathname-based shell in `__root.tsx` achieves the same persistence with minimal churn.
- No backend / RLS changes.
- No visual redesign — same sidebar, topnav, content.

## Verification

- Click between Dashboard → Partners → Agents → Sales → Stove Management → User Management. The sidebar and topnav must NOT flicker; only the main content swaps.
- Network tab: `manage-profile` fires **once** per session, not on each nav.
- Console: no auth-spinner flash and no remount logs from `AuthContext` during nav.