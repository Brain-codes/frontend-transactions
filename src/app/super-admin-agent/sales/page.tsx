"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Search,
  X,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  ShoppingCart,
} from "lucide-react";
import salesAdvancedAPIService from "../../services/salesAdvancedAPIService";
import superAdminAgentService from "../../services/superAdminAgentService";
import { useAuth } from "../../contexts/AuthContext";
import ApproveSaleConfirmModal from "./components/ApproveSaleConfirmModal";
import AgentCreateSaleModal from "./components/AgentCreateSaleModal";

interface Sale {
  id: string;
  contact_person: string | null;
  end_user_name: string | null;
  stove_serial_no: string | null;
  partner_name: string | null;
  amount: number | null;
  state_backup: string | null;
  status: string | null;
  agent_approved: boolean;
  agent_approved_at: string | null;
  created_at: string;
  organization_id: string | null;
  organizations?: { id: string; partner_name: string; branch: string | null };
}

interface AssignedOrg {
  id: string;
  partner_name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function SalesPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const [assignedOrgs, setAssignedOrgs] = useState<AssignedOrg[]>([]);
  const [orgFilter, setOrgFilter] = useState(
    searchParams.get("org") || "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Fetch assigned orgs for the filter dropdown
  useEffect(() => {
    if (!user?.id) return;
    superAdminAgentService
      .getAgentOrganizations(user.id)
      .then((r) => setAssignedOrgs(r.data || []))
      .catch(() => {});
  }, [user?.id]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, any> = {
        page: currentPage,
        limit: PAGE_SIZE,
        responseFormat: "format2",
      };
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (orgFilter !== "all") filters.organizationId = orgFilter;
      if (approvalFilter === "pending") filters.agentApproved = false;
      if (approvalFilter === "approved") filters.agentApproved = true;

      const result = await salesAdvancedAPIService.getSalesData(filters);
      setSales(result.data || result.sales || []);
      if (result.pagination) {
        setPagination(result.pagination);
      } else if (result.total !== undefined) {
        const total = result.total;
        setPagination({
          currentPage,
          totalPages: Math.ceil(total / PAGE_SIZE),
          totalItems: total,
          itemsPerPage: PAGE_SIZE,
          hasNextPage: currentPage < Math.ceil(total / PAGE_SIZE),
          hasPrevPage: currentPage > 1,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, orgFilter, approvalFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, orgFilter, approvalFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setOrgFilter("all");
    setApprovalFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== "" || orgFilter !== "all" || approvalFilter !== "all";

  const handleApproveSuccess = (saleId: string) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, agent_approved: true, agent_approved_at: new Date().toISOString() }
          : s
      )
    );
    setShowApproveModal(false);
    setSelectedSale(null);
    toast({ variant: "success", title: "Sale approved successfully" });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getPageNumbers = () => {
    if (!pagination) return [];
    const { currentPage: page, totalPages } = pagination;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent-sales">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Sale
            </Button>
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
                  placeholder="Search customer, phone, serial no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              <div className="flex-1 min-w-[180px]">
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

              <div className="flex-1 min-w-[150px]">
                <Select
                  value={approvalFilter}
                  onValueChange={setApprovalFilter}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Approvals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Approvals</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
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
                <p className="text-sm text-gray-600">Loading sales...</p>
              </div>
            )}

            <Table>
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand">
                  <TableHead className="text-white py-4 first:rounded-tl-lg">
                    Customer
                  </TableHead>
                  <TableHead className="text-white py-4">Partner</TableHead>
                  <TableHead className="text-white py-4">Serial No</TableHead>
                  <TableHead className="text-white py-4">Amount</TableHead>
                  <TableHead className="text-white py-4">State</TableHead>
                  <TableHead className="text-white py-4">Status</TableHead>
                  <TableHead className="text-white py-4">Approval</TableHead>
                  <TableHead className="text-white py-4">Date</TableHead>
                  <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && sales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-8 w-8 text-gray-300" />
                        <p>No sales found.</p>
                        {hasActiveFilters && (
                          <p className="text-xs">
                            Try clearing your filters.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale, index) => (
                    <TableRow
                      key={sale.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-brand-light"
                      } hover:bg-gray-50`}
                    >
                      <TableCell className="font-medium text-gray-900 text-sm">
                        {sale.contact_person || sale.end_user_name || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {sale.partner_name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600 text-sm">
                        {sale.stove_serial_no || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {sale.amount != null
                          ? `₦${sale.amount.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {sale.state_backup || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sale.status === "completed"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : sale.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {sale.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.agent_approved ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(sale.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          disabled={sale.agent_approved}
                          className={
                            sale.agent_approved
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed text-xs"
                              : "bg-green-600 hover:bg-green-700 text-white text-xs"
                          }
                          onClick={() => {
                            if (!sale.agent_approved) {
                              setSelectedSale(sale);
                              setShowApproveModal(true);
                            }
                          }}
                        >
                          {sale.agent_approved ? "Approved" : "Approve"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing{" "}
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}{" "}
                of {pagination.totalItems} sales
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className={
                        !pagination.hasPrevPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers().map((num) => (
                    <PaginationItem key={num}>
                      <PaginationLink
                        isActive={num === pagination.currentPage}
                        onClick={() => setCurrentPage(num)}
                        className="cursor-pointer"
                      >
                        {num}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      className={
                        !pagination.hasNextPage
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

        {/* Modals */}
        {showApproveModal && selectedSale && (
          <ApproveSaleConfirmModal
            sale={selectedSale}
            onClose={() => {
              setShowApproveModal(false);
              setSelectedSale(null);
            }}
            onSuccess={handleApproveSuccess}
          />
        )}
        {showCreateModal && (
          <AgentCreateSaleModal onClose={() => setShowCreateModal(false)} />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function SuperAdminAgentSalesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <SalesPageContent />
    </Suspense>
  );
}
