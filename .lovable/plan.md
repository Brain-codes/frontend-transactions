## Why the two totals differ

Both reports count "agents" from different sources:

- **Agents Performance Report** — lists every user with role `acsl_agent` or `acsl_agent_manager` (from `manage-users`). Result: **24**.
- **States Performance Report** — walks each state and collects unique agent IDs tied to that state via:
  - `acsl_agent_states` rows (ACSL agent/manager → state), OR
  - a partner-side profile whose `organization.state` matches.
  
  Any ACSL agent/manager with **no `acsl_agent_states` row** (and no partner org state) is invisible to this view. Result: **23** → exactly one ACSL agent/manager currently has no state assignment.

This is a data-coverage gap, not a counting bug — the two views ask different questions.

## Reconciliation plan

Make both totals agree by having the States Performance KPI use the same authoritative agent list as the Agents Performance report, and surface any unassigned agents so they're visible instead of silently dropped.

1. In `StatesPerformanceContent.tsx`, also fetch the full ACSL agent/manager roster (same query the Agents Performance view uses — profiles where `role in ('acsl_agent','acsl_agent_manager')`).
2. Change the **Agents** KPI to show the count of unique agent IDs from that roster ∪ the per-state agent details. This guarantees the KPI matches the 24 shown on the Agents Performance report.
3. Add a small **"Unassigned"** chip under the Agents KPI (e.g. `1 unassigned`) when roster agents have no state linkage. Clicking it opens a modal listing those agents (name, role, phone) so an admin can assign them via User Management.
4. Leave per-row (per-state) agent counts unchanged — those still correctly reflect coverage in each state.
5. Update the CSV export totals row to match the reconciled KPI.

No schema changes, no changes to Agents Performance view, no changes to per-state data.

## Technical notes

- File: `src/app/agents/components/StatesPerformanceContent.tsx` only.
- Reuse the existing profiles fetch already in this file (line ~129) — it already pulls the ACSL roles; just build a `Set<string>` of ACSL agent IDs alongside the current per-state aggregation and union it into `totals.agents`.
- Unassigned = roster IDs not present in any `agentDetails[].id` across `filtered` rows.