"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import FinancialSummaryCards from "../../admin/components/financial-reports/FinancialSummaryCards";
import PaymentStatusCards from "../../admin/components/financial-reports/PaymentStatusCards";
import FinancialReportsTable from "../../admin/components/financial-reports/FinancialReportsTable";
import PaymentHistoryModal from "../../admin/components/financial-reports/PaymentHistoryModal";
import AdminSalesDetailModal from "../../admin/components/sales/AdminSalesDetailModal";
import { AdminSales } from "@/types/adminSales";
import salesAdvancedService from "../../services/salesAdvancedAPIService";
import { lgaAndStates } from "../../constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Search,
  X,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "super_admin_manage_sales_selected_years";

const getAmountPaid = (sale: AdminSales): number =>
  sale.is_installment ? (sale.total_paid ?? 0) : sale.amount;

const stateList = Object.keys(lgaAndStates).sort();

const loadSelectedYears = (): number[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as number[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [new Date().getFullYear()];
};

const saveSelectedYears = (years: number[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(years)); } catch {}
};

const getYearTitle = (selected: number[]): string => {
  if (selected.length === 0) return "Sales Records";
  const sorted = [...selected].sort((a, b) => a - b);
  if (sorted.length === 1) return `Sales Records for Year ${sorted[0]}`;
  // Check contiguous
  let contiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) { contiguous = false; break; }
  }
  if (contiguous) return `Sales Records for Year ${sorted[0]} – ${sorted[sorted.length - 1]}`;
  return `Sales Records for Year ${sorted.join(", ")}`;
};

const getYearPillLabel = (selected: number[], available: number[]): string => {
  if (selected.length === 0 || selected.length === available.length) return "All Years";
  return [...selected].sort((a, b) => a - b).join(", ");
};

// ── YearFilterBar ─────────────────────────────────────────────────────────────

interface YearFilterBarProps {
  selectedYears: number[];
  availableYears: number[];
  onChange: (years: number[]) => void;
}

