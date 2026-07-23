## Plan to make LGA recall on Edit Sale work reliably

I checked the current edit flow and confirmed these points:
- The sales list data includes `lga_backup` for the affected record, for example `Kano Municipal`.
- `get-sale` selects `*` from `sales`, so the detailed edit payload should also include `lga_backup`.
- `populateFormDataForEdit()` already maps `lga_backup` into `formData.lgaBackup`.
- The visible failure is in the UI select: State shows `Kano`, but LGA shows the placeholder. This matches a known Radix/shadcn Select issue where a controlled Select can render blank if its value and matching option are not available in the same render cycle.

## Fix

1. **Normalize the saved State/LGA before putting it into form state**
   - Move the State/LGA reconciliation into the edit-data population step, not after the form has already rendered.
   - Trim saved values and match them case-insensitively against the LGA catalogue.
   - Example: saved `kano municipal ` becomes canonical `Kano Municipal` before the Select renders.

2. **Make the LGA options list always contain the selected LGA**
   - Build a stable `lgaOptionsForSelectedState` list with `useMemo`.
   - If `formData.lgaBackup` is set but missing from the catalogue, insert it as the first option.
   - This prevents the selected value from ever being orphaned.

3. **Force the LGA Select to remount when edit data/options become ready**
   - Add a `key` to the LGA Select based on `stateBackup`, `lgaBackup`, and the options count.
   - This resolves the Radix/shadcn timing problem where the trigger remains blank even after the option later appears.

4. **Prevent accidental clearing during edit initialization**
   - Update `handleStateChange` so it only clears LGA when the user actually changes State.
   - During edit initialization/reconciliation, State changes must preserve the original LGA.

5. **Add a safe fallback display**
   - If the Select still has a value but cannot resolve a label, render the saved `formData.lgaBackup` as the visible selected text instead of showing `Select LGA`.
   - This guarantees the user sees the returned LGA like every other field.

6. **Verify against the real edit modal**
   - Open the sale edit modal from Sales Records.
   - Confirm the Location section shows both:
     - State: `Kano`
     - LGA: the saved value, e.g. `Kano Municipal`
   - Confirm changing State manually still resets the LGA so users cannot save a mismatched State/LGA pair.