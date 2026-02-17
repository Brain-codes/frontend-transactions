"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import OrganizationFormModal from "../components/OrganizationFormModal";
import OrganizationDetailSidebar from "../components/OrganizationDetailSidebar";
import StoveIdsSidebar from "../components/StoveIdsSidebar";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import OrganizationCSVImportModal from "../components/OrganizationCSVImportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useOrganizations from "../hooks/useOrganizations";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { lgaAndStates } from "../constants";
import {
  Plus,
  Search,
  X,
  Building2,
  Upload,
  Package,
  CheckCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";

const PartnersPage = () => {
  const { supabase, userRole } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  // Cache management for organizations
  const ORG_CACHE_KEY = "partners_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "partners_organizations_cache_timestamp";
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
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [showStoveIdsSidebar, setShowStoveIdsSidebar] = useState(false);
  const [organizationForStoveIds, setOrganizationForStoveIds] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Organization CSV Import state
  const [showOrgImportModal, setShowOrgImportModal] = useState(false);
  const [orgImportLoading, setOrgImportLoading] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    state: "",
  });

  // Organization search for dropdown (matching Stove ID Management pattern)
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);
  const orgDropdownRef = useRef(null);

  // Statistics state
  const [stats, setStats] = useState({
    total_received: 0,
    total_sold: 0,
    total_available: 0,
    total_partners: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const nigerianStates = Object.keys(lgaAndStates).sort();

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

  // Hook for organizations data
  const {
    data: organizationsData,
    loading,
    tableLoading,
    error,
    pagination,
    applyFilters,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    fetchOrganizations,
  } = useOrganizations();

  // Clear error when auth becomes available
  useEffect(() => {
    if (error && error.includes("login") && supabase) {
      // Retry fetching if we have auth now
      const timer = setTimeout(() => {
        fetchOrganizations();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error, supabase, fetchOrganizations]);

  // Fetch statistics
  const fetchStats = async (orgIds = null) => {
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

      // Add organization filter if provided
      if (orgIds && orgIds.length > 0) {
        params.append("organization_ids", orgIds.join(","));
      }

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

      setStats({
        total_received: result.data?.total || 0,
        total_sold: result.data?.sold || 0,
        total_available: result.data?.available || 0,
        total_partners: pagination.total || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch stats on mount and when data changes
  useEffect(() => {
    if (!loading) {
      fetchStats(selectedOrgIds.length > 0 ? selectedOrgIds : null);
    }
  }, [organizationsData, pagination.total, selectedOrgIds]);

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

  // Auto-apply filters when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      const filterParams = {};
      if (filters.search) filterParams.search = filters.search;
      if (filters.status && filters.status !== "all")
        filterParams.status = filters.status;
      if (filters.state && filters.state !== "all")
        filterParams.state = filters.state;
      filterParams.page = 1;

      applyFilters(filterParams);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.state]);

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Handle organization selection
  const handleSelectOrganization = (orgIds) => {
    setSelectedOrgIds(orgIds);
    setOpenOrgPopover(false);

    // Update stats based on selection
    fetchStats(orgIds && orgIds.length > 0 ? orgIds : null);

    // Build search filter based on selected organization IDs
    // The manage-organizations endpoint filters by search, not organization_ids
    // So we need to build a search term from the selected organizations
    let searchFilter = "";

    if (orgIds && orgIds.length > 0) {
      // Get organization names from the selected IDs
      const cachedOrgs = getCachedOrganizations() || organizations;

      for (const group of cachedOrgs) {
        // Check if all org IDs match (all branches selected)
        if (
          orgIds.length === group.organization_ids.length &&
          orgIds.every((id) => group.organization_ids.includes(id))
        ) {
          searchFilter = group.base_name;
          break;
        }
        // Check if specific branch is selected
        const selectedBranch = group.branches.find(
          (b) => orgIds.includes(b.id) && orgIds.length === 1,
        );
        if (selectedBranch) {
          searchFilter = group.base_name;
          break;
        }
      }
    }

    // Update filters and apply
    const newFilters = { ...filters, search: searchFilter, page: 1 };
    setFilters(newFilters);

    // Trigger the filter
    const filterParams = {};
    if (searchFilter) filterParams.search = searchFilter;
    if (filters.status && filters.status !== "all")
      filterParams.status = filters.status;
    if (filters.state && filters.state !== "all")
      filterParams.state = filters.state;
    filterParams.page = 1;

    applyFilters(filterParams);
  };

  // Get selected organization name for display
  const getSelectedOrgName = () => {
    if (!selectedOrgIds || selectedOrgIds.length === 0) {
      return "";
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

  const handleClearFilters = () => {
    const clearedFilters = {
      search: "",
      status: "",
      state: "",
    };
    setFilters(clearedFilters);
    setSelectedOrgIds([]);
    setOrgSearch("");

    // Reset organizations list to cached full list
    const cached = getCachedOrganizations();
    if (cached && cached.length > 0) {
      setOrganizations(cached);
    }

    // Reset stats to show all organizations
    fetchStats(null);

    // Apply empty filters explicitly to show all partners data
    applyFilters({
      page: 1,
      search: "",
      status: "",
      state: "",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.state ||
    selectedOrgIds.length > 0;

  // Pagination handlers
  const handlePageChange = (page) => {
    applyFilters({ page });
  };

  const handlePageSizeChange = (value) => {
    applyFilters({ page: 1, limit: parseInt(value) });
  };

  // Organization action handlers
  const handleViewDetails = (organization) => {
    setShowFormModal(false);
    setShowDeleteModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(null);
    setSelectedOrganization(organization);
    setShowStoveIdsSidebar(false);
    setOrganizationForStoveIds(null);
  };

  const handleViewStoveIds = (organization) => {
    setSelectedOrganization(null);
    setShowStoveIdsSidebar(true);
    setOrganizationForStoveIds(organization);
  };

  const handleEdit = (organization) => {
    setSelectedOrganization(null);
    setShowDeleteModal(false);
    setOrganizationToDelete(null);
    setEditingOrganization(organization);
    setShowFormModal(true);
  };

  const handleDelete = (organization) => {
    setSelectedOrganization(null);
    setShowFormModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(organization);
    setShowDeleteModal(true);
  };

  const handleCreateNew = () => {
    setSelectedOrganization(null);
    setShowDeleteModal(false);
    setOrganizationToDelete(null);
    setEditingOrganization(null);
    setShowFormModal(true);
  };

  const handleImportOrganizations = () => {
    setSelectedOrganization(null);
    setShowFormModal(false);
    setShowDeleteModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(null);
    setShowOrgImportModal(true);
  };

  const handleOrgImportComplete = () => {
    fetchOrganizations();
  };

  const handleFormSubmit = async (formData) => {
    setFormSubmitLoading(true);
    try {
      if (editingOrganization) {
        const response = await updateOrganization(
          editingOrganization.id,
          formData,
        );
        if (response.success) {
          toast.success("Success", "Organization updated successfully");
          setShowFormModal(false);
          setEditingOrganization(null);
        }
      } else {
        const response = await createOrganization(formData);
        if (response.success) {
          toast.success("Success", "Organization created successfully");
          setShowFormModal(false);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await deleteOrganization(organizationToDelete.id);
      if (response.success) {
        toast.success("Success", "Organization deleted successfully");
        setShowDeleteModal(false);
        setOrganizationToDelete(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error", error.message || "Failed to delete organization");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="partners">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-brand" />
              <p className="text-gray-600">Loading partners data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Error state - only show if persistent (not initial auth check)
  if (error && !error.includes("login")) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="partners">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                Error loading partners data: {error}
              </p>
              <Button onClick={() => fetchOrganizations()}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout currentRoute="partners">
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Page Header with Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={handleImportOrganizations}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import Organizations</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                <Button
                  onClick={handleCreateNew}
                  className="bg-brand hover:bg-brand/90 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Partner</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                {/* Organization Search with Dropdown */}
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

                {/* Status Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={filters.state}
                    onValueChange={(value) =>
                      handleFilterChange("state", value)
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state.toLowerCase()}>
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
            <div className="flex flex-wrap gap-4">
              <Card className="w-fit">
                <CardContent className="p-4">
                  {loadingStats ? (
                    <div className="flex items-center justify-center h-16 w-48">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                          Total Stove ID Received
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {stats.total_received.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="w-fit">
                <CardContent className="p-4">
                  {loadingStats ? (
                    <div className="flex items-center justify-center h-16 w-48">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                          Total Stove ID Sold
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.total_sold.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="w-fit">
                <CardContent className="p-4">
                  {loadingStats ? (
                    <div className="flex items-center justify-center h-16 w-48">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                        <Package className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                          Total Available Stove IDs
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.total_available.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="w-fit">
                <CardContent className="p-4">
                  {loadingStats ? (
                    <div className="flex items-center justify-center h-16 w-48">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-100 p-3 rounded-full flex-shrink-0">
                        <Building2 className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                          Total Partners
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {stats.total_partners.toLocaleString()}
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
                {organizationsData.length > 0
                  ? (pagination.page - 1) * pagination.limit + 1
                  : 0}{" "}
                to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} partners
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select
                  value={pagination.limit.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-20 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading partners...</p>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader className="bg-brand">
                  <TableRow className="hover:bg-brand">
                    <TableHead className="text-white py-4 first:rounded-tl-lg">
                      Partner
                    </TableHead>
                    <TableHead className="text-white py-4">Type</TableHead>
                    <TableHead className="text-white py-4">Branch</TableHead>
                    <TableHead className="text-white py-4">
                      Total Stove ID Received
                    </TableHead>
                    <TableHead className="text-white py-4">
                      Total Stove ID Sold
                    </TableHead>
                    <TableHead className="text-white py-4">
                      Total Available Stove IDs
                    </TableHead>
                    <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableLoading ? "opacity-40" : ""}>
                  {organizationsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-500">
                          {tableLoading ? "Loading..." : "No partners found"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizationsData.map((org, index) => (
                      <TableRow
                        key={org.id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-brand-light"
                        } hover:bg-gray-50`}
                      >
                        <TableCell className="font-medium">
                          {org.partner_name}
                        </TableCell>
                        <TableCell>
                          {org.partner_type ? (
                            <div
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${
                                org.partner_type === "partner"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }`}
                            >
                              {org.partner_type.charAt(0).toUpperCase() +
                                org.partner_type.slice(1)}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>{org.branch || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            {org.total_stove_ids || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {org.sold_stove_ids || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            {org.available_stove_ids || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleViewStoveIds(org)}
                              className="bg-brand hover:bg-brand/90"
                            >
                              View Stove IDs
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(org)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Partner Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(org)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(org)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className={
                          pagination.page <= 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {[...Array(Math.min(5, pagination.totalPages))].map(
                      (_, index) => {
                        const page = index + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === pagination.page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      },
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className={
                          pagination.page >= pagination.totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <OrganizationFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingOrganization(null);
            setFormSubmitLoading(false);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingOrganization}
          loading={loading}
          submitLoading={formSubmitLoading}
        />

        {selectedOrganization && (
          <OrganizationDetailSidebar
            organization={selectedOrganization}
            isOpen={!!selectedOrganization}
            onClose={() => setSelectedOrganization(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {showStoveIdsSidebar && organizationForStoveIds && (
          <StoveIdsSidebar
            organization={organizationForStoveIds}
            isOpen={showStoveIdsSidebar}
            onClose={() => {
              setShowStoveIdsSidebar(false);
              setOrganizationForStoveIds(null);
            }}
          />
        )}

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setOrganizationToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          organizationName={organizationToDelete?.partner_name}
          loading={loading}
        />

        <OrganizationCSVImportModal
          isOpen={showOrgImportModal}
          onClose={() => {
            setShowOrgImportModal(false);
            setOrgImportLoading(false);
          }}
          onImportComplete={handleOrgImportComplete}
          loading={orgImportLoading}
          supabase={supabase}
        />

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PartnersPage;
