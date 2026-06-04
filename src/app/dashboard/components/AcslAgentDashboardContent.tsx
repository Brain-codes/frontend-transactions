"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContentBase from "./DashboardContent";
const DashboardContent = DashboardContentBase as any;
import PartnerDashboardTableSection from "./PartnerDashboardTableSection";
import SalesFormModal from "../../admin/components/sales/SalesFormModal";
import { useAuth } from "../../contexts/AuthContext";
import superAdminAgentService from "../../services/superAdminAgentService";

const CURRENT_YEAR = new Date().getFullYear();

const AcslAgentDashboardContent = () => {
  const { user, getOrganizationId } = useAuth() as any;
  const [year, setYear] = useState(CURRENT_YEAR);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [partners, setPartners] = useState<any>([]);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (user?.id) {
      superAdminAgentService.getAgentOrganizations(user.id)
        .then((r: any) => { if (r.success) setPartners(r.data || []); })
        .catch((err: any) => console.error("Error fetching agent partners:", err));
    }
  }, [user?.id]);

  const fetchData = async (y: number, from: string | null, to: string | null) => {
    setLoading(true);
    try {
      const response = await superAdminAgentService.getDashboardStats({
        year: (!from && !to) ? y : undefined,
        date_from: from || undefined,
        date_to: to || undefined,
      });
      if (response.success) setData(response.data);
      else console.error("Agent dashboard failed:", response.error || response.message);
    } catch (err) {
      console.error("Agent dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year, dateFrom, dateTo); }, [year, dateFrom, dateTo]);

  const handleCardClick = (cardKey: string) => {
    setActiveCard((prev) => (prev === cardKey ? null : cardKey));
  };

  const normalized = data ? {
    stovesReceived: data.stovesReceived ?? 0,
    stovesSold: data.stovesSold ?? 0,
    availableStoves: data.availableStoves ?? 0,
    expectedReceivable: data.expectedReceivable ?? 0,
    amountReceived: data.amountReceived ?? 0,
    outstandingBalance: data.outstandingBalance ?? 0,
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
          role="acsl_agent"
          partners={partners}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
          onPartnerSearch={() => {}}
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

export default AcslAgentDashboardContent;
