import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { useRealtimeRefresh, useRefreshListener } from "../hooks/useRealtimeRefresh";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  Building2,
  Package,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Phone,
  X,
} from "lucide-react";
import { downloadCSV } from "@/utils/csvExportUtils";
import tokenManager from "@/utils/tokenManager";

const ACSL_AGENT_ROLES = new Set(["acsl_agent", "acsl_agent_manager"]);
const ACSL_ASSIGNMENT_TABLES = [
  "super_admin_agent_organizations",
  "acsl_agent_organizations",
];
const ACSL_AGENT_ID_COLUMNS = ["agent_id", "super_admin_agent_id", "user_id"];
const REALTIME_STATE_TABLES = [
  "organizations",
  "profiles",
  ...ACSL_ASSIGNMENT_TABLES,
  "sales",
  "stove_ids",
];

const PROFILE_ROLES_FOR_STATES = [
  "partner",
  "admin",
  "partner_agent",
  "agent",
  "acsl_agent",
  "acsl_agent_manager",
];

const AGENT_ROLE_LABELS: Record<string, string> = {
  acsl_agent: "ACSL Agent",
  acsl_agent_manager: "ACSL Manager",
  partner: "Partner",
  partner_agent: "Partner Agent",
  agent: "Agent",
  admin: "Admin",
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  organization_id: string | null;
  phone: string | null;
};

