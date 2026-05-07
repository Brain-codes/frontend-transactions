"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminDashboardContent from "./components/SuperAdminDashboardContent";
import AcslAgentDashboardContent from "./components/AcslAgentDashboardContent";
import PartnerDashboardContent from "./components/PartnerDashboardContent";

function DashboardRouter() {
  const { can } = usePermissions();
  if (can("global-filters")) return <SuperAdminDashboardContent />;
  if (can("my-partners-filter")) return <AcslAgentDashboardContent />;
  return <PartnerDashboardContent />;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <DashboardRouter />
    </ProtectedRoute>
  );
}
