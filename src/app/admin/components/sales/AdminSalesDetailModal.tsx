import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  Clock,
  Plus,
  Loader2,
  Layers,
} from "lucide-react";
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

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between py-1 text-sm">
    <span className="font-medium text-primary-700">{label}</span>
    <span className="text-gray-900 text-right break-all">{value ?? "N/A"}</span>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-primary-600 border-b border-primary-100 pb-1">
      {title}
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

const AdminSalesDetailModal: React.FC<AdminSalesDetailModalProps> = ({
  open,
  onClose,
  sale,
  viewFrom,
  onSaleUpdated,
}) => {
  const [installmentPayments, setInstallmentPayments] = useState<
    InstallmentPayment[]
  >([]);
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
    if (open && isInstallment) {
      fetchInstallmentPayments();
    }
  }, [open, isInstallment, fetchInstallmentPayments]);

  const formatCurrency = (amount: number) =>
    `₦${Number(amount).toLocaleString("en-NG")}`;

  const handlePaymentRecorded = () => {
    setShowRecordPayment(false);
    fetchInstallmentPayments();
    onSaleUpdated?.();
  };

  if (!sale) return null;

  const totalPaid = paymentSummary?.total_paid ?? (sale.total_paid || 0);
  const saleAmount = sale.amount || 0;
  const remainingBalance =
    paymentSummary?.remaining_balance ?? saleAmount - totalPaid;
  const progressPercent =
    paymentSummary?.progress_percent ??
    (saleAmount > 0 ? (totalPaid / saleAmount) * 100 : 0);
  const isFullyPaid = sale.payment_status === "fully_paid";

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(v: any) => !v && onClose()}
        title="Sale Details"
        className="max-w-3xl max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-full flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            <Section title="Basic Info">
              <InfoRow label="Transaction ID" value={sale.transaction_id} />
              <InfoRow label="Status" value={sale.status} />
              <InfoRow
                label="Amount"
                value={
                  sale.amount ? `₦${sale.amount.toLocaleString()}` : "N/A"
                }
              />
              <InfoRow
                label="Sale Date"
                value={
                  sale.sales_date
                    ? new Date(sale.sales_date).toLocaleDateString()
                    : "N/A"
                }
              />
              <InfoRow
                label="Created At"
                value={
                  sale.created_at
                    ? new Date(sale.created_at).toLocaleDateString()
                    : "N/A"
                }
              />
              {isInstallment && (
                <InfoRow
                  label="Payment Type"
                  value={
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                      Installment
                    </Badge>
                  }
                />
              )}
            </Section>
            <Section title="Product">
              <InfoRow label="Stove Serial No" value={sale.stove_serial_no} />
              <InfoRow label="Partner Name" value={sale.partner_name} />
            </Section>
            <Section title="Images & Attachments">
              <InfoRow
                label="Stove Image"
                value={
                  viewFrom === "superAdmin" ? (
                    (sale as SuperAdminSale).stove_image?.url ? (
                      <a
                        href={(sale as SuperAdminSale).stove_image!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )
                  ) : viewFrom === "admin" ? (
                    (sale as AdminSales).stove_image_id?.url ? (
                      <a
                        href={(sale as AdminSales).stove_image_id.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )
                  ) : (
                    "N/A"
                  )
                }
              />
              <InfoRow
                label="Agreement Image"
                value={
                  viewFrom === "superAdmin" ? (
                    (sale as SuperAdminSale).agreement_image?.url ? (
                      <a
                        href={(sale as SuperAdminSale).agreement_image!.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )
                  ) : viewFrom === "admin" ? (
                    (sale as AdminSales).agreement_image_id?.url ? (
                      <a
                        href={(sale as AdminSales).agreement_image_id.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )
                  ) : (
                    "N/A"
                  )
                }
              />
              <InfoRow
                label="Signature"
                value={
                  sale.signature ? (
                    <span className="text-primary">Available</span>
                  ) : (
                    "N/A"
                  )
                }
              />
            </Section>
          </div>
          {/* Right column */}
          <div className="flex-1 min-w-0">
            <Section title="Customer">
              <InfoRow label="End User Name" value={sale.end_user_name} />
              <InfoRow label="AKA" value={sale.aka} />
              <InfoRow label="Phone" value={sale.phone} />
              <InfoRow label="Other Phone" value={sale.other_phone} />
              <InfoRow label="Contact Person" value={sale.contact_person} />
              <InfoRow label="Contact Phone" value={sale.contact_phone} />
            </Section>
            <Section title="Location">
              <InfoRow label="State" value={sale.state_backup} />
              <InfoRow label="LGA" value={sale.lga_backup} />
              <InfoRow
                label="Address"
                value={
                  viewFrom === "superAdmin"
                    ? (sale as SuperAdminSale).addresses?.full_address ||
                      (sale as SuperAdminSale).addresses?.street
                    : (sale as AdminSales).address?.full_address ||
                      (sale as AdminSales).address?.street
                }
              />
              <InfoRow
                label="City"
                value={
                  viewFrom === "superAdmin"
                    ? (sale as SuperAdminSale).addresses?.city
                    : (sale as AdminSales).address?.city
                }
              />
              <InfoRow
                label="Country"
                value={
                  viewFrom === "superAdmin"
                    ? (sale as SuperAdminSale).addresses?.country
                    : (sale as AdminSales).address?.country
                }
              />
              <InfoRow
                label="Latitude"
                value={
                  viewFrom === "superAdmin"
                    ? (sale as SuperAdminSale).addresses?.latitude
                    : (sale as AdminSales).address?.latitude
                }
              />
              <InfoRow
                label="Longitude"
                value={
                  viewFrom === "superAdmin"
                    ? (sale as SuperAdminSale).addresses?.longitude
                    : (sale as AdminSales).address?.longitude
                }
              />
            </Section>
          </div>
        </div>

        {/* Installment Payments Section */}
        {isInstallment && (
          <div className="mt-6 border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand" />
                <span className="text-xs font-bold uppercase tracking-wide text-primary-600">
                  Installment Payments
                </span>
              </div>
              {!isFullyPaid && (
                <Button
                  size="sm"
                  onClick={() => setShowRecordPayment(true)}
                  className="bg-brand hover:bg-brand/90 text-white text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Record Payment
                </Button>
              )}
            </div>

            {/* Payment Model Info */}
            {sale.payment_model && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-brand mb-1">
                  <Layers className="h-3.5 w-3.5" />
                  {sale.payment_model.name}
                </div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(sale.payment_model.fixed_price)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {sale.payment_model.duration_months} months
                  </span>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {formatCurrency(totalPaid)} paid
                </span>
                <span className="text-gray-600">
                  {formatCurrency(remainingBalance)} remaining
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFullyPaid ? "bg-green-500" : "bg-brand"
                  }`}
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                  }}
                />
              </div>
              <div className="text-right">
                {isFullyPaid ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    Payment Complete
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-500">
                    {progressPercent.toFixed(0)}% complete
                  </span>
                )}
              </div>
            </div>

            {/* Payments List */}
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span className="ml-2 text-xs text-gray-600">
                  Loading payments...
                </span>
              </div>
            ) : installmentPayments.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {installmentPayments.map((payment, idx) => (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {payment.payment_method}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(payment.payment_date).toLocaleDateString()}
                        {payment.recorder?.full_name &&
                          ` · ${payment.recorder.full_name}`}
                        {payment.notes && ` · ${payment.notes}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      {showRecordPayment && sale?.id && (
        <RecordPaymentModal
          saleId={sale.id}
          remainingBalance={remainingBalance}
          onClose={() => setShowRecordPayment(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}
    </>
  );
};

export default AdminSalesDetailModal;
