## Problem

On the Agents Performance Report view (`src/app/agents/components/SuperAdminAgentsContent.tsx`), the table body renders `displayedAgents.map(...)` (line 3053), which is the full sorted list — it is never sliced by the current page. The pagination footer (Prev / page numbers / Next, rows-per-page selector) updates `page` and `pageSize` state, and `pagination.totalPages` is computed correctly from `rows.length / pageSize`, but because the rendered array isn't sliced, every page shows all agents. Changing page number or rows-per-page has no visible effect on the table.

There is also no "Showing X–Y of Z" indicator in the footer (other tables in the app have it).

## Fix

In `SuperAdminAgentsContent.tsx`:

1. Derive a page slice from `displayedAgents` using current `page` / `pageSize`, clamped to available pages:
   - `safePage = Math.min(page, Math.max(1, Math.ceil(displayedAgents.length / pageSize)))`
   - `pageRows = displayedAgents.slice((safePage - 1) * pageSize, safePage * pageSize)`
2. Render `pageRows.map(...)` in the table body instead of `displayedAgents.map(...)`.
3. Keep `totalPages` / page-button rendering driven by `displayedAgents.length` (client-side count), so sort/filter changes reflect immediately. Update `getPageNumbers()` to use this local `totalPages` if needed.
4. Add a "Showing {start}–{end} of {total} agents" label on the left side of the footer row (footer becomes: rows-per-page + showing text on the left, pager on the right), matching the style used in `PartnerAgentsProfilesContent.jsx` / `EndUserRecordsContent.jsx`.
5. Ensure the `page` reset already wired to search/status/roles/date filters also fires when `stoveSort` or `sortMode` changes result count (add these to the existing reset `useEffect`) so users don't land on an empty page after re-sorting/filtering.

No changes to data fetching, edge functions, or business logic — this is a rendering fix only.
