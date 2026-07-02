## Goal

On the **Agents Performance Report** table, make the three per-row cells — **Records to collect**, **Records collected**, **Records not collected** — clickable pills that open a stove-list modal, mirroring the UI, layout, and columns of the **Partner Performance Report** row modal (`StoveIdsModal` opened from the Purchased / Sold / Available pills).

## Reference: Partner row modal (what to match)

In `src/app/partners/components/PartnersContent.jsx`, each partner row renders 3 colored pill buttons:
- Purchased → purple pill → opens `StoveIdsModal` with `initialFilter="all"`
- Sold → blue pill → opens `StoveIdsModal` with `initialFilter="sold"`
- Available → green pill → opens `StoveIdsModal` with `initialFilter="available"`

The modal shows: KPI header (Available / Sold with %), status filter dropdown, search, CSV/PDF export, paginated table of stove IDs with status + sale date, and a sale-details drill-in when a sold stove is clicked.

## Changes

### 1. `src/app/agents/components/SuperAdminAgentsContent.tsx`

- Wrap the three per-row cell values in `<button>` pills styled exactly like the partner row (purple/blue/green rounded-full pills, hover states, `min-w-[40px] px-2.5 py-0.5 text-xs font-semibold`).
  - Records to collect → purple pill → opens modal in `all` mode
  - Records collected → blue pill → opens modal in `sold` mode
  - Records not collected → green pill (rename to match "available/unsold" semantics visually) → opens modal in `unsold` mode
- Disable each pill when its count is 0.
- Add state `agentStovesModal: { agent, mode } | null`.

### 2. New `AgentStovesModal` component (in the same file)

Copy the visual shell of `StoveIdsModal` from `PartnersContent.jsx` — same dialog width, header layout, KPI summary strip, filter/search/export toolbar, table columns (Stove ID, Status, Sale Date, Sold To), and pagination — but scope the data to a single agent using the existing per-agent logic already implemented for the KPI-level `AssignedStovesModal` / `StovesStatusModal`:

- `all` (Records to collect): every non-archived stove at the agent's assigned partners (same query as the existing "assigned" modal, filtered to this one agent's org list).
- `sold` (Records collected): stoves where `sales.created_by = agent.id` at those partners.
- `unsold` (Records not collected): the `all` set minus the `sold` set.

Reuse the CSV export shape from the existing modals and the `AdminSalesDetailModal` drill-in from `StoveIdsModal` so a sold row click opens the sale.

### 3. No changes to

- KPI cards at the top (already clickable via `SystemStovesModal`-equivalent flow).
- Column headers or sort behavior.
- Data fetching for the agents table itself.

## Out of scope

- Partners Performance report (unchanged).
- Any backend / RLS changes — all queries reuse patterns already in the file.

## Acceptance

- Clicking any of the three numeric cells on an agent row opens a modal with the same look-and-feel as the partner row modal.
- Modal is scoped to that one agent and the correct mode (all / sold / unsold).
- Search, status filter, CSV/PDF export, and pagination all work inside the modal.
- Cells with a 0 count are visually disabled and non-clickable.
