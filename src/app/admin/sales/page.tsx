"use client";

import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import FinancialReportsView from "../components/financial-reports/FinancialReportsView";
import SalesFormModal from "../components/sales/SalesFormModal";
import adminSalesService from "../../services/adminSalesService";
import { AdminSales } from "@/types/adminSales";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AdminSalesPage = () => {
  const router = useRouter();
  const { isAgent, user } = useAuth() as any;

  // Agents only see their own sales; admins see all
  const loadSales = useMemo(
    () => () => adminSalesService.getFinancialReportSales({
      limit: 500,
      ...(isAgent && user?.id ? { createdBy: user.id } : {}),
    }),
    [isAgent, user?.id]
  );

  // Edit modal state
  const [editSale, setEditSale] = useState<AdminSales | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal state
  const [deleteSale, setDeleteSale] = useState<AdminSales | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reload trigger for FinancialReportsView
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  // Fetch full sale details before opening edit modal (list view lacks address/images)
  const handleEditSale = useCallback(async (sale: AdminSales) => {
    try {
      setEditLoading(true);
      const result = await (adminSalesService as any).getSale(sale.id);
      if (result.success && result.data) {
        setEditSale(result.data);
      } else {
        // Fallback to list data if fetch fails
        setEditSale(sale);
      }
    } catch {
      setEditSale(sale);
    } finally {
      setEditLoading(false);
    }
  }, []);

  const handleDeleteSale = (sale: AdminSales) => {
    setDeleteError("");
    setDeleteSale(sale);
  };

  const confirmDelete = async () => {
    if (!deleteSale) return;
    try {
      setDeleteLoading(true);
      setDeleteError("");
      const result = await (adminSalesService as any).deleteSale(deleteSale.id);
      if (result.success) {
        setDeleteSale(null);
        reload();
      } else {
        setDeleteError(result.error || "Failed to delete sale");
      }
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred");
    } finally {
      setDeleteLoading(false);
    }
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
            key={reloadKey}
            loadSales={loadSales}
            onEditSale={handleEditSale}
            onDeleteSale={handleDeleteSale}
          />
        </div>
      </DashboardLayout>

      {/* Edit loading overlay */}
      {editLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 flex items-center gap-4 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <span className="text-gray-700 font-medium">Loading sale details...</span>
          </div>
        </div>
      )}

      {/* Edit Sale Modal — only mount when editing to avoid API calls on page load */}
      {editSale && (
        <SalesFormModal
          open={true}
          onOpenChange={(open: boolean) => { if (!open) setEditSale(null); }}
          mode="edit"
          saleData={editSale as any}
          onSuccess={() => { setEditSale(null); reload(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteSale} onOpenChange={(open) => { if (!open) setDeleteSale(null); }}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this sale?
              {deleteSale?.end_user_name && (
                <> The sale for <span className="font-semibold">{deleteSale.end_user_name}</span> will be permanently removed.</>
              )}
            </p>
            {deleteSale?.transaction_id && (
              <p className="text-xs text-gray-400">Transaction ID: {deleteSale.transaction_id}</p>
            )}
            {deleteError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteSale(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                ) : (
                  "Delete Sale"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default AdminSalesPage;
