"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import AgentFormModal from "../../components/AgentFormModal";
import DeleteSuperAdminAgentModal from "../../super-admin-agents/components/DeleteSuperAdminAgentModal";
import ViewSuperAdminAgentModal from "../../super-admin-agents/components/ViewSuperAdminAgentModal";
import AssignOrganizationsModal from "../../super-admin-agents/components/AssignOrganizationsModal";
import PageHeader from "../../components/PageHeader";

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

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AcslAgent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [agentFormMode, setAgentFormMode] = useState<"create" | "edit" | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AcslAgent | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: pageSize };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (roleFilter !== "all") params.role = roleFilter;
      const result = await superAdminAgentService.getSuperAdminAgents(params);
      setAgents(result.data || []);
      setPagination(result.pagination || null);
    } catch (err: any) {
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, roleFilter]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { setPage(1); }, [search, statusFilter, roleFilter]);

  // ── Actions ────────────────────────────────────────────────────────────────
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
              Create Agent
            </Button>
          }
        />

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
          <div className="w-1/4 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-white h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all" || roleFilter !== "all") && (
            <Button
              onClick={() => { setSearch(""); setStatusFilter("all"); setRoleFilter("all"); setPage(1); }}
              size="sm"
              variant="outline"
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="space-y-0">
          <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
            </div>
            <p className="text-sm font-bold text-green-500">
              Total: <span className="text-[#07376a]">{totalItems.toLocaleString()}</span>
            </p>
          </div>

          <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#07376a]" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-[#07376a] hover:bg-[#07376a]">
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Full Name</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Email</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Role</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Assigned to Partners</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Last Modified</TableHead>
                  <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={loading ? "opacity-40" : ""}>
                {!loading && agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No agents found</p>
                      <p className="text-gray-400 text-sm">Click "Create Agent" to add one.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent, idx) => (
                    <TableRow
                      key={agent.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                    >
                      <TableCell className="text-xs font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#07376a]/10 flex items-center justify-center text-[#07376a] font-semibold text-[11px] flex-shrink-0">
                            {agent.full_name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          {agent.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{agent.email}</TableCell>
                      <TableCell className="text-xs text-gray-600">{agent.phone || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          agent.role === "super_admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {agent.role === "super_admin" ? "Super Admin" : "ACSL Agent"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {agent.assigned_organizations_count ?? 0} org{(agent.assigned_organizations_count ?? 0) !== 1 ? "s" : ""}
                          </span>
                          {(agent.assigned_states_count ?? 0) > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {agent.assigned_states_count} state{agent.assigned_states_count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
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
                      <TableCell>
                        {(() => {
                          const hasEdit = !!agent.updated_at && agent.updated_at !== agent.created_at;
                          const ts = hasEdit ? agent.updated_at! : agent.created_at;
                          const d = new Date(ts);
                          const dateLine = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                          const timeLine = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                          const byName = hasEdit ? (agent.updated_by_name ?? "Admin") : null;
                          return (
                            <div className="space-y-0.5 min-w-[120px]">
                              {byName && (
                                <p className="text-xs font-semibold text-gray-800 truncate">{byName}</p>
                              )}
                              <p className="text-xs text-gray-600">{dateLine}</p>
                              <p className="text-[10px] text-gray-400">{timeLine}</p>
                              {!hasEdit && (
                                <p className="text-[9px] text-gray-300 font-mono leading-none">created</p>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
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
                    className={`h-8 w-8 p-0 ${p === page ? "bg-[#07376a] text-white hover:bg-[#07376a]" : ""}`}
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
          onSuccess={(result) => {
            setAgentFormMode(null);
            setSelectedAgent(null);
            toast({
              variant: "success",
              title: agentFormMode === "create"
                ? `Agent "${result.full_name}" created successfully`
                : `Agent "${result.full_name}" updated`,
            });
            fetchAgents();
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </DashboardLayout>
  );
}
