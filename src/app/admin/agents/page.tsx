"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { Dialog, DialogTrigger } from "../../../components/ui/dialog";
import { AlertCircle, UserPlus, Users, Search } from "lucide-react";
import { Input } from "../../../components/ui/input.jsx";
import adminAgentService from "../../services/adminAgentService.jsx";
import { SalesAgent, AgentCredentials } from "../../../types/salesAgent";

// Import modular components
import SalesAgentTable from "../components/agents/SalesAgentTable";
import AgentStatsCards from "../components/agents/AgentStatsCards";
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

  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] =
    useState<boolean>(false);

  // Selected agent for operations
  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);
  const [newAgentCredentials, setNewAgentCredentials] =
    useState<AgentCredentials | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [currentPage, searchTerm]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAgentService.getSalesAgents({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (response.success) {
        setAgents(response.data || []);
        setPagination(response.pagination);
      } else {
        setError(response.error || "Failed to load sales agents");
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError("An unexpected error occurred while loading agents");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAgentCreated = () => {
    fetchAgents();
  };

  const handleCredentialsSuccess = (credentials: AgentCredentials) => {
    setNewAgentCredentials(credentials);
    setShowCredentialsModal(true);
  };

  const handleViewAgent = (agent: SalesAgent) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
  };

  const handleEditAgent = (agent: SalesAgent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const handleDeleteAgent = (agent: SalesAgent) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  const handleAgentUpdated = () => {
    fetchAgents();
    setShowEditModal(false);
    setSelectedAgent(null);
  };

  const handleAgentDeleted = () => {
    fetchAgents();
    setShowDeleteModal(false);
    setSelectedAgent(null);
  };

  const handleViewPerformance = (agent: SalesAgent) => {
    console.log("View performance:", agent);
    // TODO: Navigate to performance page or show performance modal
    // This could redirect to a detailed performance dashboard
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className={i === currentPage ? "bg-brand hover:bg-brand-700" : ""}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
          {Math.min(
            currentPage * pagination.itemsPerPage,
            pagination.totalItems
          )}{" "}
          of {pagination.totalItems} agents
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          {pages}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  if (loading && agents.length === 0) {
    return (
      <ProtectedRoute requireAdminAccess={true}>
        <DashboardLayout currentRoute="admin-agents">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales agents...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdminAccess={true}>
      <DashboardLayout
        currentRoute="admin-agents"
        title="Sales Agents Management"
        description="Manage your sales team members"
        // rightButton={
        //   <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        //     <DialogTrigger asChild>
        //       <Button className="bg-brand hover:bg-brand-700 text-white">
        //         <UserPlus className="h-4 w-4 mr-2" />
        //         Add Agent
        //       </Button>
        //     </DialogTrigger>
        //   </Dialog>
        // }
      >
        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAgents}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Stats Cards */}
          <AgentStatsCards agents={agents} />

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sales Agents
                  {pagination && (
                    <span className="text-sm font-normal text-gray-500">
                      ({pagination.totalItems} total)
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search agents by name or email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog
                  open={showCreateModal}
                  onOpenChange={setShowCreateModal}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-brand hover:bg-brand-700 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>

              {/* Table */}
              {agents.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No agents found" : "No Sales Agents"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? `No agents match your search "${searchTerm}"`
                      : "You haven't added any sales agents yet. Create your first agent to get started."}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-brand hover:bg-brand-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Agent
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <SalesAgentTable
                    data={agents}
                    loading={loading}
                    onView={handleViewAgent}
                    onEdit={handleEditAgent}
                    onDelete={handleDeleteAgent}
                    onViewPerformance={handleViewPerformance}
                  />
                  {renderPagination()}
                </>
              )}
            </CardContent>
          </Card>
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
          onClose={() => {
            setShowEditModal(false);
            setSelectedAgent(null);
          }}
          onSuccess={handleAgentUpdated}
          agent={selectedAgent}
        />

        <DeleteAgentModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAgent(null);
          }}
          onSuccess={handleAgentDeleted}
          agent={selectedAgent}
        />

        <ViewAgentModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAgent(null);
          }}
          agent={selectedAgent}
          onEdit={handleEditAgent}
          onViewPerformance={handleViewPerformance}
        />

        <AgentCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => {
            setShowCredentialsModal(false);
            setNewAgentCredentials(null);
          }}
          credentials={newAgentCredentials}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminAgentsPage;
