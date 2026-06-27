import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import superAdminAgentService from "../../services/superAdminAgentService";
import { useToast, ToastContainer } from "@/components/ui/toast";
import ViewSuperAdminAgentModal from "../../super-admin-agents/components/ViewSuperAdminAgentModal";
import EditSuperAdminAgentModal from "../../super-admin-agents/components/EditSuperAdminAgentModal";
import AgentViewCredentialModal from "../../admin/components/agents/AgentViewCredentialModal";
import tokenManager from "@/utils/tokenManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Building2, Search } from "lucide-react";

const PAGE_SIZE = 10;

const AgentsProfilesContent = () => {
  const { toast, toasts, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", role: "" });
  const [page, setPage] = useState(1);

  const [detailsAgent, setDetailsAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [credentialAgent, setCredentialAgent] = useState(null);
  const [credentialData, setCredentialData] = useState(null);
  const [loadingCredentialId, setLoadingCredentialId] = useState(null);

  const [statesModalAgent, setStatesModalAgent] = useState(null);
  const [statesModalList, setStatesModalList] = useState([]);
  const [statesModalLoading, setStatesModalLoading] = useState(false);

  const [partnersModalAgent, setPartnersModalAgent] = useState(null);
  const [partnersModalList, setPartnersModalList] = useState([]);
  const [partnersModalLoading, setPartnersModalLoading] = useState(false);

  const openStatesModal = async (agent) => {
    setStatesModalAgent(agent);
    setStatesModalList([]);
    setStatesModalLoading(true);
    try {
      const res = await superAdminAgentService.getAgentStates(agent.id);
      const list = res?.data || res?.states || res || [];
      setStatesModalList(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ variant: "error", title: "Failed to load states", description: err.message });
    } finally {
      setStatesModalLoading(false);
    }
  };

  const openPartnersModal = async (agent) => {
    setPartnersModalAgent(agent);
    setPartnersModalList([]);
    setPartnersModalLoading(true);
    try {
      const res = await superAdminAgentService.getAgentOrganizations(agent.id);
      const list = res?.data || res?.organizations || res || [];
      setPartnersModalList(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ variant: "error", title: "Failed to load partners", description: err.message });
    } finally {
      setPartnersModalLoading(false);
    }
  };



  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await superAdminAgentService.getSuperAdminAgents({ page: 1, limit: 1000 });
      setAgents(res.data || []);
    } catch (err) {
      toast({ variant: "error", title: "Failed to load agents", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleViewCredentials = async (agent) => {
    setLoadingCredentialId(agent.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = await tokenManager.getValidToken();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/manage-credentials?user_id=${agent.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.success && json.data) {
        setCredentialData(json.data);
        setCredentialAgent(agent);
      } else {
        toast({
          variant: "error",
          title: "No credentials found",
          description: json.error || "This agent has no credentials.",
        });
      }
    } catch (err) {
      toast({ variant: "error", title: "Error", description: err.message });
    } finally {
      setLoadingCredentialId(null);
    }
  };

  const roles = useMemo(() => {
    const s = new Set();
    agents.forEach((a) => a.role && s.add(a.role));
    return Array.from(s).sort();
  }, [agents]);

  const formatRole = (r) =>
    (r || "")
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const ROLE_BADGE = {
    acsl_agent: "bg-blue-100 text-blue-700",
    acsl_agent_manager: "bg-purple-100 text-purple-700",
    super_admin: "bg-red-100 text-red-700",
    partner: "bg-amber-100 text-amber-700",
    partner_agent: "bg-teal-100 text-teal-700",
  };

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.role && a.role !== filters.role) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${a.full_name ?? ""} ${a.email ?? ""} ${a.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agents, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRecord = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const hasActiveFilters = filters.search !== "" || filters.status !== "" || filters.role !== "";

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ search: "", status: "", role: "" });
    setPage(1);
  };

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={Users} title="Agents Profile" />

      {/* Filter Bar */}
      <div
        className="p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: "#f4f7e3" }}
      >
        <div className="w-1/4 min-w-[180px]">
          <Input
            placeholder="Search name, email or phone..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="bg-white h-9 text-xs shadow-none border-gray-200"
          />
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[170px] h-9 bg-white text-xs shadow-none border-gray-200 text-gray-400 data-[placeholder]:text-gray-400">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="disabled" className="text-xs">Disabled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.role || "all"}
          onValueChange={(v) => handleFilterChange("role", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px] h-9 bg-white text-xs shadow-none border-gray-200 text-gray-400 data-[placeholder]:text-gray-400">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all" className="text-xs">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">{formatRole(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleClearFilters}
          size="sm"
          variant="outline"
          className="h-9 bg-white shadow-none border-gray-200"
          disabled={!hasActiveFilters}
        >
          <X className="h-4 w-4 mr-1" />
          Reset Filters
        </Button>

        <p className="ml-auto text-sm text-gray-600">
          Showing <span className="font-medium">{startRecord}</span> to{" "}
          <span className="font-medium">{endRecord}</span> of{" "}
          <span className="font-medium">{filtered.length}</span> agents
        </p>
      </div>

      {/* Table */}
      <div className="space-y-0">
        <div className="bg-white border-x border-t border-gray-200 rounded-t-lg overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#4a5d0f" }} className="hover:bg-transparent">
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap first:rounded-tl-lg">Full Name</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Role</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap text-center">States Assigned</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap text-center">Partners Assigned</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right text-white font-semibold text-sm whitespace-nowrap rounded-tr-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={loading ? "opacity-40" : ""}>
              {pageRows.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                    No agents found
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((a, idx) => (
                  <TableRow
                    key={a.id}
                    className="hover:bg-[#eef3c4] text-gray-700"
                    style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f7e3" }}
                  >
                    <TableCell className="text-sm font-medium text-gray-900">{a.full_name || "N/A"}</TableCell>
                    <TableCell className="text-sm">
                      {a.role ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ROLE_BADGE[a.role] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {formatRole(a.role)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      {(() => {
                        const n = a.assigned_states_count ?? 0;
                        const cls = n > 0
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200";
                        return (
                          <button
                            type="button"
                            onClick={() => openStatesModal(a)}
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold transition ${cls}`}
                          >
                            {n}
                          </button>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      {(() => {
                        const n = a.total_partners_count ?? a.assigned_organizations_count ?? 0;
                        const cls = n > 0
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200";
                        return (
                          <button
                            type="button"
                            onClick={() => openPartnersModal(a)}
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold transition ${cls}`}
                          >
                            {n}
                          </button>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {a.status || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setDetailsAgent(a)}
                                aria-label="View details"
                                className="inline-flex items-center justify-center h-8 px-3 bg-slate-700 text-white text-xs font-medium shadow-sm hover:bg-slate-800 active:scale-[0.98] transition"
                              >
                                Details
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View agent details</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleViewCredentials(a)}
                                disabled={loadingCredentialId === a.id}
                                aria-label="Credentials"
                                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-60"
                              >
                                {loadingCredentialId === a.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : null}
                                Credentials
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View login credentials</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setEditingAgent(a)}
                                aria-label="Edit agent"
                                className="inline-flex items-center justify-center h-8 px-3 bg-orange-500 text-white text-xs font-medium shadow-sm hover:bg-orange-600 active:scale-[0.98] transition"
                              >
                                Edit
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit agent</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{startRecord}</span> to{" "}
              <span className="font-medium">{endRecord}</span> of{" "}
              <span className="font-medium">{filtered.length}</span> agents
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                {getVisiblePages().map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${p === currentPage ? "bg-brand text-white hover:bg-brand" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {detailsAgent && (
        <ViewSuperAdminAgentModal
          agent={detailsAgent}
          onClose={() => setDetailsAgent(null)}
        />
      )}

      {editingAgent && (
        <EditSuperAdminAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSuccess={() => {
            setEditingAgent(null);
            loadAgents();
          }}
        />
      )}

      <AgentViewCredentialModal
        isOpen={!!credentialAgent}
        onClose={() => {
          setCredentialAgent(null);
          setCredentialData(null);
        }}
        credential={credentialData}
      />

      {/* States Assigned Modal */}
      <Dialog open={!!statesModalAgent} onOpenChange={(o) => !o && setStatesModalAgent(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4" style={{ backgroundColor: "#4a5d0f" }}>
            <DialogTitle className="text-white text-base">
              States Assigned — {statesModalAgent?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {statesModalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#4a5d0f]" />
              </div>
            ) : statesModalList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No states assigned</p>
            ) : (
              <ul className="space-y-2">
                {statesModalList.map((s, i) => {
                  const name = typeof s === "string" ? s : (s.state || s.name || JSON.stringify(s));
                  return (
                    <li
                      key={`${name}-${i}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md border border-gray-100"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f4f7e3" }}
                    >
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#eef3c4] text-[#4a5d0f]">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="text-sm text-gray-800 font-medium">{name}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Partners Assigned Modal */}
      <Dialog open={!!partnersModalAgent} onOpenChange={(o) => !o && setPartnersModalAgent(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4" style={{ backgroundColor: "#4a5d0f" }}>
            <DialogTitle className="text-white text-base">
              Assigned Partners — {partnersModalAgent?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {partnersModalLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#4a5d0f]" />
              </div>
            ) : partnersModalList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No partners assigned</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: "#eef3c4" }} className="hover:bg-transparent">
                    <TableHead className="text-[#4a5d0f] font-semibold text-xs">Partner Name</TableHead>
                    <TableHead className="text-[#4a5d0f] font-semibold text-xs">State</TableHead>
                    <TableHead className="text-[#4a5d0f] font-semibold text-xs">Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnersModalList.map((p, i) => (
                    <TableRow
                      key={p.id || p.assignment_id || i}
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f4f7e3" }}
                    >
                      <TableCell className="text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#4a5d0f]" />
                          {p.partner_name || p.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{p.state || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-700">{p.branch || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default AgentsProfilesContent;
