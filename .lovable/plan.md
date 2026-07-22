## Problem

On the **States Performance Report** view:

1. **Agent names blank in modal** — the "Agents in {State}" modal shows agent rows but the **Agent** column is empty (or shows "—").
2. **Totals mismatch** — the Agents KPI shows **23**, while the Agents Performance Report shows **24**.

## Root cause (single cause, both symptoms)

`src/app/agents/components/StatesPerformanceContent.tsx` fetches `profiles` directly from Supabase (subject to RLS):

```ts
const { data: profiles } = await supabase
  .from("profiles")
  .select("id,full_name,email,role,organization_id,phone")
  .in("role", [...]);
```

RLS on `profiles` is restricting what the current user can read, so:

- The ACSL roster built from this query returns **23**, not 24 (one profile row is invisible under RLS) → KPI reads 23.
- For agents whose profile row is filtered out, `profileById.get(agentId)` is `undefined`, so `name` falls back to `"—"` in the agents modal.

The **Agents Performance Report** view does not hit this problem because it fetches through the `manage-users` Edge Function, which uses the service role and returns the full 24-agent roster with names.

## Fix

Reuse the same authoritative source in States Performance.

Change **`src/app/agents/components/StatesPerformanceContent.tsx`** to:

1. Replace the direct `supabase.from("profiles")…` call with a fetch to the `manage-users` Edge Function (same call shape used by `SuperAdminAgentsContent.tsx`), requesting all users. Map the response into the existing `profiles` array shape (`id, full_name, email, role, organization_id, phone`).
2. Keep everything downstream unchanged — `profileById`, `acslRoster`, `pushAgent`, partner-side agent iteration, and `totals.agents` all continue to work as-is.
3. If the Edge Function call fails, fall back to the current direct query so the view still loads (degraded, matches today's behavior).

## Expected outcome

- Agents KPI on States Performance reads **24**, matching the Agents Performance Report.
- The "Agents in {State}" modal shows every agent's full name in the **Agent** column (email fallback only when `full_name` truly is null in the profile).
- No other view changes — partner modal, unassigned-agents chip, sorting, pagination, and per-state counts remain as they are.
