"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Search,
  X,
  UserPlus,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import AssignOrganizationsModal from "../super-admin-agents/components/AssignOrganizationsModal";

// Relative time formatter (same pattern as SalesAgentTable)
const formatRelativeTime = (dateString) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Just now";
  if (diffHours < 1) return `${diffMins}m ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
};

const getRoleLabel = (role) => {
  if (role === "super_admin") return "Super Admin";
  if (role === "acsl_agent" || role === "super_admin_agent") return "ACSL Agent";
  if (role === "partner" || role === "admin") return "Partner";
  if (role === "partner_agent" || role === "agent") return "Partner Agent";
  return role;
};

const UserManagementPage = () => {
  const { supabase } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 0,
  });

  // Sort state
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filter state
  const [filters, setFilters] = useState({ search: "", status: "", role: "" });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignOrgsModal, setShowAssignOrgsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserForOrgs, setSelectedUserForOrgs] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // stores userId or 'create'/'delete' etc.

  // Form state
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "acsl_agent",
    password: "",
    auto_generate_password: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = async (
    page = 1,
    pageSize = pagination.page_size,
    currentFilters = filters,
    currentSortBy = sortBy,
    currentSortOrder = sortOrder,
  ) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No authentication token");

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      });
      if (currentFilters.search) params.append("search", currentFilters.search);
      if (currentFilters.status) params.append("status", currentFilters.status);
      if (currentFilters.role) params.append("role", currentFilters.role);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch users");

      setUsers(result.data || []);
      if (result.pagination) {
        setPagination({
          page: result.pagination.currentPage || 1,
          page_size: result.pagination.itemsPerPage || 25,
          total_count: result.pagination.totalItems || 0,
          total_pages: result.pagination.totalPages || 0,
        });
      }
    } catch (err) {
      toast({ variant: "error", title: "Failed to fetch users", description: err.message });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sort ───────────────────────────────────────────────────────────────────

  const handleSort = (column) => {
    const newOrder = sortBy === column && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(column);
    setSortOrder(newOrder);
    fetchUsers(1, pagination.page_size, filters, column, newOrder);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // ── Filters ────────────────────────────────────────────────────────────────

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    fetchUsers(1, pagination.page_size, newFilters);
  };

  const handleClearFilters = () => {
    const cleared = { search: "", status: "", role: "" };
    setFilters(cleared);
    fetchUsers(1, pagination.page_size, cleared);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  // ── Pagination ─────────────────────────────────────────────────────────────

  const handlePageChange = (page) => fetchUsers(page, pagination.page_size);
  const handlePageSizeChange = (val) => {
    const size = parseInt(val);
    setPagination((prev) => ({ ...prev, page_size: size }));
    fetchUsers(1, size);
  };

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, pagination.page - 2);
    const end = Math.min(pagination.total_pages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const startRecord = users.length > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0;
  const endRecord = Math.min(pagination.page * pagination.page_size, pagination.total_count);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setUserForm({ full_name: "", email: "", phone: "", role: "acsl_agent", password: "", auto_generate_password: true });
    setFormErrors({});
    setShowPassword(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!userForm.full_name.trim()) errors.full_name = "Full name is required";
    if (!userForm.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) errors.email = "Invalid email format";
    if (!userForm.auto_generate_password && !userForm.password) errors.password = "Password is required";
    else if (!userForm.auto_generate_password && userForm.password.length < 8) errors.password = "Password must be at least 8 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({ full_name: user.full_name || "", email: user.email || "", phone: user.phone || "", role: user.role || "acsl_agent", password: "", auto_generate_password: true });
    setFormErrors({});
    setShowEditModal(true);
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setActionLoading("create");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim() || null,
        role: userForm.role,
        auto_generate_password: userForm.auto_generate_password,
      };
      if (!userForm.auto_generate_password) payload.password = userForm.password;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create user");

      toast({
        variant: "success",
        title: "User created successfully",
        description: result.generated_password ? `Password: ${result.generated_password}` : "User can now log in",
      });
      setShowCreateModal(false);
      resetForm();
      fetchUsers(1, pagination.page_size);
    } catch (err) {
      toast({ variant: "error", title: "Failed to create user", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!userForm.full_name.trim()) { setFormErrors({ full_name: "Full name is required" }); return; }
    setActionLoading("edit");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users/${selectedUser.id}`,
        { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ full_name: userForm.full_name.trim(), phone: userForm.phone.trim() || null }) },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update user");

      toast({ variant: "success", title: "User updated successfully" });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      toast({ variant: "error", title: "Failed to update user", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setActionLoading(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users/${userId}`,
        { method: "PATCH", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update status");

      toast({ variant: "success", title: `User ${newStatus === "disabled" ? "disabled" : "enabled"} successfully` });
      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      toast({ variant: "error", title: "Failed to update user status", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading("delete");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users/${selectedUser.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete user");

      toast({ variant: "success", title: "User deleted successfully" });
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      toast({ variant: "error", title: "Failed to delete user", description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute allowedRoles={["super_admin", "acsl_agent", "super_admin_agent"]}>
      <DashboardLayout
        currentRoute="user-management"
        title="User Management"
        rightButton={
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
            onClick={() => { resetForm(); setShowCreateModal(true); }}
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        }
      >
        <div className="p-6 space-y-5">

          {/* Filter Bar */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Status */}
            <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9 bg-white text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            {/* Role */}
            <Select value={filters.role || "all"} onValueChange={(v) => handleFilterChange("role", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[170px] h-9 bg-white text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
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
          <div className="space-y-0">
            {/* Pagination header */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startRecord}–{endRecord}</span> of{" "}
                  <span className="font-medium">{pagination.total_count}</span> users
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={pagination.page_size.toString()} onValueChange={handlePageSizeChange}>
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
                Total Users: <span className="text-brand">{pagination.total_count}</span>
              </p>
            </div>

            {/* Table body */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Role</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Assigned Partners</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Last Active</TableHead>
                    <TableHead
                      className="text-white font-semibold text-xs whitespace-nowrap cursor-pointer select-none"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="flex items-center">
                        Created At
                        <SortIcon column="created_at" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? "opacity-40" : ""}>
                  {users.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, idx) => (
                      <TableRow
                        key={u.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}
                      >
                        <TableCell className="text-xs font-medium text-gray-900">{u.full_name || "N/A"}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{u.email}</TableCell>
                        <TableCell className="text-xs text-gray-600">{u.phone || "—"}</TableCell>

                        {/* Role — plain text, colored */}
                        <TableCell>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            u.role === "super_admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </TableCell>

                        {/* Assigned Partners — inline pattern, no badges */}
                        <TableCell>
                          {["acsl_agent", "super_admin_agent"].includes(u.role) ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-blue-700 font-medium">
                                {u.assigned_organizations_count ?? 0}{" "}
                                {(u.assigned_organizations_count ?? 0) === 1 ? "Organization" : "Organizations"}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="text-purple-600 font-medium">
                                {u.assigned_states_count ?? 0}{" "}
                                {(u.assigned_states_count ?? 0) === 1 ? "State" : "States"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            u.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "N/A"}
                          </span>
                        </TableCell>

                        {/* Last Active */}
                        <TableCell className="text-xs text-gray-600">
                          {formatRelativeTime(u.last_login)}
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="text-xs text-gray-600">
                          {formatDate(u.created_at)}
                        </TableCell>

                        {/* Actions — inline buttons */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Assign Partners — SAA only */}
                            {["acsl_agent", "super_admin_agent"].includes(u.role) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-brand border-brand/30 hover:bg-brand/5"
                                onClick={() => { setSelectedUserForOrgs(u); setShowAssignOrgsModal(true); }}
                                disabled={!!actionLoading}
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                Assign
                              </Button>
                            )}

                            {/* Edit */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEditModal(u)}
                              disabled={!!actionLoading}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>

                            {/* Enable / Disable */}
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-7 px-2 text-xs ${
                                u.status === "active"
                                  ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                                  : "text-green-600 border-green-200 hover:bg-green-50"
                              }`}
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              disabled={!!actionLoading}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.status === "active" ? (
                                <><UserX className="h-3 w-3 mr-1" />Disable</>
                              ) : (
                                <><UserCheck className="h-3 w-3 mr-1" />Enable</>
                              )}
                            </Button>

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                              disabled={!!actionLoading}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {pagination.total_pages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startRecord} to {endRecord} of {pagination.total_count} users
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={pagination.page === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Prev
                  </Button>
                  {getVisiblePages().map((p) => (
                    <Button
                      key={p}
                      variant={p === pagination.page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${p === pagination.page ? "bg-brand text-white hover:bg-brand" : ""}`}
                      onClick={() => handlePageChange(p)}
                    >{p}</Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.total_pages)} disabled={pagination.page >= pagination.total_pages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Create User Modal ──────────────────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetForm(); } }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new super admin or ACSL agent to the system</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="full_name"
                    placeholder="Enter full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className={formErrors.full_name ? "border-red-500" : ""}
                  />
                  {formErrors.full_name && <p className="text-xs text-red-600">{formErrors.full_name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className={formErrors.email ? "border-red-500" : ""}
                  />
                  {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                  <Select value={userForm.role} onValueChange={(v) => setUserForm((prev) => ({ ...prev, role: v }))}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Password Options */}
              <div className="space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_generate"
                    checked={userForm.auto_generate_password}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, auto_generate_password: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="auto_generate" className="cursor-pointer text-sm">Auto-generate password</Label>
                </div>

                {!userForm.auto_generate_password && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                        className={formErrors.password ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {formErrors.password && <p className="text-xs text-red-600">{formErrors.password}</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }} disabled={actionLoading === "create"}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === "create"} className="bg-brand hover:bg-brand/90 text-white">
                  {actionLoading === "create" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><UserPlus className="h-4 w-4 mr-2" />Create User</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Edit User Modal ────────────────────────────────────────────────── */}
        <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) { setShowEditModal(false); setSelectedUser(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information (email cannot be changed)</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditUser} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit_full_name"
                    placeholder="Enter full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className={formErrors.full_name ? "border-red-500" : ""}
                  />
                  {formErrors.full_name && <p className="text-xs text-red-600">{formErrors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input id="edit_email" type="email" value={userForm.email} disabled className="bg-gray-100 cursor-not-allowed" />
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
                  <Input
                    id="edit_phone"
                    placeholder="Enter phone number"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }} disabled={actionLoading === "edit"}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === "edit"} className="bg-brand hover:bg-brand/90 text-white">
                  {actionLoading === "edit" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Edit className="h-4 w-4 mr-2" />Update User</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
        <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setSelectedUser(null); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete User</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The user and all their data will be permanently removed.
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1.5 text-sm text-gray-700">
                <p><strong>Name:</strong> {selectedUser.full_name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {getRoleLabel(selectedUser.role)}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }} disabled={actionLoading === "delete"}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading === "delete"}>
                {actionLoading === "delete" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete User</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Assign Organizations Modal ─────────────────────────────────────── */}
        {showAssignOrgsModal && selectedUserForOrgs && (
          <AssignOrganizationsModal
            agent={selectedUserForOrgs}
            onClose={() => { setShowAssignOrgsModal(false); setSelectedUserForOrgs(null); }}
            onSuccess={() => {
              setShowAssignOrgsModal(false);
              setSelectedUserForOrgs(null);
              toast({ variant: "success", title: "Partner assignments updated" });
              fetchUsers(pagination.page, pagination.page_size);
            }}
          />
        )}

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default UserManagementPage;
