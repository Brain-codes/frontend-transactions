## Goal
Validate Nigerian phone number format on both **Contact Phone** and **End User Phone** fields on the sales form. Accept only:
- `08031234567` (11 digits, starts with 0)
- `+2348031234567` (starts with +234)
- `2348031234567` (13 digits, starts with 234)

## Format rule
Digits-only normalization must yield either:
- 11 digits starting with `0` followed by `[7-9][0-1]` (Nigerian mobile prefixes 70/71/80/81/90/91), or
- 13 digits starting with `234` followed by `[7-9][0-1]`.

Regex on the raw input: `/^(?:0|\+?234)[7-9][0-1]\d{8}$/` after stripping spaces/dashes.

## Changes — `src/app/admin/components/sales/CreateSalesForm.jsx`

1. Add a helper `isValidNgPhone(raw)` near the top of the component.
2. **On change** (via `handleInputChange` or an inline check for these two fields): when the field is non-empty and fails the format check, set the field error to:
   `"Enter a valid phone number (e.g. 08031234567, +2348031234567, or 2348031234567)."`
   When it passes, clear that format error.
3. **Live duplicate check (End User Phone)**: only run the debounced Supabase duplicate query when the format is valid — otherwise skip the query and keep the format error.
4. **Submit validation**: in the existing validator (around line 728), reject submit if either phone fails the format check, with the same message.
5. Contact Phone gets the format check only (no uniqueness requirement).

No server / edge function changes.
