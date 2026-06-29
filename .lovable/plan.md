## Goal
Keep only the 2 most-recently-created Partner Agents in the system, and delete every other `partner_agent` record (both `profiles` row and `auth.users` entry) so the Partner Agents Profile view shows exactly the unified-system records.

## Why this is needed
The view fetches `role=partner_agent` from `profiles` via the `manage-users` edge function. Legacy/orphan rows from earlier creation attempts (before the unified flow) are still in `profiles`, inflating the list beyond the 2 you created.

## Approach
Since I can't run SQL directly against your Supabase, the cleanup runs through the existing `manage-users` edge function (which you control with your super_admin session) using its already-deployed DELETE endpoint. I'll add a one-time, guarded admin action on the Partner Agents Profile page.

### Steps

1. **Add a "Clean Legacy Records" button** (visible to super_admin only) in the filter bar of `src/app/agents/partner-agents-profiles/PartnerAgentsProfilesContent.jsx`.

2. **Click flow:**
   - Fetch all `partner_agent` users via `GET /manage-users?role=partner_agent&limit=500&sortBy=created_at&sortOrder=desc`.
   - Identify the 2 newest (top 2 of the sorted list) → "keepers".
   - Show a confirmation dialog listing the keepers (name + email + created_at) and the count of records that will be deleted, with the full deletion list collapsed for review.
   - On confirm, loop the rest and call `DELETE /manage-users/{id}` for each (sequential, with per-row toast + progress counter).
   - On finish, reload the list and toast the summary (deleted X, kept 2, failures Y).

3. **Safety guards:**
   - Button disabled unless the current user is `super_admin`.
   - Confirmation modal requires typing `DELETE` to enable the confirm button.
   - If fewer than 3 records are returned, the button is disabled (nothing to clean).
   - Each delete is wrapped in try/catch; failures are reported but don't abort the loop.

4. **No edge-function changes required.** `delete-operations.ts` already accepts `partner_agent` deletes (we updated that earlier), and it removes both the auth user and the profile row.

### Files touched
- `src/app/agents/partner-agents-profiles/PartnerAgentsProfilesContent.jsx` — add button, confirmation modal, and cleanup handler.

### Out of scope
- No schema changes, no migrations, no SQL execution.
- Other roles (`partner`, `agent`, `acsl_agent`) are not touched.
- After cleanup, if you ever need the same operation for other roles, we can generalize it later.

## What you'll see after running it
The Partner Agents Profile view will show exactly 2 rows — the two you created — and the underlying `profiles` + `auth.users` tables will no longer hold the legacy partner_agent records.