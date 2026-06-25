
import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, UserPlus, Search, X, Plus, Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import adminAgentService from "../../services/adminAgentService.jsx";
import PageHeader from "../../components/PageHeader";
import { SalesAgent, AgentCredentials } from "@/types/salesAgent";

import SalesAgentTable from "../../admin/components/agents/SalesAgentTable";
import CreateAgentModal from "../../admin/components/agents/CreateAgentModal";
import EditAgentModal from "../../admin/components/agents/EditAgentModal";
import DeleteAgentModal from "../../admin/components/agents/DeleteAgentModal";
import ViewAgentModal from "../../admin/components/agents/ViewAgentModal";
import AgentCredentialsModal from "../../admin/components/agents/AgentCredentialsModal";
import AgentViewCredentialModal from "../../admin/components/agents/AgentViewCredentialModal";
import tokenManager from "@/utils/tokenManager";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function PartnerAgentsContent() {
  const [loading, setLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [showViewCredentialModal, setShowViewCredentialModal] = useState<boolean>(false);
  const [viewCredentialData, setViewCredentialData] = useState<any>(null);
  const [loadingCredentialId, setLoadingCredentialId] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);
  const [newAgentCredentials, setNewAgentCredentials] = useState<AgentCredentials | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [currentPage, pageSize, searchTerm, sortBy, sortOrder]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAgentService.getSalesAgents({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
      if (response.success) {
        setAgents(response.data || []);
        setPagination(response.pagination);
      } else {
        setError(response.error || "Failed to load sales agents");
      }
    } catch {
      setError("An unexpected error occurred while loading agents");
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = useMemo(() => {
    if (activityFilter === "all") return agents;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return agents.filter((a) => {
      if (activityFilter === "active") return a.last_login && now - new Date(a.last_login).getTime() <= sevenDays;
      if (activityFilter === "inactive") return a.last_login && now - new Date(a.last_login).getTime() > sevenDays;
      if (activityFilter === "never") return !a.last_login;
      return true;
    });
  }, [agents, activityFilter]);

  const stats = useMemo(() => {
    const total = pagination?.totalItems ?? agents.length;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const activeCount = agents.filter((a) => a.last_login && now - new Date(a.last_login).getTime() <= sevenDays).length;
    const noSalesCount = agents.filter((a) => (a.total_sold ?? 0) === 0).length;
    const totalSold = agents.reduce((sum, a) => sum + (a.total_sold ?? 0), 0);
    return { total, activeCount, noSalesCount, totalSold };
  }, [agents, pagination]);

  const hasActiveFilters = searchTerm !== "" || activityFilter !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setActivityFilter("all");
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(column); setSortOrder("desc"); }
    setCurrentPage(1);
  };
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };
  const handleAgentCreated = () => fetchAgents();
  const handleCredentialsSuccess = (credentials: AgentCredentials) => {
    setNewAgentCredentials(credentials);
    setShowCredentialsModal(true);
  };
  const handleViewAgent = (agent: SalesAgent) => { setSelectedAgent(agent); setShowViewModal(true); };
  const handleEditAgent = (agent: SalesAgent) => { setSelectedAgent(agent); setShowEditModal(true); };
  const handleDeleteAgent = (agent: SalesAgent) => { setSelectedAgent(agent); setShowDeleteModal(true); };
  const handleAgentUpdated = () => { fetchAgents(); setShowEditModal(false); setSelectedAgent(null); };
  const handleAgentDeleted = () => { fetchAgents(); setShowDeleteModal(false); setSelectedAgent(null); };
  const handleViewCredentials = async (agent: SalesAgent) => {
    setLoadingCredentialId(agent.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = await tokenManager.getValidToken();
      const res = await fetch(`${supabaseUrl}/functions/v1/manage-credentials?user_id=${agent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setViewCredentialData(json.data);
        setSelectedAgent(agent);
        setShowViewCredentialModal(true);
      } else {
        alert(json.error ?? "Credentials not found for this agent");
      }
    } catch {
      alert("Failed to load credentials");
    } finally {
      setLoadingCredentialId(null);
    }
  };

  const totalRecords = pagination?.totalItems ?? filteredAgents.length;

  return (
    <DashboardLayout currentRoute="agents" title="Agents Manager">
      <div className="p-6 space-y-5">
        <PageHeader
          icon={Users}
          title="Agents Manager"
          right={
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          }
        />
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
            <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">Try Again</Button>
          </div>
        )}

        {(() => {
          const cards = [
            {
              gradient: "from-[#194977] to-[#2563EB]",
              Icon: Users,
              value: stats.total.toString(),
              label: "Total Agents",
              sub: "Registered in your org",
              clickable: false,
              filterKey: null as string | null,
            },
            {
              gradient: "from-[#047857] to-[#10B981]",
              Icon: UserCheck,
              value: stats.activeCount.toString(),
              label: "Active (7 days)",
              sub: activityFilter === "active" ? "Click to clear filter" : "Click to filter",
              clickable: true,
              filterKey: "active",
            },
            {
              gradient: "from-red-800 to-red-500",
              Icon: UserX,
              value: stats.noSalesCount.toString(),
              label: "Zero Sales",
              sub: "Need attention",
              clickable: false,
              filterKey: null,
            },
            {
              gradient: "from-[#B45309] to-[#F59E0B]",
              Icon: TrendingUp,
              value: stats.totalSold.toLocaleString(),
              label: "Total Stoves Sold",
              sub: "Across all agents",
              clickable: false,
              filterKey: null,
            },
          ] as const;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {cards.map(({ gradient, Icon, value, label, sub, clickable, filterKey }) => {
                const isActive = clickable && filterKey !== null && activityFilter === filterKey;
                const handleClick = clickable && filterKey !== null
                  ? () => setActivityFilter((f) => f === filterKey ? "all" : filterKey)
                  : undefined;

                return isActive ? (
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
                      <div className="rounded-lg p-1.5 bg-white/20 text-white shadow-sm shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={label}
                    onClick={handleClick}
                    className={`relative overflow-hidden rounded-lg border bg-white px-4 py-3.5 shadow-sm transition-all group ${clickable ? "cursor-pointer hover:shadow-md" : ""}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold text-gray-900 tracking-tight leading-tight truncate">{value}</p>
                        <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>
                      </div>
                      <div className={`rounded-lg p-1.5 bg-gradient-to-br ${gradient} text-white shadow-sm shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
          <div className="w-1/4 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-white h-9 text-sm"
            />
          </div>

          <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 bg-white text-sm">
              <SelectValue placeholder="All activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="active">Active (last 7 days)</SelectItem>
              <SelectItem value="inactive">Inactive (&gt;7 days)</SelectItem>
              <SelectItem value="never">Never Logged In</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">
                {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecords)}
              </span>{" "}
              of <span className="font-medium">{totalRecords}</span> records
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => handlePageSizeChange(Number(v))}>
                <SelectTrigger className="w-[65px] h-7 bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm font-bold text-green-500">
              Total Agents: <span className="text-brand">{totalRecords}</span>
            </p>
          </div>
        </div>

        {agents.length === 0 && !loading ? (
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No agents found" : "No Sales Agents"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? `No agents match your search "${searchTerm}"` : "Add your first agent to get started."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-green-500 hover:bg-green-600 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Agent
              </Button>
            )}
          </div>
        ) : (
          <SalesAgentTable
            data={filteredAgents}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onView={handleViewAgent}
            onEdit={handleEditAgent}
            onDelete={handleDeleteAgent}
            onViewPerformance={() => {}}
            onViewCredentials={handleViewCredentials}
            loadingCredentialId={loadingCredentialId}
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            hidePaginationHeader
          />
        )}
      </div>

      <CreateAgentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCredentialsSuccess}
        onAgentCreated={handleAgentCreated}
      />
      <EditAgentModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedAgent(null); }}
        onSuccess={handleAgentUpdated}
        agent={selectedAgent}
      />
      <DeleteAgentModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedAgent(null); }}
        onSuccess={handleAgentDeleted}
        agent={selectedAgent}
      />
      <ViewAgentModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedAgent(null); }}
        agent={selectedAgent}
        onEdit={handleEditAgent}
        onViewPerformance={() => {}}
      />
      <AgentCredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => { setShowCredentialsModal(false); setNewAgentCredentials(null); }}
        credentials={newAgentCredentials}
      />
      <AgentViewCredentialModal
        isOpen={showViewCredentialModal}
        onClose={() => { setShowViewCredentialModal(false); setViewCredentialData(null); setSelectedAgent(null); }}
        credential={viewCredentialData}
        agentName={selectedAgent?.full_name}
        canResetPassword
      />
    </DashboardLayout>
  );
}
