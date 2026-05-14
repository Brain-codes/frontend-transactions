"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import FinancialReportsView from "../../admin/components/financial-reports/FinancialReportsView";
import SalesFormModal from "../../admin/components/sales/SalesFormModal";
import adminSalesService from "../../services/adminSalesService";
import salesAdvancedService from "../../services/salesAdvancedAPIService";
import superAdminAgentService from "../../services/superAdminAgentService";
import { AdminSales } from "@/types/adminSales";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart, Download, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ApproveSaleConfirmModal from "@/app/admin/components/sales/ApproveSaleConfirmModal";
// import ApproveSaleConfirmModal from "../../admin/components/sales/ApproveSaleConfirmModal";

export default function UnifiedSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userRole } = useAuth() as any;
  const { can } = usePermissions();

  const isSuperAdmin = userRole === "super_admin";
  const isAcslAgent = userRole === "acsl_agent" || userRole === "super_admin_agent";
  const isPartner = userRole === "partner" || userRole === "admin";
  const isAgent = userRole === "partner_agent" || userRole === "agent";

  const viewFrom = isSuperAdmin ? "superAdmin" : (isAcslAgent ? "acsl_agent" : (isPartner ? "admin" : "agent"));

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const CURRENT_YEAR = new Date().getFullYear();
  const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const exportFnRef = useRef<(() => void) | null>(null);
  const [exporting, setExporting] = useState(false);

  const [editSale, setEditSale] = useState<AdminSales | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [approveSale, setApproveSale] = useState<AdminSales | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auto-open create modal if ?create=true is in URL
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateModal(true);
      // Clean up URL
      router.replace("/sales");
    }
  }, [searchParams, router]);

  const loadSales = useCallback(async () => {
    if (isSuperAdmin) {
      return salesAdvancedService.getSalesData(
        { limit: 1000, responseFormat: "format2" },
        "POST",
        "SuperAdminManageSales"
      );
    }
    
    if (isAcslAgent) {
      return salesAdvancedService.getSalesData(
        { limit: 1000, responseFormat: "format2" },
        "POST",
        "AgentManageSales"
      );
    }

    // Default for partner/agent
    return adminSalesService.getFinancialReportSales({
      limit: 1000,
      ...(isAgent && user?.id ? { createdBy: user.id } : {}),
    });
  }, [isSuperAdmin, isAcslAgent, isAgent, user?.id]);

  const handleEditSale = useCallback(async (sale: AdminSales) => {
    try {
      setEditLoading(true);
      const result = await (adminSalesService as any).getSale(sale.id);
      if (result.success && result.data) {
        setEditSale(result.data);
      } else {
        setEditSale(sale);
      }
    } catch {
      setEditSale(sale);
    } finally {
      setEditLoading(false);
    }
  }, []);

  const handleDeleteSale = useCallback(async (sale: AdminSales) => {
    if (window.confirm(`Are you sure you want to delete the sale for ${sale.end_user_name}?`)) {
      try {
        const result = await adminSalesService.deleteSale(sale.id);
        if (result.success) {
          reload();
        } else {
          alert(result.error || "Failed to delete sale");
        }
      } catch (err: any) {
        alert(err.message || "An error occurred");
      }
    }
  }, []);

  return (
    <DashboardLayout currentRoute="sales" title="Sales">
      <div className="p-6 space-y-6">
        <PageHeader
          icon={ShoppingCart}
          title="Sales"
          right={
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <>
                  <span className="text-sm font-medium text-gray-700">Year:</span>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[110px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {(isSuperAdmin || isPartner) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex items-center gap-1.5"
                  disabled={exporting}
                  onClick={() => {
                    if (exportFnRef.current) {
                      setExporting(true);
                      Promise.resolve(exportFnRef.current()).finally(() => setExporting(false));
                    }
                  }}
                >
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Export
                </Button>
              )}
              {can("create-sale") && (
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create Sale
                </Button>
              )}
            </div>
          }
        />

        <FinancialReportsView
          key={reloadKey}
          loadSales={loadSales}
          onEditSale={handleEditSale}
          onDeleteSale={handleDeleteSale}
          onApproveSale={isAcslAgent ? setApproveSale : undefined}
          viewFrom={viewFrom as any}
          selectedYear={isSuperAdmin ? selectedYear : undefined}
          onYearChange={isSuperAdmin ? setSelectedYear : undefined}
          availableYears={isSuperAdmin ? YEARS : undefined}
          onExportReady={(fn) => { exportFnRef.current = fn; }}
        />
      </div>

      {editLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 flex items-center gap-4 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <span className="text-gray-700 font-medium">Loading sale details...</span>
          </div>
        </div>
      )}

      {editSale && (
        <SalesFormModal
          open={true}
          onOpenChange={(open: boolean) => { if (!open) setEditSale(null); }}
          mode="edit"
          saleData={editSale as any}
          onSuccess={() => { setEditSale(null); reload(); }}
        />
      )}

      {showCreateModal && (
        <SalesFormModal
          open={true}
          onOpenChange={setShowCreateModal}
          mode="create"
          onSuccess={() => { setShowCreateModal(false); reload(); }}
        />
      )}

      <ApproveSaleConfirmModal
        open={!!approveSale}
        onClose={() => setApproveSale(null)}
        saleId={approveSale?.id || ""}
        customerName={approveSale?.end_user_name || ""}
        onApproved={() => { setApproveSale(null); reload(); }}
      />
    </DashboardLayout>
  );
}
