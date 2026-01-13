"use client";

import React, { useState, useEffect } from "react";
import type { DashboardStats } from "@/types/dashboard";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardStatsCards from "./components/dashboard/DashboardStatsCards";
import PendingSalesAlert from "./components/dashboard/PendingSalesAlert";
import StoveInventoryCard from "./components/dashboard/StoveInventoryCard";
import QuickActions from "./components/dashboard/QuickActions";
import SalesOverview from "./components/dashboard/SalesOverview";
import { useAuth } from "../contexts/AuthContext";
// import adminDashboardService from "../services/adminDashboardService";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import adminDashboardService from "../services/adminDashboardService";

const AdminDashboardPage = () => {
  const { user, getStoredProfile } = useAuth();
  const storedProfile = getStoredProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminDashboardService.getDashboardStats();

      if (response.success) {
        // TypeScript will enforce the DashboardStats type here
        setDashboardData(response.data);
        // console.log(response.data);
      } else {
        setError(response.error || "Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("An unexpected error occurred while loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dashboardData) {
      console.log("dashboardData updated:", dashboardData);
    }
  }, [dashboardData]);

  const formatCurrency = (amount: any) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStoveProgressPercentage = () => {
    if (!dashboardData) return 0;
    const { totalStovesReceived, totalStovesSold } = dashboardData;
    if (!totalStovesReceived || totalStovesReceived === 0) return 0;
    return Math.round((totalStovesSold / totalStovesReceived) * 100);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
        <DashboardLayout currentRoute="admin">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
        <DashboardLayout currentRoute="admin">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
      <DashboardLayout
        currentRoute="admin"
        title={`Welcome back, ${
          storedProfile?.full_name || user?.email?.split("@")[0] || "Admin"
        }!`}
        description="Manage your sales operations and team"
      >
        <div className="p-6 space-y-6">
          {/* Alert Banner for Pending Sales */}
          {dashboardData && (
            <PendingSalesAlert pendingSales={dashboardData.pendingSales} />
          )}

          {/* Summary Statistics Cards */}
          {dashboardData && (
            <DashboardStatsCards
              data={dashboardData}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Stove Inventory Progress Bar */}
          {dashboardData && (
            <StoveInventoryCard
              data={dashboardData}
              getStoveProgressPercentage={getStoveProgressPercentage}
            />
          )}

          {/* Quick Action Tiles */}
          <QuickActions onSync={fetchDashboardData} />

          {/* Sales Overview */}
          {dashboardData && (
            <SalesOverview
              data={dashboardData}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminDashboardPage;
