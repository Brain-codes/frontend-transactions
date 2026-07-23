## Fix End User Records API view

### 1. "Failed to fetch" under Authentication

**Diagnosis (to confirm on redeploy):** the browser call to `get-end-user-api-key` fails at the network layer (no status returned). The function file exists but was just added, so the most likely cause is that the function needs to be (re)deployed. As a hardening pass I'll also make it more resilient:

- Fall back to `SUPABASE_PUBLISHABLE_KEY` when `SUPABASE_ANON_KEY` isn't present.
- Return CORS headers even on crash (already does, but wrap the whole handler defensively).
- Resolve super-admin via `has_role(uid, 'super_admin')` first, then fall back to `profiles.role` — matches the rest of the app.
- Touch the file so it redeploys.

If after redeploy it still fails, I'll pull `server-function-logs` for `get-end-user-api-key` and fix the surfaced error.

### 2. "Loading sample response..."

This is a cascade: `loadSample` is gated on `apiKey` being loaded. Once #1 is fixed, the sample will fetch automatically. I'll also:

- Show a clear "Waiting for API key…" message instead of "Loading sample response..." when the key isn't loaded yet.
- Show the actual error when the sample request fails, with a Retry button.

### 3. Make "Try it" easier to use

Replace the generic text inputs with proper controls:

- **`dateFrom` / `dateTo`** — Shadcn Popover + Calendar date pickers (same pattern used elsewhere in the app), storing `YYYY-MM-DD`. Include a "Clear" affordance.
- **`state`** — Shadcn `Select` dropdown populated from the Nigerian states list already used by `CreateSalesForm` (`src/lib/nigeriaStatesLgas` or equivalent).
- **`lga`** — Shadcn `Select` dropdown, dependent on the selected state (disabled + cleared when state changes; options from the same source).
- **`partner_id`** — Combobox listing partner organizations (fetched once via existing `manage-organizations`), showing partner name but submitting the UUID.
- **`include_cancelled`** — Switch (boolean) instead of a text field.
- **`page` / `limit`** — numeric inputs with sensible min/max.
- **`search`** — kept as a text input.

Layout: keep the responsive grid, put date pickers side-by-side, state/LGA side-by-side, then partner, search, and boolean/number controls. Add a "Reset" button next to "Send request".

### Files to touch

- `supabase/functions/get-end-user-api-key/index.ts` — resilience + redeploy.
- `src/app/end-user-records/api/ApiEndpointContent.tsx` — Try-it controls, sample-response empty state, error handling.
- (Reuse) existing states/LGAs data module and existing organizations service — no new backend needed for the dropdowns.

### Out of scope

- No changes to `end-user-records-api` (data endpoint) itself — it already returns the fields shown in the details modal.
- No changes to permissions or sidebar.
