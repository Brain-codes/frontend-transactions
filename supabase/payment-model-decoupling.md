# Payment models ↔ partners

**Audience:** whoever maintains `sales-monitoring-web`, the mobile app, and the Supabase edge functions.
**Status:** current. Supersedes the June 2026 decoupling described at the bottom.
**Date:** 2026-07-21

## Where things stand

Sales models are **tied to a partner**, and the **external application is the source
of truth**. A super admin no longer assigns them.

Every sync payload carries the partner's full entitlement list, and the sync mirrors
it onto `organization_payment_models`. At point of sale, a partner may only use the
models assigned to them.

This reverses the June 2026 decoupling (kept at the bottom for history). It is *not*
a return to the original design: the assignment now comes from the CSV, not from a
super admin screen.

## The CSV contract

`external-csv-sync` reads three new columns (all optional):

| Column | Meaning |
|---|---|
| `Partner Sales Models` | The partner's full entitlement list. Authoritative when present. |
| `Order Sales Model` | The model used for *this* transfer's sale. Also grants entitlement. |
| `Order Sales Model Duration` | Duration in months for the above. |

**Both columns grant entitlement**, because the ERP does not always populate the
list — a real payload (Atmosfair, 21 Jul 2026) sent
`Order Sales Model = "Direct Community Engagement Sales Model"` with
`Partner Sales Models = "N/A"`. Reading only the list left that partner with no
models and no installment option at point of sale.

| `Partner Sales Models` | Behaviour |
|---|---|
| Present | List **∪** order model, **authoritative** — models absent from it are revoked. |
| `N/A` / empty | Order model only, **additive** — it is assigned, and nothing is ever revoked. One order is not evidence of the partner's full set. |
| Both empty | No-op. |

`Partner Sales Models` is a `;`-separated list of `Name (Nm)`:

```
"Hakimi Sales Model (6m); Amina Sales Model (12m)"
```

`external-sync` (the JSON sibling) accepts the same thing on
`organization_data.partner_sales_models`, either as that string or as
`[{ name, duration_months }]`.

### Resolution rules

1. Each entry is matched against `payment_models` on **normalized name + `duration_months`**
   (case- and whitespace-insensitive). Name alone is not enough — "Amina (6m)" and
   "Amina (12m)" are different models.
2. **No match → a stub model is created** with the given name and duration and
   `fixed_price = 0`, `min_down_payment = 0`, `is_active = true`. A partner is
   therefore never blocked from selling by a missing model. The sync logs a
   `warn` so a super admin can fill in the pricing.
   Zero pricing is safe today because **the sale amount is operator-entered** in
   both clients and `create-sale` honours it; `fixed_price` is only a fallback
   when the client sends no amount. This changes once the external app starts
   sending amounts — see *Coming next*.
3. The set is then **reconciled**: models present are assigned; models absent are
   unassigned **only when `Partner Sales Models` was supplied** (see the table
   above). The external app owns the set only when it states the set.
4. **An absent or empty cell means "nothing was said", not "revoke everything"** —
   existing assignments are left untouched.
5. Entitlements are applied even when the partner is `manually_edited`; that flag
   guards contact details only.
6. The whole step is non-fatal — a failure is logged and stove ID processing
   continues.

## How clients read it — never per partner

There are hundreds of thousands of partners, so fetching models per partner is not
an option, and the mobile app must work offline. Both clients therefore:

1. Load the **full active catalogue once** (`GET payment-models`) and cache it.
2. Read the partner's **`payment_model_ids`** — a bare ID array now returned on every
   organization row by `manage-organizations` (both the list and single-org reads).
3. **Resolve the IDs against the cached catalogue in memory** at point of sale.

No extra request is made when a partner is selected, online or offline.

### Three states, never conflated

`payment_model_ids` carries three distinct states, and clients must not collapse
them into "empty":

| `payment_model_ids` | Meaning | Client behaviour |
|---|---|---|
| `[...]` | These models | Show exactly these |
| `[]` | Genuinely none assigned | **Full payment only**, with an explanatory note |
| `null` | Unknown — lookup failed, or an older cached row | Fall back to every active model |

Installments are an entitlement: a partner earns them by being assigned a model,
so `[]` means full payment only. `null` is not an entitlement decision at all —
it means we don't know, and blocking a sale on missing information would punish
the seller for our failed lookup.

`create-sale` applies the identical rule (`!assignedIds.includes` → 403).
**These must not diverge**: if a client is more permissive than the server the
picker offers models that then fail on submit; if it is more restrictive,
sellers silently lose options they are entitled to.

Separately from all three, a partner may be assigned models that cannot be
*resolved* against the cached catalogue (inactive, or created after the client
cached it). Both clients show an amber warning there rather than silently
offering nothing — that case is a data fault, not a permission, and must not be
shown as "none assigned" or it would hide the fault.

## Server-side enforcement — `create-sale`

Client-side filtering is cosmetic on its own, so the installment branch re-checks
the org's assignments. Any partner whose assignments don't include the chosen
model — including a partner with no assignments at all — gets a 403:

> `This partner is not assigned the "<name>" sales model`

The endpoint fetches the partner's whole assignment list rather than probing for
a single link, so a failed lookup returns a 500 instead of a misleading 403.

The sale `amount` remains operator-entered (see the request contract below).

## Installment request contract — `create-sale`

| Field | Type | Required | Notes |
|---|---|---|---|
| `isInstallment` | boolean | yes | Must be `true` to enter the installment path. |
| `paymentModelId` | uuid | yes | Must be **active** and **assigned to the partner**. |
| `initialPaymentAmount` | number | no | The down payment. Optional and open-ended; falls back to `amountReceived`, then `0`. |
| `initialPaymentMethod` | string | no | Defaults to `"cash"`. |
| `initialPaymentProofImageId` | uuid | no | Empty string is normalized to `null`. |

`amount` is the operator-entered sale amount and is honoured as sent. The model's
`fixed_price` is used only when no amount is supplied.

## Migration

`20260721_sales_models_from_external_sync.sql` drops `NOT NULL` from
`organization_payment_models.assigned_by` and `payment_models.created_by`. The sync
authenticates with an app token and has no acting user, so `NULL` there means
"written by the external sync" rather than attributing machine writes to a person.
It also indexes `organization_payment_models.organization_id`, which the sync and
both reads hit constantly.

## Coming next

The external application will start sending the **sales model amount**. When it does,
stub models stop being zero-priced and `fixed_price` becomes meaningful — revisit
rule 2 above and decide whether the operator may still edit the amount.

---

## History: the June 2026 decoupling (reversed)

Between 2026-06-28 and 2026-07-21, every partner could use every active payment
model. `organization_payment_models` was left in place but unused for gating, the
`create-sale` org↔model check was removed, and both clients listed all active
models. That is no longer the behaviour. The table was never dropped, so no data
was lost in either direction.
