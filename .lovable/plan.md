## Problem

On `/sales/create`, typing in the Partner search returns "No partners found" for super admin. The network log shows the request going to:

```
undefined/functions/v1/manage-organizations?limit=100&offset=0&search=ab
```

The host is literally `undefined`, so every partner lookup 404s against the app shell instead of the edge function. That's why no partners appear and search never returns results.

## Cause

`src/app/admin/components/sales/CreateSalesForm.jsx` builds the URL from `import.meta.env.VITE_SUPABASE_URL` (lines 198 and 767). In this preview build that variable is not injected, so it resolves to `undefined`. Every other working call in the app (e.g. `PartnersContent.jsx`, `EditPartnerModal.tsx`) uses the `SUPABASE_URL` constant from `src/lib/supabaseConfig`, which has a hardcoded fallback to the project URL — that's why those calls succeed while this one fails.

## Fix

Switch the two `manage-organizations` fetches in `CreateSalesForm.jsx` to use the same `SUPABASE_URL` constant the rest of the app uses.

1. Import `SUPABASE_URL` from `@/lib/supabaseConfig` at the top of `CreateSalesForm.jsx`.
2. Replace `${import.meta.env.VITE_SUPABASE_URL}` with `${SUPABASE_URL}` on lines 198 and 767.

No other behavior, UI, or business logic changes — this only restores the correct edge-function host so the partner search/list works for super admins (and for any other role that hits this code path).

## Verification

- Open `/sales/create` as super admin, click the Partner field — list of partners loads.
- Type a query (e.g. "abia") — matching partners appear, can be selected, and State/Branch cascade follows.
