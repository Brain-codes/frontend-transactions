## Plan: Recover the preview

The dev server is currently responding (HTTP 200 with the app HTML), so the "Preview has not been built yet" message is a transient sandbox/preview build state rather than a code problem. No source changes are needed.

### Steps
1. Flush the HMR gate (`POST /__hmr_flush`) to force the latest modules to be served.
2. Restart the Vite dev server inside the sandbox to clear any stale build state behind the preview frame.
3. Re-hit `http://localhost:8080/` and confirm a 200 response with the app shell.
4. Ask you to hard-refresh the preview tab; if it still shows "Preview has not been built yet", capture browser console + network logs so we can dig deeper (likely an auth/Supabase redirect issue rather than a build failure).

### Notes
- No file edits.
- No dependency or schema changes.
- If the issue persists after restart, next step is to check console/network for failed requests (Supabase URL, env vars) on the `/` route, since `src/app/page.jsx` immediately redirects based on auth state.
