## Problem

The Residential Address field on the Sales form never becomes usable:

1. **`google-places-input.jsx` fetches the Maps key from an edge function** (`/functions/v1/get-google-keys`) that is **not deployed** on your external Supabase project → fetch returns 404 → `isLoaded` stays `false` → the input is `disabled` forever and shows "Loading Google Places…".
2. **It uses the legacy Places library** (`google.maps.places.AutocompleteService` + `PlacesService`). Google has retired legacy Places for keys created after March 1, 2025 — even if the script loads, suggestions silently return zero results on new keys.
3. The input is `disabled={disabled || !isLoaded}`, so when Places fails for any reason the user **cannot even type a plain address** as a fallback.

Your project already has `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (the map page uses it directly), so the edge-function detour is unnecessary.

## Fix — rewrite `src/app/components/ui/google-places-input.jsx`

Single-file change. Public API (`value`, `onChange`, `placeholder`, `disabled`, `className`) and the shape returned to `onChange` (`fullAddress, street, city, state, country, latitude, longitude`) stay identical, so `CreateSalesForm.jsx` does not change.

### What changes inside the component

1. **Load the key synchronously from env**
   - Read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
   - Remove the `supabase.auth.getSession()` + `fetch('/functions/v1/get-google-keys')` block entirely.
   - If the key is missing, log a clear console error and render the input in plain-text mode (still editable).

2. **Load Maps JS the modern way**
   - Inject one `<script>` with `https://maps.googleapis.com/maps/api/js?key=…&v=weekly&libraries=places&loading=async&callback=__gmInitPlaces`.
   - Use a single global init callback shared across all instances; if the script tag already exists, just await the callback.
   - Do NOT set `mapId` and do NOT use `AdvancedMarkerElement` (per Lovable Maps guidance).

3. **Switch to Places API (New)** — fixes the "no suggestions" issue on modern keys
   - Predictions: `const { AutocompleteSuggestion, AutocompleteSessionToken } = await google.maps.importLibrary('places');` then `AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken, includedRegionCodes: ['ng'] })`.
   - One `AutocompleteSessionToken` per typing session (reset after a selection).
   - Debounce input by ~250 ms to avoid hammering the API per keystroke.
   - Details: on selection call `suggestion.placePrediction.toPlace()` then `place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location', 'displayName'] })`. Map `addressComponents` → `street/city/state/country` using the same `types` logic that's already in the file.

4. **Never block typing**
   - Remove `disabled={disabled || !isLoaded}` — only honor the parent `disabled` prop.
   - On every keystroke, also call `onChange({ fullAddress: typedText, … })` so a user can save a free-text address even if Places never loads. Coordinates stay `null` until a suggestion is picked.
   - Replace the persistent "Loading Google Places…" overlay with a small inline hint that only shows while the script is still loading AND the input is empty.

5. **Clearer failure messaging**
   - If the script loads but `AutocompleteSuggestion.fetchAutocompleteSuggestions` throws `REQUEST_DENIED` / `ApiNotActivatedMapError`, show a one-line hint under the input: *"Address suggestions unavailable — enable Places API (New) in your Google Cloud project."* The input remains usable.

## Files touched

- `src/app/components/ui/google-places-input.jsx` — full rewrite (only file).
- No changes to `CreateSalesForm.jsx`, no schema changes, no edge functions.

## Prerequisite on your Google Cloud project

For autocomplete to return suggestions, the key in `.env.local` (`VITE_GOOGLE_MAPS_API_KEY`) must have **Places API (New)** enabled (in addition to Maps JavaScript API which the map page already uses). If only the legacy Places API is enabled, the rewrite still leaves the field fully typeable but suggestions won't appear until Places API (New) is turned on — the inline hint above will tell you that's what's missing.

## Out of scope

- No changes to the Map page (`src/app/map/page.jsx`) — it works.
- No changes to the System Configuration screen.
- No new edge functions; the unused `get-google-keys` function is left in the repo but no longer called.
