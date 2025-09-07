"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import OrganizationTable from "../components/OrganizationTable";
import PartnerBranchesView from "../components/PartnerBranchesView";
import OrganizationFormModal from "../components/OrganizationFormModal";
import OrganizationDetailSidebar from "../components/OrganizationDetailSidebar";
import StoveIdsSidebar from "../components/StoveIdsSidebar";
import OrganizationFilters from "../components/OrganizationFilters";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import ImportCSVModal from "../components/ImportCSVModal";
import { Button } from "@/components/ui/button";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import useOrganizations from "../hooks/useOrganizations";
import csvImportService from "../services/csvImportService";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { lgaAndStates } from "../constants";
import { Plus, Download, Search, X, Building2, Upload } from "lucide-react";

const PartnersPage = () => {
  // State management
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [showStoveIdsSidebar, setShowStoveIdsSidebar] = useState(false);
  const [organizationForStoveIds, setOrganizationForStoveIds] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const isManualSearchClear = useRef(false);
  const searchTimeoutRef = useRef(null);

  // View state management
  const [currentView, setCurrentView] = useState("partners"); // "partners" | "branches"
  const [selectedPartnerForBranches, setSelectedPartnerForBranches] =
    useState(null);

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [preselectedOrganizationId, setPreselectedOrganizationId] =
    useState(null);
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Toast notifications
  const { toast, toasts, removeToast } = useToast();

  // Track active filters for badges
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    state: "",
    city: "",
  });

  // Nigerian states from constants
  const nigerianStates = Object.keys(lgaAndStates).sort();

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
    exportOrganizations,
    fetchOrganizations,
  } = useOrganizations();

  // Handle search term changes with debouncing
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
        applyFilters({ search: "", page: 1 });
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

  // Pagination handlers
  const handlePageChange = (page) => {
    applyFilters({ page });
  };

  const handlePageSizeChange = (pageSize) => {
    applyFilters({ page: 1, limit: pageSize });
  };

  // Filter handlers
  const handleStatusFilter = (value) => {
    if (value === "all") {
      setActiveFilters((prev) => ({ ...prev, status: "" }));
      applyFilters({ status: "", page: 1 });
    } else {
      setActiveFilters((prev) => ({ ...prev, status: value }));
      applyFilters({ status: value, page: 1 });
    }
  };

  const handleStateFilter = (value) => {
    if (value === "all") {
      setActiveFilters((prev) => ({ ...prev, state: "" }));
      applyFilters({ state: "", page: 1 });
    } else {
      setActiveFilters((prev) => ({ ...prev, state: value }));
      applyFilters({ state: value, page: 1 });
    }
  };

  // Clear individual filter
  const handleClearFilter = (filterType) => {
    setActiveFilters((prev) => ({ ...prev, [filterType]: "" }));
    applyFilters({ [filterType]: "", page: 1 });
  };

  // Clear search
  const handleClearSearch = () => {
    // Cancel any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    isManualSearchClear.current = true;
    setSearchTerm("");
    applyFilters({ search: "", page: 1 });
  };

  // Clear all filters
  const clearAllFilters = () => {
    // Cancel any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Set manual clear flag and clear search term
    isManualSearchClear.current = true;
    setSearchTerm("");

    // Clear all filter states
    setActiveFilters({ status: "", state: "", city: "" });

    // Apply cleared filters including search
    applyFilters({
      search: "",
      status: "",
      state: "",
      city: "",
      page: 1,
    });
  };

  // Export handler
  const handleExport = (format) => {
    exportOrganizations({}, format);
  };

  // Organization action handlers
  const handleViewBranches = (organization) => {
    // Close any open modals first
    setSelectedOrganization(null);
    setShowStoveIdsSidebar(false);
    setOrganizationForStoveIds(null);
    setShowFormModal(false);
    setShowDeleteModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(null);

    // Switch to branches view
    setSelectedPartnerForBranches(organization);
    setCurrentView("branches");
  };

  const handleBackToPartners = () => {
    setCurrentView("partners");
    setSelectedPartnerForBranches(null);
  };

  const handleViewDetails = (organization) => {
    // Close any open modals first
    setShowFormModal(false);
    setShowImportModal(false);
    setShowDeleteModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(null);

    // Then open the details sidebar
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
    // Close any open modals first
    setSelectedOrganization(null); // Close details sidebar
    setShowImportModal(false);
    setShowDeleteModal(false);
    setOrganizationToDelete(null);

    // Then open the edit modal
    setEditingOrganization(organization);
    setShowFormModal(true);
  };

  const handleDelete = (organization) => {
    // Close any open modals first
    setSelectedOrganization(null); // Close details sidebar
    setShowFormModal(false);
    setShowImportModal(false);
    setEditingOrganization(null);

    // Then open the delete modal
    setOrganizationToDelete(organization);
    setShowDeleteModal(true);
  };

  const handleCreateNew = () => {
    // Close any open modals first
    setSelectedOrganization(null);
    setShowImportModal(false);
    setShowDeleteModal(false);
    setOrganizationToDelete(null);

    // Then open the create modal
    setEditingOrganization(null);
    setShowFormModal(true);
  };

  // Get supabase client from AuthContext
  const { supabase } = useAuth();

  // CSV Import handlers
  const handleImportCSV = (organization = null) => {
    // Close any open modals first
    setSelectedOrganization(null);
    setShowFormModal(false);
    setShowDeleteModal(false);
    setEditingOrganization(null);
    setOrganizationToDelete(null);

    // Set preselected organization if called from row action
    if (organization) {
      setPreselectedOrganizationId(organization.id);
    } else {
      setPreselectedOrganizationId(null);
    }

    // Then open the import modal
    setShowImportModal(true);
  };

  const handleImportSubmit = async (importData) => {
    setImportLoading(true);
    try {
      const response = await csvImportService.importSalesCSV(
        supabase,
        importData.organizationId,
        importData.csvFile
      );
      if (response.success) {
        toast.success("Import Successful", response.message);
        setShowImportModal(false);
        setPreselectedOrganizationId(null); // Clear preselection after successful import
      }
    } catch (error) {
      console.error("CSV import error:", error);
      toast.error("Import Failed", error.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Form submission handlers
  const handleFormSubmit = async (formData) => {
    setFormSubmitLoading(true);
    try {
      if (editingOrganization) {
        // Update existing organization
        const response = await updateOrganization(
          editingOrganization.id,
          formData
        );
        if (response.success) {
          toast.success("Success", "Organization updated successfully");
          // Close form modal and clear editing state only on success
          setShowFormModal(false);
          setEditingOrganization(null);
          setFormSubmitLoading(false);
          // Data will be automatically refreshed by the hook
        }
      } else {
        // Create new organization
        const response = await createOrganization(formData);
        if (response.success) {
          toast.success("Success", "Organization created successfully");
          // Close form modal only on success
          setShowFormModal(false);
          setFormSubmitLoading(false);
          // Data will be automatically refreshed by the hook
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Error toast is already handled by the hook
      // Keep modal open and just clear loading state
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await deleteOrganization(organizationToDelete.id);
      if (response.success) {
        toast.success("Success", "Organization deleted successfully");
        if (response.warnings && response.warnings.length > 0) {
          console.warn("Delete warnings:", response.warnings);
          toast.warning("Warning", response.warnings.join(", "));
        }
        // Close delete modal and clear state
        setShowDeleteModal(false);
        setOrganizationToDelete(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error", error.message || "Failed to delete organization");
      // Error is already handled by the hook
    }
  };

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="partners">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading partners data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Error state
  if (error) {
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

  // Render branches view
  if (currentView === "branches" && selectedPartnerForBranches) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="partners">
          <PartnerBranchesView
            organization={selectedPartnerForBranches}
            onBack={handleBackToPartners}
          />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Render partners list view

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="partners"
        title="Partner Organizations"
        description="Manage and track your partner organizations"
      >
        <div className="h-full flex flex-col">
          {/* Filters Section */}
          <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
            {/* Mobile Action Buttons - Only visible on mobile */}
            {/* <div className="sm:hidden mb-4 space-y-2">
              <Button
                onClick={handleCreateNew}
                className="w-full bg-brand hover:bg-brand/50"
                disabled={tableLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
              <Button
                variant="outline"
                onClick={handleImportCSV}
                className="w-full text-gray-700"
                disabled={tableLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Stove ID CSV
              </Button>
            </div> */}

            {/* Search and Filters - Mobile Responsive but Desktop Horizontal */}
            <div
              className={`flex flex-col xl:flex-row gap-4 items-start xl:items-start ${
                tableLoading ? "opacity-70" : ""
              }`}
            >
              {/* Search Bar */}
              <div className="md:w-1/3 w-full relative min-w-0 md:mt-6 mt-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <input
                  type="text"
                  placeholder="Search by organization name, email, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 !py-2.5 text-sm border border-gray-300 rounded-lg text-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status and State Filters */}
              <div className="flex flex-col sm:flex-row xl:flex-row gap-3 items-start">
                {/* Status Filter */}
                <div className="space-y-1 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <Select
                    onValueChange={(value) => handleStatusFilter(value)}
                    disabled={tableLoading}
                  >
                    <SelectTrigger className="w-full sm:w-40 !py-2.5 text-sm text-gray-600">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="space-y-1 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700">
                    State
                  </label>
                  <Select
                    onValueChange={(value) => handleStateFilter(value)}
                    disabled={tableLoading}
                  >
                    <SelectTrigger className="w-full sm:w-40 !py-2.5 text-sm text-gray-600">
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
              </div>

              {/* Action Buttons */}
              <div className="flex md:w-1/2 w-full md:justify-end justify-start gap-2 md:mt-7 mt-0">
                <Button
                  variant="outline"
                  onClick={handleImportCSV}
                  className="text-gray-700"
                  disabled={tableLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Stove ID's CSV
                </Button>
                <Button
                  onClick={handleCreateNew}
                  className="bg-brand hover:bg-brand/50"
                  disabled={tableLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Partner
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            <div className="mt-4">
              <OrganizationFilters
                searchTerm={searchTerm}
                activeFilters={activeFilters}
                onClearSearch={handleClearSearch}
                onClearFilter={handleClearFilter}
                onClearAll={clearAllFilters}
              />
            </div>

            {/* Stats */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-600">
                Showing {organizationsData.length} of {pagination.total}{" "}
                partners (Page {pagination.page} of {pagination.totalPages})
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
                  <SelectTrigger className="w-20 text-sm text-gray-600">
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

          {/* Table Section */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <OrganizationTable
              data={organizationsData}
              loading={tableLoading}
              onView={handleViewDetails}
              onViewStoveIds={handleViewStoveIds}
              onViewBranches={handleViewBranches}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onImportCSV={handleImportCSV}
            />

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

        {/* Organization Form Modal */}
        <OrganizationFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingOrganization(null);
            setFormSubmitLoading(false); // Clear loading state when modal is closed
          }}
          onSubmit={handleFormSubmit}
          initialData={editingOrganization}
          loading={loading}
          submitLoading={formSubmitLoading}
        />

        {/* Organization Detail Sidebar */}

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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setOrganizationToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          organizationName={organizationToDelete?.name}
          loading={loading}
        />

        {/* CSV Import Modal */}
        <ImportCSVModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setPreselectedOrganizationId(null); // Clear preselection when modal is closed
          }}
          onImport={handleImportSubmit}
          organizations={organizationsData}
          loading={importLoading}
          preselectedOrganizationId={preselectedOrganizationId}
        />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PartnersPage;
