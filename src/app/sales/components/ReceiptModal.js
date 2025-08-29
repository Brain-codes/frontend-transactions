import { Modal } from "@/components/ui/modal";

const ReceiptModal = ({ isOpen, onClose, modalSale }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Download Receipt">
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Receipt for Transaction: {modalSale?.transaction_id || modalSale?.id}
      </h2>
      {modalSale?.receipt_url ? (
        <a
          href={modalSale.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
          download
        >
          Download Receipt
        </a>
      ) : (
        <div className="text-gray-600">No receipt available for this sale.</div>
      )}
    </div>
  </Modal>
);

export default ReceiptModal;
