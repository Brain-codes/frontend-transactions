## Problem

On the **Agents Performance Report**, the "Collected" column currently counts stoves whose `stove_ids.status = 'sold'` for any partner assigned to the agent. That includes stoves marked sold via CSV imports / transfer history / other agents — not just sales recorded by the user in view. That's why you see more than the 2 actual sales records.

## Fix

Redefine "Collected" to mean exactly: **the number of stoves the user in view personally sold** (sales records where the sales rep / created_by is that user).

### Changes in `src/app/agents/components/SuperAdminAgentsContent.tsx`

1. In the hydration `useEffect` (around lines 1507–1570), stop deriving `sold` from `stove_ids.status`.
2. For each agent, query the sales table via the existing `get-sales-advanced` endpoint (or directly via supabase) filtered by that agent's user id as the sales rep / creator, and sum the stove count.
3. Keep current logic for:
   - **Assigned** = total stoves at assigned partner orgs (from `stove_ids`).
   - **In Stock** = `Assigned − Collected` (so they always reconcile), instead of counting `status != 'sold'`.
4. Show a small spinner / dash while counts hydrate; never show stale "sold" counts.

### Verification

- Open the report and confirm the agent who logged 2 sales shows **Collected = 2**.
- Confirm Assigned and In Stock still add up correctly (In Stock = Assigned − Collected).
- Spot-check a second agent against their sales list.

### Technical detail

I still need to confirm the exact column / filter name the sales table uses for "the user who recorded the sale" (likely `sales_rep_id`, `created_by`, or `agent_id`). I'll inspect the sales schema / edge function once in build mode and use the right field; if none exists, I'll fall back to filtering by `sales_rep_name` matching the agent's full name.

No UI changes — only the data source for the three numeric columns.
