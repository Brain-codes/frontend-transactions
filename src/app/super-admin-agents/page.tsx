"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  const PAGE_SIZE = 25;

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
        limit: PAGE_SIZE,
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
  }, [currentPage, searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || roleFilter !== "all";

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
        title: `User "${agent.full_name}" ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
      });
      fetchAgents();
    } catch (err: any) {
      toast({ variant: "error", title: err.message || "Failed to update user status" });
    }
  };

  const totalAgents = pagination?.totalItems ?? agents.length;
  const totalAssignments = agents.reduce(
    (sum, a) => sum + (a.assigned_organizations_count ?? 0),
    0
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getPageNumbers = () => {
    if (!pagination) return [];
    const { currentPage: page, totalPages } = pagination;
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout currentRoute="super-admin-agents">
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              User Management
            </h1>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap gap-4">
            <Card className="w-fit">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                      Total Agents
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {totalAgents.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="w-fit">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">
                      Total Org Assignments
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {totalAssignments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select
                  value={roleFilter}
                  onValueChange={setRoleFilter}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin_agent">Super Admin Agent</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                <p className="text-sm text-gray-600">Loading agents...</p>
              </div>
            )}

            <Table>
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand">
                  <TableHead className="text-white py-4 first:rounded-tl-lg">
                    Full Name
                  </TableHead>
                  <TableHead className="text-white py-4">Email</TableHead>
                  <TableHead className="text-white py-4">Phone</TableHead>
                  <TableHead className="text-white py-4">Role</TableHead>
                  <TableHead className="text-white py-4">
                    Assigned Partners
                  </TableHead>
                  <TableHead className="text-white py-4">Status</TableHead>
                  <TableHead className="text-white py-4">Created At</TableHead>
                  <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && agents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-gray-500"
                    >
                      No users found.{" "}
                      {hasActiveFilters
                        ? "Try clearing your filters."
                        : 'Click "Add User" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent, index) => (
                    <TableRow
                      key={agent.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-brand-light"
                      } hover:bg-gray-50`}
                    >
                      <TableCell className="font-medium">
                        {agent.full_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {agent.email}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {agent.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            agent.role === "super_admin"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {agent.role === "super_admin" ? "Super Admin" : "SAA"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          {agent.assigned_organizations_count ?? 0} partner
                          {(agent.assigned_organizations_count ?? 0) !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            agent.status === "active"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(agent.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {agent.role === "super_admin_agent" && (
                            <Button
                              size="sm"
                              className="bg-brand hover:bg-brand/90 text-white text-xs"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setShowAssignModal(true);
                              }}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Assign Partners
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setShowViewModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(agent)}
                              >
                                {agent.status === "active" ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2 text-orange-500" />
                                    Disable User
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                    Enable User
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setShowDeleteModal(true);
                                }}
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing{" "}
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}{" "}
                of {pagination.totalItems} users
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className={
                        !pagination.hasPrevPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers().map((num) => (
                    <PaginationItem key={num}>
                      <PaginationLink
                        isActive={num === pagination.currentPage}
                        onClick={() => setCurrentPage(num)}
                        className="cursor-pointer"
                      >
                        {num}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      className={
                        !pagination.hasNextPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
            onClose={() => {
              setShowEditModal(false);
              setSelectedAgent(null);
            }}
            onSuccess={handleEditSuccess}
          />
        )}
        {showDeleteModal && selectedAgent && (
          <DeleteSuperAdminAgentModal
            agent={selectedAgent}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedAgent(null);
            }}
            onSuccess={handleDeleteSuccess}
          />
        )}
        {showViewModal && selectedAgent && (
          <ViewSuperAdminAgentModal
            agent={selectedAgent}
            onClose={() => {
              setShowViewModal(false);
              setSelectedAgent(null);
            }}
          />
        )}
        {showAssignModal && selectedAgent && (
          <AssignOrganizationsModal
            agent={selectedAgent}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedAgent(null);
            }}
            onSuccess={handleAssignSuccess}
          />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentsPage;
