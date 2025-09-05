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
 } : ProtectedRouteProp) => {
  const { user, loading, authError, isAuthenticated, isSuperAdmin, hasAdminAccess, clearAuthError } =
    useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !redirecting) {
      // Handle authentication errors first
      if (authError) {
        console.warn("Auth error in ProtectedRoute:", authError);
        
        // For session-related errors, redirect to login
        if (authError.includes("Session expired") || 
            authError.includes("refresh_token") ||
            authError.includes("Invalid Refresh Token")) {
          setRedirecting(true);
          router.push("/login");
          return;
        }
      }

      // Check authentication status
      if (!isAuthenticated) {
        setRedirecting(true);
        router.push("/login");
        return;
      }

      // Check role-based permissions
      if (requireSuperAdmin && !isSuperAdmin) {
        console.warn("Access denied: Super admin required");
        setRedirecting(true);
        router.push("/unauthorized");
        return;
      }

      if (requireAdminAccess && !hasAdminAccess) {
        console.warn("Access denied: Admin access required");
        setRedirecting(true);
        router.push("/unauthorized");
        return;
      }

      // Clear any auth errors if user is properly authenticated
      if (authError && isAuthenticated) {
        clearAuthError();
      }
    }
  }, [
    loading,
    authError,
    isAuthenticated,
    isSuperAdmin,
    hasAdminAccess,
    requireSuperAdmin,
    requireAdminAccess,
    router,
    redirecting,
    clearAuthError,
  ]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state for configuration issues
  if (authError && authError.includes("Configuration error")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Configuration Error
          </h1>
          <p className="text-gray-600 mb-4">
            Authentication service is not properly configured. Please contact support.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner while redirecting
  if (
    redirecting ||
    !isAuthenticated ||
    (requireSuperAdmin && !isSuperAdmin) ||
    (requireAdminAccess && !hasAdminAccess)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authError && authError.includes("Session expired") 
              ? "Session expired. Redirecting to login..." 
              : "Redirecting..."
            }
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;