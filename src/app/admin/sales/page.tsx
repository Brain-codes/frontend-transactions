"use client";

import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import FinancialReportsView from "../components/financial-reports/FinancialReportsView";
import adminSalesService from "../../services/adminSalesService";
import { AdminSales } from "@/types/adminSales";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const loadSales = () => adminSalesService.getFinancialReportSales({ limit: 500 });

const AdminSalesPage = () => {
  const router = useRouter();

  const handleEditSale = (sale: AdminSales) => {
    // TODO: open edit modal
    console.log("Edit sale", sale.id);
  };

  const handleDeleteSale = (sale: AdminSales) => {
    // TODO: open delete confirmation modal
    console.log("Delete sale", sale.id);
  };

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-sales"
        title="Manage Sales"
        rightButton={
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
            onClick={() => router.push("/admin/sales/create")}
          >
            <Plus className="h-4 w-4" />
            Create Sale
          </Button>
        }
      >
        <div className="pb-6">
          <FinancialReportsView
            loadSales={loadSales}
            onEditSale={handleEditSale}
            onDeleteSale={handleDeleteSale}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminSalesPage;
