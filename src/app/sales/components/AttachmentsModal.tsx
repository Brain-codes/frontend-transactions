import { Modal } from "@/components/ui/modal";
import { Sale } from "@/types/sales";

type AttachmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalSale?: Sale | null;
};

const AttachmentsModal = ({
  open,
  onOpenChange,
  modalSale,
}: AttachmentModalProps) => (
  <Modal
    open={open}
    onOpenChange={onOpenChange}
    title={<span className="flex items-center gap-2">View Attachments</span>}
    description="Attachments related to this transaction."
    className="max-w-md"
  >
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Attachments for Transaction:{" "}
        {modalSale?.transaction_id || modalSale?.id}
      </h2>
      {modalSale?.stove_image?.url ||
      modalSale?.agreement_image?.url ||
      modalSale?.signature ? (
        <ul className="space-y-2">
          {modalSale?.stove_image?.url && (
            <li>
              <a
                href={modalSale.stove_image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
                download
              >
                Stove Image
              </a>
            </li>
          )}
          {modalSale?.agreement_image?.url && (
            <li>
              <a
                href={modalSale.agreement_image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
                download
              >
                Agreement Image
              </a>
            </li>
          )}
          {modalSale?.signature && (
            <li>
              <a
                href={modalSale.signature}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
                download
              >
                Signature
              </a>
            </li>
          )}
        </ul>
      ) : (
        <div className="text-gray-600">
          No attachments available for this sale.
        </div>
      )}
    </div>
  </Modal>
);

export default AttachmentsModal;
