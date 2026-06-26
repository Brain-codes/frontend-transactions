
import React, { useEffect } from "react";
import { useRouter } from "@/compat/navigation";
import { useAuth } from "../contexts/AuthContext";

type ProtectedRouteProp = {
  children?: React.ReactNode;
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  requireAdminAccess?: boolean;
};

const ProtectedRoute = ({
  children,
  allowedRoles,
  requireSuperAdmin = false,
  requireAdminAccess = false,
}: ProtectedRouteProp) => {
  const {
    user,
    loading,
    isAuthenticated,
    isSuperAdmin,
    hasAdminAccess,
    userRole,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Super admin bypasses all role restrictions
    if (isSuperAdmin) return;

    if (allowedRoles && allowedRoles.length > 0) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.push("/unauthorized");
        return;
      }
    }

    if (requireSuperAdmin && !isSuperAdmin) {
      router.push("/unauthorized");
      return;
    }

    if (requireAdminAccess && !hasAdminAccess) {
      router.push("/unauthorized");
      return;
    }
  }, [
    loading,
    isAuthenticated,
    isSuperAdmin,
    hasAdminAccess,
    userRole,
    allowedRoles,
    requireSuperAdmin,
    requireAdminAccess,
    router,
  ]);

  // If we already have a user (cached or live), render children immediately.
  // The background session refresh will reconcile silently.
  if (user) {
    return <>{children}</>;
  }

  // Only show the spinner during the genuine first-time bootstrap
  // (no cached user AND auth context is still resolving).
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect is in-flight from the effect above.
  return null;
};

export default ProtectedRoute;
