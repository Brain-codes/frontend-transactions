`.env.local` is missing from the sandbox filesystem (sandbox resets wipe it; it is gitignored). Lovable Cloud will NOT be enabled — your independent Supabase project stays in use.

Steps:
1. Create `.env.local` at the project root containing exactly:
   - `VITE_SUPABASE_URL=https://oeiwnpngbnkhcismhpgs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...IuY0`
   - `VITE_GOOGLE_MAPS_API_KEY=AIzaSyC__spSRv_DNZAC1WgsmfiEkelMXKD9GfQ`
   - `VITE_GOOGLE_PLACES_API_KEY=AIzaSyBGfmkwRY4D3GHDJftLoDo0rOHkiMfEGeg`
2. Restart the dev server so Vite picks up the new env vars.
3. Confirm Supabase URL/key and both Google keys are present in the running bundle.

Note on the S3 upload error: that is a Lovable preview-pipeline upload throttle ("Reduce your concurrent request rate"), not an application bug. The next build retry uploads cleanly; no code change addresses it.