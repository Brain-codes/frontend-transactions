// UPDATED STOVE MANAGEMENT PAGE WITH ORGANIZATION SIDEBAR
// Save this as: src/app/stove-management/page.jsx

"use client";

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import OrganizationSidebar from "../components/OrganizationSidebar";
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
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { Loader2, Search, X, Eye, Filter, Package, CheckCircle, Building2 } from "lucide-react";
import StoveDetailModal from "../components/StoveDetailModal";

// Copy the SimpleTooltip component from your original file here
const SimpleTooltip = ({ children, text }) => {
const [show, setShow] = useState(false);
return (
<div className="relative inline-block">
<div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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
const { supabase, userRole } = useAuth();
const { toast, toasts, removeToast } = useToast();

const [loading, setLoading] = useState(false);
const [stoveIds, setStoveIds] = useState([]);
const [pagination, setPagination] = useState({
page: 1,
page_size: 25,
total_count: 0,
total_pages: 0,
});

const [selectedOrgIds, setSelectedOrgIds] = useState([]);
const [stats, setStats] = useState({ available: 0, sold: 0, total: 0 });
const [loadingStats, setLoadingStats] = useState(false);

const [filters, setFilters] = useState({
stove_id: "",
status: "",
branch: "",
state: "",
date_from: "",
date_to: "",
});

const [selectedStove, setSelectedStove] = useState(null);
const [showStoveModal, setShowStoveModal] = useState(false);
const [loadingStoveId, setLoadingStoveId] = useState(null);

// Fetch statistics
const fetchStats = async (orgIds) => {
if (!orgIds || orgIds.length === 0) {
setStats({ available: 0, sold: 0, total: 0 });
return;
}

    setLoadingStats(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/get-stove-stats`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("No authentication token found");

      const params = new URLSearchParams({ organization_ids: orgIds.join(",") });
      const response = await fetch(`${functionUrl}?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch statistics");

      setStats(result.data || { available: 0, sold: 0, total: 0 });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({ available: 0, sold: 0, total: 0 });
    } finally {
      setLoadingStats(false);
    }

};

// Fetch stove IDs - COPY YOUR FETCHSTOVEIDS FUNCTION HERE AND UPDATE organization_ids PARAMETER

// Handle organization selection
const handleSelectOrganization = (orgIds) => {
setSelectedOrgIds(orgIds);
fetchStats(orgIds);
fetchStoveIds(1, pagination.page_size, filters, orgIds);
};

// COPY ALL OTHER HANDLER FUNCTIONS FROM YOUR ORIGINAL FILE
// - handlePageChange
// - handlePageSizeChange
// - handleFilterChange
// - handleApplyFilters
// - handleClearFilters
// - handleViewStove
// - formatDate
// - getPageNumbers

const hasActiveFilters = Object.values(filters).some((value) => value !== "");

return (
<ProtectedRoute allowedRoles={["super_admin"]}>
<DashboardLayout currentRoute="stove-management">
<div className="flex h-full">
{/_ Organization Sidebar _/}
<OrganizationSidebar
            onSelectOrganization={handleSelectOrganization}
            selectedOrgIds={selectedOrgIds}
          />

          {/* Main Content */}
          <div className="flex-1 bg-gray-50 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stove ID Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedOrgIds.length > 0
                    ? `Viewing stove IDs for selected organization${selectedOrgIds.length > 1 ? "s" : ""}`
                    : "Select an organization to view stove IDs"}
                </p>
              </div>

              {selectedOrgIds.length > 0 ? (
                <>
                  {/* Filters - UPDATE TO REMOVE organization_name FIELD */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                    {/* COPY YOUR FILTER SECTION BUT REMOVE ORGANIZATION FILTER */}
                  </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        {loadingStats ? (
                          <div className="flex items-center justify-center h-16">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Available Stove IDs</p>
                              <p className="text-2xl font-bold text-green-600">
                                {stats.available.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                              <Package className="h-6 w-6 text-green-600" />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        {loadingStats ? (
                          <div className="flex items-center justify-center h-16">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Sold Stove IDs</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {stats.sold.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                              <CheckCircle className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* COPY YOUR TABLE AND PAGINATION SECTIONS HERE */}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                  <Building2 className="h-16 w-16 mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Organization Selected</h3>
                  <p className="text-sm">
                    Please select an organization from the left sidebar to view stove IDs
                  </p>
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

              <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>

);
};

export default StoveManagementPage;
