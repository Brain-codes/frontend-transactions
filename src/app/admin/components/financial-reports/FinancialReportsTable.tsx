"use client";

import React from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { AdminSales } from "@/types/adminSales";
import FinancialReportRowActions from "./FinancialReportRowActions";

interface FinancialReportsTableProps {
  data: AdminSales[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewHistory: (sale: AdminSales) => void;
  onRecordPayment: (sale: AdminSales) => void;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
}

const formatCurrency = (amount: number) =>
  `₦${(amount ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getAmountPaid = (sale: AdminSales): number => {
  if (!sale.is_installment) return sale.amount;
  return sale.total_paid ?? 0;
};

const getAmountOwed = (sale: AdminSales): number => {
  if (!sale.is_installment) return 0;
  return sale.amount - (sale.total_paid ?? 0);
};

const getStatusBadge = (sale: AdminSales) => {
  const owed = getAmountOwed(sale);
  const paid = getAmountPaid(sale);

  if (!sale.is_installment || owed <= 0) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
        Paid
      </Badge>
    );
  }
  if (paid > 0 && owed > 0) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
      Unpaid
    </Badge>
  );
};

const FinancialReportsTable: React.FC<FinancialReportsTableProps> = ({
  data,
  loading,
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onViewHistory,
  onRecordPayment,
  sortOrder,
  onToggleSort,
}) => {
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate visible page numbers (max 5)
  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (data.length === 0 && !loading) {
    return (
      <div className="text-gray-500 flex flex-col py-10 items-center justify-center px-10 border border-gray-200 rounded-lg">
        <p className="text-lg font-medium">No records found</p>
        <p className="text-sm">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Pagination header */}
      <div className="bg-blue-50  rounded-lg px-4 py-2 flex items-center justify-between mb-5">
        <p className="text-sm text-gray-600">
          Showing{" "}
          <span className="font-medium">
            {startRecord}-{endRecord}
          </span>{" "}
          of <span className="font-medium">{totalRecords}</span> records
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Records per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="w-[70px] h-8 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-x border-gray-200 relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand hover:bg-brand">
              <TableHead className="text-white font-semibold">
                Transaction ID
              </TableHead>
              <TableHead
                className="text-white font-semibold cursor-pointer select-none"
                onClick={onToggleSort}
              >
                <div className="flex items-center gap-1">
                  Sales Date
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-white font-semibold">
                Customer
              </TableHead>
              <TableHead className="text-white font-semibold text-right">
                Total Amount
              </TableHead>
              <TableHead className="text-white font-semibold text-right">
                Amount Paid
              </TableHead>
              <TableHead className="text-white font-semibold text-right">
                Amount Owed
              </TableHead>
              <TableHead className="text-white font-semibold text-center">
                Status
              </TableHead>
              <TableHead className="text-white font-semibold text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={loading ? "opacity-40" : ""}>
            {data.map((sale, idx) => (
              <TableRow
                key={sale.id}
                className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}
              >
                <TableCell className="font-medium text-sm">
                  {sale.transaction_id || "N/A"}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(sale.sales_date || sale.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {sale.end_user_name || "N/A"}
                </TableCell>
                <TableCell className="text-right font-bold text-sm">
                  {formatCurrency(sale.amount ?? 0)}
                </TableCell>
                <TableCell className="text-right text-green-700 font-medium text-sm">
                  {formatCurrency(getAmountPaid(sale))}
                </TableCell>
                <TableCell className="text-right text-red-700 font-medium text-sm">
                  {formatCurrency(getAmountOwed(sale))}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(sale)}
                </TableCell>
                <TableCell className="text-center">
                  <FinancialReportRowActions
                    sale={sale}
                    onViewHistory={onViewHistory}
                    onRecordPayment={onRecordPayment}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="border border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
          <p className="text-sm text-gray-600">
            Showing {startRecord} to {endRecord} of {totalRecords} records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            {getVisiblePages().map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 p-0 ${
                  p === currentPage ? "bg-brand text-white hover:bg-brand" : ""
                }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReportsTable;
