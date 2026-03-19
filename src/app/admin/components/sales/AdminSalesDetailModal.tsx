import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, Plus, Loader2, Layers } from "lucide-react";
import { AdminSales } from "@/types/adminSales";
import type { SuperAdminSale } from "@/types/superAdminSales";
import paymentModelService from "../../../services/paymentModelService";
import RecordPaymentModal from "./RecordPaymentModal";

interface InstallmentPayment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
  recorder?: { full_name?: string };
}

interface AdminSalesDetailModalProps {
  open: boolean;
  onClose: () => void;
  viewFrom: "admin" | "superAdmin";
  sale?: AdminSales | SuperAdminSale | null | undefined;
  onSaleUpdated?: () => void;
}

const DetailItem = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) => (
  <div className="space-y-0">
    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
      {label}
    </p>
    <p className={`text-xs font-medium ${highlight ? "text-blue-600" : ""}`}>
      {value ?? <span className="text-gray-400">N/A</span>}
    </p>
  </div>
);

const SectionCard = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-muted/30 rounded-lg p-3 border border-border/50 ${className}`}>
    <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-0.5 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const AdminSalesDetailModal: React.FC<AdminSalesDetailModalProps> = ({
  open,
  onClose,
  sale,
  viewFrom,
  onSaleUpdated,
}) => {
  const [installmentPayments, setInstallmentPayments] = useState<InstallmentPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<{
    total_paid: number;
    remaining_balance: number;
    payment_count: number;
    fixed_price: number;
    progress_percent: number;
  } | null>(null);

  const isInstallment = sale?.is_installment === true;

  const fetchInstallmentPayments = useCallback(async () => {
    if (!sale?.id || !isInstallment) return;
    try {
      setPaymentsLoading(true);
      const result = await paymentModelService.getInstallmentPayments(sale.id);
      setInstallmentPayments(result.data || []);
      setPaymentSummary(result.summary || null);
    } catch (err) {
      console.error("Error fetching installment payments:", err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [sale?.id, isInstallment]);

  useEffect(() => {
    if (open && isInstallment) fetchInstallmentPayments();
  }, [open, isInstallment, fetchInstallmentPayments]);

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return "N/A";
    return `₦${Number(amount).toLocaleString("en-NG")}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const handlePaymentRecorded = () => {
    setShowRecordPayment(false);
    fetchInstallmentPayments();
    onSaleUpdated?.();
  };

  if (!sale) return null;

  const totalPaid = paymentSummary?.total_paid ?? (sale.total_paid || 0);
  const saleAmount = sale.amount || 0;
  const remainingBalance = paymentSummary?.remaining_balance ?? saleAmount - totalPaid;
  const progressPercent =
    paymentSummary?.progress_percent ??
    (saleAmount > 0 ? (totalPaid / saleAmount) * 100 : 0);
  const isFullyPaid = sale.payment_status === "fully_paid";

  const stoveImageUrl =
    viewFrom === "superAdmin"
      ? (sale as SuperAdminSale).stove_image?.url
      : (sale as AdminSales).stove_image_id?.url;

  const agreementImageUrl =
    viewFrom === "superAdmin"
      ? (sale as SuperAdminSale).agreement_image?.url
      : (sale as AdminSales).agreement_image_id?.url;

  const address =
    viewFrom === "superAdmin"
      ? (sale as SuperAdminSale).addresses
      : (sale as AdminSales).address;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-sky-50/80 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Sale Details
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transaction:{" "}
                  <span className="font-semibold text-primary">
                    {sale.transaction_id || "N/A"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(sale)}
                {isInstallment && !isFullyPaid && (
                  <Button
                    size="sm"
                    className="bg-brand hover:bg-brand/90 text-white gap-1.5"
                    onClick={() => setShowRecordPayment(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="px-5 py-3 space-y-3 overflow-y-auto flex-1">
            {/* Row 1: Sale Info + Customer Details */}
            <div className="grid grid-cols-2 gap-3">
              <SectionCard title="Sale Information">
                <div className="grid grid-cols-2 gap-2">
                  <DetailItem label="Sales Date" value={formatDate(sale.sales_date)} />
                  <DetailItem label="Created" value={formatDate(sale.created_at)} />
                  <DetailItem label="Stove Serial No" value={sale.stove_serial_no} />
                  <DetailItem label="Partner Name" value={sale.partner_name} />
                  <DetailItem label="Agent" value={(sale as AdminSales).creator?.full_name || (sale as AdminSales).agent_name} />
                  <DetailItem
                    label="Payment Type"
                    value={
                      isInstallment ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0">
                          Installment
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5 py-0">
                          Full Payment
                        </Badge>
                      )
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard title="Customer Details">
                <div className="grid grid-cols-2 gap-2">
                  <DetailItem label="Customer Name" value={sale.end_user_name} />
                  <DetailItem label="AKA" value={sale.aka} />
                  <DetailItem label="Phone" value={sale.phone} />
                  <DetailItem label="Other Phone" value={sale.other_phone} />
                  <DetailItem label="Contact Person" value={sale.contact_person} />
                  <DetailItem label="Contact Phone" value={sale.contact_phone} />
                </div>
              </SectionCard>
            </div>

            {/* Row 2: Location + Images */}
            <div className="grid grid-cols-2 gap-3">
              <SectionCard title="Location">
                <div className="grid grid-cols-2 gap-2">
                  <DetailItem label="State" value={sale.state_backup} />
                  <DetailItem label="LGA" value={sale.lga_backup} />
                  <DetailItem label="City" value={address?.city} />
                  <DetailItem label="Country" value={address?.country} />
                  <div className="col-span-2">
                    <DetailItem
                      label="Address"
                      value={address?.full_address || address?.street}
                    />
                  </div>
                  <DetailItem label="Latitude" value={address?.latitude} />
                  <DetailItem label="Longitude" value={address?.longitude} />
                </div>
              </SectionCard>

              <SectionCard title="Images & Documents">
                <div className="grid grid-cols-1 gap-2">
                  <DetailItem
                    label="Stove Image"
                    value={
                      stoveImageUrl ? (
                        <a
                          href={stoveImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View Image
                        </a>
                      ) : undefined
                    }
                  />
                  <DetailItem
                    label="Agreement Image"
                    value={
                      agreementImageUrl ? (
                        <a
                          href={agreementImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View Image
                        </a>
                      ) : undefined
                    }
                  />
                  <DetailItem
                    label="Signature"
                    value={
                      sale.signature ? (
                        <span className="text-green-600">Available</span>
                      ) : undefined
                    }
                  />
                </div>
              </SectionCard>
            </div>

            {/* Row 3: Financial Details — full width */}
            <div className="bg-gradient-to-r from-blue-50/50 to-green-50/50 rounded-lg p-3 border border-primary/10">
              <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-0.5 mb-2">
                Financial Details
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <DetailItem label="Total Amount" value={formatCurrency(saleAmount)} highlight />
                <DetailItem
                  label="Amount Paid"
                  value={
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(isInstallment ? totalPaid : saleAmount)}
                    </span>
                  }
                />
                <DetailItem
                  label="Amount Owed"
                  value={
                    <span className={remainingBalance > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                      {formatCurrency(isInstallment ? remainingBalance : 0)}
                    </span>
                  }
                />
                <DetailItem
                  label="Payment Status"
                  value={getStatusBadge(sale)}
                />
                {isInstallment && sale.payment_model && (
                  <>
                    <DetailItem label="Payment Model" value={sale.payment_model.name} />
                    <DetailItem label="Duration" value={`${sale.payment_model.duration_months} months`} />
                    <DetailItem label="Installment Price" value={formatCurrency(sale.payment_model.fixed_price)} />
                    <DetailItem label="Progress" value={`${progressPercent.toFixed(0)}% complete`} />
                  </>
                )}
              </div>

              {/* Progress bar for installments */}
              {isInstallment && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(totalPaid)} paid</span>
                    <span>{formatCurrency(remainingBalance)} remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFullyPaid ? "bg-green-500" : "bg-brand"}`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Installment Payments History */}
            {isInstallment && (
              <SectionCard title="Payment History">
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                    <span className="ml-2 text-xs text-gray-600">Loading payments...</span>
                  </div>
                ) : installmentPayments.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">
                    No payments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {installmentPayments.map((payment, idx) => (
                      <div
                        key={payment.id}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                          <span className="ml-2 text-gray-500">
                            {new Date(payment.payment_date).toLocaleDateString("en-GB")}
                          </span>
                          {payment.recorder?.full_name && (
                            <span className="ml-2 text-gray-400">· {payment.recorder.full_name}</span>
                          )}
                          {payment.notes && (
                            <span className="ml-2 text-gray-400 italic">· {payment.notes}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {payment.payment_method}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      {showRecordPayment && sale?.id && (
        <RecordPaymentModal
          saleId={sale.id}
          remainingBalance={remainingBalance}
          onClose={() => setShowRecordPayment(false)}
          onSuccess={handlePaymentRecorded}
          saleSummary={{
            transactionId: sale.transaction_id,
            customerName: sale.end_user_name,
            totalAmount: saleAmount,
            amountPaid: totalPaid,
            amountOwed: remainingBalance,
          }}
        />
      )}
    </>
  );
};

function getStatusBadge(sale: AdminSales | SuperAdminSale) {
  const isInstallment = sale.is_installment;
  const totalPaid = sale.total_paid ?? 0;
  const owed = isInstallment ? (sale.amount || 0) - totalPaid : 0;
  if (!isInstallment || owed <= 0)
    return <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Paid</Badge>;
  if (totalPaid > 0 && owed > 0)
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Unpaid</Badge>;
}

export default AdminSalesDetailModal;
