"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import FinancialSummaryCards from "./FinancialSummaryCards";
import PaymentStatusCards from "./PaymentStatusCards";
import FinancialReportsFilters from "./FinancialReportsFilters";
import FinancialReportsTable from "./FinancialReportsTable";
import PaymentHistoryModal from "./PaymentHistoryModal";
import RecordPaymentModal from "../sales/RecordPaymentModal";
import { AdminSales } from "@/types/adminSales";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinancialReportsViewProps {
  loadSales: () => Promise<{ success: boolean; data?: AdminSales[]; error?: string }>;
  onEditSale?: (sale: AdminSales) => void;
  onDeleteSale?: (sale: AdminSales) => void;
}

const getAmountPaid = (sale: AdminSales): number =>
  sale.is_installment ? (sale.total_paid ?? 0) : sale.amount;

const getAmountOwed = (sale: AdminSales): number =>
  sale.is_installment ? sale.amount - (sale.total_paid ?? 0) : 0;

const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({ loadSales, onEditSale, onDeleteSale }) => {
  const [allSales, setAllSales] = useState<AdminSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showFinancialSummary, setShowFinancialSummary] = useState(true);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(true);

  const [historyModalSale, setHistoryModalSale] = useState<AdminSales | null>(null);
  const [paymentModalSale, setPaymentModalSale] = useState<AdminSales | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await loadSales();
      if (result.success) {
        setAllSales(result.data || []);
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [loadSales]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const filteredSales = useMemo(() => {
    let result = [...allSales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        (s.end_user_name || "").toLowerCase().includes(term) ||
        (s.transaction_id || "").toLowerCase().includes(term) ||
        (s.phone || "").toLowerCase().includes(term) ||
        (s.partner_name || "").toLowerCase().includes(term)
      );
    }

    if (paymentStatusFilter !== "all") {
      result = result.filter((s) => {
        const paid = getAmountPaid(s);
        switch (paymentStatusFilter) {
          case "paid":    return !s.is_installment || s.payment_status === "fully_paid";
          case "partial": return s.is_installment && s.payment_status === "partially_paid";
          case "unpaid":  return s.is_installment && paid === 0;
          default:        return true;
        }
      });
    }

    if (startDate) result = result.filter((s) => (s.sales_date || s.created_at) >= startDate);
    if (endDate)   result = result.filter((s) => (s.sales_date || s.created_at) <= endDate + "T23:59:59");

    result.sort((a, b) => {
      const dA = new Date(a.sales_date || a.created_at).getTime();
      const dB = new Date(b.sales_date || b.created_at).getTime();
      return sortOrder === "asc" ? dA - dB : dB - dA;
    });

    return result;
  }, [allSales, searchTerm, paymentStatusFilter, startDate, endDate, sortOrder]);

  const financialSummary = useMemo(() => {
    const totalReceivable = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalCollected  = filteredSales.reduce((sum, s) => sum + getAmountPaid(s), 0);
    const outstandingBalance = totalReceivable - totalCollected;
    return {
      totalReceivable, totalCollected, outstandingBalance,
      salesCount: filteredSales.length,
      collectedPercent:    totalReceivable > 0 ? (totalCollected / totalReceivable) * 100 : 0,
      outstandingPercent:  totalReceivable > 0 ? (outstandingBalance / totalReceivable) * 100 : 0,
    };
  }, [filteredSales]);

  const paymentBreakdown = useMemo(() => ({
    totalOrders:    filteredSales.length,
    fullyPaid:      filteredSales.filter((s) => !s.is_installment || s.payment_status === "fully_paid").length,
    partiallyPaid:  filteredSales.filter((s) => s.is_installment && s.payment_status === "partially_paid").length,
    unpaid:         filteredSales.filter((s) => s.is_installment && (s.total_paid ?? 0) === 0).length,
  }), [filteredSales]);

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, paymentStatusFilter, startDate, endDate, pageSize]);

  const hasActiveFilters = searchTerm !== "" || paymentStatusFilter !== "all" || startDate !== "" || endDate !== "";

  const clearFilters = () => {
    setSearchTerm(""); setPaymentStatusFilter("all"); setStartDate(""); setEndDate("");
  };

  // Clicking a status card toggles the filter
  const handleCardFilterClick = (filter: string) => {
    setPaymentStatusFilter((prev) => prev === filter ? "all" : filter);
  };

  const handlePaymentSuccess = () => { setPaymentModalSale(null); fetchSales(); };

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

  return (
    <div className="space-y-4 px-6">
      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading sales data...</span>
        </div>
      ) : (
        <>
          {/* Financial Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700 uppercase">Financial Summary</h2>
              {toggleBtn(showFinancialSummary, () => setShowFinancialSummary(!showFinancialSummary))}
            </div>
            {showFinancialSummary && <FinancialSummaryCards summary={financialSummary} />}
          </div>

          {/* Payment Status Breakdown — clickable */}
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

          {/* Filters */}
          <FinancialReportsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusChange={setPaymentStatusFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Table */}
          <FinancialReportsTable
            data={paginatedSales}
            loading={false}
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={filteredSales.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onViewHistory={setHistoryModalSale}
            onRecordPayment={setPaymentModalSale}
            onEditSale={onEditSale}
            onDeleteSale={onDeleteSale}
            sortOrder={sortOrder}
            onToggleSort={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          />
        </>
      )}

      {/* Modals */}
      <PaymentHistoryModal open={!!historyModalSale} onClose={() => setHistoryModalSale(null)} sale={historyModalSale} />

      {paymentModalSale && (
        <RecordPaymentModal
          saleId={paymentModalSale.id}
          remainingBalance={paymentModalSale.amount - (paymentModalSale.total_paid ?? 0)}
          onClose={() => setPaymentModalSale(null)}
          onSuccess={handlePaymentSuccess}
          saleSummary={{
            transactionId: paymentModalSale.transaction_id,
            customerName: paymentModalSale.end_user_name,
            totalAmount: paymentModalSale.amount,
            amountPaid: paymentModalSale.total_paid ?? 0,
            amountOwed: paymentModalSale.amount - (paymentModalSale.total_paid ?? 0),
          }}
        />
      )}
    </div>
  );
};

export default FinancialReportsView;
