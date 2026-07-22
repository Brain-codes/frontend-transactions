## Sales Tracking Filter Bar

Add a horizontal chip/pill bar directly above the sales records table with due-date tracking filters.

### Chips (left-aligned)
- **Due in 30 days** (blue)
- **Due in 14 days** (indigo)
- **Due in 7 days** (teal)
- **Due Today** (amber)
- **Overdue** (red)
- **Cancel** button (ghost, appears when a chip is active) — clears the tracking filter

Each chip shows a count badge (matching the reference screenshot style: pill with rounded colored count badge).

### Behavior
- Only one chip active at a time. Clicking an active chip toggles it off (same as Cancel).
- Filter applies to installment sales with an outstanding balance, using `next_due_date` (already computed by `get-sales-advanced/fetch-related.ts` and available on each sale row):
  - **Due in N days**: `next_due_date` between today and today+N (inclusive), balance > 0
  - **Due Today**: `next_due_date` === today, balance > 0
  - **Overdue**: `next_due_date` < today, balance > 0
- Fully-paid sales and sales without a `next_due_date` are excluded from all tracking chips.
- Counts reflect the currently-filtered dataset (respecting search/state/year/etc.), computed before the tracking filter is applied so numbers stay stable while browsing.
- Resets page to 1 on change (existing behavior).

### Implementation

1. **`FinancialReportsView.tsx`**
   - Add `trackingFilter` state: `"none" | "due30" | "due14" | "due7" | "dueToday" | "overdue"`.
   - Compute `trackingCounts` from `filteredSales` (before applying tracking filter).
   - Split filtering: apply tracking filter as a final step producing `trackedSales`; pagination uses `trackedSales`.
   - Include `trackingFilter` in `hasActiveFilters` and `clearFilters`.
   - Render a new `<SalesTrackingBar />` between `FinancialReportsFilters` and `FinancialReportsTable`.

2. **New `SalesTrackingBar.tsx`** (in `src/app/admin/components/financial-reports/`)
   - Props: `active`, `onChange(key)`, `counts` (record per key).
   - Renders 5 pill buttons with lucide icons (`CalendarClock`, `CalendarDays`, `Clock`, `AlertCircle`, `AlertTriangle`) and count badges styled like the reference image (light bg outer pill, solid colored circular count).
   - Shows a subtle "Cancel" ghost button with an X icon when `active !== "none"`.

3. **Types**: rely on existing `next_due_date` field on `AdminSales`. If TS complains, extend `src/types/adminSales.ts` with optional `next_due_date?: string | null`.

No backend, no edge-function changes — `next_due_date` is already returned.
