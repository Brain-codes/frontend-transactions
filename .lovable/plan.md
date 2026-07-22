Plan to make ACSL Agent deletion work reliably:

1. **Unify the delete logic**
   - Update both user-management deletion and ACSL-agent deletion to use the same backend cleanup sequence.
   - Keep the existing rule that a user cannot delete their own account.
   - Keep manager scoping: an ACSL Agent Manager can only delete ACSL Agents where `profiles.manager_id` equals that manager’s user ID.

2. **Clean all dependent records before deleting the Auth user**
   - Explicitly remove or neutralize ACSL assignment rows before Auth deletion:
     - `acsl_agent_organizations`
     - `acsl_agent_states`
   - Remove saved login credential rows for the deleted user if present.
   - Clear subordinate `manager_id` if the deleted user is an ACSL Agent Manager.
   - Null-safe cleanup for audit/user-reference fields that can block deletion, such as `updated_by`, `agent_approved_by`, and similar profile references where the schema allows null.

3. **Preserve sales history instead of deleting sales records**
   - Do not delete historical sales made by the agent.
   - If sales reference the deleted user, preserve the transaction rows and avoid breaking reports by either clearing nullable references or leaving non-blocking historical references intact depending on the actual table constraint.

4. **Improve error reporting**
   - Return the exact blocking table/field when deletion fails instead of a generic “Failed to delete user”.
   - Show that detailed message in the User Management delete modal toast so we can immediately see any remaining dependency.

5. **Verification**
   - Test deleting the specific user `ACSL Agent From Manager` (`698b7474-aa1b-4897-89b0-11687e9bcd3f`) through the same User Management action.
   - Confirm the user disappears from:
     - User Management
     - ACSL Agents list
     - Agent assignments
   - Confirm existing sales/report records still load without errors.