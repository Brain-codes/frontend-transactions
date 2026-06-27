
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Users,
  Search,
  X,
  Loader2,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  MapPin,
  Check,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Package,
  Boxes,
  Activity,
  Download,
  KeyRound,
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import organizationsService from "../../services/organizationsService";
import { useAuth } from "../../contexts/useAuth";
import { lgaAndStates } from "../../constants";
import AgentFormModal from "../../components/AgentFormModal";
import DeleteSuperAdminAgentModal from "../../super-admin-agents/components/DeleteSuperAdminAgentModal";
import ViewSuperAdminAgentModal from "../../super-admin-agents/components/ViewSuperAdminAgentModal";
import AssignOrganizationsModal from "../../super-admin-agents/components/AssignOrganizationsModal";
import PageHeader from "../../components/PageHeader";
import AgentViewCredentialModal from "../../admin/components/agents/AgentViewCredentialModal";
import AgentCredentialsModal from "../../admin/components/agents/AgentCredentialsModal";
import tokenManager from "@/utils/tokenManager";

interface AcslAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  assigned_organizations_count: number;
  assigned_states_count: number;
  total_partners_count: number;
  assigned_states?: string[];
  stove_summary?: { received: number; sold: number; available: number };
}

interface PartnerOrg {
  id: string;
  partner_name: string;
  state: string | null;
  branch: string | null;
  source: "direct" | "state";
}

