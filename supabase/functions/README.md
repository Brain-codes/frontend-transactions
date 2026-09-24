# Edge functions

Source for every edge function the SALES Supabase project runs
(`oeiwnpngbnkhcismhpgs`). One directory per function, matching the deployed
slug.

## Twelve functions were recovered here on 2026-08-19

Production ran 62 edge functions. This repository held source for 50 of them.
The missing twelve had been deployed from somewhere other than this repository
(the dashboard, or a working copy that was never committed), so the repository
could not rebuild the project and nobody reading it would know the functions
existed:

| Function | Known caller |
|---|---|
| `upload-image` | Sell Stove photo and agreement upload (`adminSalesService.jsx`) |
| `assign-sale-to-agent` | sale assignment |
| `check-user-exists` | pre-auth account check |
| `create-agent` | agent creation |
| `create-agent-user` | agent account creation |
| `create-sales-history` | sales audit trail write |
| `get-sales` | sales list |
| `get-sales-activities` | activity feed |
| `get-sales-advance-two` | advanced sales query (7 files) |
| `get-sales-history` | per-sale audit trail |
| `manage-branches` | partner branch CRUD (8 files) |
| `upload-stove-ids-csv` | stove ID bulk upload |

They were recovered with `supabase functions download <slug> --project-ref`,
which unpacks the deployed ESZIP bundle back to source. The recovery is
faithful, not approximate: downloading three functions that this repository
already tracks returned bytes identical to the committed copies for
`manage-profile` and `geo-data`.

Nothing was deployed to produce this commit. The bundles were read from the
preview branch project, which carries clones of the same function versions, so
production was never touched.

## What the Supabase GitHub integration actually does

Both of these were measured on this project, not assumed, because `main` is
registered as a Supabase branch pointing at the **production** project. A push
to `main` runs the integration against the live database.

**It never deletes.** A full integration deploy ran against the preview branch
project on 2026-08-19 while the repository held 53 functions and the project
held 64. Nothing was removed. There is no prune step, so a function that exists
only in production stays there.

**It deploys exactly the functions declared in `supabase/config.toml`, and
nothing else.** A `[functions.<slug>]` block is what makes the integration
deploy that function. Everything else in this directory it ignores: across
pushes that added `data-center-read` and `data-center-admin`, it deployed
neither, and both had to go out by hand.

Four blocks are declared today: `end-user-records-api`, `get-end-user-api-key`,
`sale-dictionary` and `change-request-intake`. Only those four are deployed by the
integration; every other function goes out by hand.

**This happens on a merge to `main`, not only at branch creation.** An earlier
version of this file said branch creation only. That was wrong, and merging
PR #8 and PR #9 on 2026-08-20 proved it: the integration redeployed both
declared functions to production a minute later. No harm on that occasion,
because the deployed copies already matched this repository, but the rule is
sharper than it was written.

So it cuts both ways, and both are worth knowing:

- Adding source to this directory changes nothing that is running, which is why
  recovering the twelve was inert.
- **Adding a `[functions.*]` block turns every future merge to `main` into a
  production deploy of that function.** That is a useful lever when you want it
  and a trap when nobody has mentioned it. `create-sale` deliberately has no
  block, which is why the race fix in PR #9 sat on `main` without going live.

**A function with no block has to be deployed by hand:**

```bash
supabase functions deploy <slug> --project-ref <ref>
```

## Before you deploy anything from this directory

Check the deployed copy first. This repository has been behind production
before, and `supabase functions deploy` overwrites without warning:

```bash
supabase functions download <slug> --project-ref oeiwnpngbnkhcismhpgs
```

Run that into a scratch directory and diff it against the copy here. See
`DRIFT.md` for the functions where the two are known to disagree.

## New accounts take their role and organisation from the server (2026-09-27)

`create-agent`, `create-agent-user`, `super-admin-agents`, `manage-users`,
`manage-organizations` (`user-utils.ts`, used by both `write-operations.ts`
and `csv-import-operations.ts`), `manage-agents`, `manage-admin-users`,
`external-sync` and `external-csv-sync` now also write `app_metadata` (role
and organisation) on every account they create, alongside the existing
`user_metadata` write. Migration `20260927200000_account_roles_from_server.sql`
then makes the profile take role and organisation from `app_metadata` only: at
insert, and again when the auth service writes `app_metadata` a moment later,
for a profile that has no role yet.

**Deploy order matters:** deploy all nine changed functions above first, then
apply the migration. Applying the migration before a function redeploys means
that function's new accounts get no role until it does.

Diff each of the nine against its deployed copy before deploying it
(`supabase functions download <slug> --project-ref oeiwnpngbnkhcismhpgs`, per
"Before you deploy anything" above), the same as any other change in this
directory.
