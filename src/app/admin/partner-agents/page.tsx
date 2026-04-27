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
import {
  AlertCircle,
  Search,
  X,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Input } from "../../../components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import adminAgentService from "../../services/adminAgentService.jsx";
import ViewAgentModal from "../components/agents/ViewAgentModal";
import { SalesAgent } from "../../../types/salesAgent";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const PartnerAgentsPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<(SalesAgent & { organization_name?: string | null })[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);

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
        setError(response.error || "Failed to load partner agents");
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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 inline" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 inline" />;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

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

  const totalRecords = pagination?.totalItems ?? filteredAgents.length;
  const totalPages = pagination?.totalPages ?? 1;
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout currentRoute="partner-agents" title="Partner Agents">
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">Try Again</Button>
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
                  <p className="text-sm text-blue-600 font-medium">Total Agents</p>
                  <p className="text-xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-blue-500">Across all partners</p>
                </div>
              </div>
            </div>

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
                <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Active — click to clear</p>
              )}
            </div>

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
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[170px] h-9 bg-white text-sm">
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
                  <span className="font-medium">{totalRecords.toLocaleString()}</span> agents
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
                Total Agents: <span className="text-[#07376a]">{totalRecords.toLocaleString()}</span>
              </p>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#07376a] border-t-transparent" />
                </div>
              )}

              {filteredAgents.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No agents found" : "No Partner Agents"}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? `No agents match your search "${searchTerm}"` : "Partner agents will appear here once created by partners."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#07376a] hover:bg-[#07376a]">
                      <TableHead
                        className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none"
                        onClick={() => handleSort("full_name")}
                      >
                        Agent Name <SortIcon col="full_name" />
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone</TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner / Org</TableHead>
                      <TableHead
                        className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none text-center"
                        onClick={() => handleSort("total_sold")}
                      >
                        Sales <SortIcon col="total_sold" />
                      </TableHead>
                      <TableHead
                        className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        Joined <SortIcon col="created_at" />
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Last Login</TableHead>
                      <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? "opacity-40" : ""}>
                    {filteredAgents.map((agent, idx) => (
                      <TableRow
                        key={agent.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                      >
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
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {(agent as any).organization_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            (agent.total_sold ?? 0) > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {agent.total_sold ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">{formatDate(agent.created_at)}</TableCell>
                        <TableCell className="text-xs">{formatLastLogin(agent.last_login)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            className="bg-[#07376a] hover:bg-[#07376a]/90 text-white h-7 px-2 text-xs"
                            onClick={() => { setSelectedAgent(agent); setShowViewModal(true); }}
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

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startItem} to {endItem} of {totalRecords.toLocaleString()} agents
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

        <ViewAgentModal
          isOpen={showViewModal}
          onClose={() => { setShowViewModal(false); setSelectedAgent(null); }}
          agent={selectedAgent}
          onEdit={() => {}}
          onViewPerformance={() => {}}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PartnerAgentsPage;
