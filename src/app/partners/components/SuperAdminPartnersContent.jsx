"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import OrganizationFormModal from "../../components/OrganizationFormModal";
import OrganizationDetailSidebar from "../../components/OrganizationDetailSidebar";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import OrganizationCSVImportModal from "../../components/OrganizationCSVImportModal";
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
import useOrganizations from "../../hooks/useOrganizations";
import { useAuth } from "../../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { lgaAndStates } from "../../constants";
import adminAgentService from "../../services/adminAgentService.jsx";
import PageHeader from "../../components/PageHeader";
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
import AddPartnerModal from "../components/AddPartnerModal";
import AssignAgentModal from "../components/AssignAgentModal";
import AdminSalesDetailModal from "../../admin/components/sales/AdminSalesDetailModal";

// ── Stove IDs Modal ──────────────────────────────────────────────────────────

const FILTER_LABELS = { all: "All Stove IDs", available: "Available Stove IDs", sold: "Sold Stove IDs" };

const StoveIdsModal = ({ organization, isOpen, onClose, initialFilter = "all" }) => {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [totals, setTotals] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSaleId, setLoadingSaleId] = useState(null);

  // On open, reset to the requested filter and fetch
  useEffect(() => {
    if (isOpen && organization) {
      setSearch("");
      setStatusFilter(initialFilter);
      fetchStoveIds(initialFilter);
    }
  }, [isOpen, organization]);

  // Re-fetch when user manually changes the filter dropdown
  const handleStatusChange = (val) => {
    setStatusFilter(val);
    fetchStoveIds(val);
  };

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

  const fileSlug = `${organization?.partner_name?.replace(/\s+/g, "-").toLowerCase() ?? "partner"}-${statusFilter}`;

  const downloadCSV = () => {
    const headers = ["Stove ID", "Status", "Assigned Date", "Sale Date"];
    const rows = filtered.map((s) => [
      s.stove_id,
      s.status === "sold" ? "Sold" : "Available",
      formatDate(s.created_at),
      s.status === "sold" ? formatDate(s.sale_date) : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stove-ids-${fileSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`${FILTER_LABELS[statusFilter]}`, 14, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Partner: ${organization?.partner_name}   |   Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 22);
      autoTable(doc, {
        head: [["Stove ID", "Status", "Assigned Date", "Sale Date"]],
        body: filtered.map((s) => [
          s.stove_id,
          s.status === "sold" ? "Sold" : "Available",
          formatDate(s.created_at),
          s.status === "sold" ? formatDate(s.sale_date) : "—",
        ]),
        startY: 27,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [7, 55, 106] },
        alternateRowStyles: { fillColor: [240, 245, 255] },
      });
      doc.save(`stove-ids-${fileSlug}.pdf`);
    } catch (err) {
      toast({ variant: "error", title: "PDF export failed", description: err.message });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-sky-50/80 border-b shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-base font-bold">{FILTER_LABELS[statusFilter]}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {organization?.partner_name}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1.5" onClick={downloadCSV} disabled={loading || filtered.length === 0}>
                  <Download className="h-3 w-3" />CSV
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1.5" onClick={downloadPDF} disabled={loading || filtered.length === 0}>
                  <Download className="h-3 w-3" />PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input placeholder="Search stove ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-white" />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
            ) : error ? (
              <div className="text-center text-red-600 py-8 text-sm">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No stove IDs found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map((stove) => (
                  <div key={stove.id} className={`bg-muted/30 border rounded-lg p-3 space-y-2 ${stove.status === "sold" ? "border-blue-200" : "border-green-200"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900">{stove.stove_id}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stove.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {stove.status === "sold" ? "Sold" : "Available"}
                      </span>
                    </div>
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
                    {stove.sale_id && (
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleViewSale(stove.sale_id)} disabled={!!loadingSaleId}>
                        {loadingSaleId === stove.sale_id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
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
        <AdminSalesDetailModal open={!!selectedSale} onClose={() => setSelectedSale(null)} sale={selectedSale} viewFrom="superAdmin" />
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
    <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-1 mb-3">{title}</h3>
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
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${organization.status === "active" ? "bg-green-50 text-green-700 border-green-200" : organization.status === "inactive" ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {organization.status ? organization.status.charAt(0).toUpperCase() + organization.status.slice(1) : "N/A"}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onClose(); onEdit(organization); }}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
          <SectionCard title="Contact Information">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailItem label="Contact Person" value={organization.contact_person} />
              <DetailItem label="Contact Phone" value={organization.contact_phone} />
              <DetailItem label="Alternative Phone" value={organization.alternative_phone} />
              <DetailItem label="Email" value={organization.email} />
              <DetailItem label="Address" value={organization.address} span2 />
            </div>
          </SectionCard>
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

// ── Main Content ──────────────────────────────────────────────────────────────

export default function SuperAdminPartnersContent() {
  const { supabase } = useAuth();
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

  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [stoveIdsOrg, setStoveIdsOrg] = useState(null);
  const [stoveIdsFilter, setStoveIdsFilter] = useState("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [assignAgentOrg, setAssignAgentOrg] = useState(null);
  const [showOrgImportModal, setShowOrgImportModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);

  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [orgGroupedData, setOrgGroupedData] = useState({});
  const [loadingOrgId, setLoadingOrgId] = useState(null);
  const [expandedRefKeys, setExpandedRefKeys] = useState({});

  const [orgAgentsData, setOrgAgentsData] = useState({});
  const loadingAgentOrgIdsRef = useRef(new Set());

  const [filters, setFilters] = useState({ search: "", state: "all", partner_type: "all" });
  const [typeCardFilter, setTypeCardFilter] = useState("all");

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
      setStats({ total_received: result.data?.total || 0, total_sold: result.data?.sold || 0, total_available: result.data?.available || 0, total_partners: pagination.total || 0 });
    } catch (err) { console.error("Stats error:", err); }
    finally { setLoadingStats(false); }
  };

  useEffect(() => { if (!loading) fetchStats(); }, [organizationsData, pagination.total]);

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
      setTypeCounts({ customer: custData.pagination?.total ?? 0, partner: partData.pagination?.total ?? 0 });
    } catch (err) { console.error("Type counts error:", err); }
    finally { setLoadingTypeCounts(false); }
  };

  useEffect(() => { fetchTypeCounts(); }, []);

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
  const handleClearFilters = () => { setFilters({ search: "", state: "all", partner_type: "all" }); setTypeCardFilter("all"); };
  const hasActiveFilters = filters.search || filters.state !== "all" || filters.partner_type !== "all";

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
    if (expandedOrgId === org.id) { setExpandedOrgId(null); return; }
    setExpandedOrgId(org.id);
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
    } finally { setLoadingOrgId(null); }
  };

  const handleToggleRef = (orgId, refKey) => {
    const key = `${orgId}::${refKey}`;
    setExpandedRefKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (organizationsData.length === 0) return;
    organizationsData.forEach((org) => {
      if (orgAgentsData[org.id] !== undefined) return;
      if (loadingAgentOrgIdsRef.current.has(org.id)) return;
      loadingAgentOrgIdsRef.current.add(org.id);
      adminAgentService.getSalesAgents({ limit: 100, organization_id: org.id })
        .then((response) => {
          setOrgAgentsData((prev) => ({ ...prev, [org.id]: response.data || [] }));
        })
        .catch(() => {
          setOrgAgentsData((prev) => ({ ...prev, [org.id]: [] }));
        })
        .finally(() => {
          loadingAgentOrgIdsRef.current.delete(org.id);
        });
    });
  }, [organizationsData]);

  const formatDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "N/A"; }
  };

  const handleViewDetails = (org) => setSelectedOrganization(org);
  const handleViewStoveIds = (org, filter = "all") => { setStoveIdsOrg(org); setStoveIdsFilter(filter); };
  const handleEdit = (org) => { setEditingOrganization(org); setShowFormModal(true); };
  const handleDelete = (org) => { setOrganizationToDelete(org); setShowDeleteModal(true); };

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

  if (loading) return (
    <DashboardLayout currentRoute="partners" title="Partners & Customers">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-brand" />
      </div>
    </DashboardLayout>
  );

  if (error && !error.includes("login")) return (
    <DashboardLayout currentRoute="partners" title="Partners & Customers">
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          Error: {error}
          <Button onClick={fetchOrganizations} size="sm" variant="outline" className="ml-3">Retry</Button>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      <DashboardLayout currentRoute="partners" title="Partners & Customers">
        <div className="p-6 space-y-5">

          <PageHeader icon={Building2} title="Partners & Customers" />

          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="w-1/4 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, ID, branch..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} className="pl-9 bg-white h-9 text-sm" />
            </div>
            <Select value={filters.state} onValueChange={(v) => handleFilterChange("state", v)}>
              <SelectTrigger className="w-[155px] h-9 bg-white text-sm"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {nigerianStates.map((s) => (<SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          <div className="space-y-0">
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startRecord}–{endRecord}</span> of <span className="font-medium">{pagination.total}</span> partners
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={pagination.limit?.toString() ?? "10"} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[65px] h-7 bg-white text-sm"><SelectValue /></SelectTrigger>
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
                <p className="text-sm font-bold text-green-500">Total Partners: <span className="text-brand">{pagination.total}</span></p>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex items-center gap-1"
                  onClick={() => {
                    const headers = ["Partner Name", "Type", "Branch", "State", "Contact Person", "Contact Phone", "Email", "Total Stoves", "Sold", "Available"];
                    const rows = organizationsData.map((org) => [org.partner_name, org.partner_type || "", org.branch || "", org.state || "", org.contact_person || "", org.contact_phone || "", org.email || "", org.total_stove_ids ?? "", org.sold_stove_ids ?? "", org.available_stove_ids ?? ""]);
                    downloadTableAsCSV(headers, rows, `partners-${new Date().toISOString().slice(0, 10)}.csv`);
                  }}
                  disabled={organizationsData.length === 0}
                >
                  <Download className="h-3 w-3" />Download
                </Button>
              </div>
            </div>

            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner/Customer Name</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone Number</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stoves Received</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stoves Sold</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Unsold Stoves</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Agents Assigned</TableHead>
                    <TableHead className="text-center text-white font-semibold text-xs whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={tableLoading ? "opacity-40" : ""}>
                  {organizationsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
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
                          <TableCell className="text-xs">{org.state || "N/A"}</TableCell>
                          <TableCell className="text-xs">{org.branch || "N/A"}</TableCell>
                          <TableCell className="text-xs">{org.contact_phone || "—"}</TableCell>
                          <TableCell>
                            <button onClick={() => handleViewStoveIds(org, "all")} className="text-xs font-medium text-purple-700 hover:underline hover:text-purple-900 transition-colors">
                              {org.total_stove_ids ?? 0}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => handleViewStoveIds(org, "sold")} className="text-xs font-medium text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                              {org.sold_stove_ids ?? 0}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => handleViewStoveIds(org, "available")} className="text-xs font-medium text-green-600 hover:underline hover:text-green-800 transition-colors">
                              {org.available_stove_ids ?? 0}
                            </button>
                          </TableCell>
                          <TableCell>
                            {orgAgentsData[org.id] === undefined ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-300" />
                            ) : orgAgentsData[org.id].length === 0 ? (
                              <span className="text-gray-400 text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {orgAgentsData[org.id].map((agent) => (
                                  <span key={agent.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
                                    {agent.full_name?.split(" ")[0] || agent.full_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Edit" onClick={() => handleEdit(org)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:border-red-300" title="Delete" onClick={() => handleDelete(org)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setAssignAgentOrg(org)}>
                                    <Users className="mr-2 h-4 w-4" />Assign Agent
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewDetails(org)}>
                                    <Eye className="mr-2 h-4 w-4" />Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewStoveIds(org)}>
                                    <Package className="mr-2 h-4 w-4" />View Stove IDs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleStoveBreakdown(org)}>
                                    <Tag className="mr-2 h-4 w-4" />{expandedOrgId === org.id ? "Hide Breakdown" : "View Breakdown"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>

                        {expandedOrgId === org.id && (
                          <TableRow key={`${org.id}-breakdown`} className="bg-blue-50/40">
                            <TableCell colSpan={9} className="p-0">
                              <div className="px-4 py-3">
                                {loadingOrgId === org.id ? (
                                  <div className="flex items-center gap-2 py-3 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading stove reference breakdown...</div>
                                ) : !orgGroupedData[org.id] || orgGroupedData[org.id].length === 0 ? (
                                  <p className="text-xs text-gray-500 py-2 italic">No stove IDs assigned to this partner yet.</p>
                                ) : (
                                  <div className="border border-gray-200 rounded-md overflow-hidden">
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
                                          <button onClick={() => handleToggleRef(org.id, refKey)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
                                            <div className="flex items-center gap-2">
                                              {isRefExpanded ? <ChevronUp className="h-3.5 w-3.5 text-[#07376a]" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                                              <span className="text-xs font-semibold text-[#07376a]">{group.sales_reference || <span className="italic text-gray-400 font-normal">No Reference</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.total} received</span>
                                              <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.available} available</span>
                                              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.sold} sold</span>
                                            </div>
                                          </button>
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
                                                        <span className={`px-2 py-0.5 rounded-full font-medium ${stove.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{stove.status === "sold" ? "Sold" : "Available"}</span>
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

            {pagination.totalPages > 1 && (
              <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
                <p className="text-sm text-gray-600">Showing {startRecord} to {endRecord} of {pagination.total} partners</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={pagination.page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
                  {getVisiblePages().map((p) => (
                    <Button key={p} variant={p === pagination.page ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${p === pagination.page ? "bg-brand text-white hover:bg-brand" : ""}`} onClick={() => handlePageChange(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <AddPartnerModal isOpen={showAddPartnerModal} onClose={() => setShowAddPartnerModal(false)} onSuccess={() => { fetchOrganizations(); fetchTypeCounts(); }} />
        <OrganizationFormModal isOpen={showFormModal} onClose={() => { setShowFormModal(false); setEditingOrganization(null); setFormSubmitLoading(false); }} onSubmit={handleFormSubmit} initialData={editingOrganization} loading={loading} submitLoading={formSubmitLoading} />
        <PartnerDetailModal organization={selectedOrganization} isOpen={!!selectedOrganization} onClose={() => setSelectedOrganization(null)} onEdit={handleEdit} />
        <StoveIdsModal organization={stoveIdsOrg} isOpen={!!stoveIdsOrg} onClose={() => setStoveIdsOrg(null)} initialFilter={stoveIdsFilter} />
        <DeleteConfirmationModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setOrganizationToDelete(null); }} onConfirm={handleDeleteConfirm} organizationName={organizationToDelete?.partner_name} loading={loading} />
        <OrganizationCSVImportModal isOpen={showOrgImportModal} onClose={() => setShowOrgImportModal(false)} onImportComplete={() => fetchOrganizations()} supabase={supabase} />
        <AssignAgentModal
          organization={assignAgentOrg}
          isOpen={!!assignAgentOrg}
          onClose={() => setAssignAgentOrg(null)}
          onSuccess={() => { setAssignAgentOrg(null); setOrgAgentsData({}); }}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </DashboardLayout>
    </>
  );
}
