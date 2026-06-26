# Fix: Monthly Sales chart not reflecting sold stoves

## Root cause

`DashboardContent.jsx` reads `data?.monthlySales` to build the chart, but the `get-super-admin-dashboard` Supabase edge function (and the two role-specific dashboard services) never return a `monthlySales` field. The fallback `?? []` collapses every month to zero — even when stoves are actually sold (e.g. the 2 reflected in the inventory tile).

## Approach

Compute `monthlySales` in the browser from the same sales data the Sales Records view already uses (`salesAdvancedAPIService.getSalesData`), then merge it into the `data` object passed to `DashboardContent`. The aggregation runs alongside the existing dashboard fetch in `UnifiedDashboardContent.tsx` and reuses its current period filter (year / dateFrom / dateTo / state / branch / organization scope) so the chart always matches the rest of the dashboard.

## Changes

1. `src/app/dashboard/components/UnifiedDashboardContent.tsx`
   - Add a second fetch (in parallel with the existing `getDashboardStats` call inside `fetchData`) that calls `salesAdvancedAPIService.getSalesData` with the active filters:
     - Global scope: pass `dateFrom`/`dateTo` if set, otherwise derive Jan 1 – Dec 31 of the selected `years` (use min/max of the array). Forward `state`, `branch`, and `organization_ids` when present.
     - ACSL agent / partner / partner_agent scope: pass `dateFrom`/`dateTo` if set, otherwise the selected `year`. Scope by `organization_id` / `agent_id` as the existing role services do.
   - Reduce the returned sale rows into 12 monthly buckets keyed by `Jan…Dec` using each sale's `sales_date` (fallback to `created_at`). Each bucket sums stove count (`quantity` if present, otherwise 1 per row).
   - Merge the result into the state: `setData({ ...statsResponse.data, monthlySales: bucketed })`. Keep the rest of the payload untouched so other tiles are unaffected.
   - If the sales fetch fails, log and leave `monthlySales` as `[]` — the dashboard stats still render.

2. `src/app/dashboard/components/DashboardContent.jsx`
   - No structural change needed; the existing chart reader already handles `{ month, value }` shape. Confirm the bucket keys match the `MONTHS` array (`Jan`, `Feb`, …) used at line 657.

## Technical notes

- Use a single `Promise.all([statsPromise, salesPromise])` so the chart loads in the same render as the rest of the dashboard — no extra spinner.
- Restrict the sales request to fields needed for aggregation (`sales_date`, `quantity`) via `select`/`includeX: false` flags where supported, to keep the payload small.
- The aggregation is pure and memoizable; keep it inside `fetchData` so it re-runs automatically whenever filters change (the `useCallback` deps already cover this).
- No backend, schema, or edge-function changes. No styling changes to the chart.

## Out of scope

- Server-side `monthlySales` in the Supabase edge function (can be migrated later without touching the UI contract).
- Changes to the Sales Records view or to other dashboard tiles.
