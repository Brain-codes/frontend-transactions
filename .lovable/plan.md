## Goal
Make the "Sales by State" block on Track Performance look pixel-close to the attached reference, and ensure every Nigerian state appears in the bar list (zero-sale states included), with the Top filter controlling how many show.

## Changes (single file: `src/app/partners/components/SalesByStateChart.jsx`)

1. **Seed all 36 states + FCT** so they always render even with zero sales:
   - Maintain a constant `NIGERIAN_STATES` list (Abia, Adamawa, …, Zamfara, FCT).
   - Build counts from sales rows, then merge into the full state list (missing states default to 0).
   - Sort descending by value, then slice by `topN`. Zero-value states still render as a thin baseline tick (like Ondo/Benue in the reference).

2. **Card shell** — match reference exactly:
   - White card, `rounded-xl`, soft `shadow-sm`, light gray border.
   - Header bar: solid navy `#1e3a5f`, title "Sales by State" left in white semibold.

3. **Header filter pills** (right side, white pill style from reference):
   - "Filter by date range" — white pill, calendar icon, gray placeholder text, opens existing range Calendar popover (no future dates).
   - "All Months" pill — white pill with chevron, opens months dropdown.
   - "Top 10" pill — white pill with thicker white ring/border to look "selected" like the reference, opens 5/10/15/20/50.
   - All three: `h-9`, `rounded-md`, subtle shadow, 12px font, consistent spacing.

4. **Chart (Recharts horizontal BarChart)**:
   - `layout="vertical"`, height scales with row count (≈ `rows * 38px`, min 360).
   - `barCategoryGap={4}` and `barSize={20}` so bars sit close together like the reference.
   - Solid navy fill `#1e3a5f` for all bars (no gradient — reference uses a single tone with very subtle lightening at the bottom; we'll keep it uniform navy to match the dominant look).
   - `YAxis`: state names, no axis line, no tick line, dark gray text.
   - `XAxis`: numeric, light gray ticks, light axis line, `allowDecimals={false}`.
   - `CartesianGrid`: dashed vertical lines only (`horizontal={false}`).
   - `LabelList` on the right of each bar showing the value (gray, 11px).
   - Tooltip: rounded, light border, "Sales" label.

5. **Data logic** unchanged otherwise:
   - Uses `salesAdvancedService.getSalesData` (same source as before).
   - Filters by `dateRange` and `month` before aggregation.
   - State key resolution falls back through `state_backup → state → address.state`; unknown values are dropped (not bucketed as "Unknown") so the 36 + FCT list stays clean.

## Out of scope
- No changes to `PartnersContent.jsx` layout, the Monthly Sales chart, or the Sales by Models placeholder.
- No backend/service changes.
