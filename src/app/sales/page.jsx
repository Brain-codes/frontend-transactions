"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SalesTable from "./components/SalesTable";
import BulkActionsToolbar from "./components/BulkActionsToolbar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import useSalesAdvanced from "../hooks/useSalesAdvanced";
import { useAuth } from "../contexts/AuthContext";
import { lgaAndStates } from "../constants";
import ReceiptModal from "./components/ReceiptModal.jsx";
import AttachmentsModal from "./components/AttachmentsModal";
import { Download, Search, X, Building2, Loader2 } from "lucide-react";

const SalesPage = () => {
  const { supabase } = useAuth();

  // Cache management for organizations
  const ORG_CACHE_KEY = "sales_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "sales_organizations_cache_timestamp";
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

  // Modal state for receipts and attachments
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [modalSale, setModalSale] = useState(null);
  const [selectedLGA, setSelectedLGA] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Organization selection
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);
  const orgDropdownRef = useRef(null);

  // Bulk actions state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [exportLoading, setExportLoading] = useState(false);
  const isManualSearchClear = useRef(false);
  const searchTimeoutRef = useRef(null);

  const {
    data: salesData,
    loading,
    tableLoading,
    error,
    pagination,
    applyFilters,
    exportSales,
    fetchSales,
  } = useSalesAdvanced();

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

    // Apply organization filter
    if (orgIds && orgIds.length > 0) {
      applyFilters({ organization_ids: orgIds.join(","), page: 1 });
    } else {
      // Clear organization filter
      applyFilters({ organization_ids: "", page: 1 });
    }
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

  // Get states from constants
  const handlePageChange = (page) => {
    applyFilters({ page });
  };

  const handlePageSizeChange = (pageSize) => {
    applyFilters({ page: 1, limit: pageSize });
  };

  // For paginated data, we use server-side filtering, so display salesData directly
  // Client-side filtering is only used as a fallback for immediate visual feedback
  const displayData = salesData;

  // Debug pagination
  // console.log("Pagination state:", pagination);
  // console.log("Sales data length:", salesData.length);

  // Track active quick filters for badges
  const [activeQuickFilters, setActiveQuickFilters] = useState({
    dateRange: "",
    state: "",
    partner: "",
  });

  // Get states from constants
  const nigerianStates = Object.keys(lgaAndStates).sort();

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      setOrganizationsLoading(true);
      try {
        const response = await organizationsService.getAllOrganizations();
        if (response.success) {
          setOrganizations(response.data);
        } else {
          console.error("Failed to fetch organizations:", response.error);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setOrganizationsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleFilter = (filters) => {
    console.log("Applying filters:", filters);
    // Include search term in server-side filtering if present
    const serverFilters = {
      ...filters,
      ...(searchTerm && { search: searchTerm }),
      page: 1, // Reset to first page when applying new filters
    };
    applyFilters(serverFilters);
  };

  // Handle search term changes with debouncing for server-side search
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Skip if this is a manual clear - we handle it separately
    if (isManualSearchClear.current) {
      isManualSearchClear.current = false;
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm) {
        // Apply server-side search
        applyFilters({ search: searchTerm, page: 1 });
      } else {
        // Clear search and reload data
        applyFilters({ page: 1 });
      }
      searchTimeoutRef.current = null;
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm, applyFilters]);

  const handleExport = (format) => {
    console.log("Exporting as:", format);
    exportSales({}, format);
  };

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

  // Calculate stove age in years, months, days
  const getStoveAge = (salesDate) => {
    if (!salesDate) return "N/A";
    const soldDate = new Date(salesDate);
    const now = new Date();
    let years = now.getFullYear() - soldDate.getFullYear();
    let months = now.getMonth() - soldDate.getMonth();
    let days = now.getDate() - soldDate.getDate();
    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    let result = [];
    if (years > 0) result.push(`${years}y`);
    if (months > 0) result.push(`${months}m`);
    if (days > 0) result.push(`${days}d`);
    return result.length ? result.join(" ") : "0d";
  };

  // Show receipt modal for download
  const handleDownloadReceipt = (sale) => {
    setModalSale(sale);
    setShowReceiptModal(true);
  };

  // Show attachments modal
  const handleShowAttachments = (sale) => {
    setModalSale(sale);
    setShowAttachmentsModal(true);
  };

  const handleEdit = (sale) => {
    console.log("Edit sale:", sale);
    // Add edit functionality here
  };

  const handleDelete = (sale) => {
    console.log("Delete sale:", sale);
    // Add delete functionality here
  };

  // Bulk action handlers
  const handleSelectItem = (itemId, checked) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(displayData.map((sale) => sale.id.toString()));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleExportClick = async () => {
    setExportLoading(true);
    try {
      await exportSales();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSelected = () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    console.log("Exporting selected items:", selectedIds);
    // Create filters for selected items
    const filters = { ids: selectedIds };
    exportSales(filters, "csv");
  };

  const handleDeleteSelected = () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    console.log("Deleting selected items:", selectedIds);
    // Add bulk delete functionality here
    // For now, just clear the selection
    setSelectedItems(new Set());
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  // Clear selection when data changes (e.g., page change, filters)
  useEffect(() => {
    setSelectedItems(new Set());
  }, [salesData]);

  // Quick filter handlers
  const handleQuickDateFilter = (value) => {
    let dateFilters = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel = "";

    switch (value) {
      case "today":
        const todayStr = today.toISOString().split("T")[0];
        dateFilters.dateFrom = todayStr;
        dateFilters.dateTo = todayStr;
        dateLabel = "Today";
        setCustomDateRange({ startDate: todayStr, endDate: todayStr });
        break;
      case "yesterday":
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        dateFilters.dateFrom = yesterdayStr;
        dateFilters.dateTo = yesterdayStr;
        dateLabel = "Yesterday";
        setCustomDateRange({ startDate: yesterdayStr, endDate: yesterdayStr });
        break;
      case "last7days":
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        const last7DaysStr = last7Days.toISOString().split("T")[0];
        const todayStr7 = today.toISOString().split("T")[0];
        dateFilters.dateFrom = last7DaysStr;
        dateFilters.dateTo = todayStr7;
        dateLabel = "Last 7 days";
        setCustomDateRange({ startDate: last7DaysStr, endDate: todayStr7 });
        break;
      case "last30days":
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        const last30DaysStr = last30Days.toISOString().split("T")[0];
        const todayStr30 = today.toISOString().split("T")[0];
        dateFilters.dateFrom = last30DaysStr;
        dateFilters.dateTo = todayStr30;
        dateLabel = "Last 30 days";
        setCustomDateRange({ startDate: last30DaysStr, endDate: todayStr30 });
        break;
      case "thismonth":
        const firstDayThisMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        const firstDayStr = firstDayThisMonth.toISOString().split("T")[0];
        const todayStrMonth = today.toISOString().split("T")[0];
        dateFilters.dateFrom = firstDayStr;
        dateFilters.dateTo = todayStrMonth;
        dateLabel = "This month";
        setCustomDateRange({ startDate: firstDayStr, endDate: todayStrMonth });
        break;
      case "lastmonth":
        const firstDayLastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastDayLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
        );
        const firstDayLastStr = firstDayLastMonth.toISOString().split("T")[0];
        const lastDayLastStr = lastDayLastMonth.toISOString().split("T")[0];
        dateFilters.dateFrom = firstDayLastStr;
        dateFilters.dateTo = lastDayLastStr;
        dateLabel = "Last month";
        setCustomDateRange({
          startDate: firstDayLastStr,
          endDate: lastDayLastStr,
        });
        break;
      case "all":
      default:
        // Clear date filters
        dateFilters = { dateFrom: "", dateTo: "" };
        dateLabel = "";
        setCustomDateRange({ startDate: "", endDate: "" });
        break;
    }

    setActiveQuickFilters((prev) => ({ ...prev, dateRange: dateLabel }));
    applyFilters({ ...dateFilters, page: 1 });
  };

  const handleCustomDateChange = (field, value) => {
    const newRange = { ...customDateRange, [field]: value };
    setCustomDateRange(newRange);

    if (newRange.startDate && newRange.endDate) {
      const dateLabel = `${newRange.startDate} to ${newRange.endDate}`;
      setActiveQuickFilters((prev) => ({ ...prev, dateRange: dateLabel }));
      applyFilters({
        dateFrom: newRange.startDate,
        dateTo: newRange.endDate,
        page: 1,
      });
    }
  };

  const handleStateFilter = (value) => {
    if (value === "all") {
      setSelectedState("");
      setSelectedLGA("");
      setActiveQuickFilters((prev) => ({ ...prev, state: "" }));
      applyFilters({ state: "", lga: "", page: 1 });
    } else {
      // Find the proper state name from constants
      const stateName = nigerianStates.find(
        (state) => state.toLowerCase() === value,
      );
      const stateLabel =
        stateName || value.charAt(0).toUpperCase() + value.slice(1);
      setSelectedState(stateLabel);
      setSelectedLGA("");
      setActiveQuickFilters((prev) => ({ ...prev, state: stateLabel }));
      applyFilters({ state: stateLabel, lga: "", page: 1 });
    }
  };

  const handleLGAFilter = (value) => {
    if (value === "all") {
      setSelectedLGA("");
      applyFilters({ lga: "", page: 1 });
    } else {
      setSelectedLGA(value);
      applyFilters({ lga: value, page: 1 });
    }
  };

  const handlePartnerFilter = (value) => {
    if (value === "all") {
      setActiveQuickFilters((prev) => ({ ...prev, partner: "" }));
      applyFilters({ partner: "", organization_id: "", page: 1 });
    } else {
      // Find the organization name for display
      const selectedOrg = organizations.find(
        (org) => org.id.toString() === value,
      );
      const partnerLabel = selectedOrg
        ? selectedOrg.displayName
        : `Org ID: ${value}`;

      setActiveQuickFilters((prev) => ({ ...prev, partner: partnerLabel }));
      applyFilters({ organization_id: value, page: 1 });
    }
  };

  const clearQuickFilters = () => {
    // Cancel any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Set manual clear flag and clear search term
    isManualSearchClear.current = true;
    setSearchTerm("");

    // Clear all filter states
    setActiveQuickFilters({ dateRange: "", state: "", partner: "" });
    setCustomDateRange({ startDate: "", endDate: "" });
    setSelectedState("");
    setSelectedLGA("");

    // Apply cleared filters including search
    applyFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      state: "",
      lga: "",
      partner: "",
      organization_id: "",
      page: 1,
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="sales">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="sales">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                Error loading sales data: {error}
              </p>
              <Button onClick={() => fetchSales()}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="sales"
        title="Atmosfair Sales Management"
        description="Manage and track all your Atmosfair sales transactions"
      >
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sales Management
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportClick}
                  variant="outline"
                  size="sm"
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </div>
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
                        setOrgSearch(e.target.value);
                        fetchOrganizationsForSearch(e.target.value);
                        setOpenOrgPopover(true);
                      }}
                      onFocus={() => {
                        setOpenOrgPopover(true);
                        if (!orgSearch) {
                          // Reset to cached full list when focused with no search
                          const cached = getCachedOrganizations();
                          if (cached) {
                            setOrganizations(cached);
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
                        // Reset to cached full list
                        const cached = getCachedOrganizations();
                        if (cached) {
                          setOrganizations(cached);
                        }
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Search Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    placeholder="Search sales..."
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      isManualSearchClear.current = false;

                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                      }

                      searchTimeoutRef.current = setTimeout(() => {
                        applyFilters({ search: value, page: 1 });
                      }, 500);
                    }}
                    className="bg-white"
                  />
                </div>

                {/* State Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    placeholder="State"
                    value={selectedState}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedState(value);
                      applyFilters({ state: value, page: 1 });
                    }}
                    className="bg-white"
                  />
                </div>

                {/* LGA Filter */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    placeholder="LGA"
                    value={selectedLGA}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedLGA(value);
                      applyFilters({ lga: value, page: 1 });
                    }}
                    className="bg-white"
                  />
                </div>

                {/* Date From */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    placeholder="Date From"
                    value={customDateRange.startDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomDateRange((prev) => ({
                        ...prev,
                        startDate: value,
                      }));
                      applyFilters({
                        dateFrom: value,
                        page: 1,
                      });
                    }}
                    className="bg-white"
                  />
                </div>

                {/* Date To */}
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    placeholder="Date To"
                    value={customDateRange.endDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomDateRange((prev) => ({
                        ...prev,
                        endDate: value,
                      }));
                      applyFilters({
                        dateTo: value,
                        page: 1,
                      });
                    }}
                    className="bg-white"
                  />
                </div>

                {/* Clear Filters */}
                {(searchTerm ||
                  selectedState ||
                  selectedLGA ||
                  customDateRange.startDate ||
                  customDateRange.endDate ||
                  selectedOrgIds.length > 0) && (
                  <div>
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedState("");
                        setSelectedLGA("");
                        setCustomDateRange({ startDate: "", endDate: "" });
                        handleSelectOrganization([]);
                        setOrgSearch("");
                        // Reset to cached full list
                        const cached = getCachedOrganizations();
                        if (cached) {
                          setOrganizations(cached);
                        }
                        applyFilters({
                          search: "",
                          state: "",
                          lga: "",
                          dateFrom: "",
                          dateTo: "",
                          organization_ids: "",
                          page: 1,
                        });
                      }}
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

            {/* Table Controls */}
            <div>
              <p className="text-sm text-gray-500">
                {selectedOrgIds.length > 0
                  ? `Viewing sales for selected organization${
                      selectedOrgIds.length > 1 ? "s" : ""
                    }`
                  : "Viewing all sales"}
              </p>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
                {/* Table Loading Overlay */}
                {tableLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading data...</p>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Toolbar */}
                <div className="p-4 pb-0">
                  <BulkActionsToolbar
                    selectedCount={selectedItems.size}
                    onExportSelected={handleExportSelected}
                    onDeleteSelected={handleDeleteSelected}
                    onClearSelection={handleClearSelection}
                    disabled={tableLoading}
                  />
                </div>

                <SalesTable
                  displayData={displayData}
                  tableLoading={tableLoading}
                  searchTerm={searchTerm}
                  formatDate={formatDate}
                  getStoveAge={getStoveAge}
                  exportSales={exportSales}
                  handleDownloadReceipt={handleDownloadReceipt}
                  handleShowAttachments={handleShowAttachments}
                  handleDelete={handleDelete}
                  selectedItems={selectedItems}
                  onSelectItem={handleSelectItem}
                  onSelectAll={handleSelectAll}
                />
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div
                  className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    tableLoading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total items)
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(pagination.page - 1)}
                          className={
                            pagination.page <= 1 || tableLoading
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {/* Page Numbers */}
                      {[...Array(pagination.totalPages)].map((_, index) => {
                        const page = index + 1;
                        const isCurrentPage = page === pagination.page;
                        const showPage =
                          page === 1 ||
                          page === pagination.totalPages ||
                          (page >= pagination.page - 2 &&
                            page <= pagination.page + 2);
                        if (!showPage) {
                          if (
                            page === pagination.page - 3 ||
                            page === pagination.page + 3
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() =>
                                !tableLoading && handlePageChange(page)
                              }
                              isActive={isCurrentPage}
                              className={`cursor-pointer ${
                                tableLoading ? "pointer-events-none" : ""
                              }`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(pagination.page + 1)}
                          className={
                            pagination.page >= pagination.totalPages ||
                            tableLoading
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
        </div>

        {/* Receipt Modal */}
        {showReceiptModal && (
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => setShowReceiptModal(false)}
            modalSale={modalSale}
          />
        )}

        {/* Attachments Modal */}
        {showAttachmentsModal && (
          <AttachmentsModal
            isOpen={showAttachmentsModal}
            onClose={() => setShowAttachmentsModal(false)}
            modalSale={modalSale}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SalesPage;
