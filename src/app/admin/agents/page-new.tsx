"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, UserPlus, Users } from "lucide-react";
import adminAgentService from "../../services/adminAgentService.jsx";
import { SalesAgent, AgentCredentials } from "@/types/salesAgent";

// Import modular components
import SalesAgentTable from "../components/agents/SalesAgentTable";
import AgentStatsCards from "../components/agents/AgentStatsCards";
import CreateAgentModal from "../components/agents/CreateAgentModal";
import AgentCredentialsModal from "../components/agents/AgentCredentialsModal";

const AdminAgentsPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] =
    useState<boolean>(false);
  const [newAgentCredentials, setNewAgentCredentials] =
    useState<AgentCredentials | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAgentService.getSalesAgents();

      if (response.success) {
        setAgents(response.data || []);
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

  const handleAgentCreated = () => {
    fetchAgents();
  };

  const handleCredentialsSuccess = (credentials: AgentCredentials) => {
    setNewAgentCredentials(credentials);
    setShowCredentialsModal(true);
  };

  const handleViewAgent = (agent: SalesAgent) => {
    console.log("View agent:", agent);
    // TODO: Implement view agent details
  };

  const handleEditAgent = (agent: SalesAgent) => {
    console.log("Edit agent:", agent);
    // TODO: Implement edit agent
  };

  const handleDeleteAgent = (agent: SalesAgent) => {
    console.log("Delete agent:", agent);
    // TODO: Implement delete agent
  };

  const handleViewPerformance = (agent: SalesAgent) => {
    console.log("View performance:", agent);
    // TODO: Implement view agent performance
  };

  if (loading) {
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
        rightButton={
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-700 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </DialogTrigger>
          </Dialog>
        }
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

          {/* Agents Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sales Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Sales Agents
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You haven&apos;t added any sales agents yet. Create your
                    first agent to get started.
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Agent
                  </Button>
                </div>
              ) : (
                <SalesAgentTable
                  data={agents}
                  loading={loading}
                  onView={handleViewAgent}
                  onEdit={handleEditAgent}
                  onDelete={handleDeleteAgent}
                  onViewPerformance={handleViewPerformance}
                />
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
