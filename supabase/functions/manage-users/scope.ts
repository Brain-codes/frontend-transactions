// Caller scoping for User Management (RBAC matrix: User Management → User Manager)
//
// - super_admin           → all users
// - acsl_agent_manager    → ACSL agents reporting to them + users of assigned partners
// - acsl_agent            → partner agents of assigned partners (read-only)
// - partner (admin)       → partner agents of their own organization
// - everyone else         → no access
//
// The response shape stays identical across roles — scope only changes filters.

import { resolveAssignedOrgIds } from "../_shared/resolveAssignedOrgIds.ts";

export interface CallerContext {
  id: string;
  role: string;
  organizationId: string | null;
}

export type CallerScope =
  | { type: "all" }
  | { type: "manager"; orgIds: string[] }
  | { type: "acsl_agent"; orgIds: string[] }
  | { type: "partner"; orgIds: string[] };

export const PARTNER_ROLES = ["partner", "admin"];
export const ORG_USER_ROLES = ["partner_agent", "agent", "agent_user"];
export const ACSL_AGENT_ROLES = ["acsl_agent", "super_admin_agent"];

export const ALLOWED_CALLER_ROLES = [
  "super_admin",
  "acsl_agent_manager",
  // ACSL agents get read-only access so Agent Management → Partner Agents can
  // list agents of their assigned partners (RBAC matrix). Writes stay blocked.
  ...ACSL_AGENT_ROLES,
  ...PARTNER_ROLES,
];

export function isManagerRole(role: string): boolean {
  return role === "acsl_agent_manager";
}

export function isAcslAgentRole(role: string): boolean {
  return ACSL_AGENT_ROLES.includes(role);
}

export function isPartnerRole(role: string): boolean {
  return PARTNER_ROLES.includes(role);
}

export async function resolveCallerScope(
  supabase: any,
  caller: CallerContext
): Promise<CallerScope> {
  if (caller.role === "super_admin") return { type: "all" };
  if (isManagerRole(caller.role)) {
    const { assignedOrgIds } = await resolveAssignedOrgIds(supabase, caller.id);
    return { type: "manager", orgIds: assignedOrgIds };
  }
  if (isAcslAgentRole(caller.role)) {
    const { assignedOrgIds } = await resolveAssignedOrgIds(supabase, caller.id);
    return { type: "acsl_agent", orgIds: assignedOrgIds };
  }
  if (isPartnerRole(caller.role)) {
    return {
      type: "partner",
      orgIds: caller.organizationId ? [caller.organizationId] : [],
    };
  }
  throw new Error("Unauthorized: Access denied for this role.");
}

/**
 * Org-id list that must be applied to the scoped list query, or null when the
 * scope has no org-list filter (super_admin). When this list is large it must
 * be chunked — see getUsers — so it never overflows the request URL.
 */
export function scopeOrgList(scope: CallerScope): string[] | null {
  if (scope.type === "all") return null;
  return scope.orgIds;
}

/**
 * A manager's non-org OR-branches: their subordinate ACSL agents + their own
 * row. These match acsl_agent/manager roles only, so they are ROLE-DISJOINT
 * from org-user rows (partner_agent/agent) — letting us run them as a separate
 * query whose count sums cleanly with the org-scoped chunks.
 */
export function managerNonOrgBranches(callerId: string): string[] {
  return [
    `and(role.in.(${ACSL_AGENT_ROLES.join(",")}),manager_id.eq.${callerId})`,
    `and(role.eq.acsl_agent_manager,id.eq.${callerId})`,
  ];
}

/** Whether a single target profile is inside the caller's scope. */
export function userInScope(
  scope: CallerScope,
  profile: { id: string; role: string; organization_id?: string | null; manager_id?: string | null },
  callerId: string
): boolean {
  if (scope.type === "all") return true;
  if (scope.type === "partner" || scope.type === "acsl_agent") {
    return (
      ORG_USER_ROLES.includes(profile.role) &&
      !!profile.organization_id &&
      scope.orgIds.includes(profile.organization_id)
    );
  }
  if (ACSL_AGENT_ROLES.includes(profile.role)) return profile.manager_id === callerId;
  if (profile.role === "acsl_agent_manager") return profile.id === callerId;
  if (ORG_USER_ROLES.includes(profile.role)) {
    return !!profile.organization_id && scope.orgIds.includes(profile.organization_id);
  }
  return false;
}

/** Roles the caller is allowed to create/assign (mirrors ACCESS_CONTROL.md form rules). */
export function creatableRolesFor(callerRole: string): string[] {
  if (callerRole === "super_admin") {
    return ["super_admin", "acsl_agent_manager", "acsl_agent", "partner", "partner_agent", "agent"];
  }
  // Only super admin can create partner users.
  if (isManagerRole(callerRole)) return ["acsl_agent", "partner_agent", "agent"];
  if (isPartnerRole(callerRole)) return ["partner_agent"];
  return [];
}
