"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import superAdminAgentService from "../../../services/superAdminAgentService";

interface Sale {
  id: string;
  contact_person: string | null;
  end_user_name: string | null;
  stove_serial_no: string | null;
  partner_name: string | null;
  amount: number | null;
}

interface ApproveSaleConfirmModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: (saleId: string) => void;
}

const ApproveSaleConfirmModal: React.FC<ApproveSaleConfirmModalProps> = ({
  sale,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError("");
      await superAdminAgentService.approveSale(sale.id);
      onSuccess(sale.id);
    } catch (err: any) {
      setError(err.message || "Failed to approve sale");
    } finally {
      setLoading(false);
    }
  };

  const customerName =
    sale.contact_person || sale.end_user_name || "Unknown customer";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Sale
          </DialogTitle>
          <DialogDescription>
            Confirm that you want to approve this sale record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Sale Info */}
          <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Serial No</span>
              <span className="font-medium text-gray-900 font-mono">
                {sale.stove_serial_no || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Partner</span>
              <span className="font-medium text-gray-900">
                {sale.partner_name || "—"}
              </span>
            </div>
            {sale.amount !== null && sale.amount !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium text-gray-900">
                  ₦{sale.amount.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600">
            This will mark the sale as agent-approved. This action confirms that
            you have reviewed and verified this transaction.
          </p>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveSaleConfirmModal;
