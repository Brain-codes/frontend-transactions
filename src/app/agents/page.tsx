"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminAgentsContent from "./components/SuperAdminAgentsContent";
import PartnerAgentsContent from "./components/PartnerAgentsContent";

function AgentsRouter() {
  const { can } = usePermissions();
  // manage-acsl-agents = super admin (sees all); manage-acsl-agents-scoped = manager (sees only their agents)
  if (can("manage-acsl-agents") || can("manage-acsl-agents-scoped")) return <SuperAdminAgentsContent />;
  return <PartnerAgentsContent />;
}

export default function AgentsPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <AgentsRouter />
    </ProtectedRoute>
  );
}
