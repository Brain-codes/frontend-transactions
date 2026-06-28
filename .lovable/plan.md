## Goal
In the **Create New User** form, hide the "Assign Partners" section by default. When **ACSL Agent Manager** is selected as the User Group, show a streamlined two-step assignment: pick states (with "All states" shortcut), then pick partners in those states (auto-checked, with search + select-all/clear-all). Keep existing partner-only picker for ACSL Agent / Partner Agent unchanged.

## Scope
Single file: `src/app/settings/user-management/UserManagementContent.jsx`. No backend changes — uses existing `superAdminAgentService.setAgentStates()` and `setAgentOrganizations()` already wired in.

## UX design

```text
User Group: [ACSL Agent Manager ▼]

┌─ Assign to States ────────────────────────────────────┐
│  [ ✓ All States ]   3 of 37 selected                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Abia] [✓ Lagos] [Kano] [✓ FCT] [Ogun] [✓ Rivers]│ │ ← pill toggles, wraps
│  │ [Oyo] [Kaduna] [Enugu] ...                       │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘

┌─ Assign Partners in Selected States ─ 12 selected ────┐
│  🔍 [Search by name or branch...]   [Select all] [Clear] │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ☑ Acme Stoves — Ikeja Branch          · Lagos    │ │
│  │ ☑ Bright Energy — Wuse Branch          · FCT      │ │
│  │ ☐ CleanCook Ltd — Lekki Branch         · Lagos    │ │
│  │ ... (scrollable, ~260px max-height)              │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

Compact, full-width (uses `md:col-span-2` of the existing form grid). All partners in the chosen states start **checked**; user can uncheck individually, clear all, or re-select all. Search filters the visible list.

## Implementation

### State (new)
- `selectedStates: Set<string>` — chosen states.
- Keep existing `allOrgs`, `partnerSearch`, `selectedPartnerIds`.
- Derived `partnersInSelectedStates`: `allOrgs.filter(o => selectedStates.has(o.state))`.
- Derived `visiblePartners`: above filtered by `partnerSearch` (name or branch, case-insensitive).

### Role gating
- New helper `needsStateAndPartnerAssignment(role) => role === "acsl_agent_manager"`.
- Existing `needsPartnerAssignment` stays for `acsl_agent` / `partner_agent`.
- In `handleRoleChange`: when role becomes `acsl_agent_manager`, also load `allOrgs` (reuse existing lazy-load) and reset `selectedStates` + `selectedPartnerIds`.

### States list
- Hard-coded constant `NIGERIAN_STATES` (36 states + FCT) at top of file. Each rendered as a clickable pill (selected = green `#4a5d0f` bg, unselected = light border).
- "All States" pill toggles the whole set. Counter shows `N of 37 selected`.

### Auto-check partners on state change
- `useEffect` watching `selectedStates` + `allOrgs`: when states change, recompute `partnersInSelectedStates` and set `selectedPartnerIds` to **all** of their IDs (default-checked). Removing a state drops its partners from the selection.

### Partner section controls
- Search input (small, no shadow, matches existing form aesthetic).
- "Select all" / "Clear" small text buttons act on currently-visible (post-search) partners.
- Each row: checkbox · partner name (bold) · branch (muted) · state badge (muted right-aligned).
- Empty state: "Select one or more states to see partners."

### Submission (`handleCreateUser`)
- After user is created, if role is `acsl_agent_manager`:
  - Call `superAdminAgentService.setAgentStates(newUserId, Array.from(selectedStates))`.
  - Call `superAdminAgentService.setAgentOrganizations(newUserId, Array.from(selectedPartnerIds))`.
- Both wrapped in try/catch — non-fatal (user already created), toast a soft warning if either fails.

### Cleanup
- `resetForm`: also clear `selectedStates`.
- Existing Assign Partners block for `acsl_agent` / `partner_agent` left unchanged.

## Out of scope
- Edit User modal (request is about Create New User).
- Backend / Edge function changes.
- Other roles' assignment flow.
