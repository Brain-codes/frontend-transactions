"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminAgentsContent from "./components/SuperAdminAgentsContent";
import PartnerAgentsContent from "./components/PartnerAgentsContent";

function AgentsRouter() {
  const { can } = usePermissions();
  if (can("manage-acsl-agents")) return <SuperAdminAgentsContent />;
  return <PartnerAgentsContent />;
}

export default function AgentsPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <AgentsRouter />
    </ProtectedRoute>
  );
}
