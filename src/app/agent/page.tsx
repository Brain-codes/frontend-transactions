"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import adminDashboardService from "../services/adminDashboardService";

interface AgentStats {
  totalSales: number;
  completedSales: number;
  pendingSales: number;
  totalRevenue: number;
}

const AgentDashboardPage = () => {
  const { user, getStoredProfile } = useAuth();
  const storedProfile = getStoredProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const fetchAgentStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminDashboardService.getDashboardStats();

      if (response.success) {
        // Filter stats relevant to agent (no sensitive admin data)
        setStats({
          totalSales: response.data.totalSales || 0,
          completedSales: response.data.completedSales || 0,
          pendingSales: response.data.pendingSales || 0,
          totalRevenue: response.data.totalSalesAmount || 0,
        });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["agent"]}>
        <DashboardLayout currentRoute="agent">
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
      <ProtectedRoute allowedRoles={["agent"]}>
        <DashboardLayout currentRoute="agent">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchAgentStats}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["agent"]}>
      <DashboardLayout
        currentRoute="agent"
        title={`Welcome back, ${
          storedProfile?.full_name || user?.email?.split("@")[0] || "Agent"
        }!`}
        description="Track your sales performance and manage transactions"
      >
        <div className="p-6 space-y-6">
          {/* Pending Sales Alert */}
          {stats && stats.pendingSales > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {stats.pendingSales} Pending{" "}
                    {stats.pendingSales === 1 ? "Sale" : "Sales"}
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have incomplete sales that need attention.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/admin/sales?status=pending")}
                  size="sm"
                  variant="outline"
                  className="border-yellow-300 hover:bg-yellow-100"
                >
                  View Pending
                </Button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalSales || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time sales transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.completedSales || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed sales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.pendingSales || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sales awaiting completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total sales amount
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push("/admin/sales/create")}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Plus className="h-6 w-6" />
                  <span>Create New Sale</span>
                </Button>

                <Button
                  onClick={() => router.push("/admin/sales")}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>View All Sales</span>
                </Button>

                <Button
                  onClick={() => router.push("/admin/sales?status=pending")}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Clock className="h-6 w-6" />
                  <span>Pending Sales</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AgentDashboardPage;
