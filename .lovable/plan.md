You want to use your own existing Supabase project (not Lovable Cloud) and wire in your Google Maps/Places keys.

### What I'll do

1. **Create `.env.local`** at the project root with your four variables:
   - `VITE_SUPABASE_URL=https://oeiwnpngbnkhcismhpgs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_GOOGLE_MAPS_API_KEY=...`
   - `VITE_GOOGLE_PLACES_API_KEY=...`
2. **Restart the dev server** so Vite picks up the new env vars.
3. **Do NOT enable Lovable Cloud** — your existing `src/lib/supabaseClient.ts` already reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so it will connect straight to your own Supabase project.

### Why these values matter

- **`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`** — point the frontend Supabase client at your project. Without them, auth (login on `/login`), database reads/writes, and storage all fail. The anon key is safe to ship in the browser; your Row Level Security policies in Supabase are what actually protect data.
- **`VITE_GOOGLE_MAPS_API_KEY`** — used by `src/app/map/MapPage.jsx` to render the heatmap/markers map. Missing key = blank map.
- **`VITE_GOOGLE_PLACES_API_KEY`** — used by `GooglePlacesInput` for address autocomplete in sales/customer forms. Missing key = the input falls back to plain text with no suggestions.

### Notes / caveats

- These are `VITE_*` variables, meaning they get embedded in the client bundle. That's expected for the Supabase anon key and for browser-restricted Google Maps keys — make sure both Google keys are restricted by HTTP referrer in Google Cloud Console.
- `.env.local` is gitignored by default, so the values stay on this environment only.
- I won't call `supabase--enable` (Lovable Cloud) since you're bringing your own backend.