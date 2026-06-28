## Goal

Replace the small "Edit User" dialog with a full inline **Edit User view** that reuses the Create User form, so an ACSL Agent (and every other role) can be updated end-to-end — basic info, role, assigned states, supervising managers, and assigned partners.

## Changes (single file: `src/app/settings/user-management/UserManagementContent.jsx`)

### 1. Mode-aware inline form

- Add `formMode` state: `"create" | "edit"` (plus existing `showCreateModal` reused as "show inline form").
- `openEditModal(user)` becomes `openEditView(user)`:
  - Set `formMode = "edit"`, `selectedUser = user`.
  - Prefill `userForm` with name/email/phone/role.
  - **Hydrate assignments** from `superAdminAgentService`:
    - `getAgentStates(user.id)` → `selectedStates`
    - `getAgentOrganizations(user.id)` → `selectedPartnerIds`
    - For `acsl_agent`: derive `selectedManagerIds` by matching the user's assigned partner IDs against `acslManagers[].orgIds` (mark a manager as selected when any of their partners are in the user's set).
  - Open the inline view (`setShowCreateModal(true)`).
- The kebab "Edit" action in the table calls `openEditView(u)` for **every role** (not just ACSL Agent), so the request "all records for the user can be updated" is satisfied.

### 2. Reused inline view (lines ~904–1593)

- Header switches: title `"Create New User"` ↔ `"Edit User"`, icon `UserPlus` ↔ `SquarePen`.
- Email field becomes **disabled** in edit mode (email cannot change).
- Password block hidden in edit mode (use existing reset-password action instead).
- Role select: disabled in edit mode to avoid orphaning assignment data (simpler + safer); a short note explains role changes aren't supported here.
- Submit button: `"Create User"` ↔ `"Update User"`; calls `handleCreateUser` or new `handleUpdateUser`.
- Back button label switches to `"Back to User Management"` in both modes; clears `selectedUser` and resets form.

### 3. New `handleUpdateUser`

- `PUT /manage-users/:id` with `{ full_name, phone }` (existing endpoint behavior).
- After success, re-apply assignment side-effects identical to create:
  - If role is `acsl_agent` or `acsl_agent_manager`: `setAgentStates(id, [...selectedStates])`.
  - Always (when relevant role): `setAgentOrganizations(id, [...selectedPartnerIds])` — this overwrites prior assignments so unchecking a partner removes it.
- Toast success, return to list, refresh current page.

### 4. Remove the old Edit dialog (lines 1596–1645)

- Delete the `Dialog`-based edit modal and its `showEditModal` state. The kebab "Edit" no longer opens a dialog — it routes to the inline edit view.

### 5. Reset-form coverage

- `resetForm()` already clears assignment state; also clear `selectedUser` and reset `formMode` to `"create"` on Back / after submit.

## Out of scope

- No change to the `manage-users` Edge Function. Email and role remain immutable from the UI (matches current backend contract).
- No change to the table, filters, pagination, or other views.

## Acceptance

- Clicking "Edit" on any user opens the inline form pre-filled with their details.
- For an ACSL Agent: assigned States, supervising ACSL Managers, and Partner checkboxes all show the user's current assignments.
- Saving updates name/phone and overwrites state + partner assignments; unchecking a partner removes it; counts on Agents Profile reflect the change immediately.
- Creating a new user continues to work exactly as before.
