## Problem

The **Unsold / Unretrieved Stoves** KPI on the ACSL Agents Performance report shows 145, but the modal shows 144. The two use different definitions:

- **KPI** = `globalAssigned − globalSold`
  - `globalAssigned` = every non-archived stove at the agents' directly-assigned partners (regardless of `status`)
  - `globalSold` = stoves recorded on sales **created by these agents**
- **Modal** query (in `StovesStatusModal`, `mode === "unsold"` branch):
  - Fetches `stove_ids` where `is_archived = false` **AND `status != 'sold'`**, then excludes any IDs in `soldStoveIds`.

The extra `status != 'sold'` filter in the modal is the source of the discrepancy. If a stove at one of the agents' partners has `status = 'sold'` but was **not** sold by these agents (e.g. sold historically by another user, or the sale was cancelled/reassigned but the status flag wasn't reset), the KPI treats it as unsold, but the modal hides it. That accounts for the 1‑stove gap (145 vs 144).

## Fix

Align the modal query with the KPI definition so both reflect the same "Assigned − Sold-by-these-agents" rule.

In `src/app/agents/components/SuperAdminAgentsContent.tsx`, inside `StovesStatusModal` (unsold branch, ~lines 994–1015):

1. Remove the `.neq("status", "sold")` filter from the `stove_ids` fetch so it returns every non-archived stove at the agents' orgs — matching `globalAssigned`.
2. Keep the existing exclusion step that drops any stove ID present in `soldStoveIds` (sales attributed to the reporting agents).
3. Leave the "sold" branch untouched — it's already attribution-based via sales rows.

Result: the modal list length equals `Assigned − Sold-by-agents`, matching the KPI (e.g. 145 rows when the KPI reads 145). Rows that are `status = 'sold'` but not attributable to these agents will appear in the unsold list — which is consistent with how the KPI already counts them; if that surfaces confusing rows, that's a data-hygiene signal about historical sales at those partners that we can address separately (e.g. re-running status reconciliation).

## Verification

- Reload the Agents Performance report; confirm the Unsold KPI value equals the row count shown in the Unsold modal (both should read 145).
- Confirm `Assigned − Sold = Unsold` invariant still holds across the three KPI cards.
- Spot-check the Sold modal count is unchanged.
