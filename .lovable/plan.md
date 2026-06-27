## Add sortable Received / Sold / Available columns to Track Performance

Add three-state column sorting to the **Received**, **Sold**, and **Available** column headers in the Track Performance table (`src/app/partners/components/PartnersContent.jsx`).

### Behavior

Each of the three headers becomes clickable with a sort indicator next to the label. Clicking cycles through three states:

1. **None** (default) — original order from the API, neutral up/down arrow icon (`ArrowUpDown`)
2. **Ascending** — smallest → largest, up arrow icon (`ArrowUp`)
3. **Descending** — largest → smallest, down arrow icon (`ArrowDown`)
4. Clicking again returns to **None** (normalized / original state)

Only one column can be actively sorted at a time. Clicking a different column resets the others to None and starts that column at Ascending.

### Implementation details

- Add state: `const [sortConfig, setSortConfig] = useState({ key: null, direction: null })` where `key ∈ {'received','sold','available'}` and `direction ∈ {'asc','desc',null}`.
- Wrap the header label + icon in a `<button>` inside the existing `TableHead` for each of the three columns, preserving the current green styling and badge colors.
- Derive `displayedPartners` by:
  - Starting from the existing filtered/paginated source.
  - If `sortConfig.direction` is null, use the array as-is (original order preserved).
  - Otherwise, apply `[...partners].sort((a,b) => …)` on the numeric value for that key.
- Apply sorting **before** pagination so sorted results span all pages correctly.
- Icons from `lucide-react`: `ArrowUpDown`, `ArrowUp`, `ArrowDown` (add to existing imports).

### Scope

- File touched: `src/app/partners/components/PartnersContent.jsx` only.
- No backend, no API, no other tables affected.
- No changes to filters, pagination controls, or the Purchases from ACSL modal.
