"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { lgaAndStates } from "../constants";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Search,
  X,
  Eye,
  Package,
  CheckCircle,
  Building2,
} from "lucide-react";
import StoveDetailModal from "../components/StoveDetailModal";
import { Card, CardContent } from "@/components/ui/card";

// Simple tooltip component
const SimpleTooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50">
          {text}
        </div>
      )}
    </div>
  );
};

const StoveManagementPage = () => {
  const { supabase, user, userRole, isSuperAdmin, isAdmin, getStoredProfile } =
    useAuth();
  const { toast, toasts, removeToast } = useToast();

  // Get admin's organization for filtering
  const userProfile = getStoredProfile();
  const adminOrgId = userProfile?.organization_id || null;

  // Cache management for organizations
  const ORG_CACHE_KEY = "stove_management_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY =
    "stove_management_organizations_cache_timestamp";
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

  // State management
  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 0,
  });

  // Organization selection
  // For admin users, automatically set their organization ID
  const [selectedOrgIds, setSelectedOrgIds] = useState(
    isAdmin && adminOrgId ? [adminOrgId] : [],
  );
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    available: 0,
    sold: 0,
    total: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Filter state (removed organization_name)
  const [filters, setFilters] = useState({
    stove_id: "",
    status: "",
    branch: "",
    state: "",
    date_from: "",
    date_to: "",
  });

  // Stove detail modal
  const [selectedStove, setSelectedStove] = useState(null);
  const [showStoveModal, setShowStoveModal] = useState(false);
  const [loadingStoveId, setLoadingStoveId] = useState(null);

  // Ref for organization dropdown
  const orgDropdownRef = useRef(null);

  // Close dropdown when clicking outside
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

  // Fetch organizations for search (with caching)
  // Only super admins need this - admins are locked to their organization
  const fetchOrganizations = async (searchTerm = "") => {
    // Skip for admin users - they don't have organization selector
    if (isAdmin && !isSuperAdmin) {
      return;
    }

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
            group.base_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  };

  // Fetch stove statistics
  const fetchStats = async (orgIds) => {
    setLoadingStats(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/get-stove-stats`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const params = new URLSearchParams();

      // Add organization filter only if specific organizations are selected
      if (orgIds && orgIds.length > 0) {
        params.append("organization_ids", orgIds.join(","));
      }
      // If orgIds is empty array, fetch stats for all organizations (no filter)

      const response = await fetch(`${functionUrl}?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch statistics");
      }

      setStats(result.data || { available: 0, sold: 0, total: 0 });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({ available: 0, sold: 0, total: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch stove IDs
  const fetchStoveIds = async (
    page = 1,
    pageSize = 25,
    currentFilters = filters,
    orgIds = selectedOrgIds,
  ) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-stove-ids`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      // Add organization filter only if specific organizations are selected
      if (orgIds && orgIds.length > 0) {
        params.append("organization_ids", orgIds.join(","));
      }
      // If orgIds is empty array, fetch all stove IDs (no organization filter)

      // Add filters
      if (currentFilters.stove_id)
        params.append("stove_id", currentFilters.stove_id);
      if (currentFilters.status) params.append("status", currentFilters.status);
      if (currentFilters.branch) params.append("branch", currentFilters.branch);
      if (currentFilters.state) params.append("state", currentFilters.state);
      if (currentFilters.date_from)
        params.append("date_from", currentFilters.date_from);
      if (currentFilters.date_to)
        params.append("date_to", currentFilters.date_to);

      const response = await fetch(`${functionUrl}?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch stove IDs");
      }

      setStoveIds(result.data || []);
      setPagination(
        result.pagination || {
          page: 1,
          page_size: 25,
          total_count: 0,
          total_pages: 0,
        },
      );
    } catch (err) {
      console.error("Error fetching stove IDs:", err);
      toast.error("Failed to fetch stove IDs", err.message);
      setStoveIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Load organizations on mount
  useEffect(() => {
    fetchOrganizations();
    fetchStats([]);
    fetchStoveIds(1, 25);
  }, []);

  // Handle organization selection
  const handleSelectOrganization = (orgIds) => {
    setSelectedOrgIds(orgIds);
    fetchStats(orgIds);
    fetchStoveIds(1, pagination.page_size, filters, orgIds);
  };

  // Get selected organization name
  const getSelectedOrgName = () => {
    if (!selectedOrgIds || selectedOrgIds.length === 0) {
      return "All Organizations";
    }

    for (const group of organizations) {
      if (
        selectedOrgIds.length === group.organization_ids.length &&
        selectedOrgIds.every((id) => group.organization_ids.includes(id))
      ) {
        return `${group.base_name} (All Branches)`;
      }

      const branch = group.branches.find(
        (b) => selectedOrgIds.includes(b.id) && selectedOrgIds.length === 1,
      );
      if (branch) {
        return `${group.base_name} - ${branch.branch}`;
      }
    }

    return `${selectedOrgIds.length} selected`;
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchStoveIds(newPage, pagination.page_size);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize);
    setPagination((prev) => ({ ...prev, page_size: size }));
    fetchStoveIds(1, size);
  };

  // Handle filter change with auto-apply
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    // Auto-apply filters
    fetchStoveIds(1, pagination.page_size, newFilters);
  };

  // Apply filters
  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      stove_id: "",
      status: "",
      branch: "",
      state: "",
      date_from: "",
      date_to: "",
    };
    setFilters(clearedFilters);

    // Only clear organization selection for super admins
    // Admins should always keep their organization filter
    if (isSuperAdmin) {
      handleSelectOrganization([]);
      setOrgSearch("");

      // Reset organizations list to cached full list
      const cached = getCachedOrganizations();
      if (cached && cached.length > 0) {
        setOrganizations(cached);
      }
    }

    fetchStoveIds(1, pagination.page_size, clearedFilters);
  };

  // Check if any filters are active (including organization for super admins only)
  const hasActiveFilters =
    Object.values(filters).some((value) => value !== "") ||
    (isSuperAdmin && selectedOrgIds.length > 0);

  // Fetch stove details
  const handleViewStove = async (stoveId) => {
    setLoadingStoveId(stoveId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-stove-ids?id=${stoveId}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(functionUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch stove details");
      }

      setSelectedStove(result || null);
      setShowStoveModal(true);
    } catch (err) {
      console.error("Error fetching stove:", err);
      toast.error("Failed to fetch stove details", err.message);
    } finally {
      setLoadingStoveId(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Load organizations on mount
  useEffect(() => {
    // Load cached organizations first
    const cached = getCachedOrganizations();
    if (cached && cached.length > 0) {
      setOrganizations(cached);
    } else {
      // If no cache, fetch from API
      fetchOrganizations();
    }
    fetchStats([]);
    fetchStoveIds(1, 25);
  }, []);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }

    return pages;
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
      <DashboardLayout currentRoute="stove-management">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Stove ID Management
                </h1>
              </div>
            </div>

            <>
              {/* Filters */}
              <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Organization Search - Only for Super Admins */}
                  {isSuperAdmin && (
                    <div className="flex-1 min-w-[200px]" ref={orgDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search organizations..."
                          value={orgSearch}
                          onChange={(e) => {
                            const value = e.target.value;
                            setOrgSearch(value);
                            fetchOrganizations(value);
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
                                fetchOrganizations("");
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
                                    setOpenOrgPopover(false);
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
                                          setOpenOrgPopover(false);
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
                                              handleSelectOrganization([
                                                branch.id,
                                              ]);
                                              setOrgSearch("");
                                              setOpenOrgPopover(false);
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
                  )}

                  {/* Stove ID Search */}
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      placeholder="Stove ID"
                      value={filters.stove_id}
                      onChange={(e) =>
                        handleFilterChange("stove_id", e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "status",
                          value === "all" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch - Only for Super Admins */}
                  {isSuperAdmin && (
                    <div className="flex-1 min-w-[150px]">
                      <Input
                        placeholder="Branch"
                        value={filters.branch}
                        onChange={(e) =>
                          handleFilterChange("branch", e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                  )}

                  {/* State */}
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      value={filters.state || "all"}
                      onValueChange={(value) =>
                        handleFilterChange(
                          "state",
                          value === "all" ? "" : value,
                        )
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states</SelectItem>
                        {Object.keys(lgaAndStates)
                          .sort()
                          .map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      type="date"
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
                      value={filters.date_to}
                      onChange={(e) =>
                        handleFilterChange("date_to", e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>

                  {/* Selected Organization Badge - Only for Super Admins */}
                  {isSuperAdmin && selectedOrgIds.length > 0 && (
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
              <div className="flex gap-4">
                <Card className="w-fit shadow-none">
                  <CardContent className="p-4">
                    {loadingStats ? (
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
                            Total Stove IDs Received
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            {stats.total.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="w-fit shadow-none">
                  <CardContent className="p-4">
                    {loadingStats ? (
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
                            Total Stove IDs Sold
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.sold.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="w-fit shadow-none">
                  <CardContent className="p-4">
                    {loadingStats ? (
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
                            Total Available Stove IDs
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            {stats.available.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Table Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  {stoveIds.length > 0
                    ? (pagination.page - 1) * pagination.page_size + 1
                    : 0}{" "}
                  to{" "}
                  {Math.min(
                    pagination.page * pagination.page_size,
                    pagination.total_count,
                  )}{" "}
                  of {pagination.total_count} stove IDs
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <Select
                    value={pagination.page_size.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
                {loading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center">
                      <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Loading stove IDs...
                      </p>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader className="bg-brand">
                    <TableRow className="hover:bg-brand">
                      <TableHead className="text-white py-4 first:rounded-tl-lg">
                        Stove ID
                      </TableHead>
                      <TableHead className="text-white py-4">Status</TableHead>
                      {userRole === "super_admin" ? (
                        <>
                          <TableHead className="text-white py-4">
                            Partner Name
                          </TableHead>
                          <TableHead className="text-white py-4">
                            Branch
                          </TableHead>
                          <TableHead className="text-white py-4">
                            Location (State)
                          </TableHead>
                          <TableHead className="text-white py-4">
                            Date Sold
                          </TableHead>
                          <TableHead className="text-white py-4">
                            Sold To
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-white py-4">
                            Date Sold
                          </TableHead>
                          <TableHead className="text-white py-4">
                            Sold To
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? "opacity-40" : ""}>
                    {stoveIds.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={userRole === "super_admin" ? 8 : 5}
                          className="text-center py-8"
                        >
                          <div className="text-gray-500">
                            {loading ? "Loading..." : "No stove IDs found"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stoveIds.map((stove, index) => (
                        <TableRow
                          key={stove.id}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-brand-light"
                          } hover:bg-gray-50`}
                        >
                          <TableCell className="font-medium">
                            {stove.stove_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                stove.status === "sold"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-green-100 text-green-800 border-green-200"
                              }
                            >
                              {stove.status.charAt(0).toUpperCase() +
                                stove.status.slice(1)}
                            </Badge>
                          </TableCell>

                          {userRole === "super_admin" ? (
                            <>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.organization_name || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.branch || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.location || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.status === "sold" && stove.sale_date
                                    ? formatDate(stove.sale_date)
                                    : "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.sold_to || "-"}
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.status === "sold" && stove.sale_date
                                    ? formatDate(stove.sale_date)
                                    : "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {stove.sold_to || "-"}
                                </div>
                              </TableCell>
                            </>
                          )}

                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => handleViewStove(stove.id)}
                              disabled={loadingStoveId === stove.id}
                              className="bg-brand hover:bg-brand/90"
                            >
                              {loadingStoveId === stove.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            pagination.page > 1 &&
                            handlePageChange(pagination.page - 1)
                          }
                          className={
                            pagination.page === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {getPageNumbers().map((pageNum, index) => (
                        <PaginationItem key={index}>
                          {pageNum === "..." ? (
                            <span className="px-4 py-2">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={pagination.page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            pagination.page < pagination.total_pages &&
                            handlePageChange(pagination.page + 1)
                          }
                          className={
                            pagination.page === pagination.total_pages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>

            {/* Stove Detail Modal */}
            {showStoveModal && selectedStove && (
              <StoveDetailModal
                open={showStoveModal}
                onClose={() => {
                  setShowStoveModal(false);
                  setSelectedStove(null);
                }}
                stove={selectedStove}
              />
            )}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default StoveManagementPage;
