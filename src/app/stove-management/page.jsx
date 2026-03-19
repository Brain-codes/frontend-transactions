"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { lgaAndStates } from "../constants";
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
import { useAuth } from "../contexts/AuthContext";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  Search,
  X,
  Package,
  CheckCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import AdminSalesDetailModal from "../admin/components/sales/AdminSalesDetailModal";

// Simple tooltip component
const SimpleTooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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

const StoveManagementPage = () => {
  const { supabase, user, userRole, isSuperAdmin, isAdmin, getStoredProfile } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const userProfile = getStoredProfile();
  const adminOrgId = userProfile?.organization_id || null;

  // Org cache
  const ORG_CACHE_KEY = "stove_management_organizations_cache";
  const ORG_CACHE_TIMESTAMP_KEY = "stove_management_organizations_cache_timestamp";
  const CACHE_DURATION = 30 * 60 * 1000;

  const getCachedOrganizations = () => {
    try {
      const cached = localStorage.getItem(ORG_CACHE_KEY);
      const timestamp = localStorage.getItem(ORG_CACHE_TIMESTAMP_KEY);
      if (cached && timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION)
        return JSON.parse(cached);
    } catch {}
    return null;
  };
  const setCachedOrganizations = (data) => {
    try {
      localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(ORG_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
  };

  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 25, total_count: 0, total_pages: 0 });
  const [selectedOrgIds, setSelectedOrgIds] = useState(isAdmin && adminOrgId ? [adminOrgId] : []);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [openOrgPopover, setOpenOrgPopover] = useState(false);
  const [stats, setStats] = useState({ available: 0, sold: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [filters, setFilters] = useState({ stove_id: "", status: "", branch: "", state: "", date_from: "", date_to: "" });

  // Detail modal — uses AdminSalesDetailModal for sold stoves
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [loadingStoveId, setLoadingStoveId] = useState(null);

  const orgDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target))
        setOpenOrgPopover(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrganizations = async (searchTerm = "") => {
    if (isAdmin && !isSuperAdmin) return;
    setLoadingOrgs(true);
    try {
      const cachedData = getCachedOrganizations();
      if (cachedData?.length > 0) {
        setOrganizations(searchTerm
          ? cachedData.filter(g =>
              g.base_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              g.branches.some(b => b.branch.toLowerCase().includes(searchTerm.toLowerCase()) || b.state?.toLowerCase().includes(searchTerm.toLowerCase()))
            )
          : cachedData);
        setLoadingOrgs(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-organizations-grouped?page=1&page_size=500`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      const result = await response.json();
      const fetchedData = result.data || [];
      setCachedOrganizations(fetchedData);
      setOrganizations(searchTerm
        ? fetchedData.filter(g => g.base_name.toLowerCase().includes(searchTerm.toLowerCase()))
        : fetchedData);
    } catch (err) {
      setOrganizations([]);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchStats = async (orgIds) => {
    setLoadingStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (orgIds?.length > 0) params.append("organization_ids", orgIds.join(","));
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-stove-stats?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      const result = await response.json();
      setStats(result.data || { available: 0, sold: 0, total: 0 });
    } catch {
      setStats({ available: 0, sold: 0, total: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchStoveIds = async (page = 1, pageSize = pagination.page_size, currentFilters = filters, orgIds = selectedOrgIds) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
      if (orgIds?.length > 0) params.append("organization_ids", orgIds.join(","));
      if (currentFilters.stove_id) params.append("stove_id", currentFilters.stove_id);
      if (currentFilters.status) params.append("status", currentFilters.status);
      if (currentFilters.branch) params.append("branch", currentFilters.branch);
      if (currentFilters.state) params.append("state", currentFilters.state);
      if (currentFilters.date_from) params.append("date_from", currentFilters.date_from);
      if (currentFilters.date_to) params.append("date_to", currentFilters.date_to);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-stove-ids?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch stove IDs");
      setStoveIds(result.data || []);
      setPagination(result.pagination || { page: 1, page_size: 25, total_count: 0, total_pages: 0 });
    } catch (err) {
      toast.error("Failed to fetch stove IDs", err.message);
      setStoveIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedOrganizations();
    if (cached?.length > 0) setOrganizations(cached);
    else fetchOrganizations();
    fetchStats([]);
    fetchStoveIds(1, 25);
  }, []);

  const handleSelectOrganization = (orgIds) => {
    setSelectedOrgIds(orgIds);
    fetchStats(orgIds);
    fetchStoveIds(1, pagination.page_size, filters, orgIds);
  };

  const getSelectedOrgName = () => {
    if (!selectedOrgIds?.length) return "All Organizations";
    for (const group of organizations) {
      if (selectedOrgIds.length === group.organization_ids.length && selectedOrgIds.every(id => group.organization_ids.includes(id)))
        return `${group.base_name} (All Branches)`;
      const branch = group.branches.find(b => selectedOrgIds.includes(b.id) && selectedOrgIds.length === 1);
      if (branch) return `${group.base_name} - ${branch.branch}`;
    }
    return `${selectedOrgIds.length} selected`;
  };

  const handlePageChange = (newPage) => fetchStoveIds(newPage, pagination.page_size);
  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize);
    setPagination(prev => ({ ...prev, page_size: size }));
    fetchStoveIds(1, size);
  };
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    fetchStoveIds(1, pagination.page_size, newFilters);
  };
  const handleClearFilters = () => {
    const cleared = { stove_id: "", status: "", branch: "", state: "", date_from: "", date_to: "" };
    setFilters(cleared);
    if (isSuperAdmin) { handleSelectOrganization([]); setOrgSearch(""); const cached = getCachedOrganizations(); if (cached?.length) setOrganizations(cached); }
    fetchStoveIds(1, pagination.page_size, cleared);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "") || (isSuperAdmin && selectedOrgIds.length > 0);

  // View stove details — fetches stove data, then opens AdminSalesDetailModal for sold stoves
  const handleViewStove = async (stove) => {
    setLoadingStoveId(stove.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-stove-ids?id=${stove.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch stove details");

      const stoveData = result;
      // For sold stoves: fetch full sale via get-sale using stove_serial_no
      if (stoveData.status === "sold") {
        const saleResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-sale?stove_serial_no=${stoveData.stove_id}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const saleResult = await saleResponse.json();
        if (saleResult.success && saleResult.data) {
          setSelectedSale(saleResult.data);
          setShowSaleModal(true);
          return;
        }
      }
      // Fallback for available stoves or if sale fetch fails: show minimal info
      toast({ title: "Stove Info", description: `Stove ${stoveData.stove_id} — Status: ${stoveData.status}` });
    } catch (err) {
      toast({ variant: "error", title: "Failed to fetch stove details", description: err.message });
    } finally {
      setLoadingStoveId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    } catch { return "Invalid Date"; }
  };

  // Pagination helpers
  const startRecord = pagination.total_count === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1;
  const endRecord = Math.min(pagination.page * pagination.page_size, pagination.total_count);

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, pagination.page - 2);
    const end = Math.min(pagination.total_pages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
      <DashboardLayout currentRoute="stove-management" title="Stove ID Management">
        <div className="p-6 space-y-5">

          {/* Stats Cards — top, colored like PaymentStatusCards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Total Received */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Stove IDs Received</p>
                  {loadingStats
                    ? <Loader2 className="h-5 w-5 animate-spin text-blue-400 mt-1" />
                    : <p className="text-xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>}
                </div>
              </div>
            </div>

            {/* Total Sold */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Total Stove IDs Sold</p>
                  {loadingStats
                    ? <Loader2 className="h-5 w-5 animate-spin text-amber-400 mt-1" />
                    : <p className="text-xl font-bold text-amber-900">{stats.sold.toLocaleString()}</p>}
                </div>
              </div>
            </div>

            {/* Total Available */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Available Stove IDs</p>
                  {loadingStats
                    ? <Loader2 className="h-5 w-5 animate-spin text-green-400 mt-1" />
                    : <p className="text-xl font-bold text-green-900">{stats.available.toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              {/* Organization Search — super admin only */}
              {isSuperAdmin && (
                <div className="relative w-[200px]" ref={orgDropdownRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search organizations..."
                    value={orgSearch}
                    onChange={(e) => { setOrgSearch(e.target.value); fetchOrganizations(e.target.value); setOpenOrgPopover(true); }}
                    onFocus={() => { setOpenOrgPopover(true); if (!orgSearch) { const cached = getCachedOrganizations(); if (cached?.length) setOrganizations(cached); else fetchOrganizations(""); } }}
                    className="pl-9 bg-white h-9 text-sm"
                  />
                  {openOrgPopover && (
                    <div className="absolute z-50 min-w-[200px] max-w-[300px] mt-2 bg-white rounded-md border border-gray-200 shadow-md max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {loadingOrgs ? (
                          <div className="px-2 py-4 text-sm text-center text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                          </div>
                        ) : (
                          <>
                            <div className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm flex items-center gap-2"
                              onClick={() => { handleSelectOrganization([]); setOrgSearch(""); setOpenOrgPopover(false); const c = getCachedOrganizations(); if (c?.length) setOrganizations(c); }}>
                              <Building2 className="h-4 w-4" /> All Organizations
                            </div>
                            {organizations.map((group) => (
                              <div key={group.base_name}>
                                <div className="px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                                  onClick={() => { handleSelectOrganization(group.organization_ids); setOrgSearch(""); setOpenOrgPopover(false); }}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{group.base_name}</div>
                                    {group.branch_count > 1 && <span className="text-xs text-gray-500">{group.branch_count} branches</span>}
                                  </div>
                                </div>
                                {group.branch_count > 1 && group.branches.map((branch) => (
                                  <div key={branch.id} className="pl-8 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                                    onClick={() => { handleSelectOrganization([branch.id]); setOrgSearch(""); setOpenOrgPopover(false); }}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{branch.branch}</span>
                                      {branch.state && <span className="text-xs text-gray-500">{branch.state}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stove ID search */}
              <Input
                placeholder="Stove ID"
                value={filters.stove_id}
                onChange={(e) => handleFilterChange("stove_id", e.target.value)}
                className="bg-white h-9 text-sm w-[140px]"
              />

              {/* Status */}
              <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}>
                <SelectTrigger className="bg-white h-9 text-sm w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>

              {/* State */}
              <Select value={filters.state || "all"} onValueChange={(v) => handleFilterChange("state", v === "all" ? "" : v)}>
                <SelectTrigger className="bg-white h-9 text-sm w-[150px]"><SelectValue placeholder="All States" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {Object.keys(lgaAndStates).sort().map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Branch — super admin only */}
              {isSuperAdmin && (
                <Input
                  placeholder="Branch"
                  value={filters.branch}
                  onChange={(e) => handleFilterChange("branch", e.target.value)}
                  className="bg-white h-9 text-sm w-[130px]"
                />
              )}

              {/* Date From */}
              <Input type="date" value={filters.date_from} onChange={(e) => handleFilterChange("date_from", e.target.value)} className="bg-white h-9 text-sm w-[145px]" />

              {/* Date To */}
              <Input type="date" value={filters.date_to} onChange={(e) => handleFilterChange("date_to", e.target.value)} className="bg-white h-9 text-sm w-[145px]" />

              {/* Selected org badge */}
              {isSuperAdmin && selectedOrgIds.length > 0 && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{getSelectedOrgName()}</span>
                  <button onClick={() => { handleSelectOrganization([]); setOrgSearch(""); }} className="ml-1 text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {hasActiveFilters && (
                <Button onClick={handleClearFilters} size="sm" variant="outline" className="h-9">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table with ERP-style pagination */}
          <div className="space-y-0">
            {/* Pagination header */}
            <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{startRecord}–{endRecord}</span> of{" "}
                  <span className="font-medium">{pagination.total_count}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">per page:</span>
                  <Select value={pagination.page_size.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[65px] h-7 bg-white text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm font-bold text-green-500">
                Total Stove IDs: <span className="text-brand">{pagination.total_count}</span>
              </p>
            </div>

            {/* Table */}
            <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand hover:bg-brand">
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Stove ID</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Status</TableHead>
                    {isSuperAdmin && (
                      <>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner Name</TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Branch</TableHead>
                        <TableHead className="text-white font-semibold text-xs whitespace-nowrap">State</TableHead>
                      </>
                    )}
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Date Sold</TableHead>
                    <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Sold To</TableHead>
                    <TableHead className="text-white font-semibold text-xs text-center whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? "opacity-40" : ""}>
                  {stoveIds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 8 : 5} className="text-center py-8 text-gray-500">
                        {loading ? "Loading..." : "No stove IDs found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    stoveIds.map((stove, index) => (
                      <TableRow key={stove.id} className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50`}>
                        <TableCell className="font-medium text-xs">{stove.stove_id}</TableCell>
                        <TableCell>
                          <Badge className={stove.status === "sold" ? "bg-blue-100 text-blue-800 border-blue-200 text-xs" : "bg-green-100 text-green-800 border-green-200 text-xs"}>
                            {stove.status.charAt(0).toUpperCase() + stove.status.slice(1)}
                          </Badge>
                        </TableCell>
                        {isSuperAdmin && (
                          <>
                            <TableCell className="text-xs">{stove.organization_name || "N/A"}</TableCell>
                            <TableCell className="text-xs">{stove.branch || "N/A"}</TableCell>
                            <TableCell className="text-xs">{stove.location || "N/A"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-xs">{stove.status === "sold" && stove.sale_date ? formatDate(stove.sale_date) : "—"}</TableCell>
                        <TableCell className="text-xs">{stove.sold_to || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleViewStove(stove)}
                            disabled={loadingStoveId === stove.id}
                            className="bg-brand hover:bg-brand/90 text-white h-7 px-3 text-xs"
                          >
                            {loadingStoveId === stove.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            View Details
                          </Button>
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
                  Showing {startRecord} to {endRecord} of {pagination.total_count} records
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
                      onClick={() => handlePageChange(p)}>
                      {p}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.total_pages}>
                    Next<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(pagination.total_pages)} disabled={pagination.page === pagination.total_pages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sale Detail Modal — same as Manage Sales */}
        <AdminSalesDetailModal
          open={showSaleModal}
          onClose={() => { setShowSaleModal(false); setSelectedSale(null); }}
          sale={selectedSale}
          viewFrom="admin"
        />

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default StoveManagementPage;
