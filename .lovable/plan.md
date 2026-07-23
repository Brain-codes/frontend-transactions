## Problem

On the Edit Sale form, the LGA dropdown renders as empty ("Select LGA") even though `lga_backup` is present on the record.

## Root cause

`get-sale` does return `lga_backup`, and `populateFormDataForEdit` maps it to `formData.lgaBackup`, so the value reaches state. The failure is in the LGA `<Select>` at `src/app/admin/components/sales/CreateSalesForm.jsx` (≈lines 1560–1582):

- Radix `Select` matches `value` against `<SelectItem value>` **case-sensitively**.
- The fallback that injects the current LGA when it's not in the geo list dedupes **case-insensitively**:
  ```
  !list.some((l) => l.toLowerCase() === formData.lgaBackup.toLowerCase())
  ```
- When the DB value differs in case/whitespace from the geo-list entry (e.g. DB `"IKORODU"` vs geo `"Ikorodu"`, or `"Municipal "` with a trailing space), the fallback treats them as equal and does not insert the DB value. The SelectItem is `"Ikorodu"`, `Select.value` is `"IKORODU"` → no match → the trigger falls back to the placeholder.

The State select can have the same case-mismatch class of bug (its options come from `Object.keys(geoData.lgas)`), but the more visible one is LGA because `lgaAndStates[stateBackup]` also fails when the key case differs, dropping options to `[]` and only relying on the fallback.

## Fix (single component, no data migration)

Normalize the persisted LGA (and State) to match the geo catalogue whenever geo data is present, so Radix's strict value match succeeds.

Edit `src/app/admin/components/sales/CreateSalesForm.jsx`:

1. Add a small case-insensitive resolver:
   ```js
   const findCI = (list, v) =>
     list.find((x) => x.trim().toLowerCase() === String(v || "").trim().toLowerCase());
   ```

2. After `geoData` finishes loading in edit mode, run a one-shot effect that reconciles `stateBackup` / `lgaBackup` to the canonical spellings from `geoData`:
   ```js
   useEffect(() => {
     if (!isEditMode) return;
     if (!geoData?.lgas || Object.keys(geoData.lgas).length === 0) return;

     const stateKeys = Object.keys(geoData.lgas);
     const canonicalState = findCI(stateKeys, formData.stateBackup) || formData.stateBackup;
     const lgaList = geoData.lgas[canonicalState] || [];
     const canonicalLga = findCI(lgaList, formData.lgaBackup) || formData.lgaBackup;

     if (canonicalState !== formData.stateBackup || canonicalLga !== formData.lgaBackup) {
       setFormData((prev) => ({
         ...prev,
         stateBackup: canonicalState,
         lgaBackup: canonicalLga,
       }));
     }
   }, [isEditMode, geoData?.lgas, formData.stateBackup, formData.lgaBackup]);
   ```

3. Harden the LGA `SelectContent` render (belt-and-braces) so the fallback insertion is exact-match, not case-insensitive:
   ```js
   const options = (formData.stateBackup && lgaAndStates[formData.stateBackup]) || [];
   const list = [...options];
   if (formData.lgaBackup && !list.includes(formData.lgaBackup)) {
     list.unshift(formData.lgaBackup);
   }
   ```
   Apply the same `!includes` check to the State select if it uses similar fallback logic.

## Why this works

- Once the LGA `value` string is byte-identical to a `SelectItem value`, Radix Select renders the label — this is the exact contract it enforces.
- If geo data isn't loaded yet (or the LGA truly isn't in the catalogue), the exact-match fallback still injects the raw DB value as an option, so the field is never empty.
- The reconciliation only fires in edit mode and only when values actually change, so it can't clobber a user edit or loop.

## Verification

1. Open a sale whose LGA in the DB has a different case (or trailing space) from the geo list — the LGA now shows on open.
2. Open a sale whose LGA matches exactly — unchanged behaviour, no flicker.
3. Change State manually — LGA still resets (handleStateChange behaviour unchanged, because `isInitializing` has already been cleared by then).
4. Submit an unchanged edit — `state_backup` / `lga_backup` in the DB now reflect the canonical spelling (a harmless normalization).

## Scope

Only `src/app/admin/components/sales/CreateSalesForm.jsx` is touched. No backend, service, or schema changes.
