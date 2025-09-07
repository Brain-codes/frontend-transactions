"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Banknote,
  ShoppingCart,
  Users,
  ArrowRight,
  Activity,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const DashboardPage = () => {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Temporary redirection to sales
    const timer = setTimeout(() => {
      if (isSuperAdmin) {
        router.push("/sales");
      } else if (isAdmin) {
        router.push("/admin/sales");
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [isSuperAdmin, isAdmin, router]);

  const handleNavigateToSales = () => {
    if (isSuperAdmin) {
      router.push("/sales");
    } else if (isAdmin) {
      router.push("/admin/sales");
    }
  };

  const handleNavigateToAdmin = () => {
    router.push("/admin");
  };

  // Show admin dashboard for admin users
  if (isAdmin && !isSuperAdmin) {
    router.push("/admin");
    return null;
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        title={`Welcome back, ${
          user?.full_name || user?.email?.split("@")[0] || "User"
        }!`}
        description="Welcome to your Atmosfair sales management overview"
        rightButton={
          isSuperAdmin ? (
            <Button
              onClick={handleNavigateToSales}
              className="bg-brand-800 hover:bg-brand-900 text-white"
            >
              View Sales Data
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNavigateToAdmin}
              className="bg-brand-800 hover:bg-brand-900 text-white"
            >
              Go to Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )
        }
      >
        {/* Loading Overlay */}
        <div className="relative">
          {/* Blurred Background Content */}
          <div
            className={`${
              loading ? "blur-sm opacity-50 pointer-events-none" : ""
            } transition-all duration-300`}
          >
            <div className="p-6 space-y-6">
              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-brand-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Sales Management
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-brand-700" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      Live Data
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Real-time sales tracking
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigateToSales}
                      className="mt-2 w-full"
                    >
                      Access Sales
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Data Analytics
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      Advanced
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Comprehensive filtering & search
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigateToSales}
                      className="mt-2 w-full"
                    >
                      Explore Data
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Real-time Updates
                    </CardTitle>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">Live</div>
                    <p className="text-xs text-gray-600 mt-1">
                      Always up-to-date information
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigateToSales}
                      className="mt-2 w-full"
                    >
                      View Live Data
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Customer Focus
                    </CardTitle>
                    <Users className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      Focused
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Sales-specific interface
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigateToSales}
                      className="mt-2 w-full"
                    >
                      Manage Sales
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Getting Started Card */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                      Sales Management Hub
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">
                      Access your complete sales management system with
                      real-time data integration.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Advanced filtering and search capabilities
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Real-time data from your Supabase backend
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Comprehensive sales analytics
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Professional error handling
                      </div>
                    </div>
                    <Button
                      onClick={handleNavigateToSales}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Start Managing Sales
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* System Info Card */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-green-600" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Authentication
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          ✓ Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          API Connection
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          ✓ Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Data Integration
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          ✓ Real-time
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Error Handling
                        </span>
                        <span className="text-sm font-medium text-green-600">
                          ✓ Enhanced
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        All systems operational. Ready for production use.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Call to Action */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Ready to manage your sales data?
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Access comprehensive sales management with real-time
                        data integration.
                      </p>
                    </div>
                    <Button
                      onClick={handleNavigateToSales}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 shrink-0"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
              <Loader2 className="h-12 w-12 animate-spin text-brand-700 mb-4" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Redirecting to Sales Dashboard
                </h3>
                <p className="text-gray-600">
                  Taking you to the sales management interface...
                </p>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;
