import { Suspense, useEffect } from "react";
import { useRouter } from "@/compat/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../contexts/useAuth";
import CreateSalesForm from "../../admin/components/sales/CreateSalesForm";


function CreateSaleView() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSuccess = () => {
    router.push("/sales");
  };

  const handleCancel = () => {
    router.push("/sales");
  };

  return (
    <DashboardLayout
      currentRoute="sales-create"
      title="Sell Stove"
      description="Record a new stove sale transaction"
    >
      <div className="px-6 pb-6 pt-2">
        <div className="bg-white p-6">
          <CreateSalesForm
            isModal={false}
            showSuccessState={true}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            cancelHref="/sales"
            userRole={user?.role}
            userId={user?.id}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SalesCreatePage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <CreateSaleView />
      </Suspense>
    </ProtectedRoute>
  );
}
