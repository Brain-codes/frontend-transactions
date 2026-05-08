"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContent from "./DashboardContent";
import superAdminDashboardService from "../../services/superAdminDashboardService";

const CURRENT_YEAR = new Date().getFullYear();

const SuperAdminDashboardContent = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async (y) => {
    setLoading(true);
    try {
      const response = await superAdminDashboardService.getDashboardStats({ year: y });
      if (response.success) setData(response.data);
      else console.error("Super admin dashboard failed:", response.error);
    } catch (err) {
      console.error("Super admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year); }, [year]);

  // Normalise edge function shape → shared component shape
  const normalized = data ? {
    stovesReceived: data.stovesReceivedByPartners ?? 0,
    stovesSold: data.stovesSoldToEndUsers ?? 0,
    availableStoves: data.availableStoves ?? 0,
    expectedReceivable: data.expectedReceivable ?? 0,
    amountReceived: data.amountReceived ?? 0,
    outstandingBalance: data.outstandingBalance ?? 0,
    byState: (data.salesByState ?? []).map((s) => ({ state: s.state, count: s.sales ?? s.count ?? 0 })),
    salesModelData: data.salesModelData ?? [],
    topPartners: data.topPartners ?? [],
  } : null;

  return (
    <DashboardLayout currentRoute="dashboard">
      <div className="flex-1 overflow-y-auto bg-white">
        <DashboardContent
          data={normalized}
          loading={loading}
          year={year}
          onYearChange={setYear}
          role="super_admin"
        />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboardContent;
