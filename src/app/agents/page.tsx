import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { usePermissions } from "../hooks/usePermissions";
import SuperAdminAgentsContent from "./components/SuperAdminAgentsContent";
import PartnersContent from "../partners/components/PartnersContent";
import StatesPerformanceContent from "./components/StatesPerformanceContent";
import { Users, Building2, MapPin, RefreshCw } from "lucide-react";

type TabKey = "agents" | "partners" | "states";

function PerformanceTabs() {
  const { can } = usePermissions();
  const showAgents = can("manage-acsl-agents") || can("manage-acsl-agents-scoped");

  const tabs = useMemo(() => {
    const list: { key: TabKey; label: string; icon: typeof Users }[] = [];
    if (showAgents) list.push({ key: "agents", label: "ACSL Agents Performance Report", icon: Users });
    list.push({ key: "partners", label: "Partners Performance Report", icon: Building2 });
    list.push({ key: "states", label: "States Performance Report", icon: MapPin });
    return list;
  }, [showAgents]);

  const [active, setActive] = useState<TabKey>(() => tabs[0]?.key ?? "agents");
  const [mounted, setMounted] = useState<Set<TabKey>>(() => new Set([tabs[0]?.key ?? "agents"]));
  const [stale, setStale] = useState<Set<TabKey>>(() => new Set());
  const [refreshingActive, setRefreshingActive] = useState(false);
  const refreshingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tabs.length && !tabs.find((t) => t.key === active)) {
      setActive(tabs[0].key);
    }
  }, [tabs, active]);

  const dispatchRefresh = useCallback((key: TabKey) => {
    window.dispatchEvent(new CustomEvent(`performance-report:refresh:${key}`));
    setRefreshingActive(true);
    if (refreshingTimer.current) clearTimeout(refreshingTimer.current);
    refreshingTimer.current = setTimeout(() => setRefreshingActive(false), 900);
  }, []);

  const activateTab = useCallback(
    (key: TabKey) => {
      setActive(key);
      setMounted((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      // If the tab was flagged stale by a background realtime event, refresh once.
      if (stale.has(key) && mounted.has(key)) {
        dispatchRefresh(key);
        setStale((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [stale, mounted, dispatchRefresh],
  );

  // Listen for background realtime "changed" events from each mounted tab.
  useEffect(() => {
    const keys: TabKey[] = ["agents", "partners", "states"];
    const listeners = keys.map((key) => {
      const fn = () => {
        if (key === active) {
          dispatchRefresh(key);
        } else {
          setStale((prev) => {
            if (prev.has(key)) return prev;
            const next = new Set(prev);
            next.add(key);
            return next;
          });
        }
      };
      const evt = `performance-report:changed:${key}`;
      window.addEventListener(evt, fn);
      return { evt, fn };
    });
    return () => listeners.forEach(({ evt, fn }) => window.removeEventListener(evt, fn));
  }, [active, dispatchRefresh]);

  return (
    <div className="space-y-2">
      <div className="px-6 pt-6">
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Performance Report"
            className="flex flex-1 items-center gap-1 rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-sm"
          >
            {tabs.map((t) => {
              const isActive = active === t.key;
              const isStale = stale.has(t.key);
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => activateTab(t.key)}
                  className={[
                    "relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#4a5d0f] text-white shadow-[0_2px_8px_rgba(74,93,15,0.35)]"
                      : "text-[#4a5d0f] hover:bg-[#eef3c4]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                  {isStale && !isActive && (
                    <span
                      title="New updates available"
                      className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => dispatchRefresh(active)}
            title="Refresh current tab"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#4a5d0f] shadow-sm transition hover:bg-[#eef3c4]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingActive ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div role="tabpanel">
        {mounted.has("agents") && showAgents && (
          <div hidden={active !== "agents"}>
            <SuperAdminAgentsContent />
          </div>
        )}
        {mounted.has("partners") && (
          <div hidden={active !== "partners"}>
            <PartnersContent />
          </div>
        )}
        {mounted.has("states") && (
          <div hidden={active !== "states"}>
            <StatesPerformanceContent />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <ProtectedRoute requireAdminAccess routeKey="agents">
      <PerformanceTabs />
    </ProtectedRoute>
  );
}
