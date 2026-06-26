## Goal
Stop the recurring `Supabase URL is not configured` login error while keeping the app connected to your own independent Supabase project, not Lovable Cloud.

## What I found
- The app is already using your own Supabase client through `src/lib/supabaseClient.ts`.
- `.env.local` currently exists and contains the required Supabase variables.
- The error comes from `AuthContext.jsx`, where login reads only `import.meta.env.VITE_SUPABASE_URL` and throws if the variable is missing from the built client bundle.
- `.env.local` is ignored by git, so it can disappear or fail to travel with the project. That is why the error keeps coming back after rebuilds/resets.
- There is also inconsistent naming: code expects `VITE_SUPABASE_ANON_KEY`, while modern Supabase/TanStack docs often use `VITE_SUPABASE_PUBLISHABLE_KEY`. Your app should support both to be resilient.

## Plan
1. **Create one central Supabase config module**
   - Add a small browser-safe config file that reads:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - fallback `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Export `supabaseUrl`, `supabaseAnonKey`, and a clear `isSupabaseConfigured` flag.

2. **Use that central config everywhere**
   - Update `src/lib/supabaseClient.ts` to use the shared config instead of duplicating env lookup.
   - Update `src/app/contexts/AuthContext.jsx` login to use the shared config instead of directly reading `import.meta.env.VITE_SUPABASE_URL`.
   - Update `src/app/services/authService.js` for consistency, even if it is not the active login path.

3. **Make the login error smoother**
   - Replace the hard technical throw with a clearer configuration error message.
   - Keep the app from crashing or silently using placeholders when login is attempted without config.

4. **Make env setup durable for your independent Supabase deployment**
   - Update `.env.example` to include both supported key names and clear instructions.
   - Optionally adjust `.gitignore` so a non-secret public client env file can be committed if you want this to survive resets. Since `VITE_*` values are public in the browser bundle, the Supabase URL and anon/publishable key are not private secrets.
   - Keep private/service-role keys out of the frontend and out of committed env files.

5. **Verify**
   - Check that the dev server loads with no placeholder Supabase warning.
   - Check that the login page no longer throws `Supabase URL is not configured` and attempts the Supabase `login-with-credentials` function instead.

## Important note
This does not enable or rely on Lovable Cloud. It keeps the app pointed at your existing external Supabase project and makes the frontend configuration less fragile.