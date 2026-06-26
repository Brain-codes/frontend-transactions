## Why you see it

Every hard reload, `AuthContext` starts with `loading = true` and `ProtectedRoute` renders a full-screen "Verifying authentication..." spinner until `supabase.auth.getSession()` resolves from `localStorage`. Even though the session is already on disk, the async round trip takes a few hundred ms — long enough to flash. The same happens on route changes that remount `ProtectedRoute` while a refresh is in flight.

## Fix (frontend only, no auth logic changes)

1. **Synchronously hydrate from localStorage in `AuthContext`**
   - On mount, read the Supabase auth token key (`sb-<project>-auth-token`) directly from `localStorage` before the async `getSession()` call.
   - If a valid (non-expired) token exists: initialize `user`, `isAuthenticated`, role flags from it and set `loading = false` immediately. Then run `getSession()` in the background to refresh.
   - If no token: keep current behavior (loading stays true only until `getSession()` returns — typically instant when there's nothing to load).

2. **Stop blocking the whole app on `loading` in `ProtectedRoute`**
   - If we already have a cached `user` (from step 1), render `children` immediately — no spinner.
   - Only show the spinner when there is truly no session AND `loading` is still true (first-time login bootstrap).
   - Keep the redirect-to-`/login` behavior for the genuine "no session" case.

3. **Persist last-known role/profile in `localStorage`**
   - Cache `userRole`, `isSuperAdmin`, `hasAdminAccess` alongside the session so the sidebar/permissions don't flicker on reload while the profile re-fetches in the background.
   - Refresh from the server after mount; reconcile silently.

4. **Remove the 10-second timeout spinner UI** in `ProtectedRoute` (keep the safety redirect, but don't render the red "Authentication timeout" screen — it's only reachable in a broken state and adds nothing for the user).

5. **Quiet the auth state listener**
   - In `AuthContext`'s `onAuthStateChange`, ignore `TOKEN_REFRESHED` and `INITIAL_SESSION` events when the user id hasn't changed — currently they re-trigger state updates that can briefly flip `loading`.

## Files to change

- `src/app/contexts/AuthContext.jsx` — synchronous hydration, cached role, filtered listener
- `src/app/components/ProtectedRoute.tsx` — render children when cached session exists, drop timeout UI
- (optional) small helper `src/lib/authCache.ts` for read/write of cached auth snapshot

## Result

- Hard reload on any protected page: app shell renders instantly, no spinner flash.
- First-ever login still shows the spinner briefly (expected).
- Token refresh in the background is invisible to the user.
