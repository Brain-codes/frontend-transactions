## Why the stove doesn't show up

The Sell Stove search (`adminSalesService.searchStoveIds`) only returns rows from `stove_ids` where **all** of these are true:

1. `organization_id` = the selected partner's org (Swali Global Multi Concept)
2. `is_archived = false`
3. `status <> 'sold'`
4. `stove_id ILIKE %term%`

If serial `101109216` is missing from the dropdown, exactly one of (1)–(3) is false for that row (or the row doesn't exist at all). The payment model (Amina Sales Model) has no effect on visibility — it's applied later in the form.

## Step 1 — Diagnose (read-only)

Run a diagnostic against `stove_ids` for that serial and join to `organizations` to see the truth:

```sql
select s.stove_id, s.status, s.is_archived, s.organization_id, o.name as current_partner
from public.stove_ids s
left join public.organizations o on o.id = s.organization_id
where s.stove_id = '101109216';

select id, name from public.organizations
where name ilike '%swali%global%';
```

Three likely outcomes:

- **A. Row is assigned to a different partner** → transfer it to Swali Global.
- **B. `status = 'sold'`** (leftover from a previous sale/import) → reset to `available`.
- **C. `is_archived = true`** → un-archive it.
- **D. No row exists** → add it to `stove_ids` under Swali Global as `available`.

## Step 2 — Fix (one migration matching the diagnosis)

I'll ship a single migration that covers whichever case applies. Example for the most common case (wrong org / not available):

```sql
update public.stove_ids
set organization_id = (select id from public.organizations where name = 'Swali Global Multi Concept'),
    status = 'available',
    is_archived = false,
    updated_at = now()
where stove_id = '101109216';
```

For case D I'd `insert` a new row instead. I will not run this until Step 1 confirms which case we're in.

## Step 3 — Verify

Reload `/sales/create`, pick Swali Global Multi Concept + Amina Sales Model, type `101109216` in the Stove Serial search, and confirm it appears and validates as "Valid stove ID for this partner."

## Note

If serial `101109216` genuinely belongs to another partner in your records, please confirm before I reassign it — a reassignment moves ownership permanently.
