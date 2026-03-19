"use client";

import { useState, useEffect } from "react";
import type { DashboardStats } from "@/types/dashboard";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import YearFilter from "../components/YearFilter";
import DashboardStatsCards from "./components/dashboard/DashboardStatsCards";
import PendingSalesAlert from "./components/dashboard/PendingSalesAlert";
import StoveInventoryCard from "./components/dashboard/StoveInventoryCard";
import QuickActions from "./components/dashboard/QuickActions";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import adminDashboardService from "../services/adminDashboardService";

const CURRENT_YEAR = new Date().getFullYear();

const yearsToDateRange = (years: number[]) => {
  if (years.length === 0) return {};
  const sorted = [...years].sort((a, b) => a - b);
  return {
    date_from: `${sorted[0]}-01-01`,
    date_to: `${sorted[sorted.length - 1]}-12-31`,
  };
};

const AdminDashboardPage = () => {
  const { user, getStoredProfile } = useAuth();
  const storedProfile = getStoredProfile();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([CURRENT_YEAR]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchDashboardData = async (
    years: number[] = selectedYears,
    from: string = dateFrom,
    to: string = dateTo
  ) => {
    try {
      setLoading(true);
      setError(null);
      const filters = from || to
        ? { date_from: from || undefined, date_to: to || undefined }
        : yearsToDateRange(years);
      const response = await adminDashboardService.getDashboardStats(filters);
      if (response.success) {
        setDashboardData(response.data);
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
    fetchDashboardData();
  }, []);

  const handleYearChange = (years: number[]) => {
    setSelectedYears(years);
    setDateFrom("");
    setDateTo("");
    fetchDashboardData(years, "", "");
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    const newFrom = field === "from" ? value : dateFrom;
    const newTo = field === "to" ? value : dateTo;
    if (field === "from") setDateFrom(value); else setDateTo(value);
    fetchDashboardData(selectedYears, newFrom, newTo);
  };

  const handleClearDates = () => {
    setDateFrom("");
    setDateTo("");
    fetchDashboardData(selectedYears, "", "");
  };

  const formatCurrency = (amount: any) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const getStoveProgressPercentage = () => {
    if (!dashboardData) return 0;
    const { totalStovesReceived, totalStovesSold } = dashboardData;
    if (!totalStovesReceived || totalStovesReceived === 0) return 0;
    return Math.round((totalStovesSold / totalStovesReceived) * 100);
  };

  if (loading && !dashboardData) {
    return (
      <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
        <DashboardLayout currentRoute="admin" title="Dashboard">
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
        <DashboardLayout currentRoute="admin" title="Dashboard">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchDashboardData()}>Try Again</Button>
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
        title="Dashboard"
        description={`Welcome back, ${storedProfile?.full_name || user?.email?.split("@")[0] || "Admin"}`}
      >
        <div className="px-6 pb-6 space-y-5">
          {/* Quick Actions */}
          <QuickActions />

          {/* Filter Panel */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="h-8 px-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="h-8 px-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {(dateFrom || dateTo) && (
                <Button size="sm" variant="outline" className="h-8 bg-white" onClick={handleClearDates}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
              <div className="ml-auto">
                <YearFilter selectedYears={selectedYears} onChange={handleYearChange} />
              </div>
            </div>
          </div>

          {/* Alert Banner for Pending Sales */}
          {dashboardData && <PendingSalesAlert pendingSales={dashboardData.pendingSales} />}

          {/* Financial + Customer Cards */}
          {dashboardData && (
            <DashboardStatsCards data={dashboardData} formatCurrency={formatCurrency} />
          )}

          {/* Stove Inventory */}
          {dashboardData && (
            <StoveInventoryCard
              data={dashboardData}
              getStoveProgressPercentage={getStoveProgressPercentage}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminDashboardPage;
