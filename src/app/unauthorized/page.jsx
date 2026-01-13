/* eslint-disable react/no-unescaped-entities */
"use client";

import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force immediate navigation to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
      // Still redirect to login even if there was an error
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>

          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Please contact your
            administrator if you believe this is an error.
          </p>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your
              administrator.
            </p>

            <Button
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
