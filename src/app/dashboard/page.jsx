
import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../contexts/AuthContext";
import SuperAdminDashboardContent from "./components/SuperAdminDashboardContent";
import AcslAgentDashboardContent from "./components/AcslAgentDashboardContent";
import PartnerDashboardContent from "./components/PartnerDashboardContent";
import PartnerAgentDashboardContent from "./components/PartnerAgentDashboardContent";

function DashboardRouter() {
  const { can } = usePermissions();
  const { isPartnerAgent } = useAuth();
  if (can("global-filters")) return <SuperAdminDashboardContent />;
  if (can("my-partners-filter")) return <AcslAgentDashboardContent />;
  if (isPartnerAgent) return <PartnerAgentDashboardContent />;
  return <PartnerDashboardContent />;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <DashboardRouter />
    </ProtectedRoute>
  );
}
