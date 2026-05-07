"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  UserCheck,
  UserX,
  TrendingUp,
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
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import adminAgentService from "../../services/adminAgentService.jsx";
import CreateSuperAdminAgentModal from "../../super-admin-agents/components/CreateSuperAdminAgentModal";
import EditSuperAdminAgentModal from "../../super-admin-agents/components/EditSuperAdminAgentModal";
import DeleteSuperAdminAgentModal from "../../super-admin-agents/components/DeleteSuperAdminAgentModal";
import ViewSuperAdminAgentModal from "../../super-admin-agents/components/ViewSuperAdminAgentModal";
import AssignOrganizationsModal from "../../super-admin-agents/components/AssignOrganizationsModal";
import ViewAgentModal from "../../admin/components/agents/ViewAgentModal";
import { SalesAgent } from "@/types/salesAgent";

interface AcslAgent {
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

type TabId = "acsl" | "partner";

export default function SuperAdminAgentsContent() {
  const { toast, toasts, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("acsl");

  // --- ACSL Agents state ---
  const [acslLoading, setAcslLoading] = useState(true);
  const [acslAgents, setAcslAgents] = useState<AcslAgent[]>([]);
  const [acslPagination, setAcslPagination] = useState<PaginationInfo | null>(null);
  const [acslError, setAcslError] = useState<string | null>(null);
  const [acslSearch, setAcslSearch] = useState("");
  const [acslStatusFilter, setAcslStatusFilter] = useState("all");
  const [acslRoleFilter, setAcslRoleFilter] = useState("all");
  const [acslPage, setAcslPage] = useState(1);
  const [acslPageSize, setAcslPageSize] = useState(25);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewAcslModal, setShowViewAcslModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAcslAgent, setSelectedAcslAgent] = useState<AcslAgent | null>(null);

  // --- Partner Agents state ---
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [partnerAgents, setPartnerAgents] = useState<(SalesAgent & { organization_name?: string | null })[]>([]);
  const [partnerPagination, setPartnerPagination] = useState<PaginationInfo | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerActivityFilter, setPartnerActivityFilter] = useState("all");
  const [partnerSortBy, setPartnerSortBy] = useState("created_at");
  const [partnerSortOrder, setPartnerSortOrder] = useState("desc");
  const [partnerPage, setPartnerPage] = useState(1);
  const [partnerPageSize, setPartnerPageSize] = useState(25);
  const [showViewPartnerModal, setShowViewPartnerModal] = useState(false);
  const [selectedPartnerAgent, setSelectedPartnerAgent] = useState<SalesAgent | null>(null);

  // Fetch ACSL agents
  const fetchAcslAgents = useCallback(async () => {
    setAcslLoading(true);
    setAcslError(null);
    try {
      const params: Record<string, string | number> = { page: acslPage, limit: acslPageSize };
      if (acslSearch.trim()) params.search = acslSearch.trim();
      if (acslStatusFilter !== "all") params.status = acslStatusFilter;
      if (acslRoleFilter !== "all") params.role = acslRoleFilter;
      const result = await superAdminAgentService.getSuperAdminAgents(params);
      setAcslAgents(result.data || []);
      setAcslPagination(result.pagination || null);
    } catch (err: any) {
      setAcslError(err.message || "Failed to load ACSL agents");
    } finally {
      setAcslLoading(false);
    }
  }, [acslPage, acslPageSize, acslSearch, acslStatusFilter, acslRoleFilter]);

  // Fetch Partner agents
  const fetchPartnerAgents = useCallback(async () => {
    setPartnerLoading(true);
    setPartnerError(null);
    try {
      const response = await adminAgentService.getSalesAgents({
        page: partnerPage,
        limit: partnerPageSize,
        search: partnerSearch,
        sortBy: partnerSortBy,
        sortOrder: partnerSortOrder,
      });
      if (response.success) {
        setPartnerAgents(response.data || []);
        setPartnerPagination(response.pagination);
      } else {
        setPartnerError(response.error || "Failed to load partner agents");
      }
    } catch {
      setPartnerError("An unexpected error occurred");
    } finally {
      setPartnerLoading(false);
    }
  }, [partnerPage, partnerPageSize, partnerSearch, partnerSortBy, partnerSortOrder]);

