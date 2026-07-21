# Fix: Selecting "Swali Global Multi Concept (Amina Sales Model)" in Sales Form shows no state, no branch, no stoves

## Root cause

`CreateSalesForm.handlePartnerPick` calls `manage-organizations?search=<partnerName>` to load that partner's org rows (state + branch + org IDs). The edge function (`supabase/functions/manage-organizations/read-operations.ts`, line 126) applies the search as:

```ts
q = q.or(`partner_name.ilike.%${search}%,partner_id.ilike.%${search}%`);
```

PostgREST's `.or()` filter is a mini-DSL where parentheses `(` `)` are **grouping delimiters**, and commas separate alternatives. When the search string is `Swali Global Multi Concept (Amina Sales Model)`, the raw parens inside the value break the parser — the whole filter is malformed and PostgREST returns 0 rows.

Effect chain:

1. `handlePartnerPick` gets `rows = []` → `setPartnerBranches([])` → State/Branch dropdowns render empty.
2. `finalizeBranchPick` never fires → `saa_selected_org_ids` never written → `getActiveOrgIds()` returns nothing → stove search filters on an empty org-id set → stove `101109216` is never found.

The Partner Profiles list works because it uses a different endpoint (`get-organizations-grouped`) that does not use `.or()` on the search value.

## Change

### 1) `supabase/functions/manage-organizations/read-operations.ts`

Replace the unsafe `.or()` search with a parens-safe equivalent. Two acceptable options; pick option A because we already fall back to a single-column ilike on `partner_name` when `partner_id` looks non-numeric:

- Option A — split into two safe filters using PostgREST's quoted-value syntax for `.or()`:
  ```ts
  if (search) {
    const escaped = search.replace(/"/g, '\\"'); // escape double-quotes for PostgREST quoted value
    q = q.or(`partner_name.ilike."*${escaped}*",partner_id.ilike."*${escaped}*"`);
  }
  ```
  PostgREST uses `*` as ilike wildcard when the value is inside `"..."`, and quoted values treat parens/commas as literals.

- Option B — drop the `.or()` for the common case and use two-column combined WHERE via `.ilike()` on `partner_name` only (since `partner_id` is a short code, users rarely paste the full "Amina" name into it):
  ```ts
  if (search) q = q.ilike("partner_name", `%${search}%`);
  ```

Ship Option A so the `partner_id` search still works.

### 2) `src/app/admin/components/sales/CreateSalesForm.jsx` (defensive)

After `handlePartnerPick` returns zero rows for a partner name that was picked from the dropdown, surface an inline error under the Partner input: "No branches configured for this partner — please contact an administrator." This prevents future silent failures if a partner has no `organizations` rows.

No other client code changes needed — once the edge function returns the Amina row, State (Kano) → Branch (Main Branch) will auto-select (both single-value), `saa_selected_org_ids` gets populated with all org IDs sharing that partner+state+branch, and stove `101109216` becomes findable and sellable via the existing multi-org search path.

## Verification

1. On `/sales/create`, pick "Swali Global Multi Concept (Amina Sales Model)" from the partner dropdown.
2. State should auto-fill to "Kano", Branch should auto-fill to "Main Branch".
3. Type `101109216` in the Stove ID search — the ID should appear as available and validate as "Valid stove ID for this partner."
4. Also verify the previous test partner (no parens in name) still loads correctly — a plain "Swali Global Multi Concept" pick must still work.

## Out of scope for this turn

The related complaint that this Amina variant does not appear in the "Track Stove IDs" partner filter is caused by a different function (`get-organizations-grouped` fuzzy-merges near-duplicate partner names). That fix is a separate change and will be planned separately if you want it addressed next.
