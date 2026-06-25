
import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContent from "./DashboardContent";
import { useAuth } from "../../contexts/AuthContext";
import superAdminAgentService from "../../services/superAdminAgentService";

const CURRENT_YEAR = new Date().getFullYear();

const PartnerAgentDashboardContent = () => {
  const { user } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = async (y: number) => {
    setLoading(true);
    try {
      // Reusing the agent dashboard stats endpoint
      const response = await superAdminAgentService.getDashboardStats({ year: y });
      if (response.success) setData(response.data);
      else console.error("Partner Agent dashboard failed:", response.error || response.message);
    } catch (err) {
      console.error("Partner Agent dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year); }, [year]);

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
          role="partner_agent"
          partners={[]}
        />
      </div>
    </DashboardLayout>
  );
};

export default PartnerAgentDashboardContent;
