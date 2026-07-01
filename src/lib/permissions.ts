export type AppRole =
  | "super_admin"
  | "acsl_agent"
  | "acsl_agent_manager"
  | "super_admin_agent"
  | "partner"
  | "admin"
  | "partner_agent"
  | "agent"
  | "agent_user";

export type RouteKey =
  | "dashboard"
  | "sales"
  | "sales-create"
  | "sales-cancelled"
  | "sales-financial-reports"
  | "partners"
  | "partners-profiles"
  | "agents"
  | "agents-profiles"
  | "stove-management"
  | "stove-manager"
  | "stove-transfer-history"
  | "agreement-images"
  | "map"
  | "settings"
  | "settings-payment-models"
  | "settings-credentials"
  | "settings-system-config"
  | "settings-user-management"
  | "settings-tools"
  | "user-management"
  | "user-management-users"
  | "user-management-groups"
  | "payment-models"
  | "profile"
  | "docs"
  | "sales-monitoring-app"
  | "end-user-records";

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
  | "manage-acsl-agents-scoped"
  | "impersonate"
  | "override-assignments"
  | "approve-sales"
  | "reset-any-password"
  | "edit-any-partner"
  | "edit-any-agent"
  | "view-all-records"
  | "tools";

interface RolePermissions {
  routes: RouteKey[];
  features: FeatureKey[];
}

// Canonical role aliases — legacy roles mapped to their canonical equivalent
export const ROLE_ALIASES: Record<string, AppRole> = {
  super_admin_agent: "acsl_agent",
  admin: "partner",
  agent_user: "agent",
};

const ALL_ROUTES: RouteKey[] = [
  "dashboard",
  "sales",
  "sales-create",
  "sales-financial-reports",
  "partners",
  "partners-profiles",
  "agents",
  "agents-profiles",
  "stove-management",
  "stove-manager",
  "stove-transfer-history",
  "agreement-images",
  "map",
  "settings",
  "settings-payment-models",
  "settings-credentials",
  "settings-system-config",
  "settings-user-management",
  "settings-tools",
  "user-management",
  "user-management-users",
  "user-management-groups",
  "payment-models",
  "profile",
  "docs",
  "sales-monitoring-app",
  "end-user-records",
];

const ALL_FEATURES: FeatureKey[] = [
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
  "manage-acsl-agents-scoped",
  "impersonate",
  "override-assignments",
  "approve-sales",
  "reset-any-password",
  "edit-any-partner",
  "edit-any-agent",
  "view-all-records",
  "tools",
];

export const PERMISSIONS: Record<string, RolePermissions> = {
  // Super admin: every route, every feature.
  super_admin: {
    routes: ALL_ROUTES,
    features: ALL_FEATURES,
  },
  acsl_agent_manager: {
    routes: [
      "dashboard",
      "sales",
      "sales-create",
      "partners",
      "agents",
      "stove-management",
      "stove-manager",
      "profile",
      "sales-monitoring-app",
    ],
    features: [
      "my-partners-filter",
      "stove-allocation",
      "create-sale",
      "manage-acsl-agents-scoped",
    ],
  },
  acsl_agent: {
    routes: [
      "dashboard",
      "sales",
      "sales-create",
      "partners",
      "stove-management",
      "stove-manager",
      "profile",
      "sales-monitoring-app",
    ],
    features: ["my-partners-filter", "stove-allocation", "create-sale"],
  },
  partner: {
    routes: [
      "dashboard",
      "sales",
      "sales-create",
      "agents",
      "stove-management",
      "stove-manager",
      "profile",
      "sales-monitoring-app",
    ],
    features: ["manage-agents", "org-sales-view", "create-sale"],
  },
  partner_agent: {
    routes: ["dashboard", "sales", "sales-create", "stove-manager", "profile", "sales-monitoring-app"],
    features: ["create-sale"],
  },
  agent: {
    routes: ["dashboard", "sales", "sales-create", "stove-manager", "profile", "sales-monitoring-app"],
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

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return resolveRole(role) === "super_admin";
}
