"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
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
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import superAdminAgentService from "../../services/superAdminAgentService";

interface StoveId {
  stove_id: string;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  branch: string | null;
  state: string | null;
  date_sold: string | null;
  sold_to: string | null;
  created_at: string;
}


interface AssignedOrg {
  id: string;
  partner_name: string;
}

const PAGE_SIZE = 25;

const SuperAdminAgentStoveIdsPage = () => {
  const { supabase, user } = useAuth();

  const [stoveIds, setStoveIds] = useState<StoveId[]>([]);
  const [assignedOrgs, setAssignedOrgs] = useState<AssignedOrg[]>([]);
  const [assignedOrgIds, setAssignedOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    page_size: PAGE_SIZE,
    total_count: 0,
    total_pages: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");


  // Fetch assigned orgs on mount
  useEffect(() => {
    if (!user?.id) return;
    superAdminAgentService
      .getAgentOrganizations(user.id)
      .then((r) => {
        const orgs: AssignedOrg[] = r.data || [];
        setAssignedOrgs(orgs);
        setAssignedOrgIds(orgs.map((o) => o.id));
      })
      .catch(() => {});
  }, [user?.id]);

  const fetchStoveIds = useCallback(
    async (page = 1) => {
      if (assignedOrgIds.length === 0) {
        setStoveIds([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const functionUrl = `${baseUrl}/functions/v1/manage-stove-ids`;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) throw new Error("No authentication token");

        const orgIds = orgFilter !== "all" ? [orgFilter] : assignedOrgIds;

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: PAGE_SIZE.toString(),
          organization_ids: orgIds.join(","),
        });

        if (searchTerm.trim()) params.append("stove_id", searchTerm.trim());
        if (statusFilter !== "all") params.append("status", statusFilter);

        const response = await fetch(`${functionUrl}?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to fetch stove IDs");

        setStoveIds(result.data || []);
        setPagination(
          result.pagination || {
            page: 1,
            page_size: PAGE_SIZE,
            total_count: 0,
            total_pages: 0,
          }
        );
      } catch (err: any) {
        setError(err.message || "Failed to load stove IDs");
      } finally {
        setLoading(false);
      }
    },
    [supabase, assignedOrgIds, orgFilter, searchTerm, statusFilter]
  );

  // Fetch when assignedOrgIds or filters change
  useEffect(() => {
    if (assignedOrgIds.length > 0) {
      fetchStoveIds(1);
    } else if (!loading && assignedOrgIds.length === 0 && user?.id) {
      setLoading(false);
    }
  }, [assignedOrgIds, orgFilter, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm !== "" || statusFilter !== "all" || orgFilter !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setOrgFilter("all");
  };

  const getStatusBadge = (status: string) => {
    if (status === "sold")
      return <Badge className="bg-red-100 text-red-800 border-red-200">Sold</Badge>;
    if (status === "available")
      return <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>;
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status || "—"}</Badge>;
  };

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const getPageNumbers = () => {
    const { page, total_pages } = pagination;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(total_pages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const startItem = (pagination.page - 1) * pagination.page_size + 1;
  const endItem = Math.min(pagination.page * pagination.page_size, pagination.total_count);

  const availableOnPage = stoveIds.filter((s) => s.status === "available").length;
  const soldOnPage = stoveIds.filter((s) => s.status === "sold").length;

  return (
    <ProtectedRoute allowedRoles={["acsl_agent", "super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent-stove-ids" title="Stove IDs">
        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Stove IDs</p>
                  <p className="text-xl font-bold text-blue-900">{pagination.total_count.toLocaleString()}</p>
                  <p className="text-xs text-blue-500">across all partners</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Available</p>
                  <p className="text-xl font-bold text-green-900">{availableOnPage}</p>
                  <p className="text-xs text-green-500">on this page</p>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Package className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Sold</p>
                  <p className="text-xl font-bold text-amber-900">{soldOnPage}</p>
                  <p className="text-xs text-amber-500">on this page</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search stove ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              <div className="flex-1 min-w-[160px]">
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Partners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {assignedOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.partner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table with header row and footer */}
          <div className="space-y-0">
            {/* Header row */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{pagination.total_count > 0 ? startItem : 0}–{endItem}</span> of <span className="font-medium">{pagination.total_count}</span> stove IDs
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={PAGE_SIZE.toString()} onValueChange={() => {}}>
                    <SelectTrigger className="w-[65px] h-7 bg-white text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm font-bold text-green-500">Total Stove IDs: <span className="text-brand">{pagination.total_count}</span></p>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                  <p className="text-sm text-gray-600">Loading stove IDs...</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stove ID</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Date Sold</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Sold To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && stoveIds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-gray-300" />
                          <p>No stove IDs found.</p>
                          {hasActiveFilters && (
                            <p className="text-xs">Try clearing your filters.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stoveIds.map((stove, index) => (
                      <TableRow
                        key={stove.stove_id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                      >
                        <TableCell className="font-mono font-medium text-gray-900 text-sm">
                          {stove.stove_id}
                        </TableCell>
                        <TableCell>{getStatusBadge(stove.status)}</TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {stove.organization_name || "—"}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {stove.branch || "—"}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {formatDate(stove.date_sold)}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {stove.sold_to || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {pagination.total_pages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {pagination.total_count > 0 ? startItem : 0} to {endItem} of {pagination.total_count} stove IDs
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => fetchStoveIds(1)} disabled={pagination.page === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => fetchStoveIds(Math.max(1, pagination.page - 1))} disabled={pagination.page === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Prev
                  </Button>
                  {getPageNumbers().map((p) => (
                    <Button
                      key={p}
                      variant={p === pagination.page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${p === pagination.page ? "bg-brand text-white hover:bg-brand" : ""}`}
                      onClick={() => fetchStoveIds(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => fetchStoveIds(Math.min(pagination.total_pages, pagination.page + 1))} disabled={pagination.page === pagination.total_pages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => fetchStoveIds(pagination.total_pages)} disabled={pagination.page === pagination.total_pages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentStoveIdsPage;
