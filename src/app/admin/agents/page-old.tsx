"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  UserPlus,
  Users,
  Mail,
  Calendar,
  Shield,
  Eye,
  Copy,
  CheckCircle2,
  Loader2,
  User,
  Phone,
  BarChart3,
} from "lucide-react";
import adminAgentService from "../../services/adminAgentService.jsx";
import {
  SalesAgent,
  AgentCredentials,
  CreateAgentRequest,
} from "@/types/salesAgent";

const AdminAgentsPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] =
    useState<boolean>(false);
  const [newAgentCredentials, setNewAgentCredentials] =
    useState<AgentCredentials | null>(null);

  // Create agent form state
  const [createForm, setCreateForm] = useState<CreateAgentRequest>({
    name: "",
    email: "",
  });
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

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

  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const validation = adminAgentService.validateAgentData(
      createForm.name,
      createForm.email
    );

    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((error: string, index: number) => {
        errorMap[index.toString()] = error;
      });
      setCreateErrors(errorMap);
      return;
    }

    try {
      setCreateLoading(true);
      setCreateErrors({});

      const response = await adminAgentService.createAgent(
        createForm.name,
        createForm.email
      );

      if (response.success) {
        // Show credentials modal
        setNewAgentCredentials({
          name: createForm.name,
          email: createForm.email,
          password: response.data.generatedPassword,
        });
        setShowCredentialsModal(true);

        // Reset form and close create modal
        setCreateForm({ name: "", email: "" });
        setShowCreateModal(false);

        // Refresh agents list
        fetchAgents();
      } else {
        setCreateErrors({
          general: response.error || "Failed to create agent",
        });
      }
    } catch (err) {
      console.error("Error creating agent:", err);
      setCreateErrors({
        general: "An unexpected error occurred while creating the agent",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
    });
  };

  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      admin: "bg-blue-100 text-blue-800",
      agent: "bg-green-100 text-green-800",
      super_admin: "bg-purple-100 text-purple-800",
    };

    return (
      <Badge className={roleStyles[role] || "bg-gray-100 text-gray-800"}>
        {role?.replace("_", " ").toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  const getPasswordStatusBadge = (hasChanged: boolean | undefined) => {
    return hasChanged ? (
      <Badge className="bg-green-100 text-green-800">Password Changed</Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800">Default Password</Badge>
    );
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Sales Agent</DialogTitle>
                <DialogDescription>
                  Create a new sales agent account. They will receive login
                  credentials to access the system.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                {createErrors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 text-sm">
                      {createErrors.general}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="agentName">Full Name *</Label>
                  <Input
                    id="agentName"
                    value={createForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter agent's full name"
                    className={createErrors["0"] ? "border-red-500" : ""}
                  />
                  {createErrors["0"] && (
                    <p className="text-sm text-red-600">{createErrors["0"]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agentEmail">Email Address *</Label>
                  <Input
                    id="agentEmail"
                    type="email"
                    value={createForm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter agent's email address"
                    className={createErrors["1"] ? "border-red-500" : ""}
                  />
                  {createErrors["1"] && (
                    <p className="text-sm text-red-600">{createErrors["1"]}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoading}
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Agent
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Agents
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {agents.length}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Active sales team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Password Changed
                </CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    agents.filter(
                      (agent: SalesAgent) => agent.has_changed_password
                    ).length
                  }
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Agents with updated passwords
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  New Agents
                </CardTitle>
                <UserPlus className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    agents.filter(
                      (agent: SalesAgent) => !agent.has_changed_password
                    ).length
                  }
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Using default passwords
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sales Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
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
                <div className="space-y-4">
                  {agents.map((agent: SalesAgent) => (
                    <div
                      key={agent.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-12 h-12 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {agent.full_name?.charAt(0)?.toUpperCase() || "A"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {agent.full_name || "N/A"}
                              </h3>
                              {getRoleBadge(agent.role)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {agent.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Joined {formatDate(agent.created_at)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {getPasswordStatusBadge(
                                agent.has_changed_password
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Performance
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Credentials Modal */}
        <Dialog
          open={showCredentialsModal}
          onOpenChange={setShowCredentialsModal}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Agent Created Successfully!
              </DialogTitle>
              <DialogDescription>
                The sales agent account has been created. Please share these
                login credentials with the agent.
              </DialogDescription>
            </DialogHeader>

            {newAgentCredentials && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-3">
                    Login Credentials
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <Label className="text-xs text-gray-600">
                          Agent Name
                        </Label>
                        <p className="font-medium">
                          {newAgentCredentials.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(newAgentCredentials.name)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <Label className="text-xs text-gray-600">Email</Label>
                        <p className="font-medium">
                          {newAgentCredentials.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(newAgentCredentials.email)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <Label className="text-xs text-gray-600">
                          Temporary Password
                        </Label>
                        <p className="font-mono text-sm">
                          {newAgentCredentials.password}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(newAgentCredentials.password)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          The agent must change this password on first login
                        </li>
                        <li>These credentials will only be shown once</li>
                        <li>
                          Make sure to securely share these with the agent
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setShowCredentialsModal(false);
                      setNewAgentCredentials(null);
                    }}
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    Got it, thanks!
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminAgentsPage;
