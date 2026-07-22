## Plan

Fix the Agents in State modal so it uses the same partner-derived state assignment rule as the Agents Performance view.

### What I found

- The Agents Performance view derives an agent’s assigned states from the states of that agent’s assigned partner organizations.
- The States Performance view still uses `acsl_agent_states` in two places for ACSL agent counts and the modal’s `States Covered` / `State List` values.
- That legacy state table is why the modal can show 37 states while Agents Performance shows 25.

### Changes to make

1. **Stop using legacy state rows for the Agents in State modal**
   - Replace the modal’s `acsl_agent_states` source with partner-derived assignments from:
     - `super_admin_agent_organizations`
     - `acsl_agent_organizations`
   - Use the same agent-id column variants already used elsewhere: `agent_id`, `super_admin_agent_id`, and `user_id`.

2. **Build one ACSL agent → assigned states map**
   - For each assignment row, resolve `organization_id` → `organizations.state`.
   - Add that state to the assigned agent’s state set.
   - Deduplicate states per agent.
   - Ignore empty / unknown states.

3. **Use that map everywhere in States Performance**
   - `agentCoveredStates`
   - per-state ACSL agent counts
   - `Agents in State` modal rows
   - `States Covered` count
   - `State List`

4. **Keep partner-side agents separate**
   - Partner / partner-agent users will still cover only their own organization’s state.
   - ACSL Agent and ACSL Manager users will cover all states from their assigned partners.

5. **Update realtime triggers**
   - Include the assignment tables in the States Performance realtime refresh list so modal/state counts update when assignments change.
   - Remove `acsl_agent_states` from this view’s refresh source if it is no longer used.

### Expected result

- The Agents in State modal will no longer display legacy 37-state coverage.
- `States Covered` for each ACSL agent in the modal will match the same partner-derived values used by the Agents Performance `States Assigned` column.
- The States KPI sublabel such as `25 of 26 covered by an agent` will remain consistent with the Agents Performance total.