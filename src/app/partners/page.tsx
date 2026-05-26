"use client";

import { Suspense } from "react";
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
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <PartnersRouter />
      </Suspense>
    </ProtectedRoute>
  );
}
