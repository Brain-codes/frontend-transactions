## Problem

On the **ACSL Agents Performance Report**, the row shows Saliu Kano = **1** stove sold, but clicking the **Stoves Sold / Retrieved** KPI opens a modal listing **2** stove IDs.

Root cause (in `src/app/agents/components/SuperAdminAgentsContent.tsx`):

- The per-agent "Sold" number counts `sales` rows where `created_by = agent.id` (correct — agent-attributed).
- The KPI modal (`StovesStatusModal` with `mode="sold"`) queries `stove_ids` filtered only by `organization_id IN kpiAssignedOrgIds` + `status = 'sold'`. That returns **every** sold stove at those partners — including sales made by partner staff, super admins, or historic sales not tied to any agent. So it can exceed the sum of agent-created sales.

The view is meant to show results for **agents only**, so the modal must be scoped to sales whose `created_by` is one of the agents in the current report.

## Fix

Scope the Stoves Sold / Retrieved modal to agent-attributed sales, and show which agent sold each stove.

### 1. Pass agent context into the sold modal

At the modal render site (bottom of `SuperAdminAgentsContent.tsx`), pass the current `agents` list (id → name) into `StovesStatusModal` alongside `orgIds`. Only the `mode="sold"` instance needs it. Unsold modal stays as-is (it's about remaining inventory at assigned partners, not attribution).

### 2. Update `StovesStatusModal` sold-mode query

Replace the current single `stove_ids` query for `mode="sold"` with:

1. Fetch `sales` rows where `created_by IN agentIds` AND (optionally) `organization_id IN orgIds` — batched. Select `id, stove_id, organization_id, created_by`.
2. Build map `saleId → { agentId, agentName }` using the passed agent list (fallback "—" if missing).
3. Fetch matching `stove_ids` rows by `sale_id IN (…)` (batched), plus the existing `organizations` lookup for partner/state/branch.
4. Compose rows: `{ stove_id, partner_name, state, branch, agent_name }`.

For `mode="unsold"` keep the existing behaviour (available stoves at agent-assigned partners).

### 3. Reconcile the KPI totals

`globalSold` at line 2272 already sums per-agent `sales.created_by` counts, so the KPI number itself is correct. No change to KPI math; the modal simply has to match it. After the fix, the modal row count for sold will equal the KPI value (2 in your case would collapse to 1 if only 1 sale is agent-attributed; if it stays at 2, both belong to agents other than Saliu — which is now transparent thanks to the new Agent column).

### 4. Add Agent column to the sold modal

- Add "Agent" as a new column in the table header/body.
- Include Agent in the search filter (so typing "Saliu" narrows the list).
- Include Agent in the CSV export header/body (`Stove ID, Partner Name, State, Branch, Agent`).
- Column is omitted (or left blank) for `mode="unsold"` since attribution doesn't apply.

## Files touched

- `src/app/agents/components/SuperAdminAgentsContent.tsx`
  - Extend `StovesStatusModal` props: add optional `agents?: Array<{ id: string; full_name: string }>` and use it only when `mode="sold"`.
  - Rewrite the sold-mode fetch to go through `sales` → `stove_ids` (attribution-based) instead of `stove_ids.status='sold'` by org.
  - Add Agent column, search inclusion, and CSV export column.
  - Pass `agents={agents}` to the `<StovesStatusModal mode="sold" …>` instance.

No schema, RLS, or edge-function changes required — both `sales` and `stove_ids` are already readable in this view.
