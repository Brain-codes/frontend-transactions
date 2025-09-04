"use client";

import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import BranchesTable from "../components/branches/BranchesTable";
import BranchesFilters from "../components/branches/BranchesFilters";
import BranchesStatsBar from "../components/branches/BranchesStatsBar";
import BranchesErrorAlert from "../components/branches/BranchesErrorAlert";
import BranchesPagination from "../components/branches/BranchesPagination";
import BranchDetailModal from "../components/branches/BranchDetailModal";
import BranchFormModal from "../components/branches/BranchFormModal";
import BranchDeleteConfirmationModal from "../components/branches/BranchDeleteConfirmationModal";
import { useRouter } from "next/navigation";
import adminBranchesService from "../../services/adminBranchesService";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { getOrganizationId } from "../../utils/profileUtils";
import type { Branch } from "@/types/branches";

const AdminBranchesPage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }

  const [branchesData, setBranchesData] = useState<Branch[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Search debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualSearchClear = useRef<boolean>(false);

  useEffect(() => {
    fetchBranchesData();
  }, []);

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
      fetchBranchesData();
      searchTimeoutRef.current = null;
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm]);

  const fetchBranchesData = async (
    additionalFilters: Record<string, any> = {}
  ) => {
    try {
      setTableLoading(true);
      setError(null);

      // Include all filters: page, limit, search, country, state
      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        ...additionalFilters,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCountry &&
          selectedCountry !== "" && { country: selectedCountry }),
        ...(selectedState && selectedState !== "" ? { state: selectedState } : { state: ""}),
      };

      let response;
      const organizationId = getOrganizationId();
      console.log("Organization ID from localStorage:", organizationId);

      if (organizationId) {
        response = await adminBranchesService.getBranchesByOrganization(
          organizationId,
          filters
        );
      } else {
        throw new Error(
          "No organization access available - please ensure you are logged in properly"
        );
      }

      if (response.success) {
        setBranchesData(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Failed to fetch branches data");
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setError("An unexpected error occurred while fetching branches data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    fetchBranchesData({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    const newPagination = { page: 1, limit: pageSize };
    setPagination((prev) => ({ ...prev, ...newPagination }));
    fetchBranchesData(newPagination);
  };

  const clearFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    isManualSearchClear.current = true;
    setSearchTerm("");
    setSelectedState("");
    setSelectedCountry("");

    const newPagination = { page: 1 };
    setPagination((prev) => ({ ...prev, ...newPagination }));

    // Explicitly pass empty values to ensure filters are cleared
    fetchBranchesData({
      ...newPagination,
      search: "",
      state: "",
      country: "",
    });
  };

  // Filter handlers
  const handleStateFilter = (val: string) => {
    const newState = val === "all" ? "" : val;
    setSelectedState(newState);
    fetchBranchesData({
      page: 1,
      state: newState === "" ? "" : newState,
    });
  };

  const handleCountryFilter = (val: string) => {
    const newCountry = val === "all" ? "" : val;
    setSelectedCountry(newCountry);
    // Clear state if changing away from Nigeria
    if (newCountry !== "Nigeria") {
      setSelectedState("");
    }
    fetchBranchesData({
      page: 1,
      country: newCountry === "" ? "" : newCountry,
      state: newCountry !== "Nigeria" ? "" : selectedState,
    });
  };

  const handleExport = async (format = "csv") => {
    try {
      setTableLoading(true);
      // Export functionality can be implemented based on API support
      console.log(`Exporting branches as ${format}`);
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

  const viewBranchDetails = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowDetailModal(true);
  };

  const editBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setShowEditModal(true);
  };

  const deleteBranch = (branch: Branch) => {
    setDeletingBranch(branch);
    setShowDeleteModal(true);
  };

  const handleCreateBranchSuccess = (branchData: Branch) => {
    fetchBranchesData();
    setShowCreateModal(false);
  };

  const handleEditBranchSuccess = (branchData: Branch) => {
    fetchBranchesData();
    setShowEditModal(false);
    setEditingBranch(null);
  };

  const handleDeleteBranchConfirm = async () => {
    if (!deletingBranch) return;

    try {
      const response = await adminBranchesService.deleteBranch(
        deletingBranch.id
      );
      if (response.success) {
        fetchBranchesData();
        setShowDeleteModal(false);
        setDeletingBranch(null);
      } else {
        setError(response.error || "Failed to delete branch");
      }
    } catch (err) {
      console.error("Error deleting branch:", err);
      setError("An unexpected error occurred while deleting branch");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdminAccess={true}>
        <DashboardLayout currentRoute="admin-branches">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading branches data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-branches"
        title="Branches Management"
        description="Manage and track your organization branches"
      >
        <div className="h-full flex flex-col">
          {/* Filters Section */}
          <BranchesFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            handleStateFilter={handleStateFilter}
            handleCountryFilter={handleCountryFilter}
            handleExport={handleExport}
            tableLoading={tableLoading}
            fetchBranches={fetchBranchesData}
            clearFilters={clearFilters}
            onCreateBranch={() => setShowCreateModal(true)}
            searchTimeoutRef={searchTimeoutRef}
            isManualSearchClear={isManualSearchClear}
          />

          <BranchesStatsBar
            branchesData={branchesData}
            pagination={pagination}
          />

          {/* Table Section */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {error && (
              <BranchesErrorAlert error={error} onRetry={fetchBranchesData} />
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

              <BranchesTable
                branchesData={branchesData}
                formatDate={formatDate}
                viewBranchDetails={viewBranchDetails}
                editBranch={editBranch}
                deleteBranch={deleteBranch}
                loading={tableLoading}
              />

              {pagination.totalPages > 1 && (
                <BranchesPagination
                  pagination={pagination}
                  handlePageChange={handlePageChange}
                  handlePageSizeChange={handlePageSizeChange}
                  tableLoading={tableLoading}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <BranchDetailModal
          open={showDetailModal}
          branch={selectedBranch}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBranch(null);
          }}
        />

        <BranchFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={handleCreateBranchSuccess}
          mode="create"
          organizationId={getOrganizationId() || undefined}
        />

        {editingBranch && (
          <BranchFormModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            onSuccess={handleEditBranchSuccess}
            mode="edit"
            branchData={editingBranch}
          />
        )}

        <BranchDeleteConfirmationModal
          open={showDeleteModal}
          branch={deletingBranch}
          onConfirm={handleDeleteBranchConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeletingBranch(null);
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminBranchesPage;
