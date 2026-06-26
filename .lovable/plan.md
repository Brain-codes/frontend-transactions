## Goal
Make Sales Overview filters actually drive every KPI on the donut and prevent picking future months.

## What's wrong today

1. **State / Branch / Partner / Month / Year filters don't change "Stoves Sold to Partners" or "Unsold Stoves with Partners"** — those two values come from the `get-super-admin-dashboard` Supabase Edge Function. The frontend already sends `state`, `branch`, `organization_ids`, `date_from`, `date_to`, and `years` in the payload, but:
   - The `months` filter from the UI is **never sent** to the edge function or to the sales fetch. Selecting a month is a no-op for the KPIs.
   - The edge function's stove-transfer aggregation (received/unsold) may not be honoring `state` / `branch` (only the sales side does). This needs to be confirmed/fixed in the edge function itself — that code is not in the project repo, it lives in your Supabase project.
2. **Future months are selectable** in the Months dropdown even when the selected year is the current year.

## Plan

### Frontend fixes (`UnifiedDashboardContent.tsx` + `DashboardContent.jsx`)

- When a single month is selected (and no custom date range is active), translate it into a `date_from` / `date_to` window for the selected year and send those to BOTH the stats edge function payload and `buildSalesFilters()`. This guarantees the donut, financial snapshot, and monthly chart all respond to the Month filter regardless of edge-function support.
- Also forward `months` and `year` as explicit fields in the stats payload so the edge function can use them if/when it does.
- In the Months dropdown, disable month options that are in the future relative to today when the selected year equals the current year (and disable all months if a future year is somehow selected). If the user changes year and the previously selected month becomes invalid, clear it.

### Backend follow-up (your Supabase Edge Function — not in this repo)

- The KPIs "Stoves Sold to Partners" and "Unsold Stoves with Partners" are computed from the stove-transfer / inventory tables inside `get-super-admin-dashboard`. For the State / Branch / Partner filters to change those two numbers, that function must filter the transfer query by `organization_ids` (and by `state` / `branch` via the organizations join). If you confirm it currently ignores those filters, the fix has to land in the edge function — I can't edit it from here because the source isn't in the project.

I'll flag this clearly after the frontend change so you know which piece (if any) still needs an edge-function update on your side.

## Files touched

- `src/app/dashboard/components/UnifiedDashboardContent.tsx` — include month-as-date-range in stats payload and sales filters; forward `months` / `year`.
- `src/app/dashboard/components/DashboardContent.jsx` — disable future months in the Months dropdown; reset selection if it becomes invalid after a year change.
