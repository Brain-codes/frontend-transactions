"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminPartnersContent from "./components/SuperAdminPartnersContent";
import AcslAgentPartnersContent from "./components/AcslAgentPartnersContent";

function PartnersRouter() {
  const { can } = usePermissions();
  if (can("manage-all-partners")) return <SuperAdminPartnersContent />;
  return <AcslAgentPartnersContent />;
}

export default function PartnersPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <PartnersRouter />
    </ProtectedRoute>
  );
}
