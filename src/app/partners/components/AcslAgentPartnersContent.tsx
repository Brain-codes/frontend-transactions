
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/compat/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "../../components/PageHeader";
import {
  Building2, Loader2, AlertCircle, Search, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import { useAuth } from "../../contexts/AuthContext";
import PartnerDetailsModal from "./PartnerDetailsModal";

interface AssignedOrg {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  email?: string | null;
  assignment_id: string;
  assigned_at: string;
  total_sales?: number | null;
  approved_sales?: number | null;
  pending_sales?: number | null;
}

export default function AcslAgentPartnersContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<AssignedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState<AssignedOrg | null>(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const result = await superAdminAgentService.getAgentOrganizations(user.id);
        setOrgs(result.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load assigned partners");
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, [user?.id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const uniqueStates = useMemo(() => {
    const states = orgs.map((o) => o.state).filter(Boolean) as string[];
    return Array.from(new Set(states)).sort();
  }, [orgs]);

  const filteredOrgs = useMemo(() => {
    let result = orgs;
    if (stateFilter !== "all") result = result.filter((o) => o.state === stateFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          o.partner_name.toLowerCase().includes(q) ||
          (o.branch || "").toLowerCase().includes(q) ||
          (o.state || "").toLowerCase().includes(q) ||
          (o.contact_person || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [orgs, searchTerm, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredOrgs.length);
  const pagedOrgs = filteredOrgs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));
  const handlePageSizeChange = (v: string) => { setPageSize(Number(v)); setCurrentPage(1); };
  const handleSearch = (v: string) => { setSearchTerm(v); setCurrentPage(1); };

  return (
    <DashboardLayout currentRoute="partners" title="My Partners">
      <div className="p-6 space-y-6">
        <PageHeader icon={Building2} title="My Partners" />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-80 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search partner name, branch, state." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="pl-9 bg-white" />
              </div>
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px] bg-white text-sm"><SelectValue placeholder="Filter by state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchTerm || stateFilter !== "all") && (
                <Button variant="outline" size="sm" onClick={() => { handleSearch(""); setStateFilter("all"); }} className="whitespace-nowrap">
                  <X className="h-4 w-4 mr-2" />Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>
                Showing <span className="font-medium">{filteredOrgs.length > 0 ? startItem : 0}–{endItem}</span> of <span className="font-medium">{filteredOrgs.length}</span> partners
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">per page:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[65px] h-7 bg-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="font-bold text-green-600">Total: <span className="text-brand">{orgs.length}</span></span>
            </div>
          </div>
        </div>

        <div className="space-y-0">
          <div className="bg-white border border-gray-200 rounded-t-lg overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                <p className="text-sm text-gray-600">Loading partners...</p>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-brand hover:bg-brand">
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner Name</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Contact Person</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Phone</TableHead>
                  <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Action</TableHead>
                  {/* <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Assigned At</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && pagedOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-gray-300" />
                        <p>No partner organizations found.</p>
                        {searchTerm ? <p className="text-xs">Try clearing your search.</p> : <p className="text-xs">Contact your super admin to get assigned to partners.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedOrgs.map((org, index) => (
                    <TableRow key={org.id} className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}>
                      <TableCell className="font-medium text-gray-900">{org.partner_name}</TableCell>
                      <TableCell className="text-gray-600">{org.state || "—"}</TableCell>
                      <TableCell className="text-gray-600">{org.branch || "—"}</TableCell>
                      <TableCell className="text-gray-600">{org.contact_person || "—"}</TableCell>
                      <TableCell className="text-gray-600">{org.contact_phone || "—"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="text-xs h-7 px-3 bg-brand hover:bg-brand/90 text-white"
                          onClick={() => setSelectedPartner(org)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                      {/* <TableCell className="text-gray-600 text-sm">{formatDate(org.assigned_at)}</TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-3 flex items-center justify-between bg-white">
              <p className="text-sm text-gray-600">Showing {filteredOrgs.length > 0 ? startItem : 0} to {endItem} of {filteredOrgs.length} partners</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => goToPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
                {getPageNumbers().map((p) => (
                  <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${p === currentPage ? "bg-brand text-white hover:bg-brand" : ""}`} onClick={() => goToPage(p)}>{p}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => goToPage(totalPages)} disabled={currentPage >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPartner && (
        <PartnerDetailsModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      )}
    </DashboardLayout>
  );
}
