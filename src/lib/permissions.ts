export type AppRole =
  | "super_admin"
  | "acsl_agent"
  | "acsl_agent_manager"
  | "super_admin_agent"
  | "partner"
  | "admin"
  | "partner_agent"
  | "agent";

export type RouteKey =
  | "dashboard"
  | "sales"
  | "partners"
  | "agents"
  | "stove-management"
  | "stove-manager"
  | "stove-transfer-history"
  | "agreement-images"
  | "settings"
  | "profile";

export type FeatureKey =
  | "global-filters"
  | "manage-all-partners"
  | "manage-acsl-agents"
  | "manage-partner-agents"
  | "payment-models"
  | "user-management"
  | "credentials"
  | "system-config"
  | "stove-allocation"
  | "create-sale"
  | "my-partners-filter"
  | "manage-agents"
  | "org-sales-view"
  | "manage-acsl-agents-scoped";

interface RolePermissions {
  routes: RouteKey[];
  features: FeatureKey[];
}

// Canonical role aliases — legacy roles mapped to their canonical equivalent
export const ROLE_ALIASES: Record<string, AppRole> = {
  super_admin_agent: "acsl_agent",
  admin: "partner",
  agent: "partner_agent",
};

export const PERMISSIONS: Record<string, RolePermissions> = {
  super_admin: {
    routes: [
      "dashboard",
      "sales",
      "partners",
      "agents",
      "stove-management",
      "stove-manager",
      "stove-transfer-history",
      "agreement-images",
      "settings",
      "profile",
    ],
    features: [
      "global-filters",
      "manage-all-partners",
      "manage-acsl-agents",
      "manage-partner-agents",
      "payment-models",
      "user-management",
      "credentials",
      "system-config",
      "stove-allocation",
      "create-sale",
      "my-partners-filter",
      "manage-agents",
      "org-sales-view",
    ],
  },
  acsl_agent_manager: {
    // Same pages as super_admin except settings and transfer history — data is filtered to assigned states/partners
    routes: [
      "dashboard",
      "sales",
      "partners",
      "agents",
      "stove-management",
      "stove-manager",
      "profile",
    ],
    features: [
      "my-partners-filter",
      "stove-allocation",
      "create-sale",
      "manage-acsl-agents-scoped",
    ],
  },
  acsl_agent: {
    routes: ["dashboard", "sales", "partners", "stove-management", "stove-manager", "profile"],
    features: ["my-partners-filter", "stove-allocation", "create-sale"],
  },
  partner: {
    routes: ["dashboard", "sales", "agents", "stove-management", "stove-manager", "profile"],
    features: ["manage-agents", "org-sales-view", "create-sale"],
  },
  partner_agent: {
    routes: ["dashboard", "sales", "stove-manager"],
    features: ["create-sale"],
  },
};

export function resolveRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLE_ALIASES[role] ?? role;
}

export function getRolePermissions(role: string | null | undefined): RolePermissions {
  const resolved = resolveRole(role);
  return PERMISSIONS[resolved ?? ""] ?? { routes: [], features: [] };
}
