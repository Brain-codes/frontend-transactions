"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, History, Plus, Pencil, Trash2, Calendar, CheckCircle2, Clock } from "lucide-react";
import { AdminSales } from "@/types/adminSales";

interface FinancialReportRowActionsProps {
  sale: AdminSales;
  onViewHistory: (sale: AdminSales) => void;
  onRecordPayment: (sale: AdminSales) => void;
  onEditSale?: (sale: AdminSales) => void;
  onDeleteSale?: (sale: AdminSales) => void;
}

const FinancialReportRowActions: React.FC<FinancialReportRowActionsProps> = ({
  sale, onViewHistory, onRecordPayment, onEditSale, onDeleteSale,
}) => {
  const isInstallment = sale.is_installment === true;
  const isFullyPaid = sale.payment_status === "fully_paid";
  const showPayButton = isInstallment && !isFullyPaid;

  const totalPaid = isInstallment ? (sale.total_paid ?? 0) : sale.amount;
  const durationMonths = sale.payment_model?.duration_months ?? 0;
  const paymentsMade = isInstallment
    ? Math.min(Math.ceil(totalPaid > 0 ? totalPaid / ((sale.amount || 1) / (durationMonths || 1)) : 0), durationMonths)
    : 0;
  const remaining = durationMonths - paymentsMade;

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Pay button */}
      {showPayButton && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex items-center gap-1"
          onClick={() => onRecordPayment(sale)}
        >
          <Plus className="h-3 w-3" />
          Pay
        </Button>
      )}

      {/* More dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Payment History */}
          <DropdownMenuItem
            onClick={() => onViewHistory(sale)}
            className="py-2 px-3 rounded-md hover:!bg-green-600 hover:!text-white cursor-pointer"
          >
            <History className="mr-2 h-4 w-4" />
            Payment History & Receipts
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Edit */}
          <DropdownMenuItem
            onClick={() => onEditSale?.(sale)}
            className="py-2 px-3 rounded-md hover:!bg-blue-600 hover:!text-white cursor-pointer"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Sale
          </DropdownMenuItem>

          {/* Delete */}
          <DropdownMenuItem
            onClick={() => onDeleteSale?.(sale)}
            className="py-2 px-3 rounded-md hover:!bg-red-600 hover:!text-white cursor-pointer text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Sale
          </DropdownMenuItem>

          {/* Payment Information Section */}
          <DropdownMenuSeparator />
          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Payment Info</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium">Plan:</span>
                <span>
                  {isInstallment
                    ? (sale.payment_model?.name ?? `Monthly (${durationMonths} installments)`)
                    : "Full Payment"}
                </span>
              </div>
              {isInstallment && (
                <>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">Paid:</span>
                    <span>{paymentsMade} of {durationMonths}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium">Remaining:</span>
                    <span>{remaining}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FinancialReportRowActions;
