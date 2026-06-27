import { useState, useMemo, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SuperAdminAgentsContent from "./components/SuperAdminAgentsContent";
import PartnerAgentsContent from "./components/PartnerAgentsContent";

type TabKey = "acsl" | "partner";

function AgentsRouter() {
  const { can } = usePermissions();
  const canAcsl = can("manage-acsl-agents") || can("manage-acsl-agents-scoped");
  const canPartner = can("manage-agents");

  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string }[] = [];
    if (canAcsl) tabs.push({ key: "acsl", label: "ACSL Agents" });
    if (canPartner) tabs.push({ key: "partner", label: "Partner Agents" });
    return tabs;
  }, [canAcsl, canPartner]);

  const [active, setActive] = useState<TabKey>(() => availableTabs[0]?.key ?? "acsl");

  useEffect(() => {
    if (availableTabs.length && !availableTabs.find((t) => t.key === active)) {
      setActive(availableTabs[0].key);
    }
  }, [availableTabs, active]);

  if (availableTabs.length === 0) return null;

  // Tabs hidden per product decision: default to ACSL Agents when available,
  // otherwise fall back to Partner Agents.
  if (canAcsl) return <SuperAdminAgentsContent />;
  return <PartnerAgentsContent />;
}

export default function AgentsPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <AgentsRouter />
    </ProtectedRoute>
  );
}
