"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import PageHeader from "../../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeftRight,
  Search,
  X,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import transferHistoryService, { TransferRecord } from "../../services/transferHistoryService";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Stove IDs Modal ──────────────────────────────────────────────────────────

function StoveIdsModal({
  record,
  isOpen,
  onClose,
}: {
  record: TransferRecord | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) setSearch("");
  }, [isOpen]);

  if (!record) return null;
  const stoves = record.stove_ids ?? [];
  const filtered = stoves.filter(
    (s) => !search || s.stove_id?.toLowerCase().includes(search.toLowerCase())
  );

  const fileSlug = `${record.partner_name?.replace(/\s+/g, "-").toLowerCase() ?? "partner"}-${record.transaction_id ?? "transfer"}`;

  const downloadCSV = () => {
    const headers = ["Stove ID", "Factory", "Sales Reference"];
    const rows = filtered.map((s) => [s.stove_id, s.factory || "", s.sales_reference || ""]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stove-ids-${fileSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Transferred Stove IDs
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Partner: <span className="font-semibold text-primary">{record.partner_name}</span>
            </p>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className=" space-y-3 overflow-y-auto flex-1">
          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between border-b border-primary/20 pb-0.5 mb-2">
              <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider">Transfer Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Stoves</p>
                <p className="text-xs font-medium">{stoves.length.toLocaleString()}</p>
              </div>
              <div className="space-y-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Transfer Date</p>
                <p className="text-xs font-medium">{formatDate(record.transfer_date)}</p>
              </div>
              <div className="space-y-0">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Transaction ID</p>
                <p className="text-xs font-mono font-medium">{record.transaction_id || "—"}</p>
              </div>
            </div>
          </div>

          {/* Filter & Search */}
          {/* <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between border-b border-primary/20 pb-0.5 mb-2">
              <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider">Search</h3>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stove ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div> */}

          {/* Stove IDs */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between border-b border-primary/20 pb-0.5 mb-2">
              <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Stove IDs{filtered.length > 0 ? ` (${filtered.length})` : ""}
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={downloadCSV}
                disabled={filtered.length === 0}
              >
                <Download className="h-3 w-3" />CSV
              </Button>
            </div>

            {stoves.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">No stove IDs recorded.</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">No stove IDs match your search.</div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto">
                {filtered.map((s) => (
                  <div
                    key={s.stove_id}
                    className="px-2 py-1 text-xs rounded border text-center truncate  bg-muted/50 border-border/50 text-foreground cursor-default" 
                    title={[s.stove_id, s.factory && `Factory: ${s.factory}`, s.sales_reference && `Ref: ${s.sales_reference}`].filter(Boolean).join(" · ")}
                  >
                    {s.stove_id}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────

export default function StoveTransferHistoryContent() {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<TransferRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRecord = records.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(page * pageSize, totalCount);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await transferHistoryService.getHistory({
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_order: sortOrder,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRecords(response.data);
      setTotalCount(response.pagination.total);
    } catch (e: any) {
      setError(e.message ?? "Failed to load transfer history");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, dateFrom, dateTo, sortOrder]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, sortOrder, pageSize]);

  const openModal = (record: TransferRecord) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const sourceLabel = (source: string) =>
    source === "external-csv-sync" ? "CSV Sync" : "JSON Sync";

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (loading && records.length === 0) {
    return (
      <DashboardLayout currentRoute="stove-transfer-history" title="Stove Transfer History">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout currentRoute="stove-transfer-history" title="Stove Transfer History">
        <div className="p-6 space-y-5">
          <PageHeader title="Stove Transfer History" icon={ArrowLeftRight} />

          {/* Filter bar */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search partner, state, transaction ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white h-9 text-sm w-[140px]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white h-9 text-sm w-[140px]"
              />
            </div>

            {(search || dateFrom || dateTo) && (
              <Button
                onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
                size="sm"
                variant="outline"
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <p className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-medium">
                  {startRecord}–{endRecord}
                </span>{" "}
                of <span className="font-medium">{totalCount}</span> records
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-500">per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => setPageSize(parseInt(v))}
                >
                  <SelectTrigger className="w-[65px] h-7 bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s.toString()}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm font-bold text-green-500">
                Total: <span className="text-brand">{totalCount}</span>
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-0">
            <div className="bg-white border border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}

              {error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <p className="text-sm text-red-500">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchRecords}>
                    Retry
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-brand hover:bg-brand">
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        <button
                          className="flex items-center gap-1 hover:opacity-80"
                          onClick={() => setSortOrder((s) => s === "desc" ? "asc" : "desc")}
                        >
                          Transfer Date
                          {sortOrder === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUp className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        Transaction ID
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        Partner Name
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        State
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        Branch
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        Sales Factory
                      </TableHead>
                      <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">
                        Stoves
                      </TableHead>
                      {/* <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                        Source
                      </TableHead> */}
                      <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? "opacity-40" : ""}>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10">
                          <ArrowLeftRight className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No transfer records found</p>
                          <p className="text-gray-400 text-sm">Try adjusting your search</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record, idx) => (
                        <TableRow
                          key={record.id}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                        >
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(record.transfer_date)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {record.transaction_id}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-gray-900">
                            {record.partner_name}
                          </TableCell>
                          <TableCell className="text-xs">{record.state || "—"}</TableCell>
                          <TableCell className="text-xs">{record.branch || "—"}</TableCell>
                          <TableCell className="text-xs">{record.sales_factory || "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {record.stove_count}
                            </span>
                          </TableCell>
                          {/* <TableCell>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {sourceLabel(record.source)}
                            </span>
                          </TableCell> */}
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-brand hover:bg-brand/90 text-white gap-1"
                              onClick={() => openModal(record)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View IDs
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startRecord} to {endRecord} of {totalCount} records
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  {getVisiblePages().map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${p === page ? "bg-brand text-white hover:bg-brand" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      <StoveIdsModal
        record={selectedRecord}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
