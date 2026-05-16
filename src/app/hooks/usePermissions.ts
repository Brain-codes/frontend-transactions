"use client";

import { useAuth } from "../contexts/AuthContext";
import { getRolePermissions, type RouteKey, type FeatureKey } from "@/lib/permissions";

export function usePermissions() {
  const { userRole } = useAuth();
  const permissions = getRolePermissions(userRole);

  function canRoute(route: RouteKey): boolean {
    return permissions.routes.includes(route);
  }

  function can(feature: FeatureKey): boolean {
    return permissions.features.includes(feature);
  }

  return { can, canRoute };
}
