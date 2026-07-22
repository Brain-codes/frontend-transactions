## Plan

1. **Fix the chart query failure**
   - Update `AgentRecordsChart.tsx` so it no longer selects `sales.quantity`, because the live `sales` table does not have that column.
   - Count each non-archived sale row as `1` record collected.

2. **Use the same attribution rule as the Agents Performance table**
   - Fetch ACSL agent IDs from the `manage-users` endpoint for `acsl_agent` and `acsl_agent_manager`.
   - Query `sales` by agent attribution:
     - `created_by IN agentIds`
     - plus `sold_on_behalf_of IN agentIds` where present, with de-duplication by sale ID.
   - Exclude partner/partner-agent sales by only using the ACSL agent roster.

3. **Bucket sales into the monthly chart correctly**
   - Use `sales_date` first, then `created_at` as fallback.
   - Add `1` to the correct month per sale.
   - This should place Kamal Mustapha’s confirmed 6 sales on the chart for July.

4. **Improve failure visibility**
   - If the chart query fails, show a small inline error instead of silently leaving the chart at zero.
   - Keep the chart layout and colors unchanged.

5. **Verify against the live data path**
   - Re-run the same browser-side data check after implementation.
   - Confirm Kamal Mustapha is in the agent roster and the monthly chart data includes his 6 records collected.
   - Visually confirm the Records Collected chart no longer displays zero for that month.