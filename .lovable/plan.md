
## Goal

Make the three Performance Report tabs (ACSL Agents, Partners, States) feel instant when switching, without losing real-time accuracy.

## Root cause (verified)

`src/app/agents/page.tsx` conditionally renders one of `SuperAdminAgentsContent`, `PartnersContent`, or `StatesPerformanceContent`. Switching tabs **unmounts** the previous component. Each of those components loads its data with plain `useState` + `useEffect` + `fetch` (no shared cache — TanStack Query isn't used inside them). So every tab click:

1. Throws away the previous tab's fetched agents/partners/states/stoves/sales rows.
2. Re-runs all initial `useEffect` loaders on the next tab (edge-function calls + Supabase reads for thousands of rows).

That's the "reloads while navigating from tab to tab" the user is seeing.

## Fix

### 1. Keep tabs mounted (biggest win, smallest change)

Rework `src/app/agents/page.tsx` so tabs are rendered once activated and then **kept mounted**, toggled with the `hidden` attribute instead of conditional rendering:

- Track `mountedTabs: Set<TabKey>` — add a key the first time its tab is activated (lazy mount, so no upfront cost).
- Render each mounted tab inside a wrapper with `hidden={active !== key}`. Hidden panels keep their React state, queries, scroll position, filters, and cached data.
- Only the active panel is visible; the others sit idle in memory. Switching tabs becomes an O(1) visibility toggle — no refetch, no re-render of huge tables.

This alone eliminates the reload-on-switch behavior for all three tabs, with zero changes inside the three large content components.

### 2. Manual refresh button on the tab bar

Add a small "Refresh" button (with a spinning `RefreshCw` icon) next to the segmented tab control. It broadcasts a `performance-report:refresh` custom event scoped to the active tab key.

Each tab component gets a tiny `useEffect` that listens for that event and calls its existing top-level loader (`fetchAgents` / `fetchOrganizations` / `load()`). No refactor of the loaders themselves — just wire the existing function to the event.

Gives the user an explicit "get fresh data now" affordance without a page reload.

### 3. Realtime auto-refresh (throttled)

Add a shared hook `useRealtimeRefresh(tabKey)` used by each of the three tab components. It opens Supabase realtime channels on the tables that back each tab and, on any `INSERT`/`UPDATE`/`DELETE`, debounces (5s) then triggers the same refresh event the button uses — but only when that tab is the active one, so background tabs don't thrash.

Channels per tab:
- **Agents**: `profiles` (role in acsl_agent/acsl_agent_manager), `acsl_agent_organizations`, `super_admin_agent_organizations`, `sales`, `stove_ids`.
- **Partners**: `organizations`, `sales`, `stove_ids`.
- **States**: `organizations`, `sales`, `stove_ids`.

Result: data updates itself in the background while the user is on a tab, without a full page reload and without refetching every time they toggle tabs.

### 4. Preserve realtime for non-active tabs on next visit

When a background tab's realtime channel fires while it's hidden, set a `stale` flag for that tab. On next activation, the tab bar shows a subtle dot on the tab and auto-triggers one refresh, then clears the flag. Users never see stale numbers, but we still avoid refetching tabs they aren't looking at.

## Files to change

- `src/app/agents/page.tsx` — lazy-mount + hidden-toggle tab shell, refresh button, stale-dot indicators.
- `src/app/agents/components/SuperAdminAgentsContent.tsx` — add event listener + realtime hook wiring; no changes to existing fetch logic, table, or KPI code.
- `src/app/agents/components/StatesPerformanceContent.tsx` — same wiring.
- `src/app/partners/components/PartnersContent.jsx` — same wiring.
- `src/app/agents/hooks/useRealtimeRefresh.ts` *(new)* — small shared hook: opens channels, debounces, dispatches the refresh event only when its tab is active (or marks stale otherwise).

## Out of scope

- No refactor of the three large components' internal fetch code to TanStack Query (that's a much larger change; the mount-persistence fix already removes the perceived slowness).
- No schema, edge function, or RLS changes.
- No visual redesign of the tabs beyond adding the Refresh button and a small "updated" dot.
