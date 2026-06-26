## Why you're seeing "Supabase URL is not configured"

Your `.env.local` file is **missing from the sandbox**. I checked the project root — only `.env.example` exists. The sandbox filesystem was reset since we last created it, so `import.meta.env.VITE_SUPABASE_URL` is empty and `src/lib/supabaseClient.ts` falls back to the placeholder URL while `authService.loginWithCredentials` throws the hard error you see.

## Fix

1. Recreate `.env.local` at the project root with your four variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_GOOGLE_PLACES_API_KEY`
2. Restart the dev server so Vite picks up the new env vars.
3. Verify on `/login` that the console warning is gone and login proceeds to your Supabase edge function `login-with-credentials`.

## Note on persistence

`.env.local` lives only in the sandbox filesystem and is gitignored, so it can disappear on sandbox rebuilds. If you want these values to survive resets, the durable option is to store them as Lovable project secrets — but since `VITE_*` vars are baked into the client bundle at build time, the simplest path is to just keep `.env.local` and recreate it if it ever vanishes again.
