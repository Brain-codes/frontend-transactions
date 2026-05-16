"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContent from "./DashboardContent";
import adminDashboardService from "../../services/adminDashboardService";

const CURRENT_YEAR = new Date().getFullYear();

const PartnerDashboardContent = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = async (y: number) => {
    setLoading(true);
    try {
      const response = await adminDashboardService.getDashboardStats({ year: y });
      if (response.success) setData(response.data);
      else console.error("Partner dashboard failed:", response.error);
    } catch (err) {
      console.error("Partner dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year); }, [year]);

  // Normalise get-dashboard-stats shape → shared component shape
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
        />
      </div>
    </DashboardLayout>
  );
};

export default PartnerDashboardContent;
