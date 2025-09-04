import Modal from "@/components/ui/modal";
import { AdminSales } from "@/types/adminSales";
import type { SuperAdminSale } from "@/types/superAdminSales";

interface AdminSalesDetailModalProps {
  open: boolean;
  onClose: () => void;
  sale?: AdminSales | null | undefined;
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
}) => {
  if (!sale) return null;
  return (
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
              value={sale.amount ? `₦${sale.amount.toLocaleString()}` : "N/A"}
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
          </Section>
          <Section title="Product">
            <InfoRow label="Stove Serial No" value={sale.stove_serial_no} />
            <InfoRow label="Partner Name" value={sale.partner_name} />
          </Section>
          <Section title="Images & Attachments">
            <InfoRow
              label="Stove Image"
              value={
                sale.stove_image_id?.url ? (
                  <a
                    href={sale.stove_image_id.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View
                  </a>
                ) : (
                  "N/A"
                )
              }
            />
            <InfoRow
              label="Agreement Image"
              value={
                sale.agreement_image_id?.url ? (
                  <a
                    href={sale.agreement_image_id.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View
                  </a>
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
              value={sale.address?.full_address || sale.address?.street}
            />
            <InfoRow label="City" value={sale.address?.city} />
            <InfoRow label="Country" value={sale.address?.country} />
            <InfoRow label="Latitude" value={sale.address?.latitude} />
            <InfoRow label="Longitude" value={sale.address?.longitude} />
          </Section>
        </div>
        {/* <Section title="Organization">
          <InfoRow label="Organization Name" value={sale.organizations?.name} />
          <InfoRow label="Organization ID" value={sale.organization_id} />
        </Section>
        <Section title="Meta">
          <InfoRow
            label="Created By"
            value={sale.created_by || sale.creator?.full_name}
          />
        </Section> */}
      </div>
    </Modal>
  );
};

export default AdminSalesDetailModal;
