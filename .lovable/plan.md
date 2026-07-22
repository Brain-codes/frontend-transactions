# States Performance Tab

Add a third tab to the Performance Report page (`/agents`) called **States Performance**, alongside the existing "ACSL Agents Performance" and "Partners Performance" tabs.

## Data per state (row)

For every state that has at least one partner (organization), compute:

1. **State** — name (with region/zone badge if easy).
2. **Partners** — count of `organizations` with `state = X`.
3. **Agents** — count of profiles assigned to that state:
   - Partner-side: `profiles` with role in (`partner_agent`, `agent`, `partner`, `admin`) whose `organization_id` maps to an org in that state.
   - ACSL side: `acsl_agent_states` rows for that state (covers ACSL Agent Managers + ACSL Agents), de-duplicated by `agent_id`.
   - Show a combined total plus a small breakdown chip (e.g. `12 · 3 ACSL`).
4. **Total Stoves** — count of `stove_ids_base` rows for orgs in that state (excluding archived).
5. **Sold** — count where `status = 'sold'` (or `sale_id IS NOT NULL`).
6. **Not Sold** — Total Stoves − Sold.
7. **Sell-through %** — Sold / Total (progress bar).

## UI

- New file `src/app/agents/components/StatesPerformanceContent.tsx`.
- Header KPI strip (green theme, matches Partners tab): Total States, Total Partners, Total Agents, Total Stoves, Sold, Not Sold.
- Search box (filter by state name) + Region filter (optional) + Export CSV button.
- Table (green header, white body, no striping, `text-xs`, borders — same visual language as Partners tab):
  - Columns: State · Partners · Agents · Stoves · Sold · Not Sold · Sell-through
  - Sortable headers; default sort by Sold desc.
  - Numeric cells use tinted pills: Stoves (slate), Sold (green), Not Sold (red) — consistent with the Sales Records table tinting.
- Row click → side drawer/modal listing the partners in that state (name, agents count, stoves, sold) with links to the Partner detail modal.
- Bottom pagination (10/25/50), right-aligned "Showing X–Y of Z".

## Integration

- Update `src/app/agents/page.tsx`:
  - Add `TabKey = "agents" | "partners" | "states"`.
  - New tab entry `{ key: "states", label: "States Performance Report", icon: MapPin }` — visible to the same roles that already see the Partners tab (all admin-access roles).
  - Render `<StatesPerformanceContent />` when active.

## Data fetching

Client-side aggregation using existing Supabase client (no new edge function needed):

- `organizations` → id, partner_name, state
- `profiles` → id, role, organization_id (filter to partner-side roles)
- `acsl_agent_states` → agent_id, state
- `stove_ids_base` → organization_id, status, is_archived

Group in memory by state. Cache with a simple `useEffect` + loading state (same pattern as `PartnersContent.jsx`). Total dataset is small (states ≤ 37).

## Out of scope

- No schema changes.
- No changes to permissions matrix (tab visibility follows existing admin-access rule).
- No changes to other tabs.
