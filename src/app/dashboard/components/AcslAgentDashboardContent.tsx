"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContent from "./DashboardContent";
import { useAuth } from "../../contexts/AuthContext";
import superAdminAgentService from "../../services/superAdminAgentService";

const CURRENT_YEAR = new Date().getFullYear();

const AcslAgentDashboardContent = () => {
  const { user } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [partners, setPartners] = useState<any>([]);

  useEffect(() => {
    if (user?.id) {
      superAdminAgentService.getAgentOrganizations(user.id)
        .then(r => { if (r.success) setPartners(r.data || []); })
        .catch(err => console.error("Error fetching agent partners:", err));
    }
  }, [user?.id]);

  const fetchData = async (y: number) => {
    setLoading(true);
    try {
      const response = await superAdminAgentService.getDashboardStats({ year: y });
      if (response.success) setData(response.data);
      else console.error("Agent dashboard failed:", response.error || response.message);
    } catch (err) {
      console.error("Agent dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year); }, [year]);

  // Agent endpoint returns the unified shape directly
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
          partners={partners as any}
          onFilterChange={() => {}}
          onClearFilters={() => {}}
          onPartnerSearch={() => {}}
        />
      </div>
    </DashboardLayout>
  );
};

export default AcslAgentDashboardContent;
