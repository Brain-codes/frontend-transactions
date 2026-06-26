## Where time is being spent today

Quick audit of the current setup:

1. **Every route eagerly imports its page module at the top of the route file** (`import Page from "@/app/dashboard/page"` etc.). That defeats TanStack's automatic code splitting — the entire app's page code lands in the initial bundle, so first load and route transitions are slower than they need to be.
2. **One giant initial JS chunk** (sidebar, dashboard layout, all role-aware logic, every page) blocks first paint on every route.
3. **Hydration mismatch from the recent auth change** (server renders `loading=true`, client hydrates with cached user) — currently throws away the SSR tree and re-renders on the client. Visible as a brief flash + warning.
4. **No React Query defaults** — many lists refetch on every mount/focus instead of using cached data.
5. **Sidebar + DashboardLayout re-render on every route change** because the user/role objects from `AuthContext` are new references each time.
6. **Static assets** aren't preloaded; the LCP image (when present) is fetched after JS parses.

## Plan — concrete changes

### 1. Code-split every page route (biggest win)
Convert the 20+ route files under `src/routes/*` to lazy-load their page module instead of importing it at the top:

```tsx
// before
import Page from "@/app/dashboard/page";
export const Route = createFileRoute("/dashboard/")({ component: Page });

// after
import { lazy } from "react";
const Page = lazy(() => import("@/app/dashboard/page"));
export const Route = createFileRoute("/dashboard/")({ component: Page });
```

Effect: initial bundle drops dramatically; each route only downloads its own chunk on first visit. Router preloading (already on by default) fetches the chunk on hover/intent, so transitions still feel instant.

### 2. Fix the hydration mismatch from the auth cache
- Mark `AuthProvider` to skip SSR-side hydration for the cached state: use `useSyncExternalStore` (snapshot returns `null` on server, real cached user on client) instead of the current `typeof window` branch in `useState` initializer.
- Result: no hydration warning, no flash, and the synchronous client read still happens before paint.

### 3. Set sane React Query defaults
In the `QueryClient` config (already present in router context):
```ts
defaultOptions: {
  queries: {
    staleTime: 60_000,           // 1 min — reuse cached data across nav
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false, // no refetch storm on tab focus
    retry: 1,
  },
},
```
This alone eliminates many of the per-page reload spinners.

### 4. Memoize the layout shell
- Wrap `Sidebar` and `DashboardLayout` in `React.memo`.
- In `AuthContext`, memoize the context value with `useMemo` so descendants don't re-render unless `user`/`role`/`loading` actually change. Today the context value is a fresh object every render.

### 5. Preload critical assets in `__root.tsx`
- Add `<link rel="preconnect">` for the Supabase URL and Google Maps origins.
- Add `rel="modulepreload"` for the dashboard chunk (most users land there post-login).

### 6. Drop dev-only console noise in production builds
`AuthContext` logs a lot. Wrap the verbose logs in `if (import.meta.env.DEV)` so production isn't paying for `console.log` + JSON serialization on every auth event.

### 7. Optional follow-up (only if still slow after the above)
- Convert any large in-page tables to virtualized lists (`@tanstack/react-virtual`).
- Defer Google Maps script loading until a map is actually mounted (lazy import in the map component) instead of at app boot.

## Files touched (rough scope)

- `src/routes/**/index.tsx` — switch to `lazy()` page imports (~25 files, mechanical change)
- `src/app/contexts/AuthContext.jsx` — `useSyncExternalStore` + `useMemo`, gate logs
- `src/router.tsx` (or wherever `QueryClient` is created) — `defaultOptions`
- `src/app/components/Sidebar.jsx`, `src/app/components/DashboardLayout.tsx` — `React.memo`
- `src/routes/__root.tsx` — preconnect/modulepreload hints

## Expected impact

- Initial JS shipped to first paint: roughly 60–80% smaller.
- Route transitions: from "blank flash → render" to instant on hover-preloaded routes.
- No more hydration warning and no "Verifying authentication..." flash on reload.
- Cached pages re-open instantly instead of re-fetching.

No behavior changes — purely loading/perf work.
