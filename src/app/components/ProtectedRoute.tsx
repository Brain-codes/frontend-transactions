"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

type ProtectedRouteProp = {
  children?: React.ReactNode;
  requireSuperAdmin?: boolean;
  requireAdminAccess?: boolean;
};

const ProtectedRoute = ({
  children,
  requireSuperAdmin = false,
  requireAdminAccess = false,
}: ProtectedRouteProp) => {
  const { user, loading, isAuthenticated, isSuperAdmin, hasAdminAccess } =
    useAuth();
  const router = useRouter();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Add timeout protection to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn(
          "ProtectedRoute: Authentication verification timeout reached"
        );

        // Try to clear potentially corrupted auth data
        try {
          const authKeys = Object.keys(localStorage).filter(
            (key) =>
              key.includes("supabase.auth") ||
              key.includes("transaction_app_token")
          );

          if (authKeys.length > 0) {
            console.warn(
              "ProtectedRoute: Clearing potentially corrupted auth data"
            );
            authKeys.forEach((key) => localStorage.removeItem(key));
          }
        } catch (error) {
          console.error("ProtectedRoute: Error clearing auth data:", error);
        }

        setTimeoutReached(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    // If timeout reached, force redirect to login
    if (timeoutReached) {
      console.warn("ProtectedRoute: Forcing redirect due to timeout");
      router.push("/login");
      return;
    }

    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
        return;
      }

      if (requireSuperAdmin && !isSuperAdmin) {
        // User is authenticated but not super admin
        router.push("/unauthorized");
        return;
      }

      if (requireAdminAccess && !hasAdminAccess) {
        // User is authenticated but doesn't have admin level access
        router.push("/unauthorized");
        return;
      }
    }
  }, [
    loading,
    timeoutReached,
    isAuthenticated,
    isSuperAdmin,
    hasAdminAccess,
    requireSuperAdmin,
    requireAdminAccess,
    router,
  ]);

  // Show loading spinner while checking authentication
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show timeout message if authentication verification took too long
  if (timeoutReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-red-600 font-medium">
            Authentication timeout - redirecting to login...
          </p>
          <p className="mt-2 text-sm text-gray-600">
            If this problem persists, try refreshing your browser or clearing
            your browser cache.
          </p>
        </div>
      </div>
    );
  }

  // Show loading spinner while redirecting
  if (
    !isAuthenticated ||
    (requireSuperAdmin && !isSuperAdmin) ||
    (requireAdminAccess && !hasAdminAccess)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
