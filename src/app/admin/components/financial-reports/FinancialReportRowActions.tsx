"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  History,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AdminSales } from "@/types/adminSales";
import { useAuth } from "@/app/contexts/AuthContext";

interface FinancialReportRowActionsProps {
  sale: AdminSales;
  onViewHistory: (sale: AdminSales) => void;
  onRecordPayment: (sale: AdminSales) => void;
}

const FinancialReportRowActions: React.FC<FinancialReportRowActionsProps> = ({
  sale,
  onViewHistory,
  onRecordPayment,
}) => {
  const { isSuperAdmin } = useAuth();
  const isInstallment = sale.is_installment === true;
  const isFullyPaid = sale.payment_status === "fully_paid";
  const showPayButton = isInstallment && !isFullyPaid && !isSuperAdmin;

  // Payment info for dropdown
  const totalPaid = isInstallment ? (sale.total_paid ?? 0) : sale.amount;
  const durationMonths =
    sale.payment_model?.duration_months ?? 0;
  const paymentsMade = isInstallment
    ? Math.min(
        Math.ceil(totalPaid > 0 ? totalPaid / ((sale.amount || 1) / (durationMonths || 1)) : 0),
        durationMonths
      )
    : 0;
  const remaining = durationMonths - paymentsMade;

  return (
    <div className="flex items-center justify-center gap-1 ">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-fit">
          {/* Action */}
          <DropdownMenuItem
            onClick={() => onViewHistory(sale)}
            className="py-2 px-3 rounded-md hover:!bg-green-600 text-white hover:text-white cursor-pointer bg-green-800"
          >
            <History className="mr-2 h-4 w-4" />
            Payment History & Receipts
          </DropdownMenuItem>

          {/* Payment Information Section */}
          <DropdownMenuSeparator />
          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">
              Payment Information
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium">Plan:</span>
                <span>
                  {isInstallment
                    ? sale.payment_model?.name ?? `Monthly (${durationMonths} installments)`
                    : "Full Payment"}
                </span>
              </div>
              {isInstallment && (
                <>
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">Payments Made:</span>
                    <span>
                      {paymentsMade} of {durationMonths}
                    </span>
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
    </div>
  );
};

export default FinancialReportRowActions;
