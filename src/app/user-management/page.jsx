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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Search,
  X,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Building2,
  MoreVertical,
} from "lucide-react";
import AssignOrganizationsModal from "../super-admin-agents/components/AssignOrganizationsModal";

// Simple tooltip component
const SimpleTooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50">
          {text}
        </div>
      )}
    </div>
  );
};

const UserManagementPage = () => {
  const { supabase, user } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  // State management
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignOrgsModal, setShowAssignOrgsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserForOrgs, setSelectedUserForOrgs] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state for create/edit
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "super_admin_agent",
    password: "",
    auto_generate_password: true,
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetch users
  const fetchUsers = async (
    page = 1,
    pageSize = 25,
    currentFilters = filters,
  ) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-users`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      // Add filters
      if (currentFilters.search) params.append("search", currentFilters.search);
      if (currentFilters.status) params.append("status", currentFilters.status);
      if (currentFilters.role) params.append("role", currentFilters.role);

      const response = await fetch(`${functionUrl}?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      setUsers(result.data || []);

      // Map API pagination response to local state format
      if (result.pagination) {
        setPagination({
          page: result.pagination.currentPage || 1,
          page_size: result.pagination.itemsPerPage || 25,
          total_count: result.pagination.totalItems || 0,
          total_pages: result.pagination.totalPages || 0,
        });
      } else {
        setPagination({
          page: 1,
          page_size: 25,
          total_count: 0,
          total_pages: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users", err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchUsers(newPage, pagination.page_size);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize);
    setPagination((prev) => ({ ...prev, page_size: size }));
    fetchUsers(1, size);
  };

  // Handle filter change with auto-apply
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    // Auto-apply filters
    fetchUsers(1, pagination.page_size, newFilters);
  };

  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: "",
      status: "",
      role: "",
    };
    setFilters(clearedFilters);
    fetchUsers(1, pagination.page_size, clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!userForm.full_name.trim()) {
      errors.full_name = "Full name is required";
    }

    if (!userForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = "Invalid email format";
    }

    if (!userForm.auto_generate_password && !userForm.password) {
      errors.password = "Password is required";
    } else if (
      !userForm.auto_generate_password &&
      userForm.password.length < 8
    ) {
      errors.password = "Password must be at least 8 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setActionLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-users`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const payload = {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim() || null,
        role: userForm.role,
        auto_generate_password: userForm.auto_generate_password,
      };

      if (!userForm.auto_generate_password) {
        payload.password = userForm.password;
      }

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      // If auto-generated, store password to show to user
      if (result.generated_password) {
        setGeneratedPassword(result.generated_password);
      }

      toast.success(
        "User created successfully",
        result.generated_password
          ? `Password: ${result.generated_password}`
          : "User can now log in",
      );

      setShowCreateModal(false);
      resetForm();
      fetchUsers(1, pagination.page_size);
    } catch (err) {
      console.error("Error creating user:", err);
      toast.error("Failed to create user", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (e) => {
    e.preventDefault();

    if (!userForm.full_name.trim()) {
      setFormErrors({ full_name: "Full name is required" });
      return;
    }

    setActionLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-users/${selectedUser.id}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const payload = {
        full_name: userForm.full_name.trim(),
        phone: userForm.phone.trim() || null,
      };

      const response = await fetch(functionUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      toast.success("User updated successfully", "Changes have been saved");

      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle disable/enable user
  const handleToggleUserStatus = async (userId, currentStatus) => {
    setActionLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-users/${userId}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const newStatus = currentStatus === "active" ? "disabled" : "active";
      const payload = {
        status: newStatus,
      };

      const response = await fetch(functionUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} user`);
      }

      toast.success(
        `User ${action}d successfully`,
        `User account is now ${action === "disable" ? "disabled" : "active"}`,
      );

      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      console.error("Error toggling user status:", err);
      toast.error("Failed to update user status", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/manage-users/${selectedUser.id}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(functionUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("User deleted successfully", "User has been removed");

      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers(pagination.page, pagination.page_size);
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete user", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setUserForm({
      full_name: "",
      email: "",
      phone: "",
      role: "super_admin_agent",
      password: "",
      auto_generate_password: true,
    });
    setFormErrors({});
    setGeneratedPassword("");
    setShowPassword(false);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "super_admin_agent",
      password: "",
      auto_generate_password: true,
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }

    return pages;
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "super_admin_agent"]}>
      <DashboardLayout currentRoute="user-management">
        <div className="flex-1 bg-white p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                User Management
              </h1>
            </div>

            <Button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-brand hover:bg-brand-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-brand-light p-4 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[150px]">
                <Input
                  placeholder="Name or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("status", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="flex-1 min-w-[150px]">
                <Select
                  value={filters.role || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("role", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="super_admin_agent">
                      Super Admin Agent
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div>
                  <Button
                    onClick={handleClearFilters}
                    size="sm"
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {users.length > 0
                ? (pagination.page - 1) * pagination.page_size + 1
                : 0}{" "}
              to{" "}
              {Math.min(
                pagination.page * pagination.page_size,
                pagination.total_count,
              )}{" "}
              of {pagination.total_count} users
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <Select
                value={pagination.page_size.toString()}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading users...</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand">
                  <TableHead className="text-white py-4 first:rounded-tl-lg">
                    Name
                  </TableHead>
                  <TableHead className="text-white py-4">Email</TableHead>
                  <TableHead className="text-white py-4">Phone</TableHead>
                  <TableHead className="text-white py-4">Role</TableHead>
                  <TableHead className="text-white py-4">Assigned Partners</TableHead>
                  <TableHead className="text-white py-4">Status</TableHead>
                  <TableHead className="text-white py-4">Created At</TableHead>
                  <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={loading ? "opacity-40" : ""}>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-gray-500">
                        {loading ? "Loading..." : "No users found"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-brand-light"
                      } hover:bg-gray-50`}
                    >
                      <TableCell className="font-medium">
                        {user.full_name || "N/A"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.role === "super_admin"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {user.role === "super_admin"
                            ? "Super Admin"
                            : "Super Admin Agent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.role === "super_admin_agent" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {user.assigned_organizations_count ?? 0} 
                            
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.status === "active"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {user.status.charAt(0).toUpperCase() +
                            user.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Assign Partners — SAA only */}
                          {user.role === "super_admin_agent" && (
                            <Button
                              size="sm"
                              className="bg-brand hover:bg-brand/90 text-white text-xs"
                              onClick={() => {
                                setSelectedUserForOrgs(user);
                                setShowAssignOrgsModal(true);
                              }}
                              disabled={actionLoading}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              Assign Partners
                            </Button>
                          )}

                          {/* More dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleUserStatus(user.id, user.status)}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2 text-orange-500" />
                                    Disable User
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                    Enable User
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openDeleteModal(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
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
          {pagination.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 &&
                        handlePageChange(pagination.page - 1)
                      }
                      className={
                        pagination.page === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers().map((pageNum, index) => (
                    <PaginationItem key={index}>
                      {pageNum === "..." ? (
                        <span className="px-4 py-2">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pagination.page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.total_pages &&
                        handlePageChange(pagination.page + 1)
                      }
                      className={
                        pagination.page === pagination.total_pages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Create User Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new super admin agent to the system
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={userForm.full_name}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Enter full name"
                    className={formErrors.full_name ? "border-red-500" : ""}
                  />
                  {formErrors.full_name && (
                    <p className="text-sm text-red-600">
                      {formErrors.full_name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter email address"
                    className={formErrors.email ? "border-red-500" : ""}
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value) =>
                      setUserForm((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin_agent">
                        Super Admin Agent
                      </SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_generate"
                      checked={userForm.auto_generate_password}
                      onChange={(e) =>
                        setUserForm((prev) => ({
                          ...prev,
                          auto_generate_password: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="auto_generate" className="cursor-pointer">
                      Auto-generate password
                    </Label>
                  </div>

                  {!userForm.auto_generate_password && (
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Enter password (min 8 characters)"
                          className={
                            formErrors.password ? "border-red-500" : ""
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {formErrors.password && (
                        <p className="text-sm text-red-600">
                          {formErrors.password}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit User Modal */}
          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information (email cannot be changed)
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditUser} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_full_name"
                    value={userForm.full_name}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Enter full name"
                    className={formErrors.full_name ? "border-red-500" : ""}
                  />
                  {formErrors.full_name && (
                    <p className="text-sm text-red-600">
                      {formErrors.full_name}
                    </p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={userForm.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone (Optional)</Label>
                  <Input
                    id="edit_phone"
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      resetForm();
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-brand hover:bg-brand-700 text-white"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Delete User
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The user and all their data will
                  be permanently removed.
                </DialogDescription>
              </DialogHeader>

              {selectedUser && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Name:</strong> {selectedUser.full_name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Role:</strong>{" "}
                    {selectedUser.role === "super_admin"
                      ? "Super Admin"
                      : "Super Admin Agent"}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assign Organizations Modal */}
          {showAssignOrgsModal && selectedUserForOrgs && (
            <AssignOrganizationsModal
              agent={selectedUserForOrgs}
              onClose={() => {
                setShowAssignOrgsModal(false);
                setSelectedUserForOrgs(null);
              }}
              onSuccess={() => {
                setShowAssignOrgsModal(false);
                setSelectedUserForOrgs(null);
                toast.success("Partner assignments updated");
              }}
            />
          )}

          {/* Toast Container */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default UserManagementPage;
