"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
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
  Package,
  CheckCircle,
  Users,
  Building2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import superAdminDashboardService from "../services/superAdminDashboardService";

const DashboardPage = () => {
  const { user, isSuperAdmin, isAdmin, supabase } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    stovesSoldToPartners: 0,
    stovesSoldToEndUsers: 0,
    availableStovesWithPartners: 0,
    totalPartners: 0,
    totalCustomers: 0,
  });
  const [states, setStates] = useState([]);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    customer_state: "",
  });

  // Cache management for organizations
  const ORG_CACHE_KEY = "dashboard_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "dashboard_organizations_cache_timestamp";
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

  // Organization search state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const orgDropdownRef = useRef(null);

  // Redirect admin users to their dashboard
  useEffect(() => {
    if (isAdmin && !isSuperAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isSuperAdmin, router]);

  // Don't render anything for admin users while redirecting
  if (isAdmin && !isSuperAdmin) {
    return null;
  }

  // Fetch dashboard statistics
  const fetchDashboardStats = async (currentFilters = filters) => {
    setLoading(true);
    try {
      // Add organization_ids to filters
      const filterParams = {
        ...currentFilters,
        organization_ids:
          currentFilters.organization_ids || selectedOrgIds.length > 0
            ? selectedOrgIds
            : undefined,
      };

      const response =
        await superAdminDashboardService.getDashboardStats(filterParams);

      if (response.success) {
        setStats({
          stovesSoldToPartners: response.data.stovesSoldToPartners || 0,
          stovesSoldToEndUsers: response.data.stovesSoldToEndUsers || 0,
          availableStovesWithPartners:
            response.data.availableStovesWithPartners || 0,
          totalPartners: response.data.totalPartners || 0,
          totalCustomers: response.data.totalCustomers || 0,
        });
        setStates(response.data.states || []);
      } else {
        console.error("Failed to fetch stats:", response.error);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard stats on mount
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load cached organizations on mount
  useEffect(() => {
    const cached = getCachedOrganizations();
    if (cached && cached.length > 0) {
      setOrganizations(cached);
    }
  }, []);

  // Fetch organizations for search dropdown (using get-organizations-grouped with caching)
  const fetchOrganizationsForSearch = useCallback(
    async (searchTerm = "") => {
      setLoadingOrgs(true);
      try {
        // Check cache first
        const cachedData = getCachedOrganizations();

        if (cachedData && cachedData.length > 0) {
          // Use cached data and filter client-side
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

        // If no cache, fetch from API
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const functionUrl = `${baseUrl}/functions/v1/get-organizations-grouped`;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("No authentication token found");
        }

        const params = new URLSearchParams({
          page: "1",
          page_size: "500", // Fetch all for caching
        });

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

        // Cache the full dataset
        setCachedOrganizations(fetchedData);

        // Apply search filter if needed
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

  // Handle organization selection
  const handleSelectOrganization = (orgIds) => {
    setSelectedOrgIds(orgIds);
    setOpenOrgPopover(false);
    // Auto-apply filter
    fetchDashboardStats({ ...filters, organization_ids: orgIds });
  };

  // Get selected organization name
  const getSelectedOrgName = () => {
    if (selectedOrgIds.length === 0) return "";

    // Find the group
    const group = organizations.find((g) => {
      const branchIds = g.branches?.map((b) => b.id) || [];
      // Check if all selected IDs are in this group
      return selectedOrgIds.every((id) => branchIds.includes(id));
    });

    if (!group) return `${selectedOrgIds.length} selected`;

    // If all branches selected
    if (selectedOrgIds.length === (group.branches?.length || 0)) {
      return group.base_name;
    }

    // If single branch selected
    if (selectedOrgIds.length === 1) {
      const branch = group.branches?.find((b) => b.id === selectedOrgIds[0]);
      return branch ? `${group.base_name} - ${branch.branch}` : group.base_name;
    }

    // Multiple branches from same group
    return `${group.base_name} (${selectedOrgIds.length} branches)`;
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchDashboardStats();
    }
  }, [isSuperAdmin]);

  // Auto-apply filter on change
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    fetchDashboardStats(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      date_from: "",
      date_to: "",
      customer_state: "",
    };
    setFilters(clearedFilters);
    setSelectedOrgIds([]);
    setOrgSearch("");
    fetchDashboardStats(clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters =
    Object.values(filters).some((value) => value !== "") ||
    selectedOrgIds.length > 0;

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="dashboard"
        title={`Welcome back, ${
          user?.full_name || user?.email?.split("@")[0] || "User"
        }!`}
      >
        <div className="p-6 space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>

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
                      // Always show all organizations when focused
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
                          Loading organizations...
                        </div>
                      ) : (
                        <>
                          <div
                            className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm flex items-center gap-2"
                            onClick={() => {
                              handleSelectOrganization([]);
                              setOrgSearch("");
                              // Reset to show all cached organizations
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

              {/* Customer State */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.customer_state}
                  onValueChange={(value) =>
                    handleFilterChange("customer_state", value)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Customer state" />
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

              {/* Clear Filters Button */}
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

          {/* Statistics Cards */}
          <div className="flex gap-4 flex-wrap">
            {/* Stoves Sold to Partners */}
            <Card className="w-fit">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-16 w-48">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Stoves Sold to Partners
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.stovesSoldToPartners.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stoves Sold to End Users */}
            <Card className="w-fit">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-16 w-48">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Stoves Sold to End Users
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.stovesSoldToEndUsers.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Stoves with Partners */}
            <Card className="w-fit">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-16 w-48">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Available Stoves with Partners
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.availableStovesWithPartners.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Partners */}
            <Card className="w-fit">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-16 w-48">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Partners
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.totalPartners.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Customers */}
            <Card className="w-fit">
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-16 w-48">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-full">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Customers
                      </p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {stats.totalCustomers.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;
