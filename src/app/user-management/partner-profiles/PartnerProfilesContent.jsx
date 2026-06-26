import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  X,
  Building2,
  SquarePen,
  Eye,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import organizationsService from "../../services/organizationsService";
import { useToast, ToastContainer } from "@/components/ui/toast";
import PartnerDetailModal from "../../partners/components/PartnerDetailModal";
import EditPartnerModal from "../../partners/components/EditPartnerModal";
import ViewCredentialModal from "../../admin/components/credentials/ViewCredentialModal";
import adminCredentialsService from "../../services/adminCredentialsService";

const PAGE_SIZE = 10;

const PartnerProfilesContent = () => {
  const { toast, toasts, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [filters, setFilters] = useState({ search: "", state: "" });
  const [page, setPage] = useState(1);
  const [detailsPartner, setDetailsPartner] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [viewingCredential, setViewingCredential] = useState(null);
  const [loadingCredentialOrgId, setLoadingCredentialOrgId] = useState(null);

  const loadPartners = async () => {
    setLoading(true);
    const res = await organizationsService.getAllOrganizations();
    if (res.success) {
      setPartners(res.data);
    } else {
      toast({ variant: "error", title: "Failed to load partners", description: res.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleViewCredentials = async (org) => {
    setLoadingCredentialOrgId(org.id);
    try {
      const res = await adminCredentialsService.getCredentialByPartnerId(org.partner_id);
      if (res.success && res.data) {
        setViewingCredential(res.data);
      } else {
        toast({ variant: "error", title: "No credentials found", description: res.error || "This partner has no credentials." });
      }
    } catch (err) {
      toast({ variant: "error", title: "Error", description: err.message });
    } finally {
      setLoadingCredentialOrgId(null);
    }
  };

  const states = useMemo(() => {
    const s = new Set();
    partners.forEach((p) => p.state && s.add(p.state));
    return Array.from(s).sort();
  }, [partners]);

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (filters.state && p.state !== filters.state) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${p.partner_name ?? ""} ${p.branch ?? ""} ${p.contact_phone ?? ""} ${p.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [partners, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRecord = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const hasActiveFilters = filters.search !== "" || filters.state !== "";

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ search: "", state: "" });
    setPage(1);
  };

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={Building2} title="Partner Profiles" />

      {/* Filter Bar */}
      <div
        className="p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: "#f4f7e3" }}
      >
        <div className="w-1/4 min-w-[180px]">
          <Input
            placeholder="Search partner, branch, phone or email..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="bg-white h-9 text-xs shadow-none border-gray-200"
          />
        </div>

        <Select
          value={filters.state || "all"}
          onValueChange={(v) => handleFilterChange("state", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[170px] h-9 bg-white text-xs shadow-none border-gray-200 text-gray-400 data-[placeholder]:text-gray-400">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all" className="text-xs">All States</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <p className="ml-auto text-sm text-gray-600">
          Showing <span className="font-medium">{startRecord}</span> to{" "}
          <span className="font-medium">{endRecord}</span> of{" "}
          <span className="font-medium">{filtered.length}</span> partners
        </p>
      </div>

      {/* Table */}
      <div className="space-y-0">
        <div className="bg-white border-x border-t border-gray-200 rounded-t-lg overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#4a5d0f" }} className="hover:bg-transparent">
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap first:rounded-tl-lg">Partner</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">State</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Branch</TableHead>
                <TableHead className="text-white font-semibold text-sm whitespace-nowrap">Phone Number</TableHead>
                <TableHead className="text-center text-white font-semibold text-sm whitespace-nowrap rounded-tr-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={loading ? "opacity-40" : ""}>
              {pageRows.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((p, idx) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-[#eef3c4] text-gray-700"
                    style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f4f7e3" }}
                  >

                    <TableCell className="text-sm font-medium text-gray-900">{p.partner_name || "N/A"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{p.state || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{p.branch || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{p.contact_phone || "—"}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setDetailsPartner(p)}
                                aria-label="View details"
                                className="inline-flex items-center justify-center h-8 px-3 rounded-sm bg-slate-700 text-white text-xs font-medium shadow-sm hover:bg-slate-800 active:scale-[0.98] transition"
                              >
                                Details
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View partner details</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleViewCredentials(p)}
                                disabled={loadingCredentialOrgId === p.id}
                                aria-label="Credentials"
                                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-sm bg-indigo-600 text-white text-xs font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-60"
                              >
                                {loadingCredentialOrgId === p.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : null}
                                Credentials
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View login credentials</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setEditingPartner(p)}
                                aria-label="Edit partner"
                                className="inline-flex items-center justify-center h-8 px-3 rounded-sm bg-orange-500 text-white text-xs font-medium shadow-sm hover:bg-orange-600 active:scale-[0.98] transition"
                              >
                                Edit
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit partner</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{startRecord}</span> to{" "}
              <span className="font-medium">{endRecord}</span> of{" "}
              <span className="font-medium">{filtered.length}</span> partners
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                {getVisiblePages().map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${p === currentPage ? "bg-brand text-white hover:bg-brand" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PartnerDetailModal
        organization={detailsPartner}
        isOpen={!!detailsPartner}
        onClose={() => setDetailsPartner(null)}
      />


      <EditPartnerModal
        organization={editingPartner}
        isOpen={!!editingPartner}
        onClose={() => setEditingPartner(null)}
        onSuccess={() => {
          setEditingPartner(null);
          loadPartners();
        }}
      />

      <ViewCredentialModal
        isOpen={!!viewingCredential}
        onClose={() => setViewingCredential(null)}
        credential={viewingCredential}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default PartnerProfilesContent;