const ALL_STATES = Object.keys(lgaAndStates).sort();

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d !== 1 ? "s" : ""} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w !== 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo !== 1 ? "s" : ""} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y !== 1 ? "s" : ""} ago`;
}

// ── Assign Partner Modal ───────────────────────────────────────────────────────

interface OrgOption {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
}

function AssignPartnerModal({
  agent,
  isOpen,
  onClose,
  onSuccess,
}: {
  agent: AcslAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { userRole, user } = useAuth();
  const isCallerManager = userRole === "acsl_agent_manager";

  const [allOrgs, setAllOrgs] = useState<OrgOption[]>([]);
  const [selectedDirectOrgIds, setSelectedDirectOrgIds] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [orgSearch, setOrgSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "partner" | "state"
  const [mode, setMode] = useState<"partner" | "state">("state");
  const [stateColorMap, setStateColorMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !agent) return;
    setOrgSearch("");
    setStateSearch("");
    setError(null);
    setMode("state");
    const load = async () => {
      setLoading(true);
      try {
        const [orgsRes, assignedRes, statesRes] = await Promise.all([
          // Managers only see their own assigned orgs; super admin sees all
          isCallerManager && user?.id
            ? superAdminAgentService.getAgentOrganizations(user.id)
            : organizationsService.getAllOrganizations(),
          superAdminAgentService.getAgentOrganizations(agent.id),
          superAdminAgentService.getAgentStates(agent.id),
        ]);
        setAllOrgs(orgsRes.data || []);
        const direct = (assignedRes.data || []).filter(
          (o: any) => !o.source || o.source === "direct"
        );
        setSelectedDirectOrgIds(new Set(direct.map((o: any) => o.id as string)));
        setSelectedStates(
          new Set((statesRes.data || []).map((s: any) => s.state as string))
        );
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, agent, isCallerManager, user?.id]);

  const orgCountByState = useMemo(() => {
    const counts: Record<string, number> = {};
    allOrgs.forEach((o) => {
      if (o.state) counts[o.state] = (counts[o.state] || 0) + 1;
    });
    return counts;
  }, [allOrgs]);

  const stateCoveredIds = useMemo(() => {
    const ids = new Set<string>();
    allOrgs.forEach((o) => {
      if (o.state && selectedStates.has(o.state)) ids.add(o.id);
    });
    return ids;
  }, [allOrgs, selectedStates]);

  const totalUnique = useMemo(
    () => new Set([...selectedDirectOrgIds, ...stateCoveredIds]).size,
    [selectedDirectOrgIds, stateCoveredIds]
  );

  // Managers can only assign from their own states; super admin sees all
  const managerStates = useMemo(
    () => [...new Set(allOrgs.map((o: any) => o.state).filter(Boolean) as string[])].sort(),
    [allOrgs]
  );
  const availableStates = isCallerManager ? managerStates : ALL_STATES;
  const filteredStates = availableStates.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const filteredOrgs = allOrgs.filter((o) => {
    const q = orgSearch.toLowerCase();
    return (
      o.partner_name.toLowerCase().includes(q) ||
      (o.branch || "").toLowerCase().includes(q) ||
      (o.state || "").toLowerCase().includes(q)
    );
  });

  const toggleOrg = (id: string) =>
    setSelectedDirectOrgIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        superAdminAgentService.setAgentStates(agent.id, Array.from(selectedStates)),
        superAdminAgentService.setAgentOrganizations(agent.id, Array.from(selectedDirectOrgIds)),
      ]);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!agent) return null;

  const STATE_COLORS = [
    { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" }, // blue
    { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" }, // indigo
    { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" }, // emerald
    { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" }, // pink
    { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" }, // violet
    { bg: "#cffafe", text: "#164e63", border: "#67e8f9" }, // cyan
    { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" }, // amber
    { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" }, // red
    { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" }, // purple
    { bg: "#dcfce7", text: "#14532d", border: "#86efac" }, // green
  ];

  const getStateColor = (s: string) =>
    STATE_COLORS[(stateColorMap[s] ?? 0) % STATE_COLORS.length];

  const toggleState = (s: string) => {
    const isSelected = selectedStates.has(s);
    if (isSelected) {
      const otherStates = new Set(Array.from(selectedStates).filter((st) => st !== s));
      setSelectedStates(otherStates);
      setSelectedDirectOrgIds((prev) => {
        const next = new Set(prev);
        allOrgs.forEach((o) => {
          if (o.state === s && !otherStates.has(o.state ?? "")) next.delete(o.id);
        });
        return next;
      });
    } else {
      // Assign next color index not already in use
      const usedIndices = new Set(Object.values(stateColorMap));
      let nextIdx = 0;
      while (usedIndices.has(nextIdx)) nextIdx++;
      setStateColorMap((prev) => ({ ...prev, [s]: nextIdx }));
      setSelectedStates((prev) => new Set([...prev, s]));
      const ids = allOrgs.filter((o) => o.state === s).map((o) => o.id);
      setSelectedDirectOrgIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // State grid: only unselected states matching search, scoped to manager's states if applicable
  const visibleStates = availableStates.filter(
    (s) => !selectedStates.has(s) && s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredOrgsForPartnerMode = allOrgs.filter((o) => {
    const q = orgSearch.toLowerCase();
    return (
      o.partner_name.toLowerCase().includes(q) ||
      (o.branch || "").toLowerCase().includes(q) ||
      (o.state || "").toLowerCase().includes(q)
    );
  });

  // Only states that have at least one partner in allOrgs
  const selectedStatesWithPartners = Array.from(selectedStates).filter(
    (s) => allOrgs.some((o) => o.state === s)
  );

  const hasBottomContent = selectedStatesWithPartners.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 py-2.5 bg-gradient-to-r from-primary/5 to-primary/10 border-b shrink-0">
          <DialogTitle className="text-sm font-bold text-foreground">
            Assign partner to{" "}
            <span className="text-primary">{agent.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="px-4 pt-2.5 pb-0 shrink-0">
          <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg border border-border/50 w-fit">
            {(["state", "partner"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setOrgSearch(""); setStateSearch(""); }}
                className={[
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all",
                  mode === m
                    ? "bg-[#4a5d0f] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {m === "state" ? <MapPin className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                {m === "state" ? "By State" : "By Partner"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
          {error && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
              <AlertCircle className="h-3 w-3 shrink-0" />{error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : mode === "state" ? (
            /* ── By State ── */
            <div className="space-y-1.5">
              {/* Selected state pills above search */}
              {selectedStates.size > 0 && (
                <div className="flex flex-wrap gap-1 pb-0.5">
                  {Array.from(selectedStates).map((s) => {
                    const c = getStateColor(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleState(s)}
                        style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-opacity hover:opacity-80"
                      >
                        {s}
                        <X className="h-2.5 w-2.5 ml-0.5" />
                      </button>
                    );
                  })}
                </div>
              )}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold leading-tight text-[#8c0000]">
                                  Click to select state(s)
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newColorMap = { ...stateColorMap };
                                      const usedIndices = new Set(Object.values(newColorMap));
                                      let nextIdx = 0;
                                      availableStates.filter(s => !selectedStates.has(s)).forEach(s => {
                                        while (usedIndices.has(nextIdx)) nextIdx++;
                                        newColorMap[s] = nextIdx;
                                        usedIndices.add(nextIdx++);
                                      });
                                      setStateColorMap(newColorMap);
                                      setSelectedStates(new Set(availableStates));
                                      setSelectedDirectOrgIds(prev => {
                                        const next = new Set(prev);
                                        allOrgs.forEach(o => { if (o.state && availableStates.includes(o.state)) next.add(o.id); });
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded border border-[#4a5d0f]/40 bg-[#4a5d0f]/10 text-[#4a5d0f] hover:bg-[#4a5d0f]/20 transition-colors"
                                  >
                                    Assign All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStates(new Set());
                                      setSelectedDirectOrgIds(prev => {
                                        const next = new Set(prev);
                                        allOrgs.forEach(o => { if (o.state) next.delete(o.id); });
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                  >
                                    Unassign All
                                  </button>
                                </div>
                              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search states..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="pl-6 h-7 text-[11px]"
                />
              </div>
              {visibleStates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">
                  {stateSearch ? "No states match your search." : "All states selected."}
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto">
                  {visibleStates.map((state) => {
                    const count = orgCountByState[state] || 0;
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() => toggleState(state)}
                        className="flex flex-col items-center px-1 py-1.5 rounded border text-center transition-colors bg-muted/30 border-border/50 text-gray-700 hover:bg-[#4a5d0f]/10 hover:border-[#4a5d0f]/40"
                        title={`${state} — ${count} partner${count !== 1 ? "s" : ""}`}
                      >
                        <span className="text-[10px] font-semibold leading-tight truncate w-full">{state}</span>
                        <span className="text-[9px] leading-tight mt-0.5 text-muted-foreground">
                          {count} partner{count !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── By Partner ── */
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search partners by name, state or branch..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-6 h-7 text-[11px]"
                />
              </div>
              {filteredOrgsForPartnerMode.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  {orgSearch ? "No partners match your search." : "No partners found."}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
                  {filteredOrgsForPartnerMode.map((org) => {
                    const selected = selectedDirectOrgIds.has(org.id);
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => toggleOrg(org.id)}
                        className={[
                          "flex flex-col items-start px-2 py-1.5 rounded border text-left transition-colors",
                          selected
                            ? "bg-[#4a5d0f] border-[#4a5d0f] hover:bg-[#4a5d0f]/90"
                            : "bg-muted/30 border-border/50 hover:border-primary/40 hover:bg-muted/60",
                        ].join(" ")}
                      >
                        <p className={`text-[11px] font-medium truncate w-full ${selected ? "text-white" : "text-gray-900"}`}>
                          {org.partner_name}
                        </p>
                        <p className={`text-[10px] truncate w-full ${selected ? "text-white/70" : "text-muted-foreground"}`}>
                          {[org.branch, org.state].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom: column-per-state layout with checkbox rows */}
        {hasBottomContent && (
          <div className="border-t border-border/50 shrink-0 max-h-56 overflow-auto px-4 py-2">
            <div className="flex divide-x divide-border/50 min-w-0 border border-border/50 rounded-md overflow-hidden">
              {selectedStatesWithPartners.map((s) => {
                const c = getStateColor(s);
                const statePartners = allOrgs.filter((o) => o.state === s);
                const selectedCount = statePartners.filter((o) => selectedDirectOrgIds.has(o.id)).length;
                return (
                  <div key={s} className="flex-1 min-w-[160px]">
                    {/* Column header — same color as pill */}
                    <div
                      className="sticky top-0 px-2 py-1.5 flex items-center justify-between gap-1 border-b"
                      style={{ backgroundColor: c.bg, borderColor: c.border }}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: c.text }} />
                        <span className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: c.text }}>{s}</span>
                      </div>
                      <span className="text-[9px] shrink-0" style={{ color: c.text, opacity: 0.7 }}>{selectedCount}/{statePartners.length}</span>
                    </div>
                    {/* Partner rows */}
                    {statePartners.map((o, idx) => {
                      const checked = selectedDirectOrgIds.has(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleOrg(o.id)}
                          className={[
                            "w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors",
                            idx % 2 === 0 ? "bg-white" : "bg-blue-50/30",
                            "hover:bg-blue-50",
                          ].join(" ")}
                        >
                          {/* Checkbox */}
                          <div className={[
                            "w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                            checked ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300",
                          ].join(" ")}>
                            {checked && <Check className="h-2 w-2 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[11px] font-medium truncate ${checked ? "text-gray-900" : "text-gray-500"}`}>
                              {o.partner_name}
                            </p>
                            {o.branch && (
                              <p className="text-[9px] text-muted-foreground truncate">{o.branch}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-[#4a5d0f] hover:bg-[#4a5d0f]/90 text-white"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-3 w-3 mr-1" />Assign Partner</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Agent Partners Modal ───────────────────────────────────────────────────────

function AgentPartnersModal({
  agent,
  isOpen,
  onClose,
}: {
  agent: AcslAgent | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen || !agent) return;
    setSearch("");
    setPage(1);
    setPartners([]);
    setError(null);
    fetchPartners();
  }, [isOpen, agent]);

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1); }, [search]);

  const fetchPartners = async () => {
    if (!agent) return;
    setLoading(true);
    try {
      const result = await superAdminAgentService.getAgentOrganizations(agent.id);
      const orgs: PartnerOrg[] = (result.data || []).map((o: any) => ({
        id: o.id,
        partner_name: o.partner_name,
        state: o.state ?? null,
        branch: o.branch ?? null,
        source: o.source === "state" ? "state" : "direct",
      }));
      setPartners(orgs);
    } catch (err: any) {
      setError(err.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  if (!agent) return null;

  const filtered = partners.filter(
    (p) =>
      !search ||
      p.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase()) ||
      p.branch?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filtered.length);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const directCount = partners.filter((p) => p.source === "direct").length;
  const stateCount = partners.filter((p) => p.source === "state").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Assigned Partners
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agent:{" "}
              <span className="font-semibold text-primary">{agent.full_name}</span>
              <span className="ml-2 bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {partners.length} partner{partners.length !== 1 ? "s" : ""}
              </span>
              {directCount > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {directCount} direct
                </span>
              )}
              {stateCount > 0 && (
                <span className="ml-1 bg-purple-100 text-purple-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {stateCount} via state
                </span>
              )}
            </p>
          </div>
        </DialogHeader>

        <div className="px-5 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-red-600 text-sm">{error}</p>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={fetchPartners}>
                Retry
              </Button>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No partners assigned to this agent.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#4a5d0f] hover:bg-[#4a5d0f]">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                      Partner Name
                    </TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                      State
                    </TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                      Branch
                    </TableHead>
                    {/* <TableHead className="text-white font-semibold text-xs whitespace-nowrap">
                      Assignment
                    </TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((partner, idx) => (
                    <TableRow
                      key={partner.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}
                    >
                      <TableCell className="text-xs font-medium text-gray-900">
                        {partner.partner_name}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {partner.state || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {partner.branch || "—"}
                      </TableCell>
                      {/* <TableCell>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            partner.source === "state"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {partner.source === "state" ? "Via State" : "Direct"}
                        </span>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
            <p className="text-xs text-gray-500">
              {startItem}–{endItem} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />Prev
              </Button>
              {getPageNumbers().map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 p-0 text-xs ${p === safePage ? "bg-[#4a5d0f] text-white hover:bg-[#4a5d0f]" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next<ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Agent States Modal ─────────────────────────────────────────────────────────


function AgentStatesModal({
  agent,
  isOpen,
  onClose,
}: {
  agent: AcslAgent | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !agent) return;
    setError(null);
    setStates([]);
    const load = async () => {
      setLoading(true);
      try {
        const result = await superAdminAgentService.getAgentStates(agent.id);
        const sorted: string[] = ((result.data || []) as any[])
          .map((s: any) => s.state as string)
          .sort();
        setStates(sorted);
      } catch (err: any) {
        setError(err.message || "Failed to load states");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, agent]);

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">States Assigned</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agent: <span className="font-semibold text-primary">{agent.full_name}</span>
              {!loading && (
                <span className="ml-2 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {states.length} state{states.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : states.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No states assigned to this agent.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {states.map((s) => (
                <span
                  key={s}
                  className="bg-primary/10 text-primary text-[11px] font-mono px-2.5 py-1 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>


      </DialogContent>
    </Dialog>
  );
}


// ── Active Partners Modal ──────────────────────────────────────────────────────

interface ActivePartner {
  id: string;
  partner_name: string;
  state: string | null;
  branch: string | null;
  contact_phone: string | null;
  total_stove_ids: number;
  sold_stove_ids: number;
  available_stove_ids: number;
  agents_count: number;
}

function ActivePartnersModal({
  isOpen,
  onClose,
  partnerIds,
  dateBadge,
}: {
  isOpen: boolean;
  onClose: () => void;
  partnerIds: string[];
  dateBadge: string;
}) {
  const { supabase } = useAuth();
  const PAGE_SIZE = 15;
  const [partners, setPartners] = useState<ActivePartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setPage(1);
    setPartners([]);
    if (partnerIds.length === 0) return;
    setLoading(true);

    const load = async () => {
      try {
        const BATCH = 200;

        // Fetch org records
        const orgBatches: Promise<any>[] = [];
        for (let i = 0; i < partnerIds.length; i += BATCH) {
          orgBatches.push(
            supabase
              .from("organizations")
              .select("id, partner_name, state, branch, contact_phone")
              .in("id", partnerIds.slice(i, i + BATCH))
          );
        }
        const orgResults = await Promise.all(orgBatches);
        const orgs: any[] = orgResults.flatMap((r) => r.data || []);

        // Fetch stove counts grouped by org (client-side aggregation)
        const stoveBatches: Promise<any>[] = [];
        for (let i = 0; i < partnerIds.length; i += BATCH) {
          stoveBatches.push(
            supabase
              .from("stove_ids")
              .select("organization_id, status")
              .in("organization_id", partnerIds.slice(i, i + BATCH))
              .eq("is_archived", false)
          );
        }
        const stoveResults = await Promise.all(stoveBatches);
        const stoveCounts: Record<string, { total: number; sold: number; available: number }> = {};
        stoveResults.flatMap((r) => r.data || []).forEach((s: any) => {
          if (!stoveCounts[s.organization_id]) stoveCounts[s.organization_id] = { total: 0, sold: 0, available: 0 };
          stoveCounts[s.organization_id].total++;
          if (s.status === "sold") stoveCounts[s.organization_id].sold++;
          else stoveCounts[s.organization_id].available++;
        });

        // Fetch direct agent assignment counts
        const agentBatches: Promise<any>[] = [];
        for (let i = 0; i < partnerIds.length; i += BATCH) {
          agentBatches.push(
            supabase
              .from("super_admin_agent_organizations")
              .select("organization_id")
              .in("organization_id", partnerIds.slice(i, i + BATCH))
          );
        }
        const agentResults = await Promise.all(agentBatches);
        const agentCounts: Record<string, number> = {};
        agentResults.flatMap((r) => r.data || []).forEach((row: any) => {
          agentCounts[row.organization_id] = (agentCounts[row.organization_id] || 0) + 1;
        });

        const merged: ActivePartner[] = orgs.map((org) => ({
          id: org.id,
          partner_name: org.partner_name,
          state: org.state,
          branch: org.branch,
          contact_phone: org.contact_phone,
          total_stove_ids: stoveCounts[org.id]?.total ?? 0,
          sold_stove_ids: stoveCounts[org.id]?.sold ?? 0,
          available_stove_ids: stoveCounts[org.id]?.available ?? 0,
          agents_count: agentCounts[org.id] ?? 0,
        }));
        merged.sort((a, b) => (a.partner_name ?? "").localeCompare(b.partner_name ?? ""));
        setPartners(merged);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, partnerIds, supabase]);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.partner_name ?? "").toLowerCase().includes(q) ||
      (p.state ?? "").toLowerCase().includes(q) ||
      (p.branch ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filtered.length);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-[#6d28d9]/5 to-[#8b5cf6]/10 border-b shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#8b5cf6]" />
              Active Partners
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-[#6d28d9]">{partnerIds.length} partner{partnerIds.length !== 1 ? "s" : ""}</span>
              {" "}with sales · {dateBadge}
            </p>
          </div>
        </DialogHeader>

        <div className="px-5 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, state or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#6d28d9]" />
            </div>
          ) : partnerIds.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No active partners for this period.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No partners match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#4a5d0f] hover:bg-[#4a5d0f]">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone Number</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stoves (Received / Sold / Available)</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Agents Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((partner, idx) => (
                    <TableRow
                      key={partner.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                    >
                      <TableCell className="text-xs font-medium text-gray-900">{partner.partner_name}</TableCell>
                      <TableCell className="text-xs">{partner.state || "N/A"}</TableCell>
                      <TableCell className="text-xs">{partner.branch || "N/A"}</TableCell>
                      <TableCell className="text-xs">{partner.contact_phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium text-purple-700" title="Received">{partner.total_stove_ids.toLocaleString()}</span>
                          <span className="text-gray-300">/</span>
                          <span className="font-medium text-blue-600" title="Sold">{partner.sold_stove_ids.toLocaleString()}</span>
                          <span className="text-gray-300">/</span>
                          <span className="font-medium text-green-600" title="Available">{partner.available_stove_ids.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {partner.agents_count === 0 ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">0</span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {partner.agents_count}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
            <p className="text-xs text-gray-500">{startItem}–{endItem} of {filtered.length}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={safePage === 1}>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />Prev
                </Button>
                {getPageNumbers().map((p) => (
                  <Button
                    key={p}
                    variant={p === safePage ? "default" : "outline"}
                    size="sm"
                    className={`h-7 w-7 p-0 text-xs ${p === safePage ? "bg-[#4a5d0f] text-white hover:bg-[#4a5d0f]" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                  Next<ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}>
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Stock Modal ────────────────────────────────────────────────────────────────

function StockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { supabase } = useAuth();
  const PAGE_SIZE = 20;
  const [stoves, setStoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setSearch(""); setPage(1); setStoves([]);
    setLoading(true);
    supabase
      .from("stove_ids")
      .select("id, stove_id, status, organization_id, organizations(partner_name, state)")
      .eq("status", "available")
      .order("stove_id", { ascending: true })
      .then(({ data }: { data: any[] | null }) => setStoves(data || []))
      .finally(() => setLoading(false));
  }, [isOpen, supabase]);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = stoves.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.stove_id?.toLowerCase().includes(q) ||
      (s.organizations as any)?.partner_name?.toLowerCase().includes(q) ||
      (s.organizations as any)?.state?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCSV = () => {
    const rows = [
      ["#", "Stove ID", "Partner", "State"],
      ...filtered.map((s, i) => [
        i + 1,
        s.stove_id ?? "",
        (s.organizations as any)?.partner_name ?? "—",
        (s.organizations as any)?.state ?? "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stoves_in_stock.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = filtered
      .map((s, i) => `<tr><td>${i + 1}</td><td>${s.stove_id ?? ""}</td><td>${(s.organizations as any)?.partner_name ?? "—"}</td><td>${(s.organizations as any)?.state ?? "—"}</td></tr>`)
      .join("");
    win.document.write(`<html><head><title>Stoves in Stock</title><style>
      body{font-family:sans-serif;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#07376a;color:white}
      tr:nth-child(even){background:#f0f5ff}
      @media print{button{display:none}}
    </style></head><body>
    <h2 style="margin-bottom:8px">Stoves in Stock (${filtered.length})</h2>
    <table><thead><tr><th>#</th><th>Stove ID</th><th>Partner</th><th>State</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Stoves in Stock</DialogTitle>
              {/* <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? "Loading…" : (
                  <span className="font-semibold text-primary">{stoves.length.toLocaleString()} stove{stoves.length !== 1 ? "s" : ""}</span>
                )} currently available
              </p> */}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCSV} disabled={loading || filtered.length === 0}>
                <Download className="h-3 w-3 mr-1" />CSV
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportPDF} disabled={loading || filtered.length === 0}>
                <Download className="h-3 w-3 mr-1" />PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-2.5 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by stove ID, partner or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Boxes className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{search ? "No stoves match your search." : "No stoves currently in stock."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#4a5d0f] hover:bg-[#4a5d0f]">
                    <TableHead className="text-white font-semibold text-xs w-10">#</TableHead>
                    <TableHead className="text-white font-semibold text-xs">Stove ID</TableHead>
                    <TableHead className="text-white font-semibold text-xs">Partner</TableHead>
                    <TableHead className="text-white font-semibold text-xs">State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((s, idx) => (
                    <TableRow key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}>
                      <TableCell className="text-xs text-gray-400">{(safePage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-gray-900">{s.stove_id}</TableCell>
                      <TableCell className="text-xs text-gray-700">{(s.organizations as any)?.partner_name || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{(s.organizations as any)?.state || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
            <p className="text-xs text-gray-500">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)} disabled={safePage === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}><ChevronLeft className="h-3.5 w-3.5 mr-0.5" />Prev</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next<ChevronRight className="h-3.5 w-3.5 ml-0.5" /></Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SuperAdminAgentsContent() {
  const { toast, toasts, removeToast } = useToast();
  const { supabase } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [kpiStats, setKpiStats] = useState({
    totalSoldByAgents: 0,
    totalActiveAgents: 0,
    mostActiveState: null as string | null,
    mostActiveStateSales: 0,
    totalActivePartners: 0,
    stovesInStock: 0,
  });
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [activeAgentIdsInRange, setActiveAgentIdsInRange] = useState<Set<string>>(new Set());
  const [activePartnerIdsInRange, setActivePartnerIdsInRange] = useState<string[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showActivePartnersModal, setShowActivePartnersModal] = useState(false);
  const [agents, setAgents] = useState<AcslAgent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["acsl_agent"]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [agentFormMode, setAgentFormMode] = useState<"create" | "edit" | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AcslAgent | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialData, setCredentialData] = useState<any>(null);
  const [loadingCredentialId, setLoadingCredentialId] = useState<string | null>(null);
  const [newAgentCredentials, setNewAgentCredentials] = useState<any>(null);
  const [showNewCredentialModal, setShowNewCredentialModal] = useState(false);
  const [partnersModalAgent, setPartnersModalAgent] = useState<AcslAgent | null>(null);
  const [assignPartnerAgent, setAssignPartnerAgent] = useState<AcslAgent | null>(null);
  const [statesModalAgent, setStatesModalAgent] = useState<AcslAgent | null>(null);

  const [sortMode, setSortMode] = useState("default");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: pageSize };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (selectedRoles.length > 0 && selectedRoles.length < 3) params.role = selectedRoles.join(",");
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const result = await superAdminAgentService.getSuperAdminAgents(params);
      setAgents(result.data || []);
      setPagination(result.pagination || null);
    } catch (err: any) {
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, selectedRoles, dateFrom, dateTo]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { setPage(1); }, [search, statusFilter, selectedRoles, dateFrom, dateTo]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const fetchKpiStats = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const result = await superAdminAgentService.getAgentKpiStats({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const d = result.data;
      setKpiStats({
        totalSoldByAgents: d.totalSoldByAgents ?? 0,
        totalActiveAgents: d.totalActiveAgents ?? 0,
        mostActiveState: d.mostActiveState ?? null,
        mostActiveStateSales: d.mostActiveStateSales ?? 0,
        totalActivePartners: d.totalActivePartners ?? 0,
        stovesInStock: d.stovesInStock ?? 0,
      });
      setActiveAgentIdsInRange(new Set<string>(d.activeAgentIds ?? []));
      setActivePartnerIdsInRange(d.activePartnerIds ?? []);
    } catch (err) {
      console.error("KPI stats error:", err);
    } finally {
      setLoadingKpi(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchKpiStats(); }, [fetchKpiStats]);


  // ── Actions ────────────────────────────────────────────────────────────────
  const handleViewCredentials = async (agent: AcslAgent) => {
    setLoadingCredentialId(agent.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = await tokenManager.getValidToken();
      const res = await fetch(`${supabaseUrl}/functions/v1/manage-credentials?user_id=${agent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCredentialData(json.data);
        setSelectedAgent(agent);
        setShowCredentialModal(true);
      } else {
        alert(json.error ?? "Credentials not found for this agent");
      }
    } catch {
      alert("Failed to load credentials");
    } finally {
      setLoadingCredentialId(null);
    }
  };

  const handleToggleStatus = async (agent: AcslAgent) => {
    const newStatus = agent.status === "active" ? "disabled" : "active";
    try {
      await superAdminAgentService.updateSuperAdminAgent(agent.id, { status: newStatus });
      toast({
        variant: "success",
        title: `"${agent.full_name}" ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
      });
      fetchAgents();
    } catch (err: any) {
      toast({ variant: "error", title: err.message || "Failed to update status" });
    }
  };

  // ── Pagination helpers ─────────────────────────────────────────────────────
  const totalItems = pagination?.totalItems ?? agents.length;
  const totalPages = pagination?.totalPages ?? 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const maxReceived = agents.reduce((max, a) => Math.max(max, a.stove_summary?.received ?? 0), 0);
  const topReceivedAgents = agents.filter((a) => maxReceived > 0 && (a.stove_summary?.received ?? 0) === maxReceived);

  const formatTopNames = (list: AcslAgent[]) => {
    if (list.length === 0) return null;
    return list.map((a) => a.full_name).join(" · ");
  };

  const sortedAgents = useMemo(() => {
    const list = [...agents];
    if (sortMode === "most_received") {
      return list.sort((a, b) => (b.stove_summary?.received ?? 0) - (a.stove_summary?.received ?? 0));
    }
    if (sortMode === "most_sold") {
      return list.sort((a, b) => (b.stove_summary?.sold ?? 0) - (a.stove_summary?.sold ?? 0));
    }
    if (sortMode === "active_agents") {
      return list.filter((a) => activeAgentIdsInRange.has(a.id));
    }
    if (sortMode === "most_active_state" && kpiStats.mostActiveState) {
      return list.filter((a) => a.assigned_states?.includes(kpiStats.mostActiveState!));
    }
    if (sortMode === "active_partners") {
      return list.sort((a, b) => (b.total_partners_count ?? 0) - (a.total_partners_count ?? 0));
    }
    return list;
  }, [agents, sortMode, activeAgentIdsInRange, kpiStats.mostActiveState]);

  const dateBadgeLabel = useMemo(() => {
    const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return (dateFrom || dateTo)
      ? `${dateFrom ? fmt(dateFrom) : "…"} – ${dateTo ? fmt(dateTo) : "…"}`
      : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, [dateFrom, dateTo]);

  return (
    <DashboardLayout currentRoute="agents" title="Agent Manager">
      <div className="p-6 space-y-5">

        <PageHeader
          icon={Users}
          title="Agents Manager"
          right={
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
              onClick={() => setAgentFormMode("create")}
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          }
        />

        {/* Filters */}
        <div
          className="p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: "#f4f7e3" }}
        >
          <div className="w-1/4 min-w-[180px]">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-white h-9 text-xs shadow-none border-gray-200"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-xs shadow-none border-gray-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="disabled" className="text-xs">Disabled</SelectItem>
            </SelectContent>
          </Select>
          {/* Multi-select role filter */}
          <div ref={roleDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((o) => !o)}
              className="flex items-center justify-between gap-2 h-9 px-3 bg-white border border-gray-200 rounded-md text-xs min-w-[160px] max-w-[220px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4a5d0f]/30 shadow-none"
            >
              <span className="truncate text-left">
                {selectedRoles.length === 0 || selectedRoles.length === 3
                  ? "All Roles"
                  : selectedRoles
                      .map((r) =>
                        r === "acsl_agent"
                          ? "ACSL Agent"
                          : r === "acsl_agent_manager"
                          ? "Agent Manager"
                          : "Super Admin"
                      )
                      .join(", ")}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${roleDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {roleDropdownOpen && (
              <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[200px]">
                {/* All Roles option */}
                <button
                  type="button"
                  onClick={() => { setSelectedRoles([]); setPage(1); setRoleDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedRoles.length === 0 ? "text-[#4a5d0f] font-semibold" : "text-gray-700"}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedRoles.length === 0 ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                    {selectedRoles.length === 0 && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  All Roles
                </button>
                <div className="border-t border-gray-100 my-0.5" />
                {(
                  [
                    { value: "acsl_agent", label: "ACSL Agent" },
                    { value: "acsl_agent_manager", label: "ACSL Agent Manager" },
                    { value: "super_admin", label: "Super Admin" },
                  ] as const
                ).map(({ value, label }) => {
                  const checked = selectedRoles.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedRoles((prev) => {
                          const next = prev.includes(value)
                            ? prev.filter((r) => r !== value)
                            : [...prev, value];
                          return next;
                        });
                        setPage(1);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                        {checked && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Month picker */}
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                const m = e.target.value; // "YYYY-MM"
                setSelectedMonth(m);
                if (m) {
                  const [y, mo] = m.split("-").map(Number);
                  const first = `${y}-${String(mo).padStart(2, "0")}-01`;
                  const last = new Date(y, mo, 0); // day 0 of next month = last day of current month
                  const lastStr = `${y}-${String(mo).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
                  setDateFrom(first);
                  setDateTo(lastStr);
                } else {
                  setDateFrom("");
                  setDateTo("");
                }
                setPage(1);
              }}
              className="h-9 bg-white border border-input rounded-md text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring w-[145px]"
              style={{ colorScheme: "light" }}
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSelectedMonth(""); }}
              className="h-9 bg-white border border-input rounded-md text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring w-[140px]"
              style={{ colorScheme: "light" }}
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setSelectedMonth(""); }}
              className="h-9 bg-white border border-input rounded-md text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring w-[140px]"
              style={{ colorScheme: "light" }}
            />
          </div>

          {(search || statusFilter !== "all" || selectedRoles.length !== 1 || selectedRoles[0] !== "acsl_agent" || dateFrom || dateTo) && (
            <Button
              onClick={() => { setSearch(""); setStatusFilter("all"); setSelectedRoles(["acsl_agent"]); setDateFrom(""); setDateTo(""); setSelectedMonth(""); setPage(1); }}
              size="sm"
              variant="outline"
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{startItem}–{endItem}</span> of{" "}
              <span className="font-medium">{totalItems.toLocaleString()}</span> agents
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[65px] h-7 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm font-bold text-green-500">
              Total: <span className="text-[#4a5d0f]">{totalItems.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* KPI Stat Cards — 6-card grid */}
        {(() => {
          const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          // dateBadge: always shows something — for cards that always have date context
          const dateBadge = (dateFrom || dateTo)
            ? `${dateFrom ? fmt(dateFrom) : "…"} – ${dateTo ? fmt(dateTo) : "…"}`
            : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
          // explicitDateBadge: only shows when a date is explicitly set — for cards that are all-time by default
          const explicitDateBadge = (dateFrom || dateTo) ? dateBadge : undefined;

          const cards = [
            {
              gradient: "from-[#B45309] to-[#F59E0B]",
              Icon: Package,
              value: maxReceived > 0 ? maxReceived.toLocaleString() : "—",
              label: "Most Stoves assigned to Agent",
              sub: formatTopNames(topReceivedAgents) ?? "By agent · Highest first",
              badge: undefined as string | undefined,
              mode: "most_received",
              isModal: false,
            },
            {
              gradient: "from-[#194977] to-[#2563EB]",
              Icon: TrendingUp,
              value: loadingKpi ? "—" : kpiStats.totalSoldByAgents.toLocaleString(),
              label: "Total Stoves Sold by Agents",
              sub: "All agents combined",
              badge: dateBadge,
              mode: "most_sold",
              isModal: false,
            },
            {
              gradient: "from-[#047857] to-[#10B981]",
              Icon: Activity,
              value: loadingKpi ? "—" : kpiStats.totalActiveAgents.toLocaleString(),
              label: "Total Active Agents",
              sub: "Agents with sales",
              badge: dateBadge,
              mode: "active_agents",
              isModal: false,
            },
            {
              gradient: "from-[#0e7490] to-[#06b6d4]",
              Icon: MapPin,
              value: loadingKpi ? "—" : (kpiStats.mostActiveState ?? "—"),
              label: "Most Active State",
              sub: kpiStats.mostActiveStateSales > 0 ? `${kpiStats.mostActiveStateSales} sale${kpiStats.mostActiveStateSales !== 1 ? "s" : ""} this period` : "No sales yet",
              badge: dateBadge,
              mode: "most_active_state",
              isModal: false,
            },
            {
              gradient: "from-[#6d28d9] to-[#8b5cf6]",
              Icon: Building2,
              value: loadingKpi ? "—" : kpiStats.totalActivePartners.toLocaleString(),
              label: "Total Active Partners",
              sub: "Partners with sales · Click to view",
              badge: dateBadge,
              mode: null,
              isModal: true,
              onModalClick: () => setShowActivePartnersModal(true),
            },
            {
              gradient: "from-[#334155] to-[#64748b]",
              Icon: Boxes,
              value: loadingKpi ? "—" : kpiStats.stovesInStock.toLocaleString(),
              label: "Stoves in Stock",
              sub: (dateFrom || dateTo) ? "Received in selected period" : "Click to view all stove IDs",
              badge: explicitDateBadge,
              mode: null,
              isModal: true,
            },
          ];

          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cards.map(({ gradient, Icon, value, label, sub, badge, mode, isModal, onModalClick }: any) => {
                const active = !isModal && mode !== null && sortMode === mode;
                const handleClick = onModalClick
                  ? onModalClick
                  : isModal
                  ? () => setShowStockModal(true)
                  : mode !== null
                  ? () => setSortMode(sortMode === mode ? "default" : mode)
                  : undefined;

                return active ? (
                  <div
                    key={label}
                    onClick={handleClick}
                    className={`relative overflow-hidden rounded-lg border-transparent px-4 py-3.5 shadow-md cursor-pointer transition-all bg-gradient-to-br ${gradient} ring-2 ring-white/40`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold text-white tracking-tight leading-tight truncate">{value}</p>
                        <p className="text-[11px] font-semibold text-white/80 mt-0.5">{label}</p>
                        <p className="text-[10px] text-white/60 mt-0.5 truncate">{sub}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="rounded-lg p-1.5 bg-white/20 text-white shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                        {badge && (
                          <span className="text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded whitespace-nowrap">{badge}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={label}
                    onClick={handleClick}
                    className="relative overflow-hidden rounded-lg border bg-white px-4 py-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md group"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold text-gray-900 tracking-tight leading-tight truncate">{value}</p>
                        <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className={`rounded-lg p-1.5 bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {badge && (
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded whitespace-nowrap">{badge}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Active filter banner */}
        {sortMode !== "default" && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
            <span className="font-semibold">
              {sortMode === "most_received" && "Sorted by: Most Stoves Collected"}
              {sortMode === "most_sold" && "Sorted by: Total Stoves Sold"}
              {sortMode === "active_agents" && `Filtered to: Active Agents (${sortedAgents.length} of ${agents.length})`}
              {sortMode === "most_active_state" && `Filtered to: Agents in ${kpiStats.mostActiveState ?? "most active state"}`}
              {sortMode === "active_partners" && "Sorted by: Most Partners"}
            </span>
            <button onClick={() => setSortMode("default")} className="ml-auto flex items-center gap-1 hover:text-primary/70">
              <X className="h-3 w-3" />Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="space-y-0">
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#4a5d0f]" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-[#4a5d0f] hover:bg-[#4a5d0f]">
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Full Name</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">States Assigned</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap text-center">Partners Assigned</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stoves (Assigned / Collected / In Stock)</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={loading ? "opacity-40" : ""}>
                {!loading && sortedAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">
                        {sortMode !== "default" ? "No agents match the active filter" : "No agents found"}
                      </p>
                      {sortMode !== "default" ? (
                        <button onClick={() => setSortMode("default")} className="text-primary text-sm underline mt-1">Clear filter</button>
                      ) : (
                        <p className="text-gray-400 text-sm">Click "Create Agent" to add one.</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAgents.map((agent, idx) => (
                    <TableRow
                      key={agent.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                    >
                      <TableCell className="text-xs font-medium text-gray-900">
                          {agent.full_name}
                      </TableCell>
                      {/* States — name badges, wrapping */}
                      <TableCell className="max-w-[260px]">
                        {!agent.assigned_states ? (
                          <span className="text-gray-400">—</span>
                        ) : agent.assigned_states.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 items-center">
                            {agent.assigned_states.slice(0, 5).map((s) => (
                              <span
                                key={s}
                                className="bg-primary/10 text-primary text-[10px] font-mono px-1.5 py-0.5 rounded"
                              >
                                {s}
                              </span>
                            ))}
                            {agent.assigned_states.length > 5 && (
                              <button
                                onClick={() => setStatesModalAgent(agent)}
                                className="text-[10px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                                title="Click to view all assigned states"
                              >
                                +{agent.assigned_states.length - 5} more
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {/* Partners */}
                      <TableCell className="text-center">
                        {(() => {
                          const total = agent.total_partners_count ?? (agent.assigned_organizations_count ?? 0);
                          if (total === 0) {
                            return (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                0
                              </span>
                            );
                          }
                          return (
                            <button
                              onClick={() => setPartnersModalAgent(agent)}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer"
                              title="Click to view assigned partners"
                            >
                              {total}
                            </button>
                          );
                        })()}
                      </TableCell>
                      {/* Stoves */}
                      <TableCell>
                        {agent.stove_summary ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-purple-700" title="Assigned">
                              {agent.stove_summary.received.toLocaleString()}
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className="font-medium text-blue-600" title="Collected">
                              {agent.stove_summary.sold.toLocaleString()}
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className="font-medium text-green-600" title="In Stock">
                              {agent.stove_summary.available.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          agent.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {agent.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-[#4a5d0f] hover:bg-[#4a5d0f]/90 text-white"
                            onClick={() => setAssignPartnerAgent(agent)}
                          >
                            Assign Partner
                          </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedAgent(agent); setShowViewModal(true); }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            {(agent.role === "acsl_agent" || agent.role === "acsl_agent_manager") && (
                              <DropdownMenuItem
                                onClick={() => handleViewCredentials(agent)}
                                disabled={loadingCredentialId === agent.id}
                              >
                                <KeyRound className="h-4 w-4 mr-2 text-brand" />
                                {loadingCredentialId === agent.id ? "Loading…" : "View Credentials"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedAgent(agent); setAgentFormMode("edit"); }}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(agent)}>
                              {agent.status === "active" ? (
                                <><Ban className="h-4 w-4 mr-2 text-orange-500" />Disable</>
                              ) : (
                                <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Enable</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => { setSelectedAgent(agent); setShowDeleteModal(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
              <p className="text-sm text-gray-600">
                Showing {startItem} to {endItem} of {totalItems.toLocaleString()} agents
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                {getPageNumbers().map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${p === page ? "bg-[#4a5d0f] text-white hover:bg-[#4a5d0f]" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {agentFormMode && (
        <AgentFormModal
          mode={agentFormMode}
          agent={agentFormMode === "edit" ? (selectedAgent ?? undefined) : undefined}
          onClose={() => { setAgentFormMode(null); setSelectedAgent(null); }}
          onSuccess={async (result) => {
            const wasCreate = agentFormMode === "create";
            setAgentFormMode(null);
            setSelectedAgent(null);
            toast({
              variant: "success",
              title: wasCreate
                ? `Agent "${result.full_name}" created successfully`
                : `Agent "${result.full_name}" updated`,
            });
            fetchAgents();
            if (wasCreate && result.id) {
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const token = await tokenManager.getValidToken();
                const res = await fetch(`${supabaseUrl}/functions/v1/manage-credentials?user_id=${result.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (json.success && json.data) {
                  setNewAgentCredentials({ name: result.full_name, email: json.data.email, password: json.data.password });
                  setShowNewCredentialModal(true);
                }
              } catch { /* non-blocking */ }
            }
          }}
        />
      )}
      {showDeleteModal && selectedAgent && (
        <DeleteSuperAdminAgentModal
          agent={selectedAgent}
          onClose={() => { setShowDeleteModal(false); setSelectedAgent(null); }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedAgent(null);
            toast({ variant: "success", title: "Agent deleted successfully" });
            fetchAgents();
          }}
        />
      )}
      {showViewModal && selectedAgent && (
        <ViewSuperAdminAgentModal
          agent={selectedAgent}
          onClose={() => { setShowViewModal(false); setSelectedAgent(null); }}
        />
      )}
      {showAssignModal && selectedAgent && (
        <AssignOrganizationsModal
          agent={selectedAgent}
          onClose={() => { setShowAssignModal(false); setSelectedAgent(null); }}
          onSuccess={() => {
            setShowAssignModal(false);
            toast({ variant: "success", title: "Assignments updated" });
            fetchAgents();
          }}
        />
      )}

      {/* View credentials modal */}
      <AgentViewCredentialModal
        isOpen={showCredentialModal}
        onClose={() => { setShowCredentialModal(false); setCredentialData(null); setSelectedAgent(null); }}
        credential={credentialData}
        agentName={selectedAgent?.full_name}
        canResetPassword
      />

      {/* New agent credentials modal (shown after creation) */}
      <AgentCredentialsModal
        isOpen={showNewCredentialModal}
        onClose={() => { setShowNewCredentialModal(false); setNewAgentCredentials(null); }}
        credentials={newAgentCredentials}
      />

      <AgentPartnersModal
        agent={partnersModalAgent}
        isOpen={!!partnersModalAgent}
        onClose={() => setPartnersModalAgent(null)}
      />

      <AgentStatesModal
        agent={statesModalAgent}
        isOpen={!!statesModalAgent}
        onClose={() => setStatesModalAgent(null)}
      />

      <AssignPartnerModal
        agent={assignPartnerAgent}
        isOpen={!!assignPartnerAgent}
        onClose={() => setAssignPartnerAgent(null)}
        onSuccess={() => {
          setAssignPartnerAgent(null);
          toast({ variant: "success", title: "Partner assignments updated" });
          fetchAgents();
        }}
      />

      <StockModal isOpen={showStockModal} onClose={() => setShowStockModal(false)} />

      <ActivePartnersModal
        isOpen={showActivePartnersModal}
        onClose={() => setShowActivePartnersModal(false)}
        partnerIds={activePartnerIdsInRange}
        dateBadge={dateBadgeLabel}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </DashboardLayout>
  );
}
