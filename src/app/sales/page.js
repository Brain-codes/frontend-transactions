"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import SalesAdvancedFilterShadcn from "../components/SalesAdvancedFilterShadcn";
import SalesDetailSidebar from "../components/SalesDetailSidebar";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import useSalesAdvanced from "../hooks/useSalesAdvanced";
import organizationsService from "../services/organizationsService";
import { lgaAndStates } from "../constants";
import {
  Eye,
  Filter,
  Download,
  Search,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";

const SalesPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showCustomDate, setShowCustomDate] = useState(true);
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

  // Handle pagination changes
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
  console.log("Pagination state:", pagination);
  console.log("Sales data length:", salesData.length);

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

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
  };

  const handleEdit = (sale) => {
    console.log("Edit sale:", sale);
    // Add edit functionality here
  };

  const handleDelete = (sale) => {
    console.log("Delete sale:", sale);
    // Add delete functionality here
  };

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
          1
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
          1
        );
        const lastDayLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0
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
      setActiveQuickFilters((prev) => ({ ...prev, state: "" }));
      applyFilters({ state: "", page: 1 });
    } else {
      // Find the proper state name from constants
      const stateName = nigerianStates.find(
        (state) => state.toLowerCase() === value
      );
      const stateLabel =
        stateName || value.charAt(0).toUpperCase() + value.slice(1);

      setActiveQuickFilters((prev) => ({ ...prev, state: stateLabel }));
      applyFilters({ state: value, page: 1 });
    }
  };

  const handlePartnerFilter = (value) => {
    if (value === "all") {
      setActiveQuickFilters((prev) => ({ ...prev, partner: "" }));
      applyFilters({ partner: "", organization_id: "", page: 1 });
    } else {
      // Find the organization name for display
      const selectedOrg = organizations.find(
        (org) => org.id.toString() === value
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

    // Apply cleared filters including search
    applyFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      state: "",
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
        rightButton={
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            className="text-gray-700"
            disabled={tableLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        }
      >
        <div className="h-full flex flex-col">
          {/* Header section removed - now in topbar */}
          <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
            {/* Mobile Export Button - Only visible on mobile */}
            <div className="sm:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                className="w-full text-gray-700"
                disabled={tableLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Search and All Filters - Mobile Responsive but Desktop Horizontal */}
            <div
              className={`flex flex-col xl:flex-row gap-4 items-start xl:items-start ${
                tableLoading ? "opacity-70" : ""
              }`}
            >
              {/* Search Bar */}
              <div className="flex-1 relative min-w-0 mt-0 md:mt-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, serial number, partner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 !py-2.5 text-sm border border-gray-300 rounded-lg text-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      // Cancel any pending search
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                        searchTimeoutRef.current = null;
                      }
                      isManualSearchClear.current = true;
                      setSearchTerm("");
                      // Immediately fetch data without search parameter
                      applyFilters({ search: "", page: 1 });
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* State and Partner Filters - Responsive but Desktop Inline */}
              <div className="flex flex-col sm:flex-row xl:flex-row gap-3 items-start">
                {/* State Filter */}
                <div className="space-y-1 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    State
                  </label>
                  <Select
                    onValueChange={(value) => handleStateFilter(value)}
                    disabled={tableLoading}
                  >
                    <SelectTrigger className="w-full sm:w-40 !py-2.5">
                      <SelectValue placeholder="All states" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All states</SelectItem>
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state.toLowerCase()}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Partner Filter */}
                <div className="space-y-1 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    Partner
                  </label>
                  <Select
                    onValueChange={(value) => handlePartnerFilter(value)}
                    disabled={tableLoading}
                  >
                    <SelectTrigger className="w-full sm:w-40 !py-2.5">
                      <SelectValue
                        placeholder={
                          organizationsLoading ? "Loading..." : "All partners"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All partners</SelectItem>
                      {organizationsLoading ? (
                        <SelectItem value="" disabled>
                          Loading organizations...
                        </SelectItem>
                      ) : organizations.length === 0 ? (
                        <SelectItem value="" disabled>
                          No organizations found
                        </SelectItem>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.displayName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Container - Compact for Desktop Inline */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3 w-full xl:w-auto xl:min-w-[280px]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Date Range
                  </span>
                </div>

                {/* Date Inputs Row - Always side by side on larger screens */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">
                      Start Date
                    </label>
                    <DatePicker
                      value={customDateRange.startDate}
                      onChange={(e) =>
                        handleCustomDateChange("startDate", e.target.value)
                      }
                      placeholder="Start date"
                      disabled={tableLoading}
                      className="w-full text-gray-700"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">
                      End Date
                    </label>
                    <DatePicker
                      value={customDateRange.endDate}
                      onChange={(e) =>
                        handleCustomDateChange("endDate", e.target.value)
                      }
                      placeholder="End date"
                      disabled={tableLoading}
                      className="w-full text-gray-700"
                    />
                  </div>
                </div>

                {/* Quick Select Row */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    Quick Select
                  </label>
                  <Select
                    onValueChange={(value) => handleQuickDateFilter(value)}
                    disabled={tableLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                      <SelectItem value="thismonth">This month</SelectItem>
                      <SelectItem value="lastmonth">Last month</SelectItem>
                      <SelectItem value="all">Clear dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(activeQuickFilters.dateRange ||
              activeQuickFilters.state ||
              activeQuickFilters.partner ||
              searchTerm) && (
              <div className="flex flex-wrap gap-2 items-center md:mt-5 mt-0">
                <span className="text-xs font-medium text-gray-600">
                  Active filters:
                </span>
                {searchTerm && (
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-800 border-brand-200"
                  >
                    Search: &ldquo;{searchTerm}&rdquo;
                    <button
                      onClick={() => {
                        // Cancel any pending search timeout
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                          searchTimeoutRef.current = null;
                        }
                        isManualSearchClear.current = true;
                        setSearchTerm("");
                        // Immediately fetch data without search parameter
                        applyFilters({ search: "", page: 1 });
                      }}
                      className="ml-1 hover:text-brand-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {activeQuickFilters.dateRange && (
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-800 border-brand-200"
                  >
                    Date: {activeQuickFilters.dateRange}
                    <button
                      onClick={() => {
                        setCustomDateRange({ startDate: "", endDate: "" });
                        handleQuickDateFilter("all");
                      }}
                      className="ml-1 hover:text-brand-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {activeQuickFilters.state && (
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-800 border-brand-200"
                  >
                    State: {activeQuickFilters.state}
                    <button
                      onClick={() => handleStateFilter("all")}
                      className="ml-1 hover:text-brand-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {activeQuickFilters.partner && (
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-800 border-brand-200"
                  >
                    Partner: {activeQuickFilters.partner}
                    <button
                      onClick={() => handlePartnerFilter("all")}
                      className="ml-1 hover:text-brand-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {/* Clear Filters Button */}
                <div className="space-y-1 flex flex-col justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearQuickFilters}
                    className="text-xs h-10 whitespace-nowrap text-gray-700"
                    disabled={tableLoading}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-600">
                Showing {displayData.length} of {pagination.total} sales (Page{" "}
                {pagination.page} of {pagination.totalPages})
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select
                  value={pagination.limit.toString()}
                  onValueChange={(value) =>
                    handlePageSizeChange(parseInt(value))
                  }
                  disabled={tableLoading}
                >
                  <SelectTrigger className="w-20 text-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="bg-white rounded-lg border border-gray-200 relative">
              {/* Table Loading Overlay */}
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading data...</p>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Stove ID</TableHead>
                    <TableHead>Sales Date</TableHead>
                    <TableHead>Sales Partner</TableHead>
                    <TableHead>Sales State</TableHead>
                    <TableHead>Sales LGA</TableHead>
                    <TableHead>End User Name</TableHead>
                    <TableHead>End User Phone</TableHead>
                    <TableHead>End User Address</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableLoading ? "opacity-40" : ""}>
                  {displayData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-gray-900">
                          {searchTerm
                            ? "No sales found matching your search."
                            : "No sales data available."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayData.map((sale, index) => (
                      <TableRow
                        key={sale.id || index}
                        className="hover:bg-gray-50 text-gray-700"
                      >
                        <TableCell className="font-medium">
                          {sale.transaction_id || sale.id || `TXN-${index + 1}`}
                        </TableCell>
                        <TableCell>{sale.stove_serial_no || "N/A"}</TableCell>
                        <TableCell>
                          {formatDate(sale.sales_date || sale.created_at)}
                        </TableCell>
                        <TableCell>
                          {sale.partner_name ||
                            sale.organizations?.name ||
                            sale.organization_name ||
                            "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.state_backup ||
                            sale.addresses?.state ||
                            sale.address?.state ||
                            "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.lga_backup ||
                            sale.addresses?.city ||
                            sale.address?.city ||
                            "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.end_user_name || sale.contact_person || "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.phone || sale.contact_phone || "N/A"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {sale.addresses?.full_address ||
                            sale.addresses?.street ||
                            sale.address?.street ||
                            "N/A"}
                        </TableCell>
                        <TableCell
                          className="cursor-pointer text-center"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Eye className="h-4 w-4" />

                          {/* <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(sale)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(sale)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(sale)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu> */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  tableLoading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}(
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
                        // Show ellipsis for skipped pages
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

        {/* Advanced Filters Sidebar */}
        <SalesAdvancedFilterShadcn
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onFilter={handleFilter}
          onExport={handleExport}
          salesData={salesData}
        />

        {/* Sale Detail Sidebar */}
        {selectedSale && (
          <SalesDetailSidebar
            sale={selectedSale}
            isOpen={!!selectedSale}
            onClose={() => setSelectedSale(null)}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SalesPage;
