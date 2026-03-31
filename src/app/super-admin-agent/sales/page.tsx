"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import FinancialSummaryCards from "../../admin/components/financial-reports/FinancialSummaryCards";
import PaymentStatusCards from "../../admin/components/financial-reports/PaymentStatusCards";
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
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Search,
  X,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  ShoppingCart,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  is_installment?: boolean;
  total_paid?: number;
  payment_status?: string;
  payment_model?: { id: string; name: string; duration_months: number; fixed_price: number } | null;
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
  const [allSalesForSummary, setAllSalesForSummary] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [showFinancialSummary, setShowFinancialSummary] = useState(true);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(true);

  // Fetch assigned orgs for the filter dropdown
  useEffect(() => {
    if (!user?.id) return;
    superAdminAgentService
      .getAgentOrganizations(user.id)
      .then((r) => setAssignedOrgs(r.data || []))
      .catch(() => {});
  }, [user?.id]);

  // Load all sales for summary computation (no pagination)
  const fetchAllSalesForSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const filters: Record<string, any> = {
        limit: 1000,
        responseFormat: "format2",
      };
      if (orgFilter !== "all") filters.organizationId = orgFilter;
      if (approvalFilter === "pending") filters.agentApproved = false;
      if (approvalFilter === "approved") filters.agentApproved = true;
      const result = await salesAdvancedAPIService.getSalesData(filters);
      setAllSalesForSummary(result.data || result.sales || []);
    } catch {
      setAllSalesForSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [orgFilter, approvalFilter]);

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
      // API returns { page, limit, total, totalPages } — normalize to our shape
      const raw = result.pagination;
      if (raw) {
        const total = raw.total ?? raw.totalItems ?? 0;
        const pages = raw.totalPages ?? raw.total_pages ?? Math.ceil(total / PAGE_SIZE);
        setPagination({
          currentPage: raw.page ?? raw.currentPage ?? currentPage,
          totalPages: pages,
          totalItems: total,
          itemsPerPage: raw.limit ?? raw.itemsPerPage ?? PAGE_SIZE,
          hasNextPage: (raw.page ?? currentPage) < pages,
          hasPrevPage: (raw.page ?? currentPage) > 1,
        });
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
    fetchAllSalesForSummary();
  }, [fetchAllSalesForSummary]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, orgFilter, approvalFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setOrgFilter("all");
    setApprovalFilter("all");
    setPaymentStatusFilter("all");
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
    setAllSalesForSummary((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, agent_approved: true }
          : s
      )
    );
    setShowApproveModal(false);
    setSelectedSale(null);
    toast({ variant: "success", title: "Sale approved successfully" });
  };

  // Financial summary computed from all sales (not just current page)
  const financialSummary = useMemo(() => {
    const getAmountPaid = (s: Sale) =>
      s.is_installment ? (s.total_paid ?? 0) : (s.amount ?? 0);

    const totalReceivable = allSalesForSummary.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalCollected = allSalesForSummary.reduce((sum, s) => sum + getAmountPaid(s), 0);
    const outstandingBalance = totalReceivable - totalCollected;
    return {
      totalReceivable,
      totalCollected,
      outstandingBalance,
      salesCount: allSalesForSummary.length,
      collectedPercent: totalReceivable > 0 ? (totalCollected / totalReceivable) * 100 : 0,
      outstandingPercent: totalReceivable > 0 ? (outstandingBalance / totalReceivable) * 100 : 0,
    };
  }, [allSalesForSummary]);

  const paymentBreakdown = useMemo(() => ({
    totalOrders: allSalesForSummary.length,
    fullyPaid: allSalesForSummary.filter((s) => !s.is_installment || s.payment_status === "fully_paid").length,
    partiallyPaid: allSalesForSummary.filter((s) => s.is_installment && s.payment_status === "partially_paid").length,
    unpaid: allSalesForSummary.filter((s) => s.is_installment && (s.total_paid ?? 0) === 0).length,
  }), [allSalesForSummary]);

  const handleCardFilterClick = (filter: string) => {
    setPaymentStatusFilter((prev) => prev === filter ? "all" : filter);
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

  const toggleBtn = (show: boolean, onToggle: () => void) => (
    <Button variant="ghost" size="sm"
      className="h-7 w-fit p-0 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      onClick={onToggle}
    >
      {show
        ? <><p>Hide</p><EyeOff className="h-4 w-4" /></>
        : <><p>Show</p><Eye className="h-4 w-4" /></>}
    </Button>
  );

  const startItem = pagination ? (pagination.currentPage - 1) * pagination.itemsPerPage + 1 : 0;
  const endItem = pagination ? Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems) : 0;

  return (
    <ProtectedRoute allowedRoles={["acsl_agent", "super_admin_agent"]}>
      <DashboardLayout
        currentRoute="super-admin-agent-sales"
        title="Sales"
        rightButton={
          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />Create Sale
          </Button>
        }
      >
        <div className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Financial Summary */}
          {!summaryLoading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase">Financial Summary</h2>
                {toggleBtn(showFinancialSummary, () => setShowFinancialSummary(!showFinancialSummary))}
              </div>
              {showFinancialSummary && <FinancialSummaryCards summary={financialSummary} />}
            </div>
          )}

          {/* Payment Status Breakdown */}
          {!summaryLoading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase">Payment Status Breakdown</h2>
                {toggleBtn(showStatusBreakdown, () => setShowStatusBreakdown(!showStatusBreakdown))}
              </div>
              {showStatusBreakdown && (
                <PaymentStatusCards
                  breakdown={paymentBreakdown}
                  activeFilter={paymentStatusFilter}
                  onFilterClick={handleCardFilterClick}
                />
              )}
            </div>
          )}

          {/* Filters */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200">
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

          {/* Table with header row and footer pagination */}
          <div className="space-y-0">
            {/* Header row */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startItem}–{endItem}</span> of <span className="font-medium">{pagination?.totalItems ?? 0}</span> sales
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
              <p className="text-sm font-bold text-green-500">Total Sales: <span className="text-brand">{pagination?.totalItems ?? 0}</span></p>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                  <p className="text-sm text-gray-600">Loading sales...</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Customer</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Serial No</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Payment</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Approval</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingCart className="h-8 w-8 text-gray-300" />
                          <p>No sales found.</p>
                          {hasActiveFilters && (
                            <p className="text-xs">Try clearing your filters.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale, index) => (
                      <TableRow
                        key={sale.id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
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
                          {sale.amount != null ? `₦${sale.amount.toLocaleString()}` : "—"}
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
                          {sale.is_installment ? (
                            sale.payment_status === "fully_paid" ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                Fully Paid
                              </Badge>
                            ) : sale.payment_status === "partially_paid" ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                  Partially Paid
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  ₦{(sale.total_paid ?? 0).toLocaleString()} / ₦{(sale.amount ?? 0).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                Installment
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">Full Payment</span>
                          )}
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

            {/* Pagination footer */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startItem} to {endItem} of {pagination.totalItems} sales
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Prev
                  </Button>
                  {getPageNumbers().map((p) => (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${p === currentPage ? "bg-brand text-white hover:bg-brand" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage >= pagination.totalPages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(pagination.totalPages)} disabled={currentPage >= pagination.totalPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
