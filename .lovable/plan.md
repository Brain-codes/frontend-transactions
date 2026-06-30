## Goal

Make `CreateSalesForm.jsx` (used at `/sales/create`) behave smoothly: hide the Transaction ID UI, give the Partner field a real "click-to-open dropdown + type-to-filter" experience, and keep Partner / State / Branch editable at all times so the user can change any selection without the form locking up.

## Changes (all in `src/app/admin/components/sales/CreateSalesForm.jsx`)

### 1. Hide the Transaction ID field
- Remove the Transaction ID `<div>` block (lines ~860–864) from the rendered form.
- Keep `formData.transactionId` and `generateTransactionId()` exactly as they are so the value is still generated and submitted — only the visible field is removed.

### 2. Keep the Partner / State / Branch cascade always editable
Today the form swaps the cascade for read-only tiles as soon as an `organization_id` is resolved (`needsPartnerSelection` flips to `false` after `handleBranchPick`). That is why the Partner field appears to "lock" once stoves load.

- In create mode, render the Partner / State / Branch cascade unconditionally (drop the `needsPartnerSelection && !isEditMode` gate around the picker JSX at line ~880). Edit mode keeps the existing read-only tiles.
- Stop flipping `needsPartnerSelection` to `false` inside `handleBranchPick` / partner resolution paths during create mode — leave the picker mounted so the user can change Partner, State, or Branch at any time.
- When the user changes Partner → reset State, Branch, branch list, and stove selection. When they change State → reset Branch and stove selection. When they change Branch → reset stove selection and reload available stoves for the new org. (`resetStoveSelection()` already exists; reuse it in each handler.)
- Never disable the Partner input while stoves are loading. Only the Stove Serial field reflects `stovesLoading`.

### 3. Partner field = dropdown + searchable
Currently the list only appears when the user types (for non-super-admin) and `distinctPartners` is empty until the debounced fetch returns.

- On focus of the Partner input, always open the dropdown (`setShowPartnerDropdown(true)`) and trigger an initial fetch if `partners` is empty — for every role, not just `super_admin`. Use the existing `manage-organizations` fetch with `limit=500` and no `search` param to load the first page.
- Keep the existing debounced effect for typing; when the user types, send the `search` query and re-render `distinctPartners`. The same list element now serves both "browse" and "search" use cases.
- Show the dropdown whenever it is open and focused, regardless of whether `partnerSearch` is empty (remove the `userRole === "super_admin" || partnerSearch.trim()` gate at line ~905).
- Close the dropdown on outside click (the existing `partner-search-container` click-away handler already does this — keep it).
- When a partner is picked, fill the input with its name, close the dropdown, and load its branches (existing `handlePartnerPick` logic). Editing the input afterwards reopens the dropdown and clears the downstream cascade (existing behavior, kept).

### 4. Smooth-flow guarantees
- Partner, State, and Branch selects remain enabled based only on their own prerequisite (State needs a partner; Branch needs a state). They are never disabled because stoves are loading or already loaded.
- Stove Serial field stays disabled only until a Branch (org) is chosen, then shows the available-stoves dropdown with the existing loading / empty / count states.
- Submit button continues to require `partnerName`, branch, and `stoveSerialNo` via existing validation — no validation logic changes.

## Out of scope
- No backend / edge-function changes.
- No changes to validation rules, submission payload, or edit-mode behavior beyond hiding the Transaction ID label.
