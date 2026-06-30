## Goal

On the **Record a New Sale** form, replace the single partner picker with a 3-step cascade — **Partner → State → Branch** — that resolves to one organization row (`organizations.id`). The choices each user sees are scoped to what their role is allowed to access. The currently selected branch's organization id is what gets used for stove search, payment models, and submission.

## Data model recap

Each row in `organizations` represents one branch and already carries `partner_name`, `state`, and `branch`. A "Partner" in the UI is the set of org rows sharing the same `partner_name`. The cascade just narrows that set down to one row.

## Role scoping (what each user sees)

| Role | Partners visible | After partner pick |
|------|------------------|--------------------|
| `super_admin` | All partners (search via `manage-organizations`) | All states + branches for that partner |
| `acsl_agent_manager`, `acsl_agent`, `super_admin_agent` | Only partners assigned to them (`superAdminAgentService.getAgentOrganizations`) | Only the states/branches among their assigned rows for that partner |
| `partner` (partner admin) | Their own partner only, auto-selected and locked | All branches/states of that partner |
| `partner_agent` | Their own partner + branch, auto-selected and locked | Locked |
| Edit mode (any role) | Locked to the sale's existing partner/state/branch | Locked |

The existing logic that hides the picker when an org context already exists stays, but for `partner` admins we now expand it to a state+branch picker (since one partner can have many branches). For `partner_agent`, everything stays locked.

## UI changes (`src/app/admin/components/sales/CreateSalesForm.jsx`)

Inside the **Transaction Information** grid, replace the single partner block + the existing `Retailer / Branch / CSO` field with three cascaded fields:

1. **Partner *** — searchable dropdown of distinct `partner_name` values from the scoped org list. Picking a partner clears state/branch.
2. **State *** — `Select` of distinct states among that partner's rows in the scoped list. Disabled until a partner is chosen. Picking a state clears branch. Auto-selected and locked if only one option.
3. **Branch *** — `Select` of branches for the chosen partner+state. Disabled until state is chosen. Auto-selected and locked if only one option. Selecting it sets the resolved `organization_id`.

The free-text `retailerBranch` input is replaced by this Branch selector (its value is still sent as `retailerBranch` on the payload, derived from the chosen branch name, so the rest of the pipeline is unchanged).

## State & flow

- Fetch the scoped org list once on mount (super_admin → `manage-organizations` paginated, SAA roles → `getAgentOrganizations`, partner/partner_agent → their profile org only). Cache in component state.
- Derive `partnerOptions = uniq(orgs.partner_name)`, `stateOptions = uniq(orgs where partner_name = picked).state`, `branchOptions = orgs where partner_name+state match`.
- When Branch resolves to a single `organizations.id`:
  - persist `saa_selected_org_id` / `saa_selected_org_name` in sessionStorage (existing behavior),
  - set `formData.partnerName` and `formData.retailerBranch`,
  - call `fetchAvailableStoves()` and `fetchPaymentModels(orgId)` (existing functions).
- Super admin search keeps a debounced fetch when query length grows past the initial page (existing pattern), but the cascade itself operates over loaded results.
- Validation: all three must be set before submit (`errors.partnerName`, `errors.state`, `errors.branch`).

## Out of scope (confirming)

- No changes to the sales submission API, edge functions, or DB schema.
- "Agents/users records" linkage is interpreted as role-scoped visibility of partner data; no new "record on behalf of agent X" field is added.
- No styling overhaul — uses the existing green form theme and shadcn `Select`/`Input` components.

## Technical notes

- Files touched: `src/app/admin/components/sales/CreateSalesForm.jsx` only.
- The existing `needsPartnerSelection` flag is generalized to `needsOrgSelection` and is true whenever the resolved `organization_id` isn't known yet (covers super_admin every time, partner admins with multiple branches, and any SAA without a stored selection).
- Edit mode keeps the current read-only tiles for Partner and uses two new read-only tiles for State and Branch sourced from `initialData`.
