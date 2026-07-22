import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
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
  Users,
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
}

const PAGE_SIZES = [10, 25, 50];

export default function StatesPerformanceContent() {
  const { supabase } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StateRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

        // Partner-side agents/profiles with an org
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("id,role,organization_id")
          .in("role", ["partner", "admin", "partner_agent", "agent"]);
        if (pErr) throw pErr;

        // ACSL agent -> state assignments
        const { data: acslStates, error: aErr } = await supabase
          .from("acsl_agent_states")
          .select("agent_id,state");
        if (aErr) throw aErr;

        // Stoves (paginated)
        const stoves: {
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
            .select("organization_id,status,sale_id")
            .eq("is_archived", false)
            .range(from, from + PAGE_FETCH - 1);
          if (sErr) throw sErr;
          const chunk = data || [];
          stoves.push(...chunk);
          if (chunk.length < PAGE_FETCH) break;
          from += PAGE_FETCH;
        }

        // Build org -> state map
        const orgState = new Map<string, string>();
        (orgs || []).forEach((o: any) => {
          if (o?.id) orgState.set(o.id, (o.state || "").trim() || "Unknown");
        });

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
            };
            map.set(state, r);
          }
          return r;
        };

        // Partners
        (orgs || []).forEach((o: any) => {
          const state = (o.state || "").trim();
          if (!state) return;
          ensure(state).partners += 1;
        });

        // Partner-side agents (via profile's organization_id -> state)
        (profiles || []).forEach((p: any) => {
          const state = p.organization_id ? orgState.get(p.organization_id) : null;
          if (!state || state === "Unknown") return;
          ensure(state).partnerAgents += 1;
        });

        // ACSL agents (dedupe by agent per state)
        const seen = new Set<string>();
        (acslStates || []).forEach((a: any) => {
          const state = (a.state || "").trim();
          if (!state) return;
          const key = `${a.agent_id}::${state}`;
          if (seen.has(key)) return;
          seen.add(key);
          ensure(state).acslAgents += 1;
        });

        // Stoves
        stoves.forEach((s) => {
          const state = s.organization_id ? orgState.get(s.organization_id) : null;
          if (!state || state === "Unknown") return;
          const row = ensure(state);
          row.stoves += 1;
          if (s.status === "sold" || s.sale_id) row.sold += 1;
        });

        // Finalize computed cols
        const finalRows: StateRow[] = Array.from(map.values())
          .filter((r) => r.partners > 0) // only states that have partners
          .map((r) => ({
            ...r,
            agents: r.partnerAgents + r.acslAgents,
            notSold: Math.max(0, r.stoves - r.sold),
            sellThrough: r.stoves > 0 ? r.sold / r.stoves : 0,
          }));

        if (!cancelled) setRows(finalRows);
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
  }, [supabase]);

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
        acc.agents += r.agents;
        acc.stoves += r.stoves;
        acc.sold += r.sold;
        acc.notSold += r.notSold;
        return acc;
      },
      { partners: 0, agents: 0, stoves: 0, sold: 0, notSold: 0 },
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

  return (
    <div className="space-y-4 p-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={MapPin} label="States" value={filtered.length} tone="blue" />
        <Kpi icon={Building2} label="Partners" value={totals.partners} tone="orange" />
        <Kpi icon={Users} label="Agents" value={totals.agents} tone="teal" />
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
                    <Pill tone="green">{r.partners}</Pill>
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Pill tone="green">{r.agents}</Pill>
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
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "blue" | "indigo" | "teal" | "orange" | "emerald" | "violet";
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