  useEffect(() => { fetchAcslAgents(); }, [fetchAcslAgents]);
  useEffect(() => { setAcslPage(1); }, [acslSearch, acslStatusFilter, acslRoleFilter]);
  useEffect(() => { fetchPartnerAgents(); }, [fetchPartnerAgents]);
  useEffect(() => { setPartnerPage(1); }, [partnerSearch, partnerActivityFilter]);

  // ACSL stats
  const acslStats = useMemo(() => {
    const total = acslPagination?.totalItems ?? acslAgents.length;
    const active = acslAgents.filter((a) => a.status === "active").length;
    const totalOrgs = acslAgents.reduce((sum, a) => sum + (a.assigned_organizations_count ?? 0), 0);
    const totalStates = acslAgents.reduce((sum, a) => sum + (a.assigned_states_count ?? 0), 0);
    return { total, active, totalOrgs, totalStates };
  }, [acslAgents, acslPagination]);

  // Partner agents stats + filtered
  const filteredPartnerAgents = useMemo(() => {
    if (partnerActivityFilter === "all") return partnerAgents;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return partnerAgents.filter((a) => {
      if (partnerActivityFilter === "active") return a.last_login && now - new Date(a.last_login).getTime() <= sevenDays;
      if (partnerActivityFilter === "inactive") return a.last_login && now - new Date(a.last_login).getTime() > sevenDays;
      if (partnerActivityFilter === "never") return !a.last_login;
      return true;
    });
  }, [partnerAgents, partnerActivityFilter]);

  const partnerStats = useMemo(() => {
    const total = partnerPagination?.totalItems ?? partnerAgents.length;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const activeCount = partnerAgents.filter((a) => a.last_login && now - new Date(a.last_login).getTime() <= sevenDays).length;
    const noSalesCount = partnerAgents.filter((a) => (a.total_sold ?? 0) === 0).length;
    const totalSold = partnerAgents.reduce((sum, a) => sum + (a.total_sold ?? 0), 0);
    return { total, activeCount, noSalesCount, totalSold };
  }, [partnerAgents, partnerPagination]);

  const handleToggleAcslStatus = async (agent: AcslAgent) => {
    const newStatus = agent.status === "active" ? "disabled" : "active";
    try {
      await superAdminAgentService.updateSuperAdminAgent(agent.id, { status: newStatus });
      toast({ variant: "success", title: `"${agent.full_name}" ${newStatus === "active" ? "enabled" : "disabled"} successfully` });
      fetchAcslAgents();
    } catch (err: any) {
      toast({ variant: "error", title: err.message || "Failed to update status" });
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const formatLastLogin = (dateStr: string | null | undefined) => {
    if (!dateStr) return <span className="text-gray-400 text-xs">Never</span>;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return <span className="text-green-600 text-xs font-medium">Today</span>;
    if (days === 1) return <span className="text-green-600 text-xs font-medium">Yesterday</span>;
    if (days <= 7) return <span className="text-green-600 text-xs font-medium">{days}d ago</span>;
    if (days <= 30) return <span className="text-amber-600 text-xs font-medium">{days}d ago</span>;
    return <span className="text-red-500 text-xs font-medium">{formatDate(dateStr)}</span>;
  };

  const handlePartnerSort = (col: string) => {
    if (partnerSortBy === col) setPartnerSortOrder((p) => p === "asc" ? "desc" : "asc");
    else { setPartnerSortBy(col); setPartnerSortOrder("desc"); }
    setPartnerPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (partnerSortBy !== col) return null;
    return partnerSortOrder === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 inline" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 inline" />;
  };

  // ACSL pagination
  const acslTotalItems = acslPagination?.totalItems ?? acslAgents.length;
  const acslTotalPages = acslPagination?.totalPages ?? 1;
  const acslStartItem = (acslPage - 1) * acslPageSize + 1;
  const acslEndItem = Math.min(acslPage * acslPageSize, acslTotalItems);
  const getAcslPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, acslPage - 2);
    const end = Math.min(acslTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // Partner pagination
  const partnerTotalRecords = partnerPagination?.totalItems ?? filteredPartnerAgents.length;
  const partnerTotalPages = partnerPagination?.totalPages ?? 1;
  const partnerStartItem = (partnerPage - 1) * partnerPageSize + 1;
  const partnerEndItem = Math.min(partnerPage * partnerPageSize, partnerTotalRecords);
  const getPartnerPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, partnerPage - Math.floor(maxVisible / 2));
    const end = Math.min(partnerTotalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "acsl", label: "ACSL Agents", count: acslStats.total },
    { id: "partner", label: "Partner Agents", count: partnerStats.total },
  ];

