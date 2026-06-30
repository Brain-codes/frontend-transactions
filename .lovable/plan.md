## Goal
Make the Partner → State → Branch → Stove Serial flow on `Record a New Sale` predictable and smooth, with no stale stove lists, no misleading placeholders, and clear feedback while data loads.

## Scope
Single file: `src/app/admin/components/sales/CreateSalesForm.jsx`. No backend / service / schema changes — `adminSalesService.getAvailableStoveIds` already queries Supabase directly and works.

## Issues observed

1. **Stale stove list when partner changes.** `handlePartnerPick`, `handleStatePick`, and editing the partner search input do not reset `availableStoves` / `stoveSearchTerm` / `formData.stoveSerialNo`. After switching partners the old partner's stoves remain in the dropdown until the new branch is finalized.
2. **Misleading placeholder.** Stove input shows "Select a partner first" only when `isSuperAdmin && !formData.partnerName`. SAA Agents and ACSL Agent Managers who also use the partner picker get a "Search stove ID..." placeholder on a disabled field instead.
3. **No empty-state feedback.** Stove dropdown is only rendered when `filteredStoves.length > 0`, so a partner with zero available stoves silently shows nothing — looks broken.
4. **No count.** User can't tell how many stoves loaded for the chosen partner.
5. **State auto-pick edge case.** When `handlePartnerPick` returns rows with one state but multiple branches, the State select stays enabled-but-empty visually until the user clicks it. Pre-selecting that one state (already done) is fine, but stoves aren't fetched until the branch is also chosen — make this obvious with a "Select a branch to load stoves" hint.
6. **Partner dropdown closes too eagerly.** Click-outside listener runs once on mount and uses `event.target.closest(".partner-search-container")`. Selecting a stove inside `.stove-search-container` while the partner dropdown is open works, but typing into the stove input doesn't close the partner dropdown. Minor — just confirm the existing handler covers this; no change needed unless reproducible.

## Changes

### `CreateSalesForm.jsx`

- **Reset stoves on partner / state change.**
  - In `handlePartnerPick`: clear `availableStoves`, `filteredStoves`, `stoveSearchTerm`, `formData.stoveSerialNo` at the top.
  - In `handleStatePick`: same reset (any branch change invalidates the previous stove list).
  - In the partner-search `onChange` (when user edits the input after a prior selection), also clear the stove list.

- **Fix stove input placeholder + disabled condition.**
  - Replace `isSuperAdmin && !formData.partnerName` with `needsPartnerSelection && !formData.partnerName` for both `placeholder` and `disabled`. Same gate already governs the partner picker, so semantics line up for every role.

- **Improve stove dropdown UX.**
  - Render the dropdown whenever `showStoveDropdown` is true (not gated on `filteredStoves.length > 0`).
  - Inside, show three states: loading spinner (`stovesLoading`), "No available stoves for this partner" (loaded + empty), or the list.
  - Add a small helper line under the stove field: `{availableStoves.length} available stove{availableStoves.length === 1 ? '' : 's'}` once loaded and a partner is chosen.

- **Branch-pending hint.**
  - When `selectedPartnerName && !formData.partnerName` (i.e. partner picked but branch not finalized), set the stove input placeholder to "Select a branch to load stoves" and keep it disabled.

- **Tiny init nit.**
  - Initial `stovesLoading` is `true`; flip to `false` when `needsPartnerSelection` becomes true on first load so the field doesn't briefly show "Loading..." before the partner picker resolves. The existing `setStovesLoading(false)` in the init branch already handles this — verify the path and remove the misleading initial `true` only if it causes a flash.

## Out of scope

- Edge function `get-stove-ids` (already bypassed — direct Supabase query is in use).
- Pagination of partner search (current 100-row limit is sufficient with debounced search).
- Visual redesign of the cascade.

## Verification

After implementing, walk through as super_admin:
1. Type a partner name → list appears → pick partner.
2. If single state+branch: stove count appears under the stove field within ~1s.
3. If multi state: pick state → pick branch → stoves load → count appears.
4. Change partner mid-flow → stove field clears immediately, count disappears, new fetch starts.
5. Pick a partner that has zero available stoves → dropdown shows "No available stoves for this partner".
