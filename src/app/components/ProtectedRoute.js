"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, requireSuperAdmin = true }) => {
  const { user, loading, isAuthenticated, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
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
    }
  }, [loading, isAuthenticated, isSuperAdmin, requireSuperAdmin, router]);

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

  // Show loading spinner while redirecting
  if (!isAuthenticated || (requireSuperAdmin && !isSuperAdmin)) {
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
