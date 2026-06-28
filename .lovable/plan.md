## Changes (frontend only, `src/app/agents/agents-profiles/AgentsProfilesContent.jsx`)

### 1. Color-coded role superscript

Right now the role under each Agent Name is plain gray. Map each role to a distinct text color and apply it as `className` on the superscript span:

- `super_admin` → red (`text-red-600`)
- `acsl_agent_manager` → purple (`text-purple-600`)
- `acsl_agent` → green (`text-green-700`)
- `partner` → blue (`text-blue-600`)
- `partner_agent` → amber (`text-amber-600`)
- fallback → gray

Still small (`text-[9px]`), still no badge background — only the font color changes.

### 2. Fix wrong supervisors on the Agents Profile view

**Root cause.** The Create New User cascade does let you pick specific managers, but only the *partners* and *states* are persisted (`setAgentOrganizations`, `setAgentStates` in `UserManagementContent.jsx` lines 486–497). There is no agent→manager link in the schema. The Supervisor column in `AgentsProfilesContent.jsx` (`hydrateSupervisors`, lines 289–342) then derives supervisors by **any partner overlap** — so every manager who happens to also manage one of the agent's partners is listed, even if they were never selected when the agent was created. That is why your ACSL Agent shows several supervisors instead of the one you picked.

**Fix (no schema change).** Tighten the derivation so a manager is listed as a supervisor only when that manager's assigned partners are a **superset** of the agent's assigned partners — i.e. the manager covers *every* partner the agent has. With the cascade flow ("pick state → pick manager → pick partners from that manager"), the agent's partners are guaranteed to all belong to the chosen manager, so the chosen manager will match. Other managers will only match if they coincidentally also cover all the same partners (genuine shared supervision), which is the correct semantic without a schema change.

Concretely in `hydrateSupervisors`:

- Keep loading each manager's org-id set as today.
- For each ACSL agent, compute `agentOrgIds`. If empty → no supervisors.
- Replace the "any id in common" check with: include manager `m` iff `agentOrgIds.every(id => m.orgIds.has(id))`.
- Everything else (batched updates, mount guard, modal) stays the same.

### 3. Out of scope

- No schema changes, no edge-function changes, no changes to the Create New User flow.
- No changes to the Partners Assigned column or modal.
- Other roles (`acsl_agent_manager`, `partner`, etc.) keep their existing Supervisor cell ("—").

## Verification

On `/agents/profiles`:
- Each Agent Name shows the role beneath it in the role's color.
- The "ACSL Agent" user you created lists only the single ACSL Manager you assigned in the cascade. Other managers no longer appear unless they also cover that exact partner set.
