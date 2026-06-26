# Improve HMR: move helpers/hooks out of component files

## Why
React Fast Refresh only preserves state when a module exports **components only**. If a file also exports a hook, helper, or context object, Vite falls back to a full page reload on every edit. The three context files in this project each export both a Provider component and a hook, which forces a reload whenever any descendant changes that touches the same module graph.

## Files to split

Each of these gets two files: one for the Provider (component-only export) and one for the hook (no component export). All existing import paths keep working because we re-export from the original file.

1. **`src/app/contexts/AuthContext.jsx`**
   - Move `useAuth` → `src/app/contexts/useAuth.js`
   - Keep `AuthProvider` (component) in `AuthContext.jsx`
   - Re-export `useAuth` from `AuthContext.jsx` for back-compat

2. **`src/app/contexts/SidebarContext.jsx`**
   - Move `useSidebar` → `src/app/contexts/useSidebar.js`
   - Keep `SidebarProvider` in `SidebarContext.jsx`
   - Re-export

3. **`src/app/contexts/ToastContext.jsx`**
   - Move `useToastNotification` → `src/app/contexts/useToastNotification.js`
   - Keep `ToastProvider` in `ToastContext.jsx`
   - Re-export

## What this changes for you
- Edits to leaf components (tables, modals, sidebar items, page bodies) will hot-update in place — no reload, scroll position and form state preserved.
- Edits to a Provider file itself will still reload (unavoidable — the whole tree depends on it).
- Edits to `DashboardLayout.tsx` / `ProtectedRoute.tsx` will still reload because they sit at the top of the tree; that is expected.

## What this does NOT change
- The Lovable preview iframe still refreshes once per agent turn when the HMR gate flushes — that is a sandbox behavior, not a code issue. Running `bun dev` locally would give you fully in-place updates after this refactor.

## Out of scope
- No logic changes, no UI changes, no behavior changes. Pure file-structure refactor.