const YearFilterBar: React.FC<YearFilterBarProps> = ({ selectedYears, availableYears, onChange }) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (year: number) => {
    const updated = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year].sort((a, b) => a - b);
    if (updated.length === 0) return;
    onChange(updated);
    saveSelectedYears(updated);
  };

  const handleSelectAll = () => {
    onChange([...availableYears]);
    saveSelectedYears([...availableYears]);
  };

  const handleSelectCurrent = () => {
    const cur = new Date().getFullYear();
    const y = availableYears.includes(cur) ? cur : availableYears[availableYears.length - 1];
    onChange([y]);
    saveSelectedYears([y]);
  };

  const pillLabel = getYearPillLabel(selectedYears, availableYears);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Trigger row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Active year(s) in view</span>
          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
            {pillLabel}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Expandable content */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Select the year(s) for which you want to display sales records.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {availableYears.map((year) => (
              <label key={year} className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => handleToggle(year)}
                />
                <span className="text-sm font-medium text-foreground">{year}</span>
              </label>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectCurrent} className="text-xs">
                Current Year Only
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const SuperAdminManageSalesPage = () => {
  const [allSales, setAllSales] = useState<AdminSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // Year filter — persisted in localStorage, defaults to current year
  const [selectedYears, setSelectedYears] = useState<number[]>(loadSelectedYears);

  // Other filters
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedLGA, setSelectedLGA] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Summary toggles
  const [showFinancialSummary, setShowFinancialSummary] = useState(true);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(true);

  // Modals
  const [detailModalSale, setDetailModalSale] = useState<AdminSales | null>(null);
  const [historyModalSale, setHistoryModalSale] = useState<AdminSales | null>(null);

  const lgaList = useMemo(
    () => selectedState !== "all" ? (lgaAndStates as Record<string, string[]>)[selectedState] || [] : [],
    [selectedState]
  );

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await salesAdvancedService.getSalesData(
        { limit: 500, responseFormat: "format2" },
        "POST",
        "SuperAdminManageSales"
      );
      if (result.success) {
        setAllSales(result.data || []);
      } else {
        setError(result.error || "Failed to fetch sales data");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // Available years derived from actual sales data
  const availableYears = useMemo(() => {
    if (allSales.length === 0) return [new Date().getFullYear()];
    const years = Array.from(
      new Set(
        allSales
          .map((s) => { const d = s.sales_date || s.created_at; return d ? new Date(d).getFullYear() : null; })
          .filter((y): y is number => y !== null)
      )
    ).sort((a, b) => a - b);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [allSales]);

  // ── Client-side filtering ─────────────────────────────────────────────────

  const filteredSales = useMemo(() => {
    let result = [...allSales];

    // Year filter
    if (selectedYears.length > 0 && selectedYears.length < availableYears.length) {
      result = result.filter((s) => {
        const d = s.sales_date || s.created_at;
        return d && selectedYears.includes(new Date(d).getFullYear());
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        (s.partner_name || "").toLowerCase().includes(term) ||
        (s.transaction_id || "").toLowerCase().includes(term) ||
        (s.stove_serial_no || "").toLowerCase().includes(term) ||
        (s.end_user_name || "").toLowerCase().includes(term) ||
        (s.phone || "").toLowerCase().includes(term)
      );
    }

    if (paymentStatusFilter !== "all") {
      result = result.filter((s) => {
        switch (paymentStatusFilter) {
          case "paid":    return !s.is_installment || s.payment_status === "fully_paid";
          case "partial": return s.is_installment && s.payment_status === "partially_paid";
          case "unpaid":  return s.is_installment && (s.total_paid ?? 0) === 0;
          default:        return true;
        }
      });
    }

    if (selectedState !== "all") {
      result = result.filter((s) =>
        (s.state_backup || "").toLowerCase() === selectedState.toLowerCase()
      );
    }

    if (selectedLGA !== "all") {
      result = result.filter((s) =>
        (s.lga_backup || "").toLowerCase() === selectedLGA.toLowerCase()
      );
    }

    if (startDate) result = result.filter((s) => (s.sales_date || s.created_at || "") >= startDate);
    if (endDate)   result = result.filter((s) => (s.sales_date || s.created_at || "") <= endDate + "T23:59:59");

    result.sort((a, b) => {
      const dA = new Date(a.sales_date || a.created_at).getTime();
      const dB = new Date(b.sales_date || b.created_at).getTime();
      return sortOrder === "asc" ? dA - dB : dB - dA;
    });

    return result;
  }, [allSales, selectedYears, availableYears, searchTerm, paymentStatusFilter, selectedState, selectedLGA, startDate, endDate, sortOrder]);

  // ── Summary cards ─────────────────────────────────────────────────────────

  const financialSummary = useMemo(() => {
    const totalReceivable = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalCollected  = filteredSales.reduce((sum, s) => sum + getAmountPaid(s), 0);
    const outstandingBalance = totalReceivable - totalCollected;
    return {
      totalReceivable, totalCollected, outstandingBalance,
      salesCount: filteredSales.length,
      collectedPercent:   totalReceivable > 0 ? (totalCollected / totalReceivable) * 100 : 0,
      outstandingPercent: totalReceivable > 0 ? (outstandingBalance / totalReceivable) * 100 : 0,
    };
  }, [filteredSales]);

  const paymentBreakdown = useMemo(() => ({
    totalOrders:   filteredSales.length,
    fullyPaid:     filteredSales.filter((s) => !s.is_installment || s.payment_status === "fully_paid").length,
    partiallyPaid: filteredSales.filter((s) => s.is_installment && s.payment_status === "partially_paid").length,
    unpaid:        filteredSales.filter((s) => s.is_installment && (s.total_paid ?? 0) === 0).length,
  }), [filteredSales]);

  // ── Pagination ────────────────────────────────────────────────────────────

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentStatusFilter, selectedState, selectedLGA, selectedYears, startDate, endDate, pageSize]);

  // ── Misc helpers ──────────────────────────────────────────────────────────

  const hasOtherActiveFilters =
    searchTerm !== "" || paymentStatusFilter !== "all" ||
    selectedState !== "all" || selectedLGA !== "all" ||
    startDate !== "" || endDate !== "";

  const clearFilters = () => {
    setSearchTerm(""); setPaymentStatusFilter("all");
    setSelectedState("all"); setSelectedLGA("all");
    setStartDate(""); setEndDate("");
  };

  const handleStateChange = (val: string) => { setSelectedState(val); setSelectedLGA("all"); };

  const handleCardFilterClick = (filter: string) =>
    setPaymentStatusFilter((prev) => (prev === filter ? "all" : filter));

  const pageTitle = getYearTitle(selectedYears);

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

  const handleExport = async () => {
    try {
      setExporting(true);
      const rows = filteredSales.map((s) => ({
        "Transaction ID": s.transaction_id || "",
        Customer: s.end_user_name || "",
        Phone: s.phone || "",
        "Stove S/N": s.stove_serial_no || "",
        Partner: s.partner_name || "",
        State: s.state_backup || "",
        LGA: s.lga_backup || "",
        "Sales Date": s.sales_date || s.created_at || "",
        Amount: s.amount ?? "",
        "Amount Paid": getAmountPaid(s),
        Status: s.payment_status || (s.is_installment ? "installment" : "paid"),
      }));
      const headers = Object.keys(rows[0] || {});
      const csv = [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout
        currentRoute="sales-manage"
        title={pageTitle}
        rightButton={
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
        }
      >
        <div className="space-y-4 px-6 py-4">

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Year Filter Bar — always visible */}
          <YearFilterBar
            selectedYears={selectedYears}
            availableYears={availableYears}
            onChange={setSelectedYears}
          />

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
                  {toggleBtn(showFinancialSummary, () => setShowFinancialSummary((v) => !v))}
                </div>
                {showFinancialSummary && <FinancialSummaryCards summary={financialSummary} />}
              </div>

              {/* Payment Status Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase">Payment Status Breakdown</h2>
                  {toggleBtn(showStatusBreakdown, () => setShowStatusBreakdown((v) => !v))}
                </div>
                {showStatusBreakdown && (
                  <PaymentStatusCards
                    breakdown={paymentBreakdown}
                    activeFilter={paymentStatusFilter}
                    onFilterClick={handleCardFilterClick}
                  />
                )}
              </div>

              {/* Filter Bar */}
              <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="w-1/4 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search org, transaction ID, stove ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white h-9 text-sm"
                  />
                </div>

                {/* Payment Status */}
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>

                {/* State */}
                <Select value={selectedState} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-[160px] h-9 bg-white text-sm">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {stateList.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* LGA — only when state selected */}
                {selectedState !== "all" && lgaList.length > 0 && (
                  <Select value={selectedLGA} onValueChange={setSelectedLGA}>
                    <SelectTrigger className="w-[180px] h-9 bg-white text-sm">
                      <SelectValue placeholder="All LGAs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All LGAs</SelectItem>
                      {lgaList.map((lga) => (
                        <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Date range */}
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[140px] h-9 bg-white text-sm"
                />
                <span className="text-gray-400 text-sm">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[140px] h-9 bg-white text-sm"
                />

                {/* Clear */}
                {hasOtherActiveFilters && (
                  <Button onClick={clearFilters} size="sm" variant="outline" className="h-9">
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Table */}
              <FinancialReportsTable
                data={paginatedSales}
                loading={false}
                currentPage={currentPage}
                pageSize={pageSize}
                totalRecords={filteredSales.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onViewDetails={setDetailModalSale}
                onViewHistory={setHistoryModalSale}
                onRecordPayment={() => {}}
                sortOrder={sortOrder}
                onToggleSort={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                viewFrom="superAdmin"
              />
            </>
          )}
        </div>

        {/* Modals */}
        <AdminSalesDetailModal
          open={!!detailModalSale}
          onClose={() => setDetailModalSale(null)}
          sale={detailModalSale}
          viewFrom="superAdmin"
          onSaleUpdated={fetchSales}
        />
        <PaymentHistoryModal
          open={!!historyModalSale}
          onClose={() => setHistoryModalSale(null)}
          sale={historyModalSale}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminManageSalesPage;
