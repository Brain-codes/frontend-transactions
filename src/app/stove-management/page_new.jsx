"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
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
import { Loader2, Search, X, Eye, Filter } from "lucide-react";
import StoveDetailModal from "../components/StoveDetailModal";

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
  const { supabase, user, userRole } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  // State management
  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({
    stove_id: "",
    status: "",
    organization_name: "",
    branch: "",
    state: "",
    date_from: "",
    date_to: "",
  });

  // Stove detail modal
  const [selectedStove, setSelectedStove] = useState(null);
  const [showStoveModal, setShowStoveModal] = useState(false);
  const [loadingStoveId, setLoadingStoveId] = useState(null);

  // Fetch stove IDs
  const fetchStoveIds = async (
    page = 1,
    pageSize = 25,
    currentFilters = filters
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

      // Add filters
      if (currentFilters.stove_id)
        params.append("stove_id", currentFilters.stove_id);
      if (currentFilters.status) params.append("status", currentFilters.status);
      if (currentFilters.organization_name && userRole === "super_admin") {
        params.append("organization_name", currentFilters.organization_name);
      }
      if (currentFilters.branch && userRole === "super_admin") {
        params.append("branch", currentFilters.branch);
      }
      if (currentFilters.state && userRole === "super_admin") {
        params.append("state", currentFilters.state);
      }
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
        }
      );
    } catch (err) {
      console.error("Error fetching stove IDs:", err);
      toast.error("Failed to fetch stove IDs", err.message);
      setStoveIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStoveIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    fetchStoveIds(1, pagination.page_size, filters);
  };

  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      stove_id: "",
      status: "",
      organization_name: "",
      branch: "",
      state: "",
      date_from: "",
      date_to: "",
    };
    setFilters(clearedFilters);
    fetchStoveIds(1, pagination.page_size, clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

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
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pages;
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
      <DashboardLayout currentRoute="stove-management">
        <div className="flex-1 bg-white p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Stove ID Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                View and manage all stove IDs{" "}
                {userRole === "admin"
                  ? "for your organization"
                  : "across all organizations"}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
              {hasActiveFilters && (
                <Badge variant="outline" className="ml-2">
                  {Object.values(filters).filter((v) => v !== "").length} active
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stove ID Search */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Stove ID
                </label>
                <Input
                  placeholder="Search stove ID..."
                  value={filters.stove_id}
                  onChange={(e) =>
                    handleFilterChange("stove_id", e.target.value)
                  }
                  className="w-full"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Status
                </label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("status", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Organization Name (Super Admin only) */}
              {userRole === "super_admin" && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    Organization
                  </label>
                  <Input
                    placeholder="Search organization..."
                    value={filters.organization_name}
                    onChange={(e) =>
                      handleFilterChange("organization_name", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              )}

              {/* Branch (Super Admin only) */}
              {userRole === "super_admin" && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    Branch
                  </label>
                  <Input
                    placeholder="Search branch..."
                    value={filters.branch}
                    onChange={(e) =>
                      handleFilterChange("branch", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              )}

              {/* State (Super Admin only) */}
              {userRole === "super_admin" && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    State
                  </label>
                  <Input
                    placeholder="Search state..."
                    value={filters.state}
                    onChange={(e) =>
                      handleFilterChange("state", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              )}

              {/* Date From */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Date From
                </label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) =>
                    handleFilterChange("date_from", e.target.value)
                  }
                  className="w-full"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Date To
                </label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) =>
                    handleFilterChange("date_to", e.target.value)
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  size="sm"
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
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
                pagination.total_count
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
          <div className="bg-white rounded-lg border border-gray-200 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading stove IDs...</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stove ID</TableHead>
                  <TableHead>Status</TableHead>
                  {userRole === "super_admin" ? (
                    <>
                      <TableHead>Partner Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Location (State)</TableHead>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Sold To</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Sold To</TableHead>
                    </>
                  )}
                  <TableHead className="text-center">Actions</TableHead>
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
                  stoveIds.map((stove) => (
                    <TableRow key={stove.id} className="hover:bg-gray-50">
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
                        <SimpleTooltip text="View Details">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewStove(stove.id)}
                            disabled={loadingStoveId === stove.id}
                          >
                            {loadingStoveId === stove.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                        </SimpleTooltip>
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
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default StoveManagementPage;
