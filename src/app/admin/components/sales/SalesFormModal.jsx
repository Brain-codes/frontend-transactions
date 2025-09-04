"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import CreateSalesForm from "./CreateSalesForm";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SalesFormModal = ({
  open,
  onOpenChange,
  onSuccess,
  mode = "create", // "create" or "edit"
  saleData = null, // existing sale data for edit mode
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [processedSale, setProcessedSale] = useState(null);

  // Reset success state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setShowSuccess(false);
      setProcessedSale(null);
    }
  }, [open]);

  const handleSuccess = (resultData) => {
    setProcessedSale(resultData);
    setShowSuccess(true);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setProcessedSale(null);
    onOpenChange(false);
    if (onSuccess && processedSale) {
      onSuccess(processedSale);
    }
  };

  const handleViewSales = () => {
    handleClose();
  };

  const isEditMode = mode === "edit";
  const modalTitle = isEditMode ? "Edit Sale" : "Create New Sale";
  const modalDescription = isEditMode
    ? "Update the sale transaction details"
    : "Record a new stove sale transaction";
  const successTitle = isEditMode
    ? "Sale Updated Successfully!"
    : "Sale Created Successfully!";
  const successMessage = isEditMode
    ? "The sale has been updated and changes are saved."
    : "The sale has been recorded and will be processed.";

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title={showSuccess ? successTitle : modalTitle}
      description={showSuccess ? successMessage : modalDescription}
      className="max-h-[90vh] max-w-4xl w-[95vw] overflow-hidden overflow-y-auto"
    >
      {showSuccess ? (
        <div className="text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <div className="flex justify-center gap-4">
            <Button onClick={handleViewSales}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="h-full w-full ">
          <div className="h-full w-full ">
            <CreateSalesForm
              isModal={true}
              showSuccessState={false}
              mode={mode}
              initialData={saleData}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SalesFormModal;