async function fetchProfilesViaManageUsers(): Promise<ProfileLite[] | null> {
  try {
    const { supabaseFunctionsUrl } = await import("@/lib/supabaseConfig");
    const token = await tokenManager.getValidToken();
    if (!token) return null;

    const fetchRole = async (role: string): Promise<any[]> => {
      const rows: any[] = [];
      let nextPage = 1;
      let totalPages = 1;
      do {
        const qs = new URLSearchParams({
          page: String(nextPage),
          limit: "100",
          sortBy: "created_at",
          sortOrder: "desc",
          role,
        });
        const res = await fetch(`${supabaseFunctionsUrl}/manage-users?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return rows;
        const json = await res.json();
        if (!res.ok) return rows;
        rows.push(...(json.data || []));
        totalPages = json.pagination?.totalPages ?? 1;
        nextPage += 1;
      } while (nextPage <= totalPages);
      return rows;
    };

    const all = (await Promise.all(PROFILE_ROLES_FOR_STATES.map(fetchRole))).flat();
    const byId = new Map<string, ProfileLite>();
    all.forEach((u: any) => {
      if (!u?.id || byId.has(u.id)) return;
      byId.set(u.id, {
        id: u.id,
        full_name: u.full_name ?? u.name ?? null,
        email: u.email ?? null,
        role: u.role,
        organization_id: u.organization_id ?? null,
        phone: u.phone ?? null,
      });
    });
    return Array.from(byId.values());
  } catch {
    return null;
  }
}

async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function pickAgentId(row: any, columns: string[]) {
  for (const col of columns) {
    if (row?.[col]) return String(row[col]);
  }
  return null;
}

type SortKey =
  | "state"
  | "partners"
  | "agents"
  | "stoves"
  | "sold"
  | "notSold"
  | "sellThrough";

interface PartnerDetail {
  id: string;
  name: string;
  phone: string;
  totalStoves: number;
  stovesSold: number;
  stovesAvailable: number;
}

interface AgentDetail {
  id: string;
  name: string;
  role: string;
  statesCovered: string[];
  stovesRecorded: number;
}

interface StoveDetail {
  stove_id: string;
  partner_name: string;
  status: "sold" | "available";
}

interface StateRow {
  state: string;
  partners: number;
  partnerAgents: number;
  acslAgents: number;
  agents: number;
  stoves: number;
  sold: number;
  notSold: number;
  sellThrough: number;
  partnerDetails: PartnerDetail[];
  agentDetails: AgentDetail[];
  stoveDetails: StoveDetail[];
}

const PAGE_SIZES = [10, 25, 50];

export default function StatesPerformanceContent() {
  const { supabase } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StateRow[]>([]);
  // Set of states that appear in at least one ACSL agent's partner-derived
  // assignments — same rule as Agents Performance's "States Assigned" badge.
  const [agentCoveredStates, setAgentCoveredStates] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Partner detail modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(10);

  // Agent detail modal state
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentModalState, setAgentModalState] = useState<string | null>(null);
  const [agentModalSearch, setAgentModalSearch] = useState("");
  const [agentModalPage, setAgentModalPage] = useState(1);
  const [agentModalPageSize, setAgentModalPageSize] = useState(10);

  // Stove detail modal state
  const [stoveModalOpen, setStoveModalOpen] = useState(false);
  const [stoveModalState, setStoveModalState] = useState<string | null>(null);
  const [stoveModalSearch, setStoveModalSearch] = useState("");
  const [stoveModalStatus, setStoveModalStatus] = useState<"all" | "sold" | "available">("all");
  const [stoveModalPage, setStoveModalPage] = useState(1);
  const [stoveModalPageSize, setStoveModalPageSize] = useState(25);
  const [reloadKey, setReloadKey] = useState(0);

  useRealtimeRefresh("states", REALTIME_STATE_TABLES);
  useRefreshListener("states", () => setReloadKey((k) => k + 1));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch organizations (id, state, name, phone)
        const { data: orgs, error: oErr } = await supabase
          .from("organizations")
          .select("id,state,partner_name,contact_phone,alternative_phone");
        if (oErr) throw oErr;

        // Partner-side + ACSL profiles — prefer manage-users (service role, bypasses RLS)
        // so the roster and names match the Agents Performance report.
        let profiles: ProfileLite[] | null = await fetchProfilesViaManageUsers();
        if (!profiles) {
          const { data: fallback, error: pErr } = await supabase
            .from("profiles")
            .select("id,full_name,email,role,organization_id,phone")
            .in("role", PROFILE_ROLES_FOR_STATES);
          if (pErr) throw pErr;
          profiles = (fallback || []) as ProfileLite[];
        }

        // Stoves (paginated)
        const stoves: {
          stove_id: string | null;
          organization_id: string | null;
          status: string | null;
          sale_id: string | null;
        }[] = [];
        const PAGE_FETCH = 1000;
        const HARD_CAP = 100000;
        let from = 0;
        while (from < HARD_CAP) {
          const { data, error: sErr } = await supabase
            .from("stove_ids")
            .select("stove_id,organization_id,status,sale_id")
            .eq("is_archived", false)
            .range(from, from + PAGE_FETCH - 1);
          if (sErr) throw sErr;
          const chunk = data || [];
          stoves.push(...chunk);
          if (chunk.length < PAGE_FETCH) break;
          from += PAGE_FETCH;
        }

        // Sales (for stoves-recorded-by-agent per state)
        const sales: { created_by: string | null; organization_id: string | null }[] = [];
        let sfrom = 0;
        while (sfrom < HARD_CAP) {
          const { data, error: sErr2 } = await supabase
            .from("sales")
            .select("created_by,organization_id")
            .range(sfrom, sfrom + PAGE_FETCH - 1);
          if (sErr2) throw sErr2;
          const chunk = data || [];
          sales.push(...chunk);
          if (chunk.length < PAGE_FETCH) break;
          sfrom += PAGE_FETCH;
        }

        // Build org -> state map
        const orgState = new Map<string, string>();
        (orgs || []).forEach((o: any) => {
          if (o?.id) orgState.set(o.id, (o.state || "").trim() || "Unknown");
        });

        // Profile lookup
        const profileById = new Map<string, any>();
        (profiles || []).forEach((p: any) => profileById.set(p.id, p));

        // ACSL agent -> states covered, using the same partner-derived rule as
        // the Agents Performance "States Assigned" badge: assigned states are
        // the union of states from the agent's assigned partner organizations.
        const acslStatesByAgent = new Map<string, Set<string>>();
        const getExistingAgentCols = async (table: string) => {
          const found: string[] = [];
          for (const col of ACSL_AGENT_ID_COLUMNS) {
            const { error } = await supabase
              .from(table)
              .select(col, { count: "exact", head: true })
              .limit(1);
            if (!error) found.push(col);
          }
          return found;
        };
        await Promise.all(
          ACSL_ASSIGNMENT_TABLES.map(async (table) => {
            const cols = await getExistingAgentCols(table);
            if (cols.length === 0) return;
            const data = await fetchAllRows<any>((from, to) =>
              supabase
                .from(table)
                .select(`organization_id,${cols.join(",")}`)
                .range(from, to),
            );
            data.forEach((r: any) => {
              const agentId = pickAgentId(r, cols);
              if (!agentId) return;
              const profile = profileById.get(agentId);
              if (!profile || !ACSL_AGENT_ROLES.has(profile.role)) return;

              const st = r.organization_id ? orgState.get(r.organization_id) : null;
              if (!st || st === "Unknown") return;

              let set = acslStatesByAgent.get(agentId);
              if (!set) {
                set = new Set();
                acslStatesByAgent.set(agentId, set);
              }
              set.add(st);
            });
          }),
        );
        const covered = new Set<string>();
        acslStatesByAgent.forEach((stateSet) => {
          stateSet.forEach((state) => covered.add(state));
        });
        if (!cancelled) setAgentCoveredStates(covered);


        // Aggregate per state
        const map = new Map<string, StateRow>();
        const ensure = (state: string): StateRow => {
          let r = map.get(state);
          if (!r) {
            r = {
              state,
              partners: 0,
              partnerAgents: 0,
              acslAgents: 0,
              agents: 0,
              stoves: 0,
              sold: 0,
              notSold: 0,
              sellThrough: 0,
              partnerDetails: [],
              agentDetails: [],
              stoveDetails: [],
            };
            map.set(state, r);
          }
          return r;
        };

        // Partner stove counts per organization
        const partnerStoveCounts = new Map<
          string,
          { total: number; sold: number; available: number }
        >();
        const ensurePartnerCounts = (orgId: string) => {
          let c = partnerStoveCounts.get(orgId);
          if (!c) {
            c = { total: 0, sold: 0, available: 0 };
            partnerStoveCounts.set(orgId, c);
          }
          return c;
        };

        // Partners
        (orgs || []).forEach((o: any) => {
          const state = (o.state || "").trim();
          if (!state) return;
          ensure(state).partners += 1;
        });

        // Partner-side agents (via profile's organization_id -> state)
        const partnerAgentRoles = new Set(["partner", "admin", "partner_agent", "agent"]);
        (profiles || []).forEach((p: any) => {
          if (!partnerAgentRoles.has(p.role)) return;
          const state = p.organization_id ? orgState.get(p.organization_id) : null;
          if (!state || state === "Unknown") return;
          ensure(state).partnerAgents += 1;
        });

        // ACSL agents (dedupe by agent per partner-derived state)
        acslStatesByAgent.forEach((stateSet) => {
          stateSet.forEach((state) => {
            ensure(state).acslAgents += 1;
          });
        });

        // Stoves
        const orgPartnerName = new Map<string, string>();
        (orgs || []).forEach((o: any) => {
          if (o?.id) orgPartnerName.set(o.id, o.partner_name || "—");
        });
        stoves.forEach((s) => {
          const state = s.organization_id ? orgState.get(s.organization_id) : null;
          if (!state || state === "Unknown") return;
          const row = ensure(state);
          row.stoves += 1;
          const isSold = s.status === "sold" || !!s.sale_id;
          if (isSold) row.sold += 1;
          if (s.organization_id) {
            const c = ensurePartnerCounts(s.organization_id);
            c.total += 1;
            if (isSold) c.sold += 1;
            else c.available += 1;
          }
          row.stoveDetails.push({
            stove_id: s.stove_id || "—",
            partner_name: s.organization_id ? (orgPartnerName.get(s.organization_id) || "—") : "—",
            status: isSold ? "sold" : "available",
          });
        });

        // Build partner details per state
        const partnerDetailsByState = new Map<string, PartnerDetail[]>();
        (orgs || []).forEach((o: any) => {
          const state = (o.state || "").trim();
          if (!state) return;
          const counts = partnerStoveCounts.get(o.id) || { total: 0, sold: 0, available: 0 };
          const phone = o.contact_phone || o.alternative_phone || "—";
          const detail: PartnerDetail = {
            id: o.id,
            name: o.partner_name || "—",
            phone,
            totalStoves: counts.total,
            stovesSold: counts.sold,
            stovesAvailable: counts.available,
          };
          const list = partnerDetailsByState.get(state) || [];
          list.push(detail);
          partnerDetailsByState.set(state, list);
        });

        // Agent -> per-state stoves recorded (from sales.created_by + org state)
        // Key: `${agentId}::${state}` -> count
        const agentStateSales = new Map<string, number>();
        sales.forEach((s) => {
          if (!s.created_by || !s.organization_id) return;
          const st = orgState.get(s.organization_id);
          if (!st || st === "Unknown") return;
          const key = `${s.created_by}::${st}`;
          agentStateSales.set(key, (agentStateSales.get(key) || 0) + 1);
        });

        // Build agent details per state
        const agentDetailsByState = new Map<string, AgentDetail[]>();
        const pushAgent = (state: string, agent: AgentDetail) => {
          const list = agentDetailsByState.get(state) || [];
          if (list.some((a) => a.id === agent.id)) return;
          list.push(agent);
          agentDetailsByState.set(state, list);
        };

        // Partner-side agents: their org's state
        (profiles || []).forEach((p: any) => {
          if (!partnerAgentRoles.has(p.role)) return;
          const state = p.organization_id ? orgState.get(p.organization_id) : null;
          if (!state || state === "Unknown") return;
          pushAgent(state, {
            id: p.id,
            name: p.full_name || p.email || "—",
            role: p.role,
            statesCovered: [state],
            stovesRecorded: agentStateSales.get(`${p.id}::${state}`) || 0,
          });
        });

        // ACSL agents/managers
        acslStatesByAgent.forEach((stateSet, agentId) => {
          const p = profileById.get(agentId);
          const statesCovered = Array.from(stateSet).sort();
          stateSet.forEach((state) => {
            pushAgent(state, {
              id: agentId,
              name: p?.full_name || p?.email || "—",
              role: p?.role || "acsl_agent",
              statesCovered,
              stovesRecorded: agentStateSales.get(`${agentId}::${state}`) || 0,
            });
          });
        });

        // Finalize computed cols
        const finalRows: StateRow[] = Array.from(map.values())
          .filter((r) => r.partners > 0) // only states that have partners
          .map((r) => ({
            ...r,
            agents: r.partnerAgents + r.acslAgents,
            notSold: Math.max(0, r.stoves - r.sold),
            sellThrough: r.stoves > 0 ? r.sold / r.stoves : 0,
            partnerDetails: partnerDetailsByState.get(r.state) || [],
            agentDetails: agentDetailsByState.get(r.state) || [],
            stoveDetails: [...r.stoveDetails].sort((a, b) =>
              (a.stove_id || "").localeCompare(b.stove_id || ""),
            ),
          }));

        if (!cancelled) {
          setRows(finalRows);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load states performance");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? rows.filter((r) => r.state.toLowerCase().includes(q)) : rows;
    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
    return sorted;
  }, [rows, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.partners += r.partners;
        acc.stoves += r.stoves;
        acc.sold += r.sold;
        acc.notSold += r.notSold;
        return acc;
      },
      { partners: 0, stoves: 0, sold: 0, notSold: 0 },
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  useEffect(() => setPage(1), [search, sortKey, sortDir, pageSize]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "state" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const handleExport = () => {
    const headers = [
      "State",
      "Partners",
      "Agents (Partner)",
      "Agents (ACSL)",
      "Agents (Total)",
      "Total Stoves",
      "Sold",
      "Not Sold",
      "Sell-through %",
    ];
    const lines = [headers.join(",")].concat(
      filtered.map((r) =>
        [
          `"${r.state.replace(/"/g, '""')}"`,
          r.partners,
          r.partnerAgents,
          r.acslAgents,
          r.agents,
          r.stoves,
          r.sold,
          r.notSold,
          (r.sellThrough * 100).toFixed(1),
        ].join(","),
      ),
    );
    downloadCSV(
      lines.join("\n"),
      `states-performance-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const openPartnerModal = (state: string) => {
    setModalState(state);
    setModalSearch("");
    setModalPage(1);
    setModalPageSize(10);
    setModalOpen(true);
  };

  const closePartnerModal = () => {
    setModalOpen(false);
    setModalState(null);
    setModalSearch("");
    setModalPage(1);
  };

  const modalPartners = useMemo(() => {
    if (!modalState) return [];
    const row = rows.find((r) => r.state === modalState);
    const list = row?.partnerDetails || [];
    const q = modalSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }, [rows, modalState, modalSearch]);

  const modalTotalPages = Math.max(1, Math.ceil(modalPartners.length / modalPageSize));
  const modalClampedPage = Math.min(modalPage, modalTotalPages);
  const modalStart = (modalClampedPage - 1) * modalPageSize;
  const modalPageRows = modalPartners.slice(modalStart, modalStart + modalPageSize);

  useEffect(() => setModalPage(1), [modalSearch, modalPageSize]);

  const handleModalExport = () => {
    const headers = [
      "Partner Name",
      "Phone Number",
      "Total Stoves",
      "Stoves Sold",
      "Stoves Available",
    ];
    const lines = [headers.join(",")].concat(
      modalPartners.map((p) =>
        [
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.phone.replace(/"/g, '""')}"`,
          p.totalStoves,
          p.stovesSold,
          p.stovesAvailable,
        ].join(","),
      ),
    );
    downloadCSV(
      lines.join("\n"),
      `partners-in-${modalState?.toLowerCase().replace(/\s+/g, "-") || "state"}-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const openAgentModal = (state: string) => {
    setAgentModalState(state);
    setAgentModalSearch("");
    setAgentModalPage(1);
    setAgentModalPageSize(10);
    setAgentModalOpen(true);
  };

  const closeAgentModal = () => {
    setAgentModalOpen(false);
    setAgentModalState(null);
    setAgentModalSearch("");
    setAgentModalPage(1);
  };

  const agentModalRow = useMemo(
    () => (agentModalState ? rows.find((r) => r.state === agentModalState) : undefined),
    [rows, agentModalState],
  );

  const agentModalAgents = useMemo(() => {
    const list = agentModalRow?.agentDetails || [];
    const q = agentModalSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.statesCovered.some((s) => s.toLowerCase().includes(q)),
    );
  }, [agentModalRow, agentModalSearch]);

  const agentModalTotalPages = Math.max(
    1,
    Math.ceil(agentModalAgents.length / agentModalPageSize),
  );
  const agentModalClampedPage = Math.min(agentModalPage, agentModalTotalPages);
  const agentModalStart = (agentModalClampedPage - 1) * agentModalPageSize;
  const agentModalPageRows = agentModalAgents.slice(
    agentModalStart,
    agentModalStart + agentModalPageSize,
  );

  useEffect(() => setAgentModalPage(1), [agentModalSearch, agentModalPageSize]);

  const handleAgentModalExport = () => {
    const headers = [
      "Agent Name",
      "Role",
      "States Covered (Count)",
      "States Covered",
      "Stoves Recorded (in state)",
      "Total Stoves in State",
      "Unsold Stoves in State",
    ];
    const totalStoves = agentModalRow?.stoves || 0;
    const unsold = agentModalRow?.notSold || 0;
    const lines = [headers.join(",")].concat(
      agentModalAgents.map((a) =>
        [
          `"${a.name.replace(/"/g, '""')}"`,
          `"${a.role}"`,
          a.statesCovered.length,
          `"${a.statesCovered.join("; ").replace(/"/g, '""')}"`,
          a.stovesRecorded,
          totalStoves,
          unsold,
        ].join(","),
      ),
    );
    downloadCSV(
      lines.join("\n"),
      `agents-in-${agentModalState?.toLowerCase().replace(/\s+/g, "-") || "state"}-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  return (
    <div className="space-y-4 p-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi
          icon={MapPin}
          label="States"
          value={filtered.length}
          tone="blue"
          sub={`${filtered.filter((r) => agentCoveredStates.has(r.state)).length} of ${filtered.length} covered by an agent`}
        />

        <Kpi icon={Building2} label="Partners" value={totals.partners} tone="orange" />
        <Kpi icon={Package} label="Stoves" value={totals.stoves} tone="orange" />
        <Kpi icon={CheckCircle2} label="Sold" value={totals.sold} tone="emerald" />
        <Kpi icon={Circle} label="Not Sold" value={totals.notSold} tone="violet" />
      </div>


      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 shadow-none"
          />
        </div>
        <Button
          onClick={handleExport}
          disabled={loading || filtered.length === 0}
          className="h-9 bg-[#4a5d0f] text-white hover:bg-[#3a4a0c] shadow-none"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#4a5d0f] hover:bg-[#4a5d0f]">
              <SortableTh label="State" k="state" sortKey={sortKey} onClick={toggleSort} align="left" icon={<SortIcon k="state" />} />
              <SortableTh label="Partners" k="partners" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="partners" />} />
              <SortableTh label="Agents" k="agents" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="agents" />} />
              <SortableTh label="Stoves" k="stoves" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="stoves" />} />
              <SortableTh label="Sold" k="sold" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="sold" />} />
              <SortableTh label="Not Sold" k="notSold" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="notSold" />} />
              <SortableTh label="Sell-through" k="sellThrough" sortKey={sortKey} onClick={toggleSort} icon={<SortIcon k="sellThrough" />} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading states performance...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-red-600">
                  {error}
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                  No states found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow key={r.state} className="border-b text-xs">
                  <TableCell className="align-top font-medium text-gray-800">
                    {r.state}
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <button
                      onClick={() => openPartnerModal(r.state)}
                      className="inline-flex min-w-[2rem] cursor-pointer justify-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#eef3c4] text-[#4a5d0f] hover:bg-[#4a5d0f] hover:text-white"
                      title="View partners in this state"
                    >
                      {r.partners}
                    </button>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <button
                      onClick={() => openAgentModal(r.state)}
                      className="inline-flex min-w-[2rem] cursor-pointer justify-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[#eef3c4] text-[#4a5d0f] hover:bg-[#4a5d0f] hover:text-white"
                      title="View agents in this state"
                    >
                      {r.agents}
                    </button>
                  </TableCell>


                  <TableCell className="text-center align-top">
                    <Pill tone="slate">{r.stoves}</Pill>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Pill tone="emerald">{r.sold}</Pill>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Pill tone="rose">{r.notSold}</Pill>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-[#4a5d0f]"
                          style={{ width: `${Math.round(r.sellThrough * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] text-gray-600">
                        {(r.sellThrough * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer / pagination */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-white px-4 py-2 text-xs text-gray-600">
          <div>
            Showing {filtered.length === 0 ? 0 : start + 1}–
            {Math.min(start + pageSize, filtered.length)} of {filtered.length} states
          </div>
          <div className="flex items-center gap-2">
            <span>per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[70px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shadow-none"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="px-2">
              Page {clampedPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shadow-none"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Partners in State Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closePartnerModal()}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="border-b bg-[#4a5d0f] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Partners in {modalState}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs">
                  {modalPartners.length} partner{modalPartners.length === 1 ? "" : "s"} found
                </DialogDescription>
              </div>
              <button
                onClick={closePartnerModal}
                className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-3 p-5">
            {/* Modal search + export */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search partner name or phone..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="h-9 pl-9 shadow-none"
                />
              </div>
              <Button
                onClick={handleModalExport}
                disabled={modalPartners.length === 0}
                className="h-9 bg-[#4a5d0f] text-white hover:bg-[#3a4a0c] shadow-none"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            {/* Modal table */}
            <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#eef3c4] hover:bg-[#eef3c4]">
                    <TableHead className="text-left text-[11px] font-semibold text-[#4a5d0f]">Name</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold text-[#4a5d0f]">Phone Number</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Total Stoves</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Stoves Sold</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Stoves Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalPageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        No partners found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    modalPageRows.map((p) => (
                      <TableRow key={p.id} className="border-b text-xs">
                        <TableCell className="align-top font-medium text-gray-800">{p.name}</TableCell>
                        <TableCell className="align-top text-gray-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {p.phone}
                          </span>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="slate">{p.totalStoves}</Pill>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="emerald">{p.stovesSold}</Pill>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="green">{p.stovesAvailable}</Pill>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Modal pagination */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e5e7eb] pt-3 text-xs text-gray-600">
              <div>
                Showing {modalPartners.length === 0 ? 0 : modalStart + 1}–
                {Math.min(modalStart + modalPageSize, modalPartners.length)} of {modalPartners.length} partners
              </div>
              <div className="flex items-center gap-2">
                <span>per page:</span>
                <Select value={String(modalPageSize)} onValueChange={(v) => setModalPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-none"
                  disabled={modalClampedPage <= 1}
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="px-2">
                  Page {modalClampedPage} of {modalTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-none"
                  disabled={modalClampedPage >= modalTotalPages}
                  onClick={() => setModalPage((p) => Math.min(modalTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agents in State Modal */}
      <Dialog open={agentModalOpen} onOpenChange={(open) => !open && closeAgentModal()}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="border-b bg-[#4a5d0f] px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Agents in {agentModalState}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs">
                  {agentModalAgents.length} agent{agentModalAgents.length === 1 ? "" : "s"} · Total stoves in state: {agentModalRow?.stoves ?? 0} · Unsold: {agentModalRow?.notSold ?? 0}
                </DialogDescription>
              </div>
              <button
                onClick={closeAgentModal}
                className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex flex-col flex-1 min-h-0 space-y-3 p-5 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search agent name, role, or state..."
                  value={agentModalSearch}
                  onChange={(e) => setAgentModalSearch(e.target.value)}
                  className="h-9 pl-9 shadow-none"
                />
              </div>
              <Button
                onClick={handleAgentModalExport}
                disabled={agentModalAgents.length === 0}
                className="h-9 bg-[#4a5d0f] text-white hover:bg-[#3a4a0c] shadow-none"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[#e5e7eb]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#eef3c4] hover:bg-[#eef3c4]">
                    <TableHead className="min-w-[220px] text-left text-[11px] font-semibold text-[#4a5d0f]">Agent</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">States Covered</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold text-[#4a5d0f]">State List</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Stoves Recorded</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Total in State</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold text-[#4a5d0f]">Unsold in State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentModalPageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500">
                        No agents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentModalPageRows.map((a) => (
                      <TableRow key={a.id} className="border-b text-xs">
                        <TableCell className="min-w-[220px] align-top whitespace-nowrap">
                          <span className="inline-block max-w-[180px] truncate align-bottom font-medium text-gray-800" title={a.name}>
                            {a.name}
                          </span>
                          <sup className="ml-1 whitespace-nowrap text-[9px] font-medium text-blue-600">
                            {AGENT_ROLE_LABELS[a.role] || a.role}
                          </sup>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="slate">{a.statesCovered.length}</Pill>
                        </TableCell>
                        <TableCell className="align-top text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {a.statesCovered.map((s) => (
                              <span
                                key={s}
                                className="inline-flex rounded-full bg-[#eef3c4] px-2 py-0.5 text-[10px] font-medium text-[#4a5d0f]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="emerald">{a.stovesRecorded}</Pill>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="slate">{agentModalRow?.stoves ?? 0}</Pill>
                        </TableCell>
                        <TableCell className="text-center align-top">
                          <Pill tone="rose">{agentModalRow?.notSold ?? 0}</Pill>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e5e7eb] pt-3 text-xs text-gray-600 shrink-0">
              <div>
                Showing {agentModalAgents.length === 0 ? 0 : agentModalStart + 1}–
                {Math.min(agentModalStart + agentModalPageSize, agentModalAgents.length)} of {agentModalAgents.length} agents
              </div>
              <div className="flex items-center gap-2">
                <span>per page:</span>
                <Select value={String(agentModalPageSize)} onValueChange={(v) => setAgentModalPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-none"
                  disabled={agentModalClampedPage <= 1}
                  onClick={() => setAgentModalPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="px-2">
                  Page {agentModalClampedPage} of {agentModalTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-none"
                  disabled={agentModalClampedPage >= agentModalTotalPages}
                  onClick={() => setAgentModalPage((p) => Math.min(agentModalTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "blue" | "indigo" | "teal" | "orange" | "emerald" | "violet";
  sub?: string;
}) {
  const toneMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    indigo: "from-indigo-500 to-indigo-600",
    teal: "from-teal-500 to-emerald-600",
    orange: "from-orange-500 to-amber-600",
    emerald: "from-emerald-500 to-green-600",
    violet: "from-violet-500 to-purple-600",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${toneMap[tone]} p-3 text-white shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-bold leading-tight">{value.toLocaleString()}</div>
          <div className="mt-0.5 text-[11px] font-medium text-white/90">{label}</div>
          {sub ? (
            <div className="mt-1 text-[10px] font-medium text-white/80">{sub}</div>
          ) : null}
        </div>
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/20 backdrop-blur-sm">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}



function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "slate" | "emerald" | "rose";
}) {
  const map: Record<string, string> = {
    green: "bg-[#eef3c4] text-[#4a5d0f]",
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  onClick,
  icon,
  align = "center",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  onClick: (k: SortKey) => void;
  icon: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <TableHead
      className={`cursor-pointer text-white hover:bg-[#3f4f0d] ${
        align === "center" ? "text-center" : "text-left"
      }`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center">
        {label}
        {icon}
      </span>
    </TableHead>
  );
}
