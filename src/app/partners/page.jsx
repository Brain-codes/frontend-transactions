"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import OrganizationFormModal from "../components/OrganizationFormModal";
import OrganizationDetailSidebar from "../components/OrganizationDetailSidebar";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import OrganizationCSVImportModal from "../components/OrganizationCSVImportModal";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import useOrganizations from "../hooks/useOrganizations";
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { lgaAndStates } from "../constants";
import adminAgentService from "../services/adminAgentService.jsx";
import {
  Plus,
  Search,
  X,
  Building2,
  Upload,
  Users,
  UserCheck,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Layers,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import { downloadTableAsCSV } from "@/utils/csvExportUtils";
import AssignPaymentModelsModal from "./components/AssignPaymentModelsModal";
import AdminSalesDetailModal from "../admin/components/sales/AdminSalesDetailModal";

// ── Stove IDs Modal ──────────────────────────────────────────────────────────

const StoveIdsModal = ({ organization, isOpen, onClose }) => {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [totals, setTotals] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSaleId, setLoadingSaleId] = useState(null);

  useEffect(() => {
    if (isOpen && organization) {
      setSearch("");
      fetchStoveIds(statusFilter);
    }
  }, [isOpen, organization, statusFilter]);

  const fetchStoveIds = async (sf) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = { organization_id: organization.id };
      if (sf && sf !== "all") body.status = sf;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-stove-ids`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch stove IDs");
      setStoveIds(data.data || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err.message);
      setStoveIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSale = async (saleId) => {
    setLoadingSaleId(saleId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-sale?id=${saleId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch sale");
      setSelectedSale(data.data || null);
    } catch (err) {
      toast({ variant: "error", title: "Failed to fetch sale", description: err.message });
    } finally {
      setLoadingSaleId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "N/A"; }
  };

  const filtered = stoveIds.filter((s) =>
    !search || s.stove_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = totals?.total_stove_ids ?? 0;
  const available = totals?.total_stove_available ?? 0;
  const sold = totals?.total_stove_sold ?? 0;
  const soldPct = totalCount > 0 ? Math.round((sold / totalCount) * 100) : 0;
  const availPct = totalCount > 0 ? Math.round((available / totalCount) * 100) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-sky-50/80 border-b shrink-0">
            <DialogTitle className="text-base font-bold">Stove IDs</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {organization?.partner_name} — all assigned stove IDs
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Stats — SectionCard pattern: 3 inline stat boxes */}
            {totals && (
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-1 mb-3">
                  Stove Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Assigned</p>
                    <p className="text-xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Available</p>
                    <p className="text-xl font-bold text-green-700">{available.toLocaleString()}</p>
                    <p className="text-[10px] text-green-600">{availPct}% of total</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sold</p>
                    <p className="text-xl font-bold text-blue-700">{sold.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-600">{soldPct}% of total</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search stove ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stove Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : error ? (
              <div className="text-center text-red-600 py-8 text-sm">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No stove IDs found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map((stove) => (
                  <div
                    key={stove.id}
                    className={`bg-muted/30 border rounded-lg p-3 space-y-2 ${
                      stove.status === "sold" ? "border-blue-200" : "border-green-200"
                    }`}
                  >
                    {/* Card header: stove ID + status pill */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900">{stove.stove_id}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        stove.status === "sold"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {stove.status === "sold" ? "Sold" : "Available"}
                      </span>
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned</p>
                        <p className="text-[11px] font-medium text-gray-700">{formatDate(stove.created_at)}</p>
                      </div>
                      {stove.status === "sold" && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sale Date</p>
                          <p className="text-[11px] font-medium text-gray-700">{formatDate(stove.sale_date)}</p>
                        </div>
                      )}
                    </div>
                    {/* View Sale button */}
                    {stove.sale_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleViewSale(stove.sale_id)}
                        disabled={!!loadingSaleId}
                      >
                        {loadingSaleId === stove.sale_id
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <Eye className="h-3 w-3 mr-1" />}
                        View Sale
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedSale && (
        <AdminSalesDetailModal
          open={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          sale={selectedSale}
          viewFrom="superAdmin"
        />
      )}
    </>
  );
};

// ── Partner Detail Modal ──────────────────────────────────────────────────────

const DetailItem = ({ label, value, span2 = false }) => (
  <div className={`space-y-0.5 ${span2 ? "md:col-span-2" : ""}`}>
    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
    <p className="text-xs font-medium text-gray-900">{value || <span className="text-gray-400">N/A</span>}</p>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
    <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-1 mb-3">
      {title}
    </h3>
    {children}
  </div>
);

const PartnerDetailModal = ({ organization, isOpen, onClose, onEdit }) => {
  if (!organization) return null;
  const formatDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "N/A"; }
  };
  const typeLabel = organization.partner_type
    ? organization.partner_type.charAt(0).toUpperCase() + organization.partner_type.slice(1)
    : "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-sky-50/80 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold">Partner Details</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{organization.partner_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                organization.status === "active"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : organization.status === "inactive"
                  ? "bg-gray-50 text-gray-600 border-gray-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {organization.status ? organization.status.charAt(0).toUpperCase() + organization.status.slice(1) : "N/A"}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onClose(); onEdit(organization); }}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Basic Info */}
          <SectionCard title="Partner Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailItem label="Partner Name" value={organization.partner_name} />
              <DetailItem label="Partner ID" value={organization.partner_id} />
              <DetailItem label="Type" value={typeLabel} />
              <DetailItem label="Branch" value={organization.branch} />
              <DetailItem label="State" value={organization.state} />
              <DetailItem label="Date Joined" value={formatDate(organization.created_at)} />
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard title="Contact Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailItem label="Contact Person" value={organization.contact_person} />
              <DetailItem label="Contact Phone" value={organization.contact_phone} />
              <DetailItem label="Alternative Phone" value={organization.alternative_phone} />
              <DetailItem label="Email" value={organization.email} />
              <DetailItem label="Address" value={organization.address} span2 />
            </div>
          </SectionCard>

          {/* Stove Summary */}
          <SectionCard title="Stove Summary">
            <div className="grid grid-cols-3 gap-3">
              <DetailItem label="Total Received" value={(organization.total_stove_ids || 0).toLocaleString()} />
              <DetailItem label="Sold" value={(organization.sold_stove_ids || 0).toLocaleString()} />
              <DetailItem label="Available" value={(organization.available_stove_ids || 0).toLocaleString()} />
            </div>
          </SectionCard>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const PartnersPage = () => {
  const { supabase, userRole } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const ORG_CACHE_KEY = "partners_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "partners_organizations_cache_timestamp";
  const CACHE_DURATION = 30 * 60 * 1000;

  const getCachedOrganizations = () => {
    try {
      const cached = localStorage.getItem(ORG_CACHE_KEY);
      const ts = localStorage.getItem(ORG_CACHE_TIMESTAMP_KEY);
      if (cached && ts && Date.now() - parseInt(ts) < CACHE_DURATION) return JSON.parse(cached);
    } catch {}
    return null;
  };
  const setCachedOrganizations = (data) => {
    try {
      localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(ORG_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
  };

  // Modal state
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [stoveIdsOrg, setStoveIdsOrg] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [showPaymentModelsModal, setShowPaymentModelsModal] = useState(false);
  const [paymentModelsOrg, setPaymentModelsOrg] = useState(null);
  const [showOrgImportModal, setShowOrgImportModal] = useState(false);

  // Stove reference inline accordion
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [orgGroupedData, setOrgGroupedData] = useState({}); // orgId -> grouped array
  const [loadingOrgId, setLoadingOrgId] = useState(null);
  const [expandedRefKeys, setExpandedRefKeys] = useState({}); // "orgId::refKey" -> bool

  // Agent inline accordion
  const [expandedAgentsOrgId, setExpandedAgentsOrgId] = useState(null);
  const [orgAgentsData, setOrgAgentsData] = useState({}); // orgId -> agents array
  const [loadingAgentsOrgId, setLoadingAgentsOrgId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ search: "", state: "all", partner_type: "all" });
  const [typeCardFilter, setTypeCardFilter] = useState("all"); // synced with partner_type filter

  // Stats
  const [stats, setStats] = useState({ total_received: 0, total_sold: 0, total_available: 0, total_partners: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [typeCounts, setTypeCounts] = useState({ customer: 0, partner: 0 });
  const [loadingTypeCounts, setLoadingTypeCounts] = useState(false);

  const nigerianStates = Object.keys(lgaAndStates).sort();

  const {
    data: organizationsData,
    loading,
    tableLoading,
    error,
    pagination,
    applyFilters,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    fetchOrganizations,
  } = useOrganizations();

  // Fetch statistics
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-stove-stats`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setStats({
        total_received: result.data?.total || 0,
        total_sold: result.data?.sold || 0,
        total_available: result.data?.available || 0,
        total_partners: pagination.total || 0,
      });
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchStats();
  }, [organizationsData, pagination.total]);

  // Fetch total counts per partner type (accurate, not page-level)
  const fetchTypeCounts = async () => {
    setLoadingTypeCounts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-organizations`;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [custRes, partRes] = await Promise.all([
        fetch(`${base}?partner_type=customer&limit=1&offset=0&include_admin_users=false`, { headers }),
        fetch(`${base}?partner_type=partner&limit=1&offset=0&include_admin_users=false`, { headers }),
      ]);
      const [custData, partData] = await Promise.all([custRes.json(), partRes.json()]);
      setTypeCounts({
        customer: custData.pagination?.total ?? 0,
        partner: partData.pagination?.total ?? 0,
      });
    } catch (err) {
      console.error("Type counts error:", err);
    } finally {
      setLoadingTypeCounts(false);
    }
  };

  useEffect(() => {
    fetchTypeCounts();
  }, []);

  // Apply filters when they change — always pass all filter keys so the hook's
  // internal filtersRef gets overwritten (prevents stale values from merging back in)
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters({
        page: 1,
        search: filters.search || null,
        state: filters.state !== "all" ? filters.state : null,
        partner_type: filters.partner_type !== "all" ? filters.partner_type : null,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  const handleTypeCardClick = (type) => {
    const next = typeCardFilter === type ? "all" : type;
    setTypeCardFilter(next);
    setFilters((prev) => ({ ...prev, partner_type: next }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", state: "all", partner_type: "all" });
    setTypeCardFilter("all");
  };

  const hasActiveFilters =
    filters.search || filters.state !== "all" || filters.partner_type !== "all";

  // Pagination
  const handlePageChange = (page) => applyFilters({ page });
  const handlePageSizeChange = (value) => applyFilters({ page: 1, limit: parseInt(value) });

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, pagination.page - 2);
    const end = Math.min(pagination.totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const handleToggleStoveBreakdown = async (org) => {
    // Collapse if already open
    if (expandedOrgId === org.id) { setExpandedOrgId(null); return; }
    setExpandedOrgId(org.id);
    // Use cache if already fetched
    if (orgGroupedData[org.id]) return;
    setLoadingOrgId(org.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ grouped: "true", organization_ids: org.id });
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-stove-ids?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      const result = await res.json();
      setOrgGroupedData((prev) => ({ ...prev, [org.id]: result.data || [] }));
    } catch {
      setOrgGroupedData((prev) => ({ ...prev, [org.id]: [] }));
    } finally {
      setLoadingOrgId(null);
    }
  };

  const handleToggleRef = (orgId, refKey) => {
    const key = `${orgId}::${refKey}`;
    setExpandedRefKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAgents = async (org) => {
    if (expandedAgentsOrgId === org.id) { setExpandedAgentsOrgId(null); return; }
    setExpandedAgentsOrgId(org.id);
    if (orgAgentsData[org.id]) return;
    setLoadingAgentsOrgId(org.id);
    try {
      const response = await adminAgentService.getSalesAgents({ limit: 100, organization_id: org.id });
      setOrgAgentsData((prev) => ({ ...prev, [org.id]: response.data || [] }));
    } catch {
      setOrgAgentsData((prev) => ({ ...prev, [org.id]: [] }));
    } finally {
      setLoadingAgentsOrgId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "N/A"; }
  };

  // Action handlers
  const handleViewDetails = (org) => setSelectedOrganization(org);
  const handleViewStoveIds = (org) => setStoveIdsOrg(org);
  const handleEdit = (org) => { setEditingOrganization(org); setShowFormModal(true); };
  const handleDelete = (org) => { setOrganizationToDelete(org); setShowDeleteModal(true); };
  const handleCreateNew = () => { setEditingOrganization(null); setShowFormModal(true); };

  const handleFormSubmit = async (formData) => {
    setFormSubmitLoading(true);
    try {
      if (editingOrganization) {
        const res = await updateOrganization(editingOrganization.id, formData);
        if (res.success) { toast({ variant: "success", title: "Organization updated successfully" }); setShowFormModal(false); setEditingOrganization(null); }
      } else {
        const res = await createOrganization(formData);
        if (res.success) { toast({ variant: "success", title: "Organization created successfully" }); setShowFormModal(false); }
      }
    } catch (err) { console.error(err); }
    finally { setFormSubmitLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await deleteOrganization(organizationToDelete.id);
      if (res.success) {
        toast({ variant: "success", title: "Organization deleted successfully" });
        setShowDeleteModal(false);
        setOrganizationToDelete(null);
      }
    } catch (err) {
      toast({ variant: "error", title: "Error", description: err.message || "Failed to delete" });
    }
  };

  const startRecord = organizationsData.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  // Loading / Error states
  if (loading) return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout currentRoute="partners" title="Manage Partners">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-brand" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );

  if (error && !error.includes("login")) return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout currentRoute="partners" title="Manage Partners">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
            Error: {error}
            <Button onClick={fetchOrganizations} size="sm" variant="outline" className="ml-3">Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="partners"
        title="Manage Partners"
        rightButton={
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowOrgImportModal(true)} variant="outline" size="sm" className="flex items-center gap-1.5">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleCreateNew} size="sm" className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add Partner
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-5">

          {/* ── Stats Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Partners */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Partners</p>
                  <p className="text-xl font-bold text-blue-900">
                    {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : pagination.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">Registered</p>
                </div>
              </div>
            </div>

            {/* Customer type — clickable filter */}
            <div
              className={`bg-green-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${typeCardFilter === "customer" ? "border-green-600 shadow-md" : "border-green-200"}`}
              onClick={() => handleTypeCardClick("customer")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Customers</p>
                  <p className="text-xl font-bold text-green-900">
                    {loadingTypeCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : typeCounts.customer.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-500">Click to filter</p>
                </div>
              </div>
              {typeCardFilter === "customer" && (
                <p className="text-xs font-semibold mt-2 opacity-70 text-center text-green-700">✓ Filter active — click again to clear</p>
              )}
            </div>

            {/* Partner type — clickable filter */}
            <div
              className={`bg-amber-50 border rounded-lg p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${typeCardFilter === "partner" ? "border-amber-600 shadow-md" : "border-amber-200"}`}
              onClick={() => handleTypeCardClick("partner")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Partners</p>
                  <p className="text-xl font-bold text-amber-900">
                    {loadingTypeCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : typeCounts.partner.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-500">Click to filter</p>
                </div>
              </div>
              {typeCardFilter === "partner" && (
                <p className="text-xs font-semibold mt-2 opacity-70 text-center text-amber-700">✓ Filter active — click again to clear</p>
              )}
            </div>

            {/* Stove Inventory — compact 3-value card */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-700" />
                </div>
                <p className="text-sm text-purple-600 font-medium">Stove Inventory</p>
              </div>
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              ) : (
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-purple-500 uppercase">Total</p>
                    <p className="font-bold text-purple-900">{stats.total_received.toLocaleString()}</p>
                  </div>
                  <div className="h-5 w-px bg-purple-200" />
                  <div>
                    <p className="text-[10px] text-green-500 uppercase">Available</p>
                    <p className="font-bold text-green-700">{stats.total_available.toLocaleString()}</p>
                  </div>
                  <div className="h-5 w-px bg-purple-200" />
                  <div>
                    <p className="text-[10px] text-blue-500 uppercase">Sold</p>
                    <p className="font-bold text-blue-700">{stats.total_sold.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Filter Bar ──────────────────────────────────────────────── */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, branch..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Partner Type */}
            <Select value={filters.partner_type} onValueChange={(v) => { handleFilterChange("partner_type", v); setTypeCardFilter(v); }}>
              <SelectTrigger className="w-[150px] h-9 bg-white text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>

            {/* State */}
            <Select value={filters.state} onValueChange={(v) => handleFilterChange("state", v)}>
              <SelectTrigger className="w-[155px] h-9 bg-white text-sm">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {nigerianStates.map((s) => (
                  <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Has Stove IDs filter — practical: shows only partners with stoves assigned */}
            {/* <Select
              value={filters.has_stove_ids ?? "all"}
              onValueChange={(v) => handleFilterChange("has_stove_ids", v)}
            >
              <SelectTrigger className="w-[160px] h-9 bg-white text-sm">
                <SelectValue placeholder="Stove Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                <SelectItem value="yes">Has Stove IDs</SelectItem>
                <SelectItem value="no">No Stove IDs</SelectItem>
              </SelectContent>
            </Select> */}

            {/* Clear */}
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* ── Table ───────────────────────────────────────────────────── */}
          <div className="space-y-0">
            {/* Pagination header */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startRecord}–{endRecord}</span> of{" "}
                  <span className="font-medium">{pagination.total}</span> partners
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={pagination.limit?.toString() ?? "10"} onValueChange={handlePageSizeChange}>
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-green-500">
                  Total Partners: <span className="text-brand">{pagination.total}</span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs flex items-center gap-1"
                  onClick={() => {
                    const headers = ["Partner Name", "Type", "Branch", "State", "Contact Person", "Contact Phone", "Email", "Total Stoves", "Sold", "Available"];
                    const rows = organizationsData.map((org) => [
                      org.partner_name,
                      org.partner_type || "",
                      org.branch || "",
                      org.state || "",
                      org.contact_person || "",
                      org.contact_phone || "",
                      org.email || "",
                      org.total_stove_ids ?? "",
                      org.sold_stove_ids ?? "",
                      org.available_stove_ids ?? "",
                    ]);
                    downloadTableAsCSV(headers, rows, `partners-${new Date().toISOString().slice(0, 10)}.csv`);
                  }}
                  disabled={organizationsData.length === 0}
                >
                  <Download className="h-3 w-3" />Download
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner Name</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stove IDs</TableHead>
                    <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableLoading ? "opacity-40" : ""}>
                  {organizationsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No partners found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizationsData.map((org, idx) => (
                      <React.Fragment key={org.id}>
                      <TableRow className={`${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}>
                        <TableCell className="text-xs font-medium text-gray-900">{org.partner_name}</TableCell>
                        <TableCell>
                          {org.partner_type ? (
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              org.partner_type === "partner"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {org.partner_type === "partner" ? "Partner" : "Customer"}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{org.branch || "N/A"}</TableCell>
                        <TableCell className="text-xs">{org.state || "N/A"}</TableCell>

                        {/* Stove IDs — clickable to expand reference breakdown */}
                        <TableCell>
                          <button
                            onClick={() => handleToggleStoveBreakdown(org)}
                            className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity group"
                          >
                            <span className="text-purple-700 font-medium" title="Total">{org.total_stove_ids ?? 0} received</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-green-600" title="Available">{org.available_stove_ids ?? 0} available</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-blue-600" title="Sold">{org.sold_stove_ids ?? 0} sold</span>
                            {loadingOrgId === org.id
                              ? <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-1" />
                              : expandedOrgId === org.id
                              ? <ChevronUp className="h-3 w-3 text-[#07376a] ml-1" />
                              : <ChevronDown className="h-3 w-3 text-gray-400 ml-1 group-hover:text-[#07376a]" />}
                          </button>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Assign Payment Models */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => { setPaymentModelsOrg(org); setShowPaymentModelsModal(true); }}
                            >
                              <Layers className="h-3 w-3 mr-1" />
                              Assign Model
                            </Button>
                            {/* View Details */}
                            <Button
                              size="sm"
                              className="bg-brand hover:bg-brand/90 text-white h-7 px-2 text-xs"
                              onClick={() => handleViewDetails(org)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            {/* Dropdown: View Stove IDs, Edit, Delete */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleAgents(org)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  {expandedAgentsOrgId === org.id ? "Hide Agents" : "View Agents"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewStoveIds(org)}>
                                  <Package className="mr-2 h-4 w-4" />
                                  View Stove IDs
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(org)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(org)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Agent Inline Expand Row */}
                      {expandedAgentsOrgId === org.id && (
                        <TableRow key={`${org.id}-agents`} className="bg-indigo-50/40">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-3">
                              {loadingAgentsOrgId === org.id ? (
                                <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
                                </div>
                              ) : !orgAgentsData[org.id] || orgAgentsData[org.id].length === 0 ? (
                                <p className="text-xs text-gray-500 py-2 italic">No agents found for this partner.</p>
                              ) : (
                                <div className="border border-indigo-200 rounded-md overflow-hidden">
                                  <div className="bg-[#07376a] px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3.5 w-3.5 text-white/80" />
                                      <span className="text-xs font-semibold text-white">
                                        Sales Agents — {org.partner_name}
                                      </span>
                                    </div>
                                    <span className="text-xs text-white/70">{orgAgentsData[org.id].length} agent{orgAgentsData[org.id].length !== 1 ? "s" : ""}</span>
                                  </div>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-indigo-50 text-gray-600 border-b border-indigo-100">
                                        <th className="text-left px-3 py-2 font-semibold">Agent Name</th>
                                        <th className="text-left px-3 py-2 font-semibold">Email</th>
                                        <th className="text-left px-3 py-2 font-semibold">Phone</th>
                                        <th className="text-center px-3 py-2 font-semibold">Sales</th>
                                        <th className="text-left px-3 py-2 font-semibold">Joined</th>
                                        <th className="text-left px-3 py-2 font-semibold">Last Login</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {orgAgentsData[org.id].map((agent, ai) => {
                                        const lastLoginDiff = agent.last_login ? Date.now() - new Date(agent.last_login).getTime() : null;
                                        const lastLoginLabel = !agent.last_login
                                          ? <span className="text-gray-400">Never</span>
                                          : lastLoginDiff <= 7 * 86400000
                                          ? <span className="text-green-600 font-medium">{Math.floor(lastLoginDiff / 86400000)}d ago</span>
                                          : lastLoginDiff <= 30 * 86400000
                                          ? <span className="text-amber-600 font-medium">{Math.floor(lastLoginDiff / 86400000)}d ago</span>
                                          : <span className="text-red-500">{formatDate(agent.last_login)}</span>;
                                        return (
                                          <tr key={agent.id} className={ai % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                                            <td className="px-3 py-2 font-medium text-gray-900">
                                              <div className="flex items-center gap-1.5">
                                                <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] flex-shrink-0">
                                                  {agent.full_name?.charAt(0).toUpperCase() ?? "?"}
                                                </div>
                                                {agent.full_name}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">{agent.email}</td>
                                            <td className="px-3 py-2 text-gray-500">{agent.phone || "—"}</td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={`px-2 py-0.5 rounded-full font-semibold ${(agent.total_sold ?? 0) > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                {agent.total_sold ?? 0}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">{formatDate(agent.created_at)}</td>
                                            <td className="px-3 py-2">{lastLoginLabel}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Stove Reference Breakdown — inline accordion row */}
                      {expandedOrgId === org.id && (
                        <TableRow key={`${org.id}-breakdown`} className="bg-blue-50/40">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-3">
                              {loadingOrgId === org.id ? (
                                <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading stove reference breakdown...
                                </div>
                              ) : !orgGroupedData[org.id] || orgGroupedData[org.id].length === 0 ? (
                                <p className="text-xs text-gray-500 py-2 italic">No stove IDs assigned to this partner yet.</p>
                              ) : (
                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                  {/* Section label */}
                                  <div className="bg-[#07376a] px-3 py-2 flex items-center gap-2">
                                    <Tag className="h-3.5 w-3.5 text-white/80" />
                                    <span className="text-xs font-semibold text-white">Sales Reference Breakdown</span>
                                  </div>

                                  {orgGroupedData[org.id].map((group) => {
                                    const refKey = group.sales_reference || "__none__";
                                    const compositeKey = `${org.id}::${refKey}`;
                                    const isRefExpanded = !!expandedRefKeys[compositeKey];
                                    return (
                                      <div key={refKey} className="border-b border-gray-100 last:border-b-0">
                                        {/* Reference header */}
                                        <button
                                          onClick={() => handleToggleRef(org.id, refKey)}
                                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                                        >
                                          <div className="flex items-center gap-2">
                                            {isRefExpanded
                                              ? <ChevronUp className="h-3.5 w-3.5 text-[#07376a]" />
                                              : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                                            <span className="text-xs font-semibold text-[#07376a]">
                                              {group.sales_reference || <span className="italic text-gray-400 font-normal">No Reference</span>}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.total} received</span>
                                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.available} available</span>
                                            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.sold} sold</span>
                                          </div>
                                        </button>

                                        {/* Stove IDs table */}
                                        {isRefExpanded && (
                                          <div className="bg-white border-t border-gray-100">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-100">
                                                  <th className="text-left px-3 py-2 font-semibold">Stove ID</th>
                                                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                                                  <th className="text-left px-3 py-2 font-semibold">Assigned Date</th>
                                                  <th className="text-left px-3 py-2 font-semibold">Date Sold</th>
                                                  <th className="text-left px-3 py-2 font-semibold">Sold To</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {(group.stove_ids || []).map((stove, si) => (
                                                  <tr key={stove.id} className={si % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                                                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{stove.stove_id}</td>
                                                    <td className="px-3 py-2">
                                                      <span className={`px-2 py-0.5 rounded-full font-medium ${stove.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                                        {stove.status === "sold" ? "Sold" : "Available"}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-500">{formatDate(stove.created_at)}</td>
                                                    <td className="px-3 py-2 text-gray-500">{stove.sale_date ? formatDate(stove.sale_date) : "—"}</td>
                                                    <td className="px-3 py-2 text-gray-500">{stove.sold_to || "—"}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {pagination.totalPages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">
                  Showing {startRecord} to {endRecord} of {pagination.total} partners
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={pagination.page === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Prev
                  </Button>
                  {getVisiblePages().map((p) => (
                    <Button key={p} variant={p === pagination.page ? "default" : "outline"} size="sm"
                      className={`h-8 w-8 p-0 ${p === pagination.page ? "bg-brand text-white hover:bg-brand" : ""}`}
                      onClick={() => handlePageChange(p)}
                    >{p}</Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ────────────────────────────────────────────────────── */}
        <OrganizationFormModal
          isOpen={showFormModal}
          onClose={() => { setShowFormModal(false); setEditingOrganization(null); setFormSubmitLoading(false); }}
          onSubmit={handleFormSubmit}
          initialData={editingOrganization}
          loading={loading}
          submitLoading={formSubmitLoading}
        />

        <PartnerDetailModal
          organization={selectedOrganization}
          isOpen={!!selectedOrganization}
          onClose={() => setSelectedOrganization(null)}
          onEdit={handleEdit}
        />

        <StoveIdsModal
          organization={stoveIdsOrg}
          isOpen={!!stoveIdsOrg}
          onClose={() => setStoveIdsOrg(null)}
        />

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setOrganizationToDelete(null); }}
          onConfirm={handleDeleteConfirm}
          organizationName={organizationToDelete?.partner_name}
          loading={loading}
        />

        <OrganizationCSVImportModal
          isOpen={showOrgImportModal}
          onClose={() => setShowOrgImportModal(false)}
          onImportComplete={() => fetchOrganizations()}
          supabase={supabase}
        />

        {showPaymentModelsModal && paymentModelsOrg && (
          <AssignPaymentModelsModal
            organization={paymentModelsOrg}
            onClose={() => { setShowPaymentModelsModal(false); setPaymentModelsOrg(null); }}
            onSuccess={() => {
              setShowPaymentModelsModal(false);
              setPaymentModelsOrg(null);
              toast({ variant: "success", title: "Payment models assigned successfully" });
            }}
          />
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default PartnersPage;
