"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";
import ProtectedRoute from "../../../components/ProtectedRoute";
import CreateSalesForm from "../../components/sales/CreateSalesForm";

const CreateSalePage = () => {
  const router = useRouter();

  const handleSuccess = (saleData) => {
    // Sale was created successfully, navigation will be handled by the form
    console.log("Sale created:", saleData);
  };

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-create-sale"
        title="Create New Sale"
        description="Record a new stove sale transaction"
        // rightButton={
        //   <Button variant="outline" onClick={() => router.push("/admin/sales")}>
        //     <ArrowLeft className="h-4 w-4 mr-2" />
        //     Back to Sales
        //   </Button>
        // }
      >
        <CreateSalesForm
          isModal={false}
          showSuccessState={true}
          onSuccess={handleSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CreateSalePage;
