
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreVertical, History, Eye, Ban, Pencil } from "lucide-react";
import { AdminSales } from "@/types/adminSales";


interface FinancialReportRowActionsProps {
  sale: AdminSales;
  onViewDetails: (sale: AdminSales) => void;
  onViewHistory: (sale: AdminSales) => void;
  onRecordPayment: (sale: AdminSales) => void;
  onApproveSale?: (sale: AdminSales) => void;
  onEditSale?: (sale: AdminSales) => void;
  onDeleteSale?: (sale: AdminSales) => void;
  onCancelSale?: (sale: AdminSales) => void;
  viewFrom?: "admin" | "superAdmin" | "agent" | "partner";
}

const FinancialReportRowActions: React.FC<FinancialReportRowActionsProps> = ({
  sale, onViewDetails, onViewHistory, onRecordPayment, onApproveSale, onEditSale, onDeleteSale, onCancelSale, viewFrom = "admin",
}) => {
  const totalPaid = sale.total_paid ?? 0;
  const balance = Math.max(0, (sale.amount || 0) - totalPaid);
  const showPayButton = balance > 0;

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Record Payment button */}
      {showPayButton && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="h-7 px-3 text-xs font-medium rounded-full bg-[#4a5d0f] text-white hover:bg-[#3a4a0c] shadow-sm transition-colors flex items-center gap-1.5"
                onClick={() => onRecordPayment(sale)}
              >
                Pay
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#4a5d0f] text-white border-[#4a5d0f]">
              <p>Record payment for this sale</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}


      {/* Approve button (ACSL Agent only) */}
      {/* {onApproveSale && !sale.agent_approved && (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
          onClick={() => onApproveSale(sale)}
        >
          <CheckCircle2 className="h-3 w-3" />
          Approve
        </Button>
      )} */}

      {/* More dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* View Transaction details */}
          <DropdownMenuItem
            onClick={() => onViewDetails(sale)}
            className="py-2 px-3 rounded-md hover:!bg-[#4a5d0f] hover:!text-white cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Transaction Details
          </DropdownMenuItem>

          {/* Payment History */}
          <DropdownMenuItem
            onClick={() => onViewHistory(sale)}
            className="py-2 px-3 rounded-md hover:!bg-green-600 hover:!text-white cursor-pointer"
          >
            <History className="mr-2 h-4 w-4" />
            Payment Histories & Receipts
          </DropdownMenuItem>

          {/* Cancel Sale */}
          {onCancelSale && viewFrom !== "agent" && (
            <DropdownMenuItem
              onClick={() => onCancelSale(sale)}
              className="py-2 px-3 rounded-md hover:!bg-red-600 hover:!text-white cursor-pointer text-red-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancel Sale
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
};

export default FinancialReportRowActions;
