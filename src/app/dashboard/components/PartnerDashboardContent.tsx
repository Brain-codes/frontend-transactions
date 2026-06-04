"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContentBase from "./DashboardContent";
const DashboardContent = DashboardContentBase as any;
import PartnerDashboardTableSection from "./PartnerDashboardTableSection";
import SalesFormModal from "../../admin/components/sales/SalesFormModal";
import adminDashboardService from "../../services/adminDashboardService";
import { useAuth } from "../../contexts/AuthContext";

const CURRENT_YEAR = new Date().getFullYear();

const PartnerDashboardContent = () => {
  const { getOrganizationId } = useAuth() as any;
  const [year, setYear] = useState(CURRENT_YEAR);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchData = async (y: number, from: string | null, to: string | null) => {
    setLoading(true);
    try {
      const response = await adminDashboardService.getDashboardStats({
        year: (!from && !to) ? y : undefined,
        date_from: from || undefined,
        date_to: to || undefined,
      });
      if (response.success) setData(response.data);
      else console.error("Partner dashboard failed:", response.error);
    } catch (err) {
      console.error("Partner dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year, dateFrom, dateTo); }, [year, dateFrom, dateTo]);

  const handleCardClick = (cardKey: string) => {
    setActiveCard((prev) => (prev === cardKey ? null : cardKey));
  };

  const normalized = data ? {
    stovesReceived: data.totalStovesReceived ?? 0,
    stovesSold: data.totalStovesSold ?? 0,
    availableStoves: data.totalStovesAvailable ?? 0,
    expectedReceivable: data.totalExpectedAmount ?? 0,
    amountReceived: data.totalAmountPaid ?? 0,
    outstandingBalance: data.totalAmountOwed ?? 0,
    byState: data.byState ?? [],
    salesModelData: data.salesModelData ?? [],
  } : null;

  return (
    <DashboardLayout currentRoute="dashboard">
      <div className="flex-1 overflow-y-auto bg-white">
        <DashboardContent
          data={normalized}
          loading={loading}
          year={year}
          onYearChange={setYear}
          role="partner"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          activeCard={activeCard}
          onCardClick={handleCardClick}
        />

        {activeCard && (
          <div className="px-8 pb-8">
            <PartnerDashboardTableSection
              key={`${activeCard}-${year}-${dateFrom}-${dateTo}-${reloadKey}`}
              activeCard={activeCard}
              organizationId={getOrganizationId()}
              year={year}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onClose={() => setActiveCard(null)}
              onCreateSale={() => setShowCreateModal(true)}
              onDeleteSale={async (sale: any) => {
                if (window.confirm(`Delete sale for ${sale.end_user_name}?`)) {
                  const { default: adminSalesService } = await import("../../services/adminSalesService");
                  const result = await adminSalesService.deleteSale(sale.id);
                  if (result.success) setReloadKey((k) => k + 1);
                  else alert(result.error || "Failed to delete sale");
                }
              }}
            />
          </div>
        )}

        {showCreateModal && (
          <SalesFormModal
            open={true}
            onOpenChange={setShowCreateModal}
            mode="create"
            onSuccess={() => {
              setShowCreateModal(false);
              setReloadKey((k) => k + 1);
              fetchData(year, dateFrom, dateTo);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default PartnerDashboardContent;
