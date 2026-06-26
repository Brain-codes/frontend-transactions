Move the "Last Active" column out of the User Management table and into the kebab (hamburger) dropdown menu for each row, alongside the other secondary info already there (Created At, Assigned Partners).

## Changes
- `src/app/settings/user-management/UserManagementContent.jsx`
  - Remove the "Last Active" `<TableHead>` and corresponding `<TableCell>`.
  - Add a "Last Active: {value}" entry inside the existing per-row `DropdownMenu` (kebab) content, formatted the same way it currently appears in the column.
  - Adjust any `colSpan` used for empty/loading rows to match the new column count.

No other files or business logic touched.