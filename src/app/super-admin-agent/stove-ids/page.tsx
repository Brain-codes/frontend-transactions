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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Package } from "lucide-react";
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

        const orgIds =
          orgFilter !== "all" ? [orgFilter] : assignedOrgIds;

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
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">Sold</Badge>
      );
    if (status === "available")
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Available
        </Badge>
      );
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
        {status || "—"}
      </Badge>
    );
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

  return (
    <ProtectedRoute allowedRoles={["super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent-stove-ids">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stove IDs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Stove IDs assigned to your partner organizations.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
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

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                <p className="text-sm text-gray-600">Loading stove IDs...</p>
              </div>
            )}

            <Table>
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand">
                  <TableHead className="text-white py-4 first:rounded-tl-lg">
                    Stove ID
                  </TableHead>
                  <TableHead className="text-white py-4">Status</TableHead>
                  <TableHead className="text-white py-4">Partner</TableHead>
                  <TableHead className="text-white py-4">Branch</TableHead>
                  <TableHead className="text-white py-4">Date Sold</TableHead>
                  <TableHead className="text-white py-4 last:rounded-tr-lg">
                    Sold To
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && stoveIds.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-gray-500"
                    >
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
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-brand-light"
                      } hover:bg-gray-50`}
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

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing{" "}
                {(pagination.page - 1) * pagination.page_size + 1}–
                {Math.min(
                  pagination.page * pagination.page_size,
                  pagination.total_count
                )}{" "}
                of {pagination.total_count} stove IDs
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        fetchStoveIds(Math.max(1, pagination.page - 1))
                      }
                      className={
                        pagination.page === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers().map((num) => (
                    <PaginationItem key={num}>
                      <PaginationLink
                        isActive={num === pagination.page}
                        onClick={() => fetchStoveIds(num)}
                        className="cursor-pointer"
                      >
                        {num}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        fetchStoveIds(
                          Math.min(pagination.total_pages, pagination.page + 1)
                        )
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentStoveIdsPage;
