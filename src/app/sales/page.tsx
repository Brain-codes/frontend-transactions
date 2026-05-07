"use client";

import { Suspense } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminSalesContent from "./components/SuperAdminSalesContent";
import AcslAgentSalesContent from "./components/AcslAgentSalesContent";
import PartnerSalesContent from "./components/PartnerSalesContent";

function SalesRouter() {
  const { can } = usePermissions();

  if (can("global-filters")) return <SuperAdminSalesContent />;
  if (can("my-partners-filter")) return <AcslAgentSalesContent />;
  return <PartnerSalesContent />;
}

export default function SalesPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <SalesRouter />
      </Suspense>
    </ProtectedRoute>
  );
}
