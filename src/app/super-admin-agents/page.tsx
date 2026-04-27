"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Users,
  UserCheck,
  Search,
  X,
  Loader2,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Building2,
  Ban,
  CheckCircle2,
  Map,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import superAdminAgentService from "../services/superAdminAgentService";
import CreateSuperAdminAgentModal from "./components/CreateSuperAdminAgentModal";
import EditSuperAdminAgentModal from "./components/EditSuperAdminAgentModal";
import DeleteSuperAdminAgentModal from "./components/DeleteSuperAdminAgentModal";
import ViewSuperAdminAgentModal from "./components/ViewSuperAdminAgentModal";
import AssignOrganizationsModal from "./components/AssignOrganizationsModal";

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
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

const SuperAdminAgentsPage = () => {
  const { toast, toasts, removeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
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
  }, [currentPage, pageSize, searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || roleFilter !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setCurrentPage(1);
  };

  const handleCreateSuccess = (newAgent: Agent) => {
    setShowCreateModal(false);
    toast({ variant: "success", title: `Agent "${newAgent.full_name}" created successfully` });
    fetchAgents();
  };

  const handleEditSuccess = (updatedAgent: Agent) => {
    setShowEditModal(false);
    setSelectedAgent(null);
    toast({ variant: "success", title: `Agent "${updatedAgent.full_name}" updated successfully` });
    fetchAgents();
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedAgent(null);
    toast({ variant: "success", title: "Agent deleted successfully" });
    fetchAgents();
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    toast({ variant: "success", title: "Organization assignments updated successfully" });
    fetchAgents();
  };

  const handleToggleStatus = async (agent: Agent) => {
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

  const stats = useMemo(() => {
    const total = pagination?.totalItems ?? agents.length;
    const active = agents.filter((a) => a.status === "active").length;
    const totalOrgs = agents.reduce((sum, a) => sum + (a.assigned_organizations_count ?? 0), 0);
    const totalStates = agents.reduce((sum, a) => sum + (a.assigned_states_count ?? 0), 0);
    return { total, active, totalOrgs, totalStates };
  }, [agents, pagination]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const totalItems = pagination?.totalItems ?? agents.length;
  const totalPages = pagination?.totalPages ?? 1;
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout
        currentRoute="super-admin-agents"
        title="ACSL Agents"
        rightButton={
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        }
      >
        <div className="p-6 space-y-5">

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">Retry</Button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total ACSL Agents</p>
                  <p className="text-xl font-bold text-blue-900">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">Registered</p>
                </div>
              </div>
            </div>

            <div
              className={`bg-green-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${statusFilter === "active" ? "border-green-600 shadow-md" : "border-green-200"}`}
              onClick={() => setStatusFilter((f) => f === "active" ? "all" : "active")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Active Agents</p>
                  <p className="text-xl font-bold text-green-900">{stats.active}</p>
                  <p className="text-xs text-green-500">Click to filter</p>
                </div>
              </div>
              {statusFilter === "active" && (
                <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Filter active — click again to clear</p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Org Assignments</p>
                  <p className="text-xl font-bold text-amber-900">{stats.totalOrgs.toLocaleString()}</p>
                  <p className="text-xs text-amber-500">Across all agents</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Map className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">State Assignments</p>
                  <p className="text-xl font-bold text-purple-900">{stats.totalStates.toLocaleString()}</p>
                  <p className="text-xs text-purple-500">Across all agents</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="space-y-0">
            {/* Pagination header */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startItem}–{endItem}</span> of{" "}
                  <span className="font-medium">{totalItems.toLocaleString()}</span> agents
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[65px] h-7 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
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
                Total Agents: <span className="text-[#07376a]">{totalItems.toLocaleString()}</span>
              </p>
            </div>

            {/* Table */}
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
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Assigned Partners</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Created</TableHead>
                    <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? "opacity-40" : ""}>
                  {!loading && agents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No agents found</p>
                        <p className="text-gray-400 text-sm">
                          {hasActiveFilters ? "Try clearing your filters." : 'Click "Add Agent" to create one.'}
                        </p>
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
                          <div className="flex items-center gap-1.5">
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
                        <TableCell className="text-xs text-gray-600">{formatDate(agent.created_at)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {["acsl_agent", "super_admin_agent"].includes(agent.role) && (
                              <Button
                                size="sm"
                                className="bg-[#07376a] hover:bg-[#07376a]/90 text-white h-7 px-2 text-xs"
                                onClick={() => { setSelectedAgent(agent); setShowAssignModal(true); }}
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                Assign Partners
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedAgent(agent); setShowViewModal(true); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedAgent(agent); setShowEditModal(true); }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
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
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
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

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startItem} to {endItem} of {totalItems.toLocaleString()} agents
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Prev
                  </Button>
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${page === currentPage ? "bg-[#07376a] text-white hover:bg-[#07376a]" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showCreateModal && (
          <CreateSuperAdminAgentModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
        {showEditModal && selectedAgent && (
          <EditSuperAdminAgentModal
            agent={selectedAgent}
            onClose={() => { setShowEditModal(false); setSelectedAgent(null); }}
            onSuccess={handleEditSuccess}
          />
        )}
        {showDeleteModal && selectedAgent && (
          <DeleteSuperAdminAgentModal
            agent={selectedAgent}
            onClose={() => { setShowDeleteModal(false); setSelectedAgent(null); }}
            onSuccess={handleDeleteSuccess}
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
            onSuccess={handleAssignSuccess}
          />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentsPage;
