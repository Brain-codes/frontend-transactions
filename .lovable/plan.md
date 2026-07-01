## Goal
Restore the original Sales Overview doughnut layout and add the Sales Models doughnut beside it with a clean, clearly separated presentation.

## Current Issue
Both doughnuts sit in a single 2-column grid with the Stove Inventory metrics row underneath both charts. This makes the layout confusing because the metrics only belong to the first chart, and the second chart has no visible legend or label of its own.

## Plan

1. **Revert the Sales Overview block to its previous layout**
   - Return the Stove Inventory doughnut to its original standalone structure.
   - Place its three metric rows (Stoves Sold to Partners, Stoves Bought by End Users, Unsold Stoves with Partners) directly underneath the doughnut, inside the same card.
   - Keep the "STOVES RECEIVED" center label and doughnut styling exactly as before.

2. **Add the Sales Models doughnut as a separate, equally sized card**
   - Place it beside the Sales Overview card in a 2-column grid at the section level (two cards side by side).
   - Inside the Sales Models card: doughnut chart + its own color-coded legend list showing each payment model name, count, and percentage.
   - Center label inside the doughnut: "TOTAL SALES" with the total count.
   - Use the same doughnut sizing and inner/outer radius as the original for visual consistency.

3. **Move the Financial Snapshot section below both cards**
   - The Financial KPI tiles (Expected Receivable, Amount Received, Outstanding Balance) remain as a full-width row under both doughnut cards, separated by the same gradient divider.

## Result
- Left card: Sales Overview (original doughnut + original metric rows)
- Right card: Sales Models Distribution (new doughnut + its own legend rows)
- Below both: Financial Snapshot KPI tiles

No changes to data sources, API calls, or filter behavior — purely a layout/structural refactor of the dashboard chart section.