## Plan

1. **Make the Edit User form load reliably and faster**
   - Add a small “Loading user assignments…” state when opening Edit User.
   - Load organizations, managers, assigned states, and assigned partners in one controlled flow before showing dependent sections.
   - Avoid the current timing issue where the form appears after User Group but the assignment sections lag or get overwritten.

2. **Allow User Group updates in Edit User**
   - Enable the User Group dropdown in edit mode.
   - Include the selected `role` in the update payload sent to `manage-users/:id`.
   - When the role changes, clear/rebuild only the assignment fields that no longer apply to the new role.

3. **Retain Assigned Manager / Partner selections when editing ACSL Agents**
   - Fix the edit hydration logic so it uses the freshly-loaded manager list instead of reading stale React state.
   - For ACSL Agents, derive selected managers only from managers that actually cover the agent’s assigned partners.
   - Keep the exact checked partner IDs from the user’s saved direct assignments instead of auto-expanding to every partner under a manager/state.

4. **Persist manager relationship explicitly in the UI model where possible**
   - During save, continue saving states and selected partners.
   - If an ACSL Agent is assigned to one manager, keep the partner list constrained to that selected manager so the saved result reflects that single supervisor.
   - Prevent unchecked partners from being re-added by the auto-reconcile effect.

5. **Fix Agents Profile showing too many supervisors**
   - Change supervisor derivation from “any manager whose partners are a superset of the agent’s partners” to a stricter match based on the actual selected manager relationship inferred from edit/create rules.
   - If only one selected manager fully explains the assigned partners, show only that manager.
   - Do not list every manager who happens to cover the same partners.

6. **Validate the user flow**
   - Check that clicking Edit opens the full inline form with saved states, manager(s), and partners already selected.
   - Check that changing User Group saves.
   - Check that the ACSL Agent user shows only the originally assigned supervisor on Agents Profile.