  return (
    <DashboardLayout
      currentRoute="agents"
      title="Agents"
      rightButton={
        activeTab === "acsl" ? (
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add ACSL Agent
          </Button>
        ) : undefined
      }
    >
      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#07376a] text-[#07376a]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-[#07376a] text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ACSL Agents Tab */}
        {activeTab === "acsl" && (
          <>
            {acslError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <span>{acslError}</span>
                <Button variant="outline" size="sm" onClick={fetchAcslAgents} className="ml-auto">Retry</Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-700" /></div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total ACSL Agents</p>
                    <p className="text-xl font-bold text-blue-900">
                      {acslLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : acslStats.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500">Registered</p>
                  </div>
                </div>
              </div>

              <div
                className={`bg-green-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${acslStatusFilter === "active" ? "border-green-600 shadow-md" : "border-green-200"}`}
                onClick={() => setAcslStatusFilter((f) => f === "active" ? "all" : "active")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-700" /></div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Active Agents</p>
                    <p className="text-xl font-bold text-green-900">{acslStats.active}</p>
                    <p className="text-xs text-green-500">Click to filter</p>
                  </div>
                </div>
                {acslStatusFilter === "active" && (
                  <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Filter active — click again to clear</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><Building2 className="h-5 w-5 text-amber-700" /></div>
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Org Assignments</p>
                    <p className="text-xl font-bold text-amber-900">{acslStats.totalOrgs.toLocaleString()}</p>
                    <p className="text-xs text-amber-500">Across all agents</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><Map className="h-5 w-5 text-purple-700" /></div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">State Assignments</p>
                    <p className="text-xl font-bold text-purple-900">{acslStats.totalStates.toLocaleString()}</p>
                    <p className="text-xs text-purple-500">Across all agents</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
              <div className="w-1/4 min-w-[180px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={acslSearch}
                  onChange={(e) => { setAcslSearch(e.target.value); setAcslPage(1); }}
                  className="pl-9 bg-white h-9 text-sm"
                />
              </div>
              <Select value={acslStatusFilter} onValueChange={(v) => { setAcslStatusFilter(v); setAcslPage(1); }}>
                <SelectTrigger className="w-[150px] h-9 bg-white text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={acslRoleFilter} onValueChange={(v) => { setAcslRoleFilter(v); setAcslPage(1); }}>
                <SelectTrigger className="w-[150px] h-9 bg-white text-sm"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              {(acslSearch || acslStatusFilter !== "all" || acslRoleFilter !== "all") && (
                <Button onClick={() => { setAcslSearch(""); setAcslStatusFilter("all"); setAcslRoleFilter("all"); setAcslPage(1); }} size="sm" variant="outline" className="h-9">
                  <X className="h-4 w-4 mr-1" />Clear
                </Button>
              )}
            </div>

            <div className="space-y-0">
              <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{acslStartItem}–{acslEndItem}</span> of{" "}
                    <span className="font-medium">{acslTotalItems.toLocaleString()}</span> agents
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">per page:</span>
                    <Select value={acslPageSize.toString()} onValueChange={(v) => { setAcslPageSize(Number(v)); setAcslPage(1); }}>
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
                <p className="text-sm font-bold text-green-500">Total: <span className="text-[#07376a]">{acslTotalItems.toLocaleString()}</span></p>
              </div>

              <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
                {acslLoading && (
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
                  <TableBody className={acslLoading ? "opacity-40" : ""}>
                    {!acslLoading && acslAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No agents found</p>
                          <p className="text-gray-400 text-sm">Click "Add ACSL Agent" to create one.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      acslAgents.map((agent, idx) => (
                        <TableRow key={agent.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}>
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
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${agent.role === "super_admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
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
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${agent.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
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
                                  onClick={() => { setSelectedAcslAgent(agent); setShowAssignModal(true); }}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />Assign Partners
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setSelectedAcslAgent(agent); setShowViewAcslModal(true); }}>
                                    <Eye className="h-4 w-4 mr-2" />View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSelectedAcslAgent(agent); setShowEditModal(true); }}>
                                    <Edit className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleAcslStatus(agent)}>
                                    {agent.status === "active" ? (
                                      <><Ban className="h-4 w-4 mr-2 text-orange-500" />Disable</>
                                    ) : (
                                      <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Enable</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedAcslAgent(agent); setShowDeleteModal(true); }}>
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

              {acslTotalPages > 1 && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                  <p className="text-sm text-gray-600">Showing {acslStartItem} to {acslEndItem} of {acslTotalItems.toLocaleString()} agents</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAcslPage(1)} disabled={acslPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAcslPage((p) => Math.max(1, p - 1))} disabled={acslPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
                    {getAcslPageNumbers().map((page) => (
                      <Button key={page} variant={page === acslPage ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${page === acslPage ? "bg-[#07376a] text-white hover:bg-[#07376a]" : ""}`} onClick={() => setAcslPage(page)}>{page}</Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAcslPage((p) => Math.min(acslTotalPages, p + 1))} disabled={acslPage === acslTotalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAcslPage(acslTotalPages)} disabled={acslPage === acslTotalPages}><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Partner Agents Tab */}
        {activeTab === "partner" && (
          <>
            {partnerError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{partnerError}</span>
                <Button variant="outline" size="sm" onClick={fetchPartnerAgents} className="ml-auto">Try Again</Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-700" /></div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Agents</p>
                    <p className="text-xl font-bold text-blue-900">{partnerStats.total.toLocaleString()}</p>
                    <p className="text-xs text-blue-500">Across all partners</p>
                  </div>
                </div>
              </div>
              <div
                className={`bg-green-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${partnerActivityFilter === "active" ? "border-green-600 shadow-md" : "border-green-200"}`}
                onClick={() => setPartnerActivityFilter((f) => f === "active" ? "all" : "active")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="h-5 w-5 text-green-700" /></div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Active (7 days)</p>
                    <p className="text-xl font-bold text-green-900">{partnerStats.activeCount}</p>
                    <p className="text-xs text-green-500">Click to filter</p>
                  </div>
                </div>
                {partnerActivityFilter === "active" && (
                  <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Active — click to clear</p>
                )}
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg"><UserX className="h-5 w-5 text-red-700" /></div>
                  <div>
                    <p className="text-sm text-red-600 font-medium">Zero Sales</p>
                    <p className="text-xl font-bold text-red-900">{partnerStats.noSalesCount}</p>
                    <p className="text-xs text-red-500">Need attention</p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="h-5 w-5 text-amber-700" /></div>
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Total Stoves Sold</p>
                    <p className="text-xl font-bold text-amber-900">{partnerStats.totalSold.toLocaleString()}</p>
                    <p className="text-xs text-amber-500">Across all agents</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
              <div className="w-1/4 min-w-[180px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={partnerSearch}
                  onChange={(e) => { setPartnerSearch(e.target.value); setPartnerPage(1); }}
                  className="pl-9 bg-white h-9 text-sm"
                />
              </div>
              <Select value={partnerActivityFilter} onValueChange={(v) => { setPartnerActivityFilter(v); setPartnerPage(1); }}>
                <SelectTrigger className="w-[170px] h-9 bg-white text-sm"><SelectValue placeholder="All activity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="active">Active (last 7 days)</SelectItem>
                  <SelectItem value="inactive">Inactive (&gt;7 days)</SelectItem>
                  <SelectItem value="never">Never Logged In</SelectItem>
                </SelectContent>
              </Select>
              {(partnerSearch || partnerActivityFilter !== "all") && (
                <Button onClick={() => { setPartnerSearch(""); setPartnerActivityFilter("all"); setPartnerPage(1); }} size="sm" variant="outline" className="h-9">
                  <X className="h-4 w-4 mr-1" />Clear
                </Button>
              )}
            </div>

            <div className="space-y-0">
              <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{partnerStartItem}–{partnerEndItem}</span> of{" "}
                    <span className="font-medium">{partnerTotalRecords.toLocaleString()}</span> agents
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">per page:</span>
                    <Select value={partnerPageSize.toString()} onValueChange={(v) => { setPartnerPageSize(Number(v)); setPartnerPage(1); }}>
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
                <p className="text-sm font-bold text-green-500">Total: <span className="text-[#07376a]">{partnerTotalRecords.toLocaleString()}</span></p>
              </div>

              <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
                {partnerLoading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#07376a] border-t-transparent" />
                  </div>
                )}
                {filteredPartnerAgents.length === 0 && !partnerLoading ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {partnerSearch ? "No agents found" : "No Partner Agents"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {partnerSearch ? `No agents match "${partnerSearch}"` : "Partner agents will appear here once created by partners."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#07376a] hover:bg-[#07376a]">
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none" onClick={() => handlePartnerSort("full_name")}>
                          Agent Name <SortIcon col="full_name" />
                        </TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Email</TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone</TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner / Org</TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none text-center" onClick={() => handlePartnerSort("total_sold")}>
                          Sales <SortIcon col="total_sold" />
                        </TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none" onClick={() => handlePartnerSort("created_at")}>
                          Joined <SortIcon col="created_at" />
                        </TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Last Login</TableHead>
                        <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={partnerLoading ? "opacity-40" : ""}>
                      {filteredPartnerAgents.map((agent, idx) => (
                        <TableRow key={agent.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}>
                          <TableCell className="text-xs font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-[11px] flex-shrink-0">
                                {agent.full_name?.charAt(0).toUpperCase() ?? "?"}
                              </div>
                              {agent.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">{agent.email}</TableCell>
                          <TableCell className="text-xs text-gray-600">{agent.phone || "—"}</TableCell>
                          <TableCell>
                            {(agent as any).organization_name ? (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{(agent as any).organization_name}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${(agent.total_sold ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {agent.total_sold ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">{formatDate(agent.created_at)}</TableCell>
                          <TableCell className="text-xs">{formatLastLogin(agent.last_login)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="bg-[#07376a] hover:bg-[#07376a]/90 text-white h-7 px-2 text-xs"
                              onClick={() => { setSelectedPartnerAgent(agent); setShowViewPartnerModal(true); }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {partnerTotalPages > 1 && (
                <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                  <p className="text-sm text-gray-600">Showing {partnerStartItem} to {partnerEndItem} of {partnerTotalRecords.toLocaleString()} agents</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPartnerPage(1)} disabled={partnerPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPartnerPage((p) => Math.max(1, p - 1))} disabled={partnerPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
                    {getPartnerPageNumbers().map((page) => (
                      <Button key={page} variant={page === partnerPage ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${page === partnerPage ? "bg-[#07376a] text-white hover:bg-[#07376a]" : ""}`} onClick={() => setPartnerPage(page)}>{page}</Button>
                    ))}
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPartnerPage((p) => Math.min(partnerTotalPages, p + 1))} disabled={partnerPage === partnerTotalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPartnerPage(partnerTotalPages)} disabled={partnerPage === partnerTotalPages}><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ACSL Modals */}
      {showCreateModal && (
        <CreateSuperAdminAgentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newAgent) => { setShowCreateModal(false); toast({ variant: "success", title: `Agent "${newAgent.full_name}" created successfully` }); fetchAcslAgents(); }}
        />
      )}
      {showEditModal && selectedAcslAgent && (
        <EditSuperAdminAgentModal
          agent={selectedAcslAgent}
          onClose={() => { setShowEditModal(false); setSelectedAcslAgent(null); }}
          onSuccess={(updated) => { setShowEditModal(false); setSelectedAcslAgent(null); toast({ variant: "success", title: `Agent "${updated.full_name}" updated` }); fetchAcslAgents(); }}
        />
      )}
      {showDeleteModal && selectedAcslAgent && (
        <DeleteSuperAdminAgentModal
          agent={selectedAcslAgent}
          onClose={() => { setShowDeleteModal(false); setSelectedAcslAgent(null); }}
          onSuccess={() => { setShowDeleteModal(false); setSelectedAcslAgent(null); toast({ variant: "success", title: "Agent deleted successfully" }); fetchAcslAgents(); }}
        />
      )}
      {showViewAcslModal && selectedAcslAgent && (
        <ViewSuperAdminAgentModal
          agent={selectedAcslAgent}
          onClose={() => { setShowViewAcslModal(false); setSelectedAcslAgent(null); }}
        />
      )}
      {showAssignModal && selectedAcslAgent && (
        <AssignOrganizationsModal
          agent={selectedAcslAgent}
          onClose={() => { setShowAssignModal(false); setSelectedAcslAgent(null); }}
          onSuccess={() => { setShowAssignModal(false); toast({ variant: "success", title: "Assignments updated" }); fetchAcslAgents(); }}
        />
      )}

      {/* Partner Modals */}
      <ViewAgentModal
        isOpen={showViewPartnerModal}
        onClose={() => { setShowViewPartnerModal(false); setSelectedPartnerAgent(null); }}
        agent={selectedPartnerAgent}
        onEdit={() => {}}
        onViewPerformance={() => {}}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </DashboardLayout>
  );
}
