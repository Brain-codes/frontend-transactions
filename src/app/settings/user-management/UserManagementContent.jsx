
import { supabaseFunctionsUrl } from "@/lib/supabaseConfig";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
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
import { useAuth } from "../../contexts/useAuth";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Search,
  X,
  UserPlus,
  Users,
  Edit,
  SquarePen,
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
  Download,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import PageHeader from "../../components/PageHeader";
import { downloadTableAsCSV } from "@/utils/csvExportUtils";
import AssignOrganizationsModal from "../../super-admin-agents/components/AssignOrganizationsModal";
import organizationsService from "../../services/organizationsService";
import superAdminAgentService from "../../services/superAdminAgentService";

// Nigerian states (36 + FCT)
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];



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
  if (role === "acsl_agent_manager") return "ACSL Agent Manager";
  if (role === "partner" || role === "admin") return "Partner";
  if (role === "partner_agent" || role === "agent") return "Partner Agent";
  return role;
};

const getRoleBadgeClasses = (role) => {
  switch (role) {
    case "super_admin":
      return "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200";
    case "acsl_agent_manager":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "acsl_agent":
    case "super_admin_agent":
      return "bg-sky-100 text-sky-800 border border-sky-200";
    case "partner":
    case "admin":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "partner_agent":
    case "agent":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const UserManagementPage = () => {
  const { supabase } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
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
  const [formMode, setFormMode] = useState("create"); // "create" | "edit"
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignOrgsModal, setShowAssignOrgsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserForOrgs, setSelectedUserForOrgs] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // stores userId or 'create'/'delete' etc.
  const hydratingRef = useRef(false);

  // Form state
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: undefined,
    password: "",
    auto_generate_password: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Partner assignment state for Create modal
  const [allOrgs, setAllOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [selectedPartnerIds, setSelectedPartnerIds] = useState(new Set());
  const [selectedStates, setSelectedStates] = useState(new Set());

  // ACSL Agent cascade: managers in selected states
  const [acslManagers, setAcslManagers] = useState([]); // [{id, full_name, email, states:Set, orgIds:Set}]
  const [managersLoading, setManagersLoading] = useState(false);
  const [selectedManagerIds, setSelectedManagerIds] = useState(new Set());
  const [managerSearch, setManagerSearch] = useState("");


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
        `${supabaseFunctionsUrl}/manage-users?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch users");

      setUsers(result.data || []);
      if (result.pagination) {
        setPagination({
          page: result.pagination.currentPage || 1,
          page_size: result.pagination.itemsPerPage || 10,
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
    setUserForm({ full_name: "", email: "", phone: "", role: undefined, password: "", auto_generate_password: true });
    setFormErrors({});
    setShowPassword(false);
    setPartnerSearch("");
    setSelectedPartnerIds(new Set());
    setSelectedStates(new Set());
    setSelectedManagerIds(new Set());
    setManagerSearch("");
    setFormMode("create");
    setSelectedUser(null);
  };

  // Role classifiers
  // - partner_agent: flat partner-only picker (legacy)
  // - acsl_agent: cascade — States → Managers in those states → Partners of those managers
  // - acsl_agent_manager: States → Partners in those states (auto-checked)
  const needsPartnerAssignment = (role) => role === "partner_agent";
  const needsAcslAgentCascade = (role) => role === "acsl_agent";
  const needsStateAndPartnerAssignment = (role) => role === "acsl_agent_manager";

  // Load all ACSL Agent Managers + their assigned states & orgs (for cascade)
  const loadAcslManagers = async () => {
    setManagersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const qs = new URLSearchParams({ page: "1", limit: "500", role: "acsl_agent_manager" });
      const res = await fetch(`${supabaseFunctionsUrl}/manage-users?${qs}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load managers");
      const base = (json.data || []).filter((u) => u.role === "acsl_agent_manager");
      const enriched = await Promise.all(
        base.map(async (u) => {
          const [statesRes, orgsRes] = await Promise.allSettled([
            superAdminAgentService.getAgentStates(u.id),
            superAdminAgentService.getAgentOrganizations(u.id),
          ]);
          const statesList = statesRes.status === "fulfilled"
            ? (statesRes.value?.data || statesRes.value?.states || statesRes.value || [])
            : [];
          const orgsList = orgsRes.status === "fulfilled"
            ? (orgsRes.value?.data || orgsRes.value?.organizations || orgsRes.value || [])
            : [];
          const stateNames = Array.isArray(statesList)
            ? statesList.map((s) => (typeof s === "string" ? s : s?.state)).filter(Boolean)
            : [];
          const orgIds = Array.isArray(orgsList)
            ? orgsList.map((o) => o?.id || o?.organization_id).filter(Boolean)
            : [];
          return {
            id: u.id,
            full_name: u.full_name || u.email,
            email: u.email,
            states: new Set(stateNames),
            orgIds: new Set(orgIds),
          };
        })
      );
      setAcslManagers(enriched);
    } catch {
      setAcslManagers([]);
    } finally {
      setManagersLoading(false);
    }
  };

  const handleRoleChange = async (role) => {
    setUserForm((prev) => ({ ...prev, role }));
    setSelectedPartnerIds(new Set());
    setSelectedStates(new Set());
    setSelectedManagerIds(new Set());
    setPartnerSearch("");
    setManagerSearch("");
    const shouldLoadOrgs =
      needsPartnerAssignment(role) ||
      needsStateAndPartnerAssignment(role) ||
      needsAcslAgentCascade(role);
    if (shouldLoadOrgs && allOrgs.length === 0) {
      setOrgsLoading(true);
      try {
        const result = await organizationsService.getAllOrganizations();
        setAllOrgs(result.data || []);
      } catch {
        // silently fail — user can still proceed without partner assignment
      } finally {
        setOrgsLoading(false);
      }
    }
    if (needsAcslAgentCascade(role) && acslManagers.length === 0) {
      loadAcslManagers();
    }
  };

  // Auto-check all partners in selected states when states change (Agent Manager flow)
  useEffect(() => {
    if (userForm.role !== "acsl_agent_manager") return;
    if (hydratingRef.current) return;
    const ids = new Set(
      allOrgs
        .filter((o) => o.state && selectedStates.has(o.state))
        .map((o) => o.id)
    );
    setSelectedPartnerIds(ids);
  }, [selectedStates, allOrgs, userForm.role]);

  // When ACSL Agent cascade selections change, reconcile selected partners to
  // the union of partners belonging to the currently-selected managers AND in
  // the currently-selected states. Removing a manager/state drops their partners.
  useEffect(() => {
    if (userForm.role !== "acsl_agent") return;
    if (hydratingRef.current) return;
    const allowedOrgIds = new Set();
    acslManagers
      .filter((m) => selectedManagerIds.has(m.id))
      .forEach((m) => m.orgIds.forEach((id) => allowedOrgIds.add(id)));
    // Limit to partners that are also in selected states (if any)
    const inStateOrgIds = new Set(
      allOrgs
        .filter((o) => allowedOrgIds.has(o.id) && (selectedStates.size === 0 || (o.state && selectedStates.has(o.state))))
        .map((o) => o.id)
    );
    // Auto-check newly-available, keep prior selections that are still valid
    setSelectedPartnerIds(inStateOrgIds);
  }, [selectedManagerIds, selectedStates, acslManagers, allOrgs, userForm.role]);



  const validateForm = () => {
    const errors = {};
    if (!userForm.full_name.trim()) errors.full_name = "Full name is required";
    if (!userForm.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) errors.email = "Invalid email format";
    if (!userForm.role) errors.role = "User Group is required";
    if (!userForm.auto_generate_password && !userForm.password) errors.password = "Password is required";
    else if (!userForm.auto_generate_password && userForm.password.length < 8) errors.password = "Password must be at least 8 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({ full_name: user.full_name || "", email: user.email || "", phone: user.phone || "", role: user.role || undefined, password: "", auto_generate_password: true });
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
        `${supabaseFunctionsUrl}/manage-users`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create user");

      const newUserId = result.user?.id || result.data?.id;
      if (
        newUserId &&
        (userForm.role === "acsl_agent_manager" || userForm.role === "acsl_agent") &&
        selectedStates.size > 0
      ) {
        try {
          await superAdminAgentService.setAgentStates(newUserId, Array.from(selectedStates));
        } catch {
          // non-fatal — user was created, state assignment failed
        }
      }
      if (newUserId && selectedPartnerIds.size > 0) {
        try {
          await superAdminAgentService.setAgentOrganizations(newUserId, Array.from(selectedPartnerIds));
        } catch {
          // non-fatal — user was created, org assignment failed
        }
      }


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
        `${supabaseFunctionsUrl}/manage-users/${selectedUser.id}`,
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
        `${supabaseFunctionsUrl}/manage-users/${userId}`,
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
        `${supabaseFunctionsUrl}/manage-users/${selectedUser.id}`,
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
      <DashboardLayout currentRoute="settings" title="User Management">
        <div className="p-6 space-y-5">

          {!showCreateModal && (<>
          <PageHeader
            icon={Users}
            title="User Management"
            right={
              <Button
                className="bg-black hover:bg-gray-900 text-white text-sm h-10 px-4 flex items-center gap-1.5"
                onClick={() => { resetForm(); setShowCreateModal(true); }}
              >
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            }
          />

          {/* Filter Bar */}
          <div
            className="p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3"
            style={{ backgroundColor: "#f4f7e3" }}
          >
            {/* Search */}
            <div className="w-1/4 min-w-[180px]">
              <Input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="bg-white h-9 text-xs shadow-none border-gray-200"
              />
            </div>

            {/* Status */}
            <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9 bg-white text-xs shadow-none border-gray-200 text-gray-400 data-[placeholder]:text-gray-400">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="active" className="text-xs">Enabled</SelectItem>
                <SelectItem value="disabled" className="text-xs">Disabled</SelectItem>

              </SelectContent>
            </Select>

            {/* Role */}
            <Select value={filters.role || "all"} onValueChange={(v) => handleFilterChange("role", v === "all" ? "" : v)}>
              <SelectTrigger className="w-[170px] h-9 bg-white text-xs shadow-none border-gray-200 text-gray-400 data-[placeholder]:text-gray-400">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                <SelectItem value="super_admin" className="text-xs">Super Admin</SelectItem>
                <SelectItem value="acsl_agent" className="text-xs">ACSL Agent</SelectItem>
                <SelectItem value="partner" className="text-xs">Partner Admin</SelectItem>
                <SelectItem value="partner_agent" className="text-xs">Partner Agent</SelectItem>
              </SelectContent>
            </Select>


            {/* Reset */}
            <Button
              onClick={handleClearFilters}
              size="sm"
              variant="outline"
              className="h-9 bg-white shadow-none border-gray-200"
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Reset Filters
            </Button>

            {/* Pagination count — far right */}
            <p className="ml-auto text-sm text-gray-600">
              Showing <span className="font-medium">{startRecord}</span> to <span className="font-medium">{endRecord}</span> of <span className="font-medium">{pagination.total_count}</span> users
            </p>
          </div>

          {/* Table */}
          <div className="space-y-0">

            {/* Table body */}
            <div className="bg-white border-x border-t border-gray-200 rounded-t-lg overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="hover:opacity-100" style={{ backgroundColor: "#4a5d0f" }}>
                    <TableHead className="text-white font-semibold text-sm whitespace-nowrap first:rounded-tl-lg">Name</TableHead>
                    <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Phone</TableHead>
                    <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Role</TableHead>
                    <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Status</TableHead>
                    
                    <TableHead className="text-center text-white font-semibold text-sm whitespace-nowrap rounded-tr-lg">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? "opacity-40" : ""}>
                  {users.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, idx) => (
                      <TableRow
                        key={u.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-[#f4f7e3]"} hover:bg-[#eef3c4] text-gray-700`}
                      >
                        <TableCell className="text-sm font-medium text-gray-900">{u.full_name || "N/A"}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{u.email}</TableCell>
                        <TableCell className="text-sm text-gray-600">{u.phone || ""}</TableCell>

                        {/* Role — colored badge per role */}
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeClasses(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.status === "active"
                              ? "bg-black text-white"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {u.status === "active" ? "Enabled" : (u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "N/A")}
                          </span>

                        </TableCell>


                        {/* Actions — kebab menu */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(u)}
                                    disabled={!!actionLoading}
                                    aria-label="Edit user"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    <SquarePen className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u.id, u.status)}
                                    disabled={!!actionLoading}
                                    aria-label={u.status === "active" ? "Disable user" : "Enable user"}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                                  >
                                    {u.status === "active" ? (
                                      <UserX className="h-4 w-4" />
                                    ) : (
                                      <UserCheck className="h-4 w-4" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {u.status === "active" ? "Disable" : "Enable"}
                                </TooltipContent>

                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                                    disabled={!!actionLoading}
                                    aria-label="Delete user"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>


                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={!!actionLoading}
                                  aria-label="User actions"
                                >
                                  {actionLoading === u.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1 text-[11px] text-gray-500 bg-gray-50/80 rounded-t-sm font-medium border-b border-gray-100">
                                  Created: {formatDate(u.created_at)}
                                </div>
                                <div className="px-2 py-1 text-[11px] text-gray-500 bg-gray-50/80 font-medium border-b border-gray-100">
                                  Last Active: {formatRelativeTime(u.last_login)}
                                </div>
                                {["acsl_agent", "super_admin_agent"].includes(u.role) && (
                                  <>
                                    <div className="px-2 py-1.5 text-[11px] text-gray-500 bg-gray-50/80 font-medium border-b border-gray-100">
                                      Assigned: {u.assigned_organizations_count ?? 0} {(u.assigned_organizations_count ?? 0) === 1 ? "Org" : "Orgs"} · {u.assigned_states_count ?? 0} {(u.assigned_states_count ?? 0) === 1 ? "State" : "States"}
                                    </div>
                                    <DropdownMenuItem
                                      onClick={() => { setSelectedUserForOrgs(u); setShowAssignOrgsModal(true); }}
                                    >
                                      <Building2 className="h-4 w-4 mr-2" />
                                      Assign Partners
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => openEditModal(u)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleUserStatus(u.id, u.status)}>
                                  {u.status === "active" ? (
                                    <><UserX className="h-4 w-4 mr-2 text-amber-600" />Disable</>
                                  ) : (
                                    <><UserCheck className="h-4 w-4 mr-2 text-green-600" />Enable</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
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

            {/* Pagination footer */}
            {users.length > 0 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{startRecord}</span> to <span className="font-medium">{endRecord}</span> of <span className="font-medium">{pagination.total_count}</span> users
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">per page:</span>
                    <Select value={pagination.page_size.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-[70px] h-8 bg-white text-sm">
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
                {pagination.total_pages > 1 && (
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
                )}
              </div>
            )}
          </div>
          </>)}

          {showCreateModal && (
            <div className="space-y-5">
              <PageHeader
                icon={UserPlus}
                title="Create New User"
                right={
                  <Button
                    variant="outline"
                    className="text-sm h-10 px-4 flex items-center gap-1.5 shadow-none border-gray-300"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to User Management
                  </Button>
                }
              />
              <div className="bg-white border border-gray-200 rounded-lg p-6">




            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="full_name"
                    placeholder="Enter full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className={`shadow-none ${formErrors.full_name ? "border-red-500" : "border-gray-300"}`}
                  />
                  {formErrors.full_name && <p className="text-xs text-red-600">{formErrors.full_name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className={`shadow-none ${formErrors.email ? "border-red-500" : "border-gray-300"}`}
                  />
                  {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="shadow-none border-gray-300"
                  />
                </div>

                {/* User Group */}
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">User Group <span className="text-red-500">*</span></Label>
                  <Select value={userForm.role} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role" className="shadow-none border-gray-300">
                      <SelectValue placeholder="Select user group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="acsl_agent_manager">ACSL Agent Manager</SelectItem>
                      <SelectItem value="acsl_agent">ACSL Agent</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="partner_agent">Partner Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.role && <p className="text-xs text-red-600">{formErrors.role}</p>}
                </div>
              </div>

              {/* ACSL Agent Manager — assign States, then Partners in those states */}
              {needsStateAndPartnerAssignment(userForm.role) && (() => {
                const partnersInStates = allOrgs.filter((o) => o.state && selectedStates.has(o.state));
                const q = partnerSearch.trim().toLowerCase();
                const visiblePartners = q
                  ? partnersInStates.filter((o) =>
                      (o.partner_name || "").toLowerCase().includes(q) ||
                      (o.branch || "").toLowerCase().includes(q)
                    )
                  : partnersInStates;
                const allStatesSelected = selectedStates.size === NIGERIAN_STATES.length;
                const toggleState = (s) => setSelectedStates((prev) => {
                  const next = new Set(prev);
                  if (next.has(s)) next.delete(s); else next.add(s);
                  return next;
                });
                const toggleAllStates = () => setSelectedStates(allStatesSelected ? new Set() : new Set(NIGERIAN_STATES));
                const selectAllVisible = () => setSelectedPartnerIds((prev) => {
                  const next = new Set(prev);
                  visiblePartners.forEach((p) => next.add(p.id));
                  return next;
                });
                const clearAllVisible = () => setSelectedPartnerIds((prev) => {
                  const next = new Set(prev);
                  visiblePartners.forEach((p) => next.delete(p.id));
                  return next;
                });
                const sq = stateSearch.trim().toLowerCase();
                const filteredStates = sq
                  ? NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(sq))
                  : [];
                const hasStates = selectedStates.size > 0;
                return (
                  <>
                    {/* States block */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Label className="text-sm font-semibold text-[#4a5d0f] flex items-center gap-1.5">
                          Assign User to State
                          <span className="text-xs text-gray-500 font-normal">
                            ({selectedStates.size} of {NIGERIAN_STATES.length} selected)
                          </span>
                        </Label>
                        <label className="flex items-center gap-1.5 text-xs text-[#4a5d0f] font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allStatesSelected}
                            onChange={toggleAllStates}
                            className="rounded accent-[#4a5d0f]"
                          />
                          Select all states
                        </label>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search states to add..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="pl-8 h-9 text-sm shadow-none border-gray-300"
                        />
                      </div>

                      {sq && filteredStates.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                            {filteredStates.map((s) => {
                              const on = selectedStates.has(s);
                              return (
                                <label
                                  key={s}
                                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-white cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleState(s)}
                                    className="rounded accent-[#4a5d0f]"
                                  />
                                  <span className={on ? "text-[#4a5d0f] font-medium" : "text-gray-700"}>{s}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {sq && filteredStates.length === 0 && (
                        <p className="text-xs text-gray-400 py-1">No states match "{stateSearch}".</p>
                      )}

                      {hasStates ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(selectedStates).sort().map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full bg-[#4a5d0f] text-white"
                            >
                              {s}
                              <button
                                type="button"
                                onClick={() => toggleState(s)}
                                className="hover:bg-white/20 rounded-full p-0.5"
                                aria-label={`Remove ${s}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        !sq && (
                          <p className="text-xs text-gray-400">Search above and tick the states to assign, or pick "Select all states".</p>
                        )
                      )}
                    </div>

                    {/* Partners — only after at least one state is selected */}
                    {hasStates && (
                      <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Label className="text-sm font-semibold text-[#4a5d0f]">
                            Assign Partners
                            <span className="text-xs text-gray-500 font-normal">
                              ({selectedPartnerIds.size} selected · {partnersInStates.length} available)
                            </span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={selectAllVisible}
                              disabled={visiblePartners.length === 0}
                              className="text-xs px-2.5 py-1 rounded border border-[#4a5d0f] text-[#4a5d0f] hover:bg-[#eef3c4] disabled:opacity-40"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={clearAllVisible}
                              disabled={visiblePartners.length === 0}
                              className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            placeholder="Search partners by name or branch..."
                            value={partnerSearch}
                            onChange={(e) => setPartnerSearch(e.target.value)}
                            className="pl-8 h-9 text-sm shadow-none border-gray-300"
                          />
                        </div>

                        {orgsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading partners...
                          </div>
                        ) : visiblePartners.length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 text-center">
                            {partnersInStates.length === 0
                              ? "No partners in selected states."
                              : "No partners match your search."}
                          </p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {visiblePartners.map((org) => {
                                const checked = selectedPartnerIds.has(org.id);
                                return (
                                  <label
                                    key={org.id}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-xs transition-colors border ${
                                      checked
                                        ? "bg-[#f9fbed] border-[#4a5d0f] text-[#4a5d0f]"
                                        : "bg-white border-gray-200 hover:border-[#4a5d0f] text-gray-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setSelectedPartnerIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(org.id)) next.delete(org.id);
                                          else next.add(org.id);
                                          return next;
                                        });
                                      }}
                                      className="rounded accent-[#4a5d0f] shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">{org.partner_name}</div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 truncate">
                                        {org.branch && <span className="truncate">{org.branch}</span>}
                                        {org.branch && org.state && <span>·</span>}
                                        {org.state && <span>{org.state}</span>}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}




              {/* ACSL Agent — Cascade: States → Managers in those states → Partners of those managers */}
              {needsAcslAgentCascade(userForm.role) && (() => {
                const allStatesSelected = selectedStates.size === NIGERIAN_STATES.length;
                const toggleState = (s) => setSelectedStates((prev) => {
                  const next = new Set(prev);
                  if (next.has(s)) next.delete(s); else next.add(s);
                  return next;
                });
                const toggleAllStates = () =>
                  setSelectedStates(allStatesSelected ? new Set() : new Set(NIGERIAN_STATES));
                const sq = stateSearch.trim().toLowerCase();
                const filteredStates = sq ? NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(sq)) : [];
                const hasStates = selectedStates.size > 0;

                // Managers whose assigned states overlap with the selected states
                const managersInStates = acslManagers.filter((m) =>
                  Array.from(m.states).some((s) => selectedStates.has(s))
                );
                const mq = managerSearch.trim().toLowerCase();
                const visibleManagers = mq
                  ? managersInStates.filter(
                      (m) =>
                        (m.full_name || "").toLowerCase().includes(mq) ||
                        (m.email || "").toLowerCase().includes(mq)
                    )
                  : managersInStates;
                const toggleManager = (id) =>
                  setSelectedManagerIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                const selectAllManagers = () =>
                  setSelectedManagerIds((prev) => {
                    const next = new Set(prev);
                    visibleManagers.forEach((m) => next.add(m.id));
                    return next;
                  });
                const clearAllManagers = () => setSelectedManagerIds(new Set());

                // Partners belonging to selected managers AND in selected states
                const allowedOrgIds = new Set();
                acslManagers
                  .filter((m) => selectedManagerIds.has(m.id))
                  .forEach((m) => m.orgIds.forEach((id) => allowedOrgIds.add(id)));
                const partnersOfManagers = allOrgs.filter(
                  (o) => allowedOrgIds.has(o.id) && (selectedStates.size === 0 || (o.state && selectedStates.has(o.state)))
                );
                const pq = partnerSearch.trim().toLowerCase();
                const visiblePartners = pq
                  ? partnersOfManagers.filter(
                      (o) =>
                        (o.partner_name || "").toLowerCase().includes(pq) ||
                        (o.branch || "").toLowerCase().includes(pq)
                    )
                  : partnersOfManagers;
                const togglePartner = (id) =>
                  setSelectedPartnerIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                const selectAllPartners = () =>
                  setSelectedPartnerIds((prev) => {
                    const next = new Set(prev);
                    visiblePartners.forEach((p) => next.add(p.id));
                    return next;
                  });
                const clearAllPartners = () =>
                  setSelectedPartnerIds((prev) => {
                    const next = new Set(prev);
                    visiblePartners.forEach((p) => next.delete(p.id));
                    return next;
                  });

                return (
                  <>
                    {/* Step 1 — States */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Label className="text-sm font-semibold text-[#4a5d0f]">
                          Assign User to State
                          <span className="text-xs text-gray-500 font-normal ml-1">
                            ({selectedStates.size} of {NIGERIAN_STATES.length} selected)
                          </span>
                        </Label>
                        <label className="flex items-center gap-1.5 text-xs text-[#4a5d0f] font-medium cursor-pointer select-none">
                          <input type="checkbox" checked={allStatesSelected} onChange={toggleAllStates} className="rounded accent-[#4a5d0f]" />
                          Select all states
                        </label>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search states to add..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="pl-8 h-9 text-sm shadow-none border-gray-300"
                        />
                      </div>
                      {sq && filteredStates.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                            {filteredStates.map((s) => {
                              const on = selectedStates.has(s);
                              return (
                                <label key={s} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-white cursor-pointer">
                                  <input type="checkbox" checked={on} onChange={() => toggleState(s)} className="rounded accent-[#4a5d0f]" />
                                  <span className={on ? "text-[#4a5d0f] font-medium" : "text-gray-700"}>{s}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {hasStates && (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(selectedStates).sort().map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full bg-[#4a5d0f] text-white">
                              {s}
                              <button type="button" onClick={() => toggleState(s)} className="hover:bg-white/20 rounded-full p-0.5" aria-label={`Remove ${s}`}>
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {!hasStates && !sq && (
                        <p className="text-xs text-gray-400">Search above and tick the states to assign, or pick "Select all states".</p>
                      )}
                    </div>

                    {/* Step 2 — Managers in selected states */}
                    {hasStates && (
                      <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Label className="text-sm font-semibold text-[#4a5d0f]">
                            Assign ACSL Agent Manager(s)
                            <span className="text-xs text-gray-500 font-normal ml-1">
                              ({selectedManagerIds.size} selected · {managersInStates.length} available)
                            </span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={selectAllManagers} disabled={visibleManagers.length === 0}
                              className="text-xs px-2.5 py-1 rounded border border-[#4a5d0f] text-[#4a5d0f] hover:bg-[#eef3c4] disabled:opacity-40">
                              Select all
                            </button>
                            <button type="button" onClick={clearAllManagers} disabled={selectedManagerIds.size === 0}
                              className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            placeholder="Search managers by name or email..."
                            value={managerSearch}
                            onChange={(e) => setManagerSearch(e.target.value)}
                            className="pl-8 h-9 text-sm shadow-none border-gray-300"
                          />
                        </div>
                        {managersLoading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading managers...
                          </div>
                        ) : visibleManagers.length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 text-center">
                            {managersInStates.length === 0
                              ? "No ACSL Agent Managers cover the selected states."
                              : "No managers match your search."}
                          </p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {visibleManagers.map((m) => {
                                const checked = selectedManagerIds.has(m.id);
                                const sharedStates = Array.from(m.states).filter((s) => selectedStates.has(s));
                                return (
                                  <label key={m.id}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-xs transition-colors border ${
                                      checked ? "bg-[#f9fbed] border-[#4a5d0f] text-[#4a5d0f]" : "bg-white border-gray-200 hover:border-[#4a5d0f] text-gray-700"
                                    }`}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleManager(m.id)} className="rounded accent-[#4a5d0f] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">{m.full_name}</div>
                                      <div className="text-[10px] text-gray-500 truncate">
                                        {sharedStates.length} state{sharedStates.length === 1 ? "" : "s"} · {m.orgIds.size} partner{m.orgIds.size === 1 ? "" : "s"}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3 — Partners of selected managers */}
                    {hasStates && selectedManagerIds.size > 0 && (
                      <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Label className="text-sm font-semibold text-[#4a5d0f]">
                            Assign Partners
                            <span className="text-xs text-gray-500 font-normal ml-1">
                              ({selectedPartnerIds.size} selected · {partnersOfManagers.length} available)
                            </span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={selectAllPartners} disabled={visiblePartners.length === 0}
                              className="text-xs px-2.5 py-1 rounded border border-[#4a5d0f] text-[#4a5d0f] hover:bg-[#eef3c4] disabled:opacity-40">
                              Select all
                            </button>
                            <button type="button" onClick={clearAllPartners} disabled={visiblePartners.length === 0}
                              className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            placeholder="Search partners by name or branch..."
                            value={partnerSearch}
                            onChange={(e) => setPartnerSearch(e.target.value)}
                            className="pl-8 h-9 text-sm shadow-none border-gray-300"
                          />
                        </div>
                        {orgsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading partners...
                          </div>
                        ) : visiblePartners.length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 text-center">
                            {partnersOfManagers.length === 0
                              ? "Selected managers have no partners in the chosen states."
                              : "No partners match your search."}
                          </p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {visiblePartners.map((org) => {
                                const checked = selectedPartnerIds.has(org.id);
                                return (
                                  <label key={org.id}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer text-xs transition-colors border ${
                                      checked ? "bg-[#f9fbed] border-[#4a5d0f] text-[#4a5d0f]" : "bg-white border-gray-200 hover:border-[#4a5d0f] text-gray-700"
                                    }`}>
                                    <input type="checkbox" checked={checked} onChange={() => togglePartner(org.id)} className="rounded accent-[#4a5d0f] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">{org.partner_name}</div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 truncate">
                                        {org.branch && <span className="truncate">{org.branch}</span>}
                                        {org.branch && org.state && <span>·</span>}
                                        {org.state && <span>{org.state}</span>}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Partner Assignment — shown for Partner Agent only */}
              {needsPartnerAssignment(userForm.role) && (
                <div className="space-y-2 border border-[#eef3c4] rounded-md p-3 bg-[#f9fbed]">
                  <Label className="text-sm font-semibold text-[#4a5d0f]">
                    Assign Partners <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </Label>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Search partners..."
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      className="pl-8 h-8 text-sm bg-white shadow-none border-gray-300"
                    />
                  </div>

                  {orgsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading partners...
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {allOrgs
                        .filter((o) =>
                          !partnerSearch ||
                          (o.partner_name || "").toLowerCase().includes(partnerSearch.toLowerCase()) ||
                          (o.state || "").toLowerCase().includes(partnerSearch.toLowerCase())
                        )
                        .map((org) => {
                          const checked = selectedPartnerIds.has(org.id);
                          return (
                            <label
                              key={org.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${checked ? "bg-[#eef3c4] text-[#4a5d0f]" : "hover:bg-white text-gray-700"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedPartnerIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(org.id)) next.delete(org.id);
                                    else next.add(org.id);
                                    return next;
                                  });
                                }}
                                className="rounded accent-[#4a5d0f]"
                              />
                              <span className="flex-1 truncate font-medium">{org.partner_name}</span>
                              {org.state && <span className="text-gray-400 shrink-0">{org.state}</span>}
                            </label>
                          );
                        })}
                      {allOrgs.length === 0 && (
                        <p className="text-xs text-gray-400 py-2 text-center">No partners available</p>
                      )}
                    </div>
                  )}

                  {selectedPartnerIds.size > 0 && (
                    <p className="text-xs text-[#4a5d0f] font-medium">
                      {selectedPartnerIds.size} partner{selectedPartnerIds.size > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}

              {/* Password Options */}
              <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-[#fafcfc]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto_generate"
                    checked={userForm.auto_generate_password}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, auto_generate_password: e.target.checked }))}
                    className="rounded accent-[#4a5d0f]"
                  />
                  <Label htmlFor="auto_generate" className="cursor-pointer text-sm font-medium text-gray-700">Auto-generate password</Label>
                </div>

                {!userForm.auto_generate_password && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                        className={`shadow-none pr-9 ${formErrors.password ? "border-red-500" : "border-gray-300"}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </div>
                    {formErrors.password && <p className="text-xs text-red-600">{formErrors.password}</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }} disabled={actionLoading === "create"} className="shadow-none border-gray-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === "create"} className="bg-[#4a5d0f] hover:bg-[#3d4f0c] text-white shadow-none">
                  {actionLoading === "create" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><UserPlus className="h-4 w-4 mr-2" />Create User</>}
                </Button>
              </div>
            </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Edit User Modal ────────────────────────────────────────────────── */}
        <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) { setShowEditModal(false); setSelectedUser(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-2xl shadow-none">
            <DialogHeader className="border-b pb-3 mb-1">
              <DialogTitle className="text-lg font-semibold text-[#4a5d0f]">Edit User</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">Update user information (email cannot be changed)</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditUser} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_full_name" className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit_full_name"
                    placeholder="Enter full name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className={`shadow-none ${formErrors.full_name ? "border-red-500" : "border-gray-300"}`}
                  />
                  {formErrors.full_name && <p className="text-xs text-red-600">{formErrors.full_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input id="edit_email" type="email" value={userForm.email} disabled className="bg-gray-50 cursor-not-allowed shadow-none border-gray-200 text-gray-500" />
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_phone" className="text-sm font-medium text-gray-700">Phone <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
                  <Input
                    id="edit_phone"
                    placeholder="Enter phone number"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="shadow-none border-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }} disabled={actionLoading === "edit"} className="shadow-none border-gray-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === "edit"} className="bg-[#4a5d0f] hover:bg-[#3d4f0c] text-white shadow-none">
                  {actionLoading === "edit" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Edit className="h-4 w-4 mr-2" />Update User</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
        <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setSelectedUser(null); } }}>
          <DialogContent className="sm:max-w-md shadow-none">
            <DialogHeader className="border-b pb-3 mb-1">
              <DialogTitle className="text-lg font-semibold text-red-600">Delete User</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                This action cannot be undone. The user and all their data will be permanently removed.
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-1.5 text-sm text-gray-700">
                <p><strong>Name:</strong> {selectedUser.full_name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {getRoleLabel(selectedUser.role)}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }} disabled={actionLoading === "delete"} className="shadow-none border-gray-300">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading === "delete"} className="shadow-none">
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
