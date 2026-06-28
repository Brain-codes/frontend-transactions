## Plan

1. **Use a backend-accepted role for the new Agent group**
   - Treat the new **Agent** user group as the existing backend-compatible role value `agent` instead of `agent_user`.
   - This removes the current edge-function validation error caused by sending unsupported role values.

2. **Make Agent creation simple and single-partner bound**
   - Keep the UI label as **Agent** in the Create/Edit User form.
   - When Agent is selected, show the full partner list and enforce exactly one selected partner.
   - Send `role: "agent"` and `organization_id` during creation/update so the user is created with the right role immediately.

3. **Fix User Management display**
   - Update role labels and badges so `agent` displays as **Agent**, not **Partner Agent** or **ACSL Agent**.
   - Keep Partner Agent displayed separately as **Partner Agent** using `partner_agent`.

4. **Update app role handling**
   - Update permissions/auth routing so `agent` users can log in and use the same sales/stove access expected for a partner-linked agent.
   - Stop aliasing `agent` to `partner_agent` in the UI permission layer where it causes the new group to lose its identity.

5. **Verify the flow**
   - Check that the Create/Edit User form remains controlled and does not show the uncontrolled Select warning.
   - Confirm the runtime error about allowed roles is resolved and newly created Agent users refresh in User Management as **Agent** with one partner association.

## Technical notes

- The current error comes from `/manage-users`, which only accepts a limited role set and rejects `agent_user`.
- The existing code already has legacy support for `agent`; using that value gives the new **Agent** group a backend-compatible role without requiring database or edge-function changes.