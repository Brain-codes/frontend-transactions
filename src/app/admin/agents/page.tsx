"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Button } from "../../../components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { AlertCircle, UserPlus, Search, X, Plus, Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Input } from "../../../components/ui/input.jsx";
import adminAgentService from "../../services/adminAgentService.jsx";
import { SalesAgent, AgentCredentials } from "../../../types/salesAgent";

import SalesAgentTable from "../components/agents/SalesAgentTable";
import CreateAgentModal from "../components/agents/CreateAgentModal";
import EditAgentModal from "../components/agents/EditAgentModal";
import DeleteAgentModal from "../components/agents/DeleteAgentModal";
import ViewAgentModal from "../components/agents/ViewAgentModal";
import AgentCredentialsModal from "../components/agents/AgentCredentialsModal";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const AdminAgentsPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Extra filters
  const [activityFilter, setActivityFilter] = useState<string>("all"); // all | active | inactive | never

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);

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
    } catch (err) {
      setError("An unexpected error occurred while loading agents");
    } finally {
      setLoading(false);
    }
  };

  // Client-side activity filter applied on top of server results
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

  // Stats computed from ALL agents (not just current page)
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

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

  const totalRecords = pagination?.totalItems ?? filteredAgents.length;

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-agents"
        title="Manage Agents"
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">Try Again</Button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Agents */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Agents</p>
                  <p className="text-xl font-bold text-blue-900">{stats.total}</p>
                  <p className="text-xs text-blue-500">Registered in your org</p>
                </div>
              </div>
            </div>

            {/* Active (Last 7 Days) */}
            <div
              className={`bg-green-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${activityFilter === "active" ? "border-green-600 shadow-md" : "border-green-200"}`}
              onClick={() => setActivityFilter((f) => f === "active" ? "all" : "active")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Active (7 days)</p>
                  <p className="text-xl font-bold text-green-900">{stats.activeCount}</p>
                  <p className="text-xs text-green-500">Click to filter</p>
                </div>
              </div>
              {activityFilter === "active" && (
                <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Filter active — click again to clear</p>
              )}
            </div>

            {/* Zero Sales */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserX className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Zero Sales</p>
                  <p className="text-xl font-bold text-red-900">{stats.noSalesCount}</p>
                  <p className="text-xs text-red-500">Need attention</p>
                </div>
              </div>
            </div>

            {/* Total Stoves Sold */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Total Stoves Sold</p>
                  <p className="text-xl font-bold text-amber-900">{stats.totalSold.toLocaleString()}</p>
                  <p className="text-xs text-amber-500">Across all agents</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            {/* Search — 1/4 width */}
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Activity Filter */}
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

            {/* Clear */}
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {agents.length === 0 && !loading ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No agents found" : "No Sales Agents"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? `No agents match your search "${searchTerm}"`
                  : "Add your first agent to get started."}
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
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>

        {/* Modals */}
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
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminAgentsPage;
