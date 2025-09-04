"use client";

import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import SalesTable from "../components/sales/SalesTable";
import SalesFilters from "../components/sales/SalesFilters";
import SalesStatsBar from "../components/sales/SalesStatsBar";
import SalesErrorAlert from "../components/sales/SalesErrorAlert";
import SalesPagination from "../components/sales/SalesPagination";
import AdminSalesDetailModal from "../components/sales/AdminSalesDetailModal";
import SalesFormModal from "../components/sales/SalesFormModal";
import { useRouter } from "next/navigation";
import { lgaAndStates } from "../../constants";
import adminSalesService from "../../services/adminSalesService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminSales } from "@/types/adminSales";

const AdminSalesPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
  const [salesData, setSalesData] = useState<AdminSales[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<AdminSales | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState<AdminSales | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedLGA, setSelectedLGA] = useState<string>("");
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  // Track active filters for badge bar
  const [activeQuickFilters, setActiveQuickFilters] = useState<{
    dateRange?: string;
    state?: string;
    partner?: string;
  }>({});

  // Search debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualSearchClear = useRef<boolean>(false);

  // Get states from constants
  const nigerianStates: string[] = Object.keys(lgaAndStates).sort();

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Update activeQuickFilters whenever dateRange changes
  useEffect(() => {
    let dateLabel = "";
    const filterStart = dateRange.startDate;
    const filterEnd = dateRange.endDate;
    const todayStr = new Date().toISOString().split("T")[0];

    let actualStart = filterStart;
    let actualEnd = filterEnd;

    if (filterStart && !filterEnd) {
      actualEnd = todayStr;
    } else if (!filterStart && filterEnd) {
      actualStart = filterEnd;
    }

    if (actualStart && actualEnd) {
      if (actualStart === actualEnd) {
        dateLabel = actualStart;
      } else {
        dateLabel = `${actualStart} to ${
          actualEnd === todayStr ? "Today" : actualEnd
        }`;
      }
    } else if (actualStart) {
      dateLabel = `From ${actualStart}`;
    } else if (actualEnd) {
      dateLabel = `To ${actualEnd}`;
    }

    // Always replace the entire activeQuickFilters to prevent accumulation
    setActiveQuickFilters((prev) => ({
      ...prev,
      dateRange: dateLabel || undefined,
    }));
  }, [dateRange.startDate, dateRange.endDate]);

  // Update activeQuickFilters whenever selectedState changes
  useEffect(() => {
    setActiveQuickFilters((prev) => ({
      ...prev,
      state: selectedState || undefined,
    }));
  }, [selectedState]);

  // Handle search term changes with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (isManualSearchClear.current) {
      isManualSearchClear.current = false;
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchSalesData();
      searchTimeoutRef.current = null;
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm]);

  const fetchSalesData = async (
    additionalFilters: Record<string, any> = {}
  ) => {
    try {
      setTableLoading(true);
      setError(null);

      // Date filter logic: if only startDate, use today as endDate; if only endDate, use endDate as both
      let filterStart = dateRange.startDate;
      let filterEnd = dateRange.endDate;
      const todayStr = new Date().toISOString().split("T")[0];
      if (dateRange.startDate && !dateRange.endDate) {
        filterEnd = todayStr;
      } else if (!dateRange.startDate && dateRange.endDate) {
        filterStart = dateRange.endDate;
      }

      // Include all filters: page, limit, query, date range, state, lga
      // Use passed filter values if available, otherwise use current state
      const currentState =
        additionalFilters.state !== undefined
          ? additionalFilters.state
          : selectedState;
      const currentLGA =
        additionalFilters.lga !== undefined
          ? additionalFilters.lga
          : selectedLGA;

      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        ...additionalFilters,
        ...(searchTerm && { query: searchTerm }),
        ...(filterStart && { from: filterStart }),
        ...(filterEnd && { to: filterEnd }),
        ...(currentState && currentState !== "" && { state: currentState }),
        ...(currentLGA && currentLGA !== "" && { lga: currentLGA }),
      };

      const response = await adminSalesService.getSalesAdvanced(filters);

      if (response.success) {
        setSalesData(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Failed to fetch sales data");
      }
    } catch (err) {
      console.error("Error fetching sales:", err);
      setError("An unexpected error occurred while fetching sales data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    fetchSalesData({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    const newPagination = { page: 1, limit: pageSize };
    setPagination((prev) => ({ ...prev, ...newPagination }));
    fetchSalesData(newPagination);
  };

  const applyFilters = () => {
    const newPagination = { page: 1 };
    setPagination((prev) => ({ ...prev, ...newPagination }));
    fetchSalesData(newPagination);
    setShowFilters(false);
  };

  const clearFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    isManualSearchClear.current = true;
    setSearchTerm("");
    setSelectedState("");
    setSelectedLGA("");
    setDateRange({ startDate: null, endDate: null });
    setSelectedStatus("");

    // Clear active filters immediately
    setActiveQuickFilters({});

    const newPagination = { page: 1 };
    setPagination((prev) => ({ ...prev, ...newPagination }));

    // Explicitly pass undefined values to ensure filters are cleared
    fetchSalesData({
      ...newPagination,
      query: "",
      state: "",
      lga: "",
      from: "",
      to: "",
    });
  };

  // State and LGA filter handlers that handle "all" values
  const handleStateFilter = (val: string) => {
    const newState = val === "all" ? "" : val;
    setSelectedState(newState);
    // Pass the new state value directly to avoid race condition
    // If clearing (empty string), pass undefined to remove from filters
    fetchSalesData({
      page: 1,
      state: newState === "" ? "" : newState,
    });
  };

  const handleLGAFilter = (val: string) => {
    const newLGA = val === "all" ? "" : val;
    setSelectedLGA(newLGA);
    // Pass the new LGA value directly to avoid race condition
    // If clearing (empty string), pass undefined to remove from filters
    fetchSalesData({
      page: 1,
      lga: newLGA === "" ? "" : newLGA,
    });
  };

  const handleExport = async (format = "csv") => {
    try {
      setTableLoading(true);

      const filters = {
        ...(searchTerm && { search: searchTerm }),
        ...(selectedState && { state: selectedState }),
        ...(selectedLGA && { lga: selectedLGA }),
        ...(dateRange.startDate && { dateFrom: dateRange.startDate }),
        ...(dateRange.endDate && { dateTo: dateRange.endDate }),
        ...(selectedStatus && { status: selectedStatus }),
        export: format,
        limit: 10000, // Export more records
      };

      const response = await adminSalesService.getSalesAdvanced(filters);

      if (response.success) {
        // Handle the exported data (CSV content)
        const filename = `admin-sales-export-${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        const blob = new Blob([response.data], {
          type: format === "csv" ? "text/csv" : "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError("Failed to export sales data");
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("An error occurred while exporting data");
    } finally {
      setTableLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      incomplete: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
        {status || "Unknown"}
      </Badge>
    );
  };

  const viewSaleDetails = (sale: AdminSales | null) => {
    if (!sale) {
      setShowCreateModal(true);
      return;
    }
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const editSale = (sale: AdminSales) => {
    setEditingSale(sale);
    setShowEditModal(true);
  };

  const handleCreateSaleSuccess = (saleData: any) => {
    // Refresh the sales data to include the new sale
    fetchSalesData();
    setShowCreateModal(false);
  };

  const handleEditSaleSuccess = (saleData: any) => {
    // Refresh the sales data to include the updated sale
    fetchSalesData();
    setShowEditModal(false);
    setEditingSale(null);
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdminAccess={true}>
        <DashboardLayout currentRoute="admin-sales">
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

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-sales"
        title="Sales Management"
        description="Manage and track your sales transactions"
      >
        <div className="h-full flex flex-col">
          {/* Filters Section */}
          <SalesFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            customDateRange={dateRange}
            setCustomDateRange={setDateRange}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedLGA={selectedLGA}
            setSelectedLGA={setSelectedLGA}
            handleExport={handleExport}
            tableLoading={tableLoading}
            fetchSales={() => fetchSalesData()}
            activeQuickFilters={activeQuickFilters}
            clearQuickFilters={clearFilters}
            handleStateFilter={handleStateFilter}
            handleLGAFilter={handleLGAFilter}
            handleQuickDateFilter={() => {}}
            searchTimeoutRef={searchTimeoutRef}
            isManualSearchClear={isManualSearchClear}
            onCreateSale={() => setShowCreateModal(true)}
          />
          <SalesStatsBar salesData={salesData} pagination={pagination} />

          {/* Table Section */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {error && (
              <SalesErrorAlert error={error} onRetry={fetchSalesData} />
            )}
            <div className="bg-white rounded-lg border border-gray-200 relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading data...</p>
                  </div>
                </div>
              )}
              <SalesTable
                salesData={salesData}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
                viewSaleDetails={viewSaleDetails}
                editSale={editSale}
                loading={tableLoading}
              />
              {/* Sale Detail Modal */}
              <AdminSalesDetailModal
                open={showDetailModal}
                sale={selectedSale}
                onClose={() => {
                  setShowDetailModal(false);
                  setSelectedSale(null);
                }}
              />

              {/* Create Sale Modal */}
              <SalesFormModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSuccess={handleCreateSaleSuccess}
                mode="create"
              />

              {/* Edit Sale Modal */}
              {editingSale && (
                <SalesFormModal
                  open={showEditModal}
                  onOpenChange={setShowEditModal}
                  onSuccess={handleEditSaleSuccess}
                  mode="edit"
                  saleData={editingSale as any}
                />
              )}
              {pagination.totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total items)
                  </div>
                  <SalesPagination
                    pagination={pagination}
                    handlePageChange={handlePageChange}
                    tableLoading={tableLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminSalesPage;
