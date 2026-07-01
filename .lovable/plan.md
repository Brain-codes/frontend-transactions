## Goal

Make the Partners Performance KPI row behave like the ACSL Agents Performance Report: clickable KPI cards that open searchable, exportable modals with accurate underlying values.

## Fixes to the KPI values themselves

Current bug: the "Stoves Sold to End Users" card is bound to `stats.performing_partners` (a count of partners, not stoves). It will display a wrong number.

- Bind "Total Stoves Sold" to `stats.total_sold` (already fetched by `fetchStats`).
- Keep "Stoves Purchased from ACSL" → `stats.total_received`.
- Keep "Unsold Stoves" → `stats.total_available` and rename to "Total Unsold Stoves" (system-wide, matching what the aggregate already returns).
- Keep "Total Partners" as-is (not required to be clickable per the request, but we'll still make it clickable for consistency — opens a partners list modal already effectively achieved by the current sort behavior; we'll keep the existing sort behavior for that one card only).

## Clickable KPI cards + modals

Wrap each of the three stove-related cards in a `<button>` (cursor-pointer, focus ring, keeps the existing gradient look). Clicking opens a dedicated modal.

Three new modals live inside `PartnersContent.jsx` (same file, matching the pattern used for `StoveIdsModal` / `AssignedAgentsModal` already there). Each modal follows the shape used in `SuperAdminAgentsContent.tsx` (`AssignedStovesModal` / `StovesStatusModal`): search box, paginated table, CSV export button, loading/error states, close button.

1. **Purchased Stoves Modal** — opened by "Stoves Purchased from ACSL"
   - Rows: every non-archived `stove_ids` row across all partner orgs.
   - Columns: Stove ID, Partner, State, Branch, Status, Date Received (`created_at`).
   - Search across Stove ID / Partner / State / Status.
   - CSV export of the currently filtered rows.
   - Total in the modal header MUST equal the KPI value.

2. **Sold Stoves Modal** — opened by "Total Stoves Sold"
   - Rows: every stove with `status = 'sold'` (or joined via `sales`) across all partner orgs. This inherently includes stoves sold directly by partners and stoves sold by ACSL agents attributed to a partner — matching the "all sold stoves associated with the partner" requirement.
   - Columns: Stove ID, Partner, State, Branch, **Sales Date**, **Sold By** (seller full name with role as a superscript, e.g. `Jane Doe⁽ᴬᴳᴱᴺᵀ⁾` — mirrors the role-superscript style already used in `AgentsProfilesContent.jsx`).
   - Roles rendered: `super_admin`, `acsl_agent_manager`, `acsl_agent`, `partner`, `partner_agent` — short labels (SA / AGM / AGENT / PARTNER / PAGENT).
   - Data source: join `sales` → `stove_ids` on `sale_id`, pull `sales.sales_date` and `sales.created_by`, then resolve seller name+role via `profiles` (batched `.in()` lookups, same pattern as `StovesStatusModal`).
   - Search across Stove ID / Partner / State / Seller name.
   - CSV export (includes Sales Date and Sold By columns).
   - Total in header MUST equal the KPI value.

3. **Unsold Stoves Modal** — opened by "Total Unsold Stoves"
   - Rows: every `stove_ids` row with `is_archived=false` and status != 'sold' across all partner orgs.
   - Columns: Stove ID, Partner, State, Branch, Status, Date Received.
   - Search + CSV export as above.
   - Total in header MUST equal `total_received − total_sold` and match the KPI.

## Truthfulness guarantee

To avoid the current KPI-vs-modal drift (the same class of bug we just fixed in the Agents tab), each modal fetches its rows using the exact same filter it uses to display the count in its header, and the KPI card reads from `stats` produced by the shared `fetchStats` aggregate. We'll add a small assertion-style log in dev only if header count ≠ KPI count, so future regressions are caught. No new server function needed — reuse the existing `stove_ids` / `sales` / `profiles` tables with batched `.in()` queries like the Agents modals already do.

## Files touched

- `src/app/partners/components/PartnersContent.jsx`
  - Fix `stats.performing_partners` → `stats.total_sold` on the "Stoves Sold" card and update the label to "Total Stoves Sold".
  - Rename "Unsold Stoves with Partners" → "Total Unsold Stoves".
  - Wrap the three stove KPI cards in buttons with click handlers opening the new modals.
  - Add three new local modal components (`PurchasedStovesModal`, `SoldStovesModal`, `UnsoldStovesModal`) using the search + pagination + CSV export pattern already established by `StoveIdsModal` in the same file and `AssignedStovesModal` / `StovesStatusModal` in `SuperAdminAgentsContent.tsx`.
  - Add three `useState` open-flags and render the modals at the bottom of the component.

No backend / edge-function / schema changes. UI + client-side data-fetch only.
