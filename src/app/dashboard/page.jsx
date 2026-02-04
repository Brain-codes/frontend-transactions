"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  Building2,
  Loader2,
  Search,
  X,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import superAdminDashboardService from "../services/superAdminDashboardService";

const COLORS = {
  primary: "#07376a",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  indigo: "#6366f1",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

const DashboardPage = () => {
  const { user, isSuperAdmin, supabase } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingKPIs, setLoadingKPIs] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    customer_state: "",
    period: "6months",
  });

  // Organization search state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const orgDropdownRef = useRef(null);

  // Cache management
  const ORG_CACHE_KEY = "dashboard_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "dashboard_organizations_cache_timestamp";
  const CACHE_DURATION = 30 * 60 * 1000;

  const getCachedOrganizations = () => {
    try {
      const cached = localStorage.getItem(ORG_CACHE_KEY);
      const timestamp = localStorage.getItem(ORG_CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.error("Error reading cache:", err);
    }
    return null;
  };

  const setCachedOrganizations = (data) => {
    try {
      localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(ORG_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error("Error setting cache:", err);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        orgDropdownRef.current &&
        !orgDropdownRef.current.contains(event.target)
      ) {
        setOpenOrgPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load cached organizations on mount
  useEffect(() => {
    const cached = getCachedOrganizations();
    if (cached && cached.length > 0) {
      setOrganizations(cached);
    }
  }, []);

  // Fetch organizations
  const fetchOrganizationsForSearch = useCallback(
    async (searchTerm = "") => {
      setLoadingOrgs(true);
      try {
        const cachedData = getCachedOrganizations();
        if (cachedData && cachedData.length > 0) {
          if (searchTerm) {
            const filtered = cachedData.filter(
              (group) =>
                group.base_name
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                group.branches.some(
                  (branch) =>
                    branch.branch
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    (branch.state &&
                      branch.state
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())),
                ),
            );
            setOrganizations(filtered);
          } else {
            setOrganizations(cachedData);
          }
          setLoadingOrgs(false);
          return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const functionUrl = `${baseUrl}/functions/v1/get-organizations-grouped`;
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("No authentication token found");
        }

        const params = new URLSearchParams({ page: "1", page_size: "500" });
        const response = await fetch(`${functionUrl}?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch organizations");
        }

        const fetchedData = result.data || [];
        setCachedOrganizations(fetchedData);

        if (searchTerm) {
          const filtered = fetchedData.filter(
            (group) =>
              group.base_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              group.branches.some(
                (branch) =>
                  branch.branch
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  (branch.state &&
                    branch.state
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())),
              ),
          );
          setOrganizations(filtered);
        } else {
          setOrganizations(fetchedData);
        }
      } catch (err) {
        console.error("Error fetching organizations:", err);
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    },
    [supabase],
  );

  const handleSelectOrganization = (orgIds) => {
    setSelectedOrgIds(orgIds);
    setOpenOrgPopover(false);
    fetchDashboardStats({ ...filters, organization_ids: orgIds });
  };

  const getSelectedOrgName = () => {
    if (selectedOrgIds.length === 0) return "";
    const group = organizations.find((g) => {
      const branchIds = g.branches?.map((b) => b.id) || [];
      return selectedOrgIds.every((id) => branchIds.includes(id));
    });
    if (!group) return `${selectedOrgIds.length} selected`;
    if (selectedOrgIds.length === group.branches?.length || 0) {
      return group.base_name;
    }
    if (selectedOrgIds.length === 1) {
      const branch = group.branches?.find((b) => b.id === selectedOrgIds[0]);
      return branch ? `${group.base_name} - ${branch.branch}` : group.base_name;
    }
    return `${group.base_name} (${selectedOrgIds.length} branches)`;
  };

  const fetchDashboardStats = async (appliedFilters = filters) => {
    setLoading(true);
    setLoadingKPIs(true);
    setLoadingCharts(true);
    try {
      const filterParams = {
        ...appliedFilters,
        organization_ids:
          appliedFilters.organization_ids ||
          (selectedOrgIds.length > 0 ? selectedOrgIds : undefined),
      };

      const response =
        await superAdminDashboardService.getDashboardStats(filterParams);

      if (response.success) {
        setDashboardData(response.data);
      } else {
        console.error("Failed to fetch stats:", response.error);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
      setLoadingKPIs(false);
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchDashboardStats();
    }
  }, [isSuperAdmin]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    fetchDashboardStats({ ...newFilters, organization_ids: selectedOrgIds });
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      date_from: "",
      date_to: "",
      customer_state: "",
      period: "6months",
    };
    setFilters(clearedFilters);
    setSelectedOrgIds([]);
    setOrgSearch("");
    fetchDashboardStats(clearedFilters);
  };

  const hasActiveFilters =
    Object.values(filters).some(
      (value) => value !== "" && value !== "6months",
    ) || selectedOrgIds.length > 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  if (loading && !dashboardData) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="dashboard">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-brand" />
              <p className="text-gray-600">Loading dashboard analytics...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const monthlyTrends = dashboardData?.monthlyTrends || [];
  const topOrganizations = dashboardData?.topOrganizations || [];
  const salesByState = dashboardData?.salesByState || [];
  const stoveStatus = (dashboardData?.stoveStatus || []).filter(
    (s) => s.status !== "Received",
  );
  const states = dashboardData?.states || [];

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="dashboard"
        title={`Welcome back, ${user?.full_name || user?.email?.split("@")[0] || "Admin"}`}
      >
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Filters Section */}
            <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                {/* Organization Search */}
                <div className="flex-1 min-w-[200px]" ref={orgDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search organizations..."
                      value={orgSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setOrgSearch(value);
                        fetchOrganizationsForSearch(value);
                        setOpenOrgPopover(true);
                      }}
                      onFocus={() => {
                        setOpenOrgPopover(true);
                        if (orgSearch === "") {
                          const cached = getCachedOrganizations();
                          if (cached && cached.length > 0) {
                            setOrganizations(cached);
                          } else {
                            fetchOrganizationsForSearch("");
                          }
                        }
                      }}
                      className="pl-9 bg-white"
                    />
                  </div>
                  {openOrgPopover && (
                    <div className="absolute z-50 min-w-[200px] max-w-[300px] mt-2 bg-white rounded-md border border-gray-200 shadow-md max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {loadingOrgs ? (
                          <div className="px-2 py-4 text-sm text-center text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        ) : (
                          <>
                            <div
                              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm flex items-center gap-2"
                              onClick={() => {
                                handleSelectOrganization([]);
                                setOrgSearch("");
                                const cached = getCachedOrganizations();
                                if (cached && cached.length > 0) {
                                  setOrganizations(cached);
                                }
                              }}
                            >
                              <Building2 className="h-4 w-4" />
                              All Organizations
                            </div>
                            {organizations.length === 0 && orgSearch ? (
                              <div className="px-2 py-4 text-sm text-center text-gray-500">
                                No organization found.
                              </div>
                            ) : (
                              organizations.map((group) => (
                                <div key={group.base_name}>
                                  <div
                                    className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                                    onClick={() => {
                                      handleSelectOrganization(
                                        group.organization_ids,
                                      );
                                      setOrgSearch("");
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        {group.base_name}
                                      </div>
                                      {group.branch_count > 1 && (
                                        <span className="text-xs text-gray-500">
                                          {group.branch_count} branches
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {group.branch_count > 1 &&
                                    group.branches.map((branch) => (
                                      <div
                                        key={branch.id}
                                        className="pl-8 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                                        onClick={() => {
                                          handleSelectOrganization([branch.id]);
                                          setOrgSearch("");
                                        }}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>{branch.branch}</span>
                                          {branch.state && (
                                            <span className="text-xs text-gray-500">
                                              {branch.state}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ))
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Organization Badge */}
                {selectedOrgIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-gray-200">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {getSelectedOrgName()}
                    </span>
                    <button
                      onClick={() => {
                        handleSelectOrganization([]);
                        setOrgSearch("");
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Period Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={filters.period}
                    onValueChange={(value) =>
                      handleFilterChange("period", value)
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                      <SelectItem value="6months">Last 6 Months</SelectItem>
                      <SelectItem value="1year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    placeholder="From date"
                    value={filters.date_from}
                    onChange={(e) =>
                      handleFilterChange("date_from", e.target.value)
                    }
                    className="bg-white"
                  />
                </div>

                {/* Date To */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    placeholder="To date"
                    value={filters.date_to}
                    onChange={(e) =>
                      handleFilterChange("date_to", e.target.value)
                    }
                    className="bg-white"
                  />
                </div>

                {/* State Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={filters.customer_state || undefined}
                    onValueChange={(value) =>
                      handleFilterChange("customer_state", value || "")
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div>
                    <Button
                      onClick={handleClearFilters}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  {loadingKPIs ? (
                    <div className="flex items-center justify-center h-28">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">
                          Total Sales
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">
                          {formatNumber(kpis.totalSales)}
                        </h3>
                        <div className="flex items-center mt-2">
                          {kpis.salesGrowth >= 0 ? (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-sm font-medium text-green-600">
                                +{kpis.salesGrowth?.toFixed(1)}%
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                              <span className="text-sm font-medium text-red-600">
                                {kpis.salesGrowth?.toFixed(1)}%
                              </span>
                            </>
                          )}
                          <span className="text-xs text-gray-500 ml-2">
                            vs previous period
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Total Revenue */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  {loadingKPIs ? (
                    <div className="flex items-center justify-center h-28">
                      <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">
                          Total Revenue
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">
                          {formatCurrency(kpis.totalRevenue)}
                        </h3>
                        <div className="flex items-center mt-2">
                          {kpis.revenueGrowth >= 0 ? (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-sm font-medium text-green-600">
                                +{kpis.revenueGrowth?.toFixed(1)}%
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                              <span className="text-sm font-medium text-red-600">
                                {kpis.revenueGrowth?.toFixed(1)}%
                              </span>
                            </>
                          )}
                          <span className="text-xs text-gray-500 ml-2">
                            vs previous period
                          </span>
                        </div>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Total Organizations */}
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  {loadingKPIs ? (
                    <div className="flex items-center justify-center h-28">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">
                          Total Partners
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">
                          {formatNumber(kpis.totalOrganizations)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                          Active organizations
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-full">
                        <Building2 className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Average Sale */}
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  {loadingKPIs ? (
                    <div className="flex items-center justify-center h-28">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">
                          Avg Sale Amount
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">
                          {formatCurrency(kpis.avgSaleAmount)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2">
                          Per transaction
                        </p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-full">
                        <Activity className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1: Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales & Revenue Trends */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-brand" />
                    Sales & Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCharts ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={monthlyTrends}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          stroke="#e5e7eb"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value, name) => {
                            if (name === "Revenue")
                              return [formatCurrency(value), name];
                            return [formatNumber(value), name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          iconType="circle"
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sales"
                          stroke={COLORS.blue}
                          strokeWidth={3}
                          name="Sales"
                          dot={{ r: 4, fill: COLORS.blue }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke={COLORS.success}
                          strokeWidth={3}
                          name="Revenue"
                          dot={{ r: 4, fill: COLORS.success }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Inventory Status */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-brand" />
                    Inventory Distribution (Stove ID's)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCharts ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={stoveStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ status, percentage }) =>
                              `${status}: ${percentage.toFixed(1)}%`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {stoveStatus.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatNumber(value)}
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">
                            Available
                          </p>
                          <p className="text-xl font-bold text-green-600">
                            {formatNumber(kpis.availableStoves)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Sold</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatNumber(kpis.soldStoves)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2: Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Organizations/Partner */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-brand" />
                    Top Performing Partner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCharts ? (
                    <div className="flex items-center justify-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={topOrganizations}
                        layout="horizontal"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={140}
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickFormatter={(value) =>
                            value.length > 18
                              ? value.substring(0, 18) + "..."
                              : value
                          }
                          stroke="#e5e7eb"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value, name) => {
                            if (name === "Revenue")
                              return [formatCurrency(value), name];
                            return [formatNumber(value), name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          iconType="circle"
                        />
                        <Bar
                          dataKey="sales"
                          fill={COLORS.blue}
                          name="Sales"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Sales by State */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-brand" />
                    Sales by State (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCharts ? (
                    <div className="flex items-center justify-center h-[350px]">
                      <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={salesByState}
                        margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="state"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          stroke="#e5e7eb"
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          stroke="#e5e7eb"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value, name) => {
                            if (name === "Revenue")
                              return [formatCurrency(value), name];
                            return [formatNumber(value), name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          iconType="circle"
                        />
                        <Bar
                          dataKey="sales"
                          fill={COLORS.purple}
                          name="Sales"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;
