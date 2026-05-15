"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardContent from "./DashboardContent";
import superAdminDashboardService from "../../services/superAdminDashboardService";
import { useAuth } from "../../contexts/AuthContext";

const CURRENT_YEAR = new Date().getFullYear();

const SuperAdminDashboardContent = () => {
  const { supabase } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // filters: { selectedGroup: { base_name, organization_ids, branches } | null, state, branch, dateFrom, dateTo }
  const [filters, setFilters] = useState({ selectedGroup: null, state: null, branch: null, dateFrom: null, dateTo: null });
  const [groupedPartners, setGroupedPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // Fetch grouped partners via get-organizations-grouped
  const fetchPartners = useCallback(async (search = "") => {
    setLoadingPartners(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ page_size: "200" });
      if (search) params.set("search", search);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-organizations-grouped?${params}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const result = await res.json();
      setGroupedPartners(result.data || []);
    } catch (err) {
      console.error("Failed to fetch grouped partners:", err);
    } finally {
      setLoadingPartners(false);
    }
  }, [supabase]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  // Branches available for the selected partner group, optionally filtered by state
  const availableBranches = (() => {
    if (!filters.selectedGroup) return [];
    const branches = filters.selectedGroup.branches || [];
    const filtered = filters.state
      ? branches.filter((b) => b.state?.toLowerCase() === filters.state.toLowerCase())
      : branches;
    return [...new Set(filtered.map((b) => b.branch).filter(Boolean))].sort();
  })();

  const fetchData = async (y, f = filters) => {
    setLoading(true);
    try {
      const payload = { year: y };

      if (f.selectedGroup?.organization_ids?.length) {
        const allBranches = f.selectedGroup.branches || [];
        let orgIds = f.selectedGroup.organization_ids;

        // Narrow to orgs in the selected state
        if (f.state) {
          const stateIds = allBranches
            .filter((b) => b.state?.toLowerCase() === f.state.toLowerCase())
            .map((b) => b.id);
          if (stateIds.length) orgIds = stateIds;
        }

        // Narrow further to the specific branch org
        if (f.branch) {
          const branchIds = allBranches
            .filter((b) => b.branch === f.branch)
            .map((b) => b.id);
          if (branchIds.length) orgIds = branchIds;
        }

        payload.organization_ids = orgIds;
      }

      if (f.state) payload.state = f.state;
      if (f.branch) payload.branch = f.branch;
      if (f.dateFrom) payload.date_from = f.dateFrom;
      if (f.dateTo) payload.date_to = f.dateTo;

      const response = await superAdminDashboardService.getDashboardStats(payload);
      if (response.success) setData(response.data);
      else console.error("Super admin dashboard failed:", response.error);
    } catch (err) {
      console.error("Super admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(year, filters); }, [year, filters]);

  const normalized = data ? {
    stovesReceived: data.stovesReceivedByPartners ?? 0,
    stovesSold: data.stovesSoldToEndUsers ?? 0,
    availableStoves: data.availableStoves ?? 0,
    expectedReceivable: data.expectedReceivable ?? 0,
    amountReceived: data.amountReceived ?? 0,
    outstandingBalance: data.outstandingBalance ?? 0,
    byState: (data.salesByState ?? []).map((s) => ({ state: s.state, count: s.sales ?? s.count ?? 0 })),
    salesModelData: data.salesModelData ?? [],
    topPartners: data.topPartners ?? [],
    topAgents: data.topAgents ?? [],
  } : null;

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "selectedGroup") { next.state = null; next.branch = null; }
      if (field === "state") next.branch = null;
      return next;
    });
  };

  const handleClearFilters = () => setFilters({ selectedGroup: null, state: null, branch: null, dateFrom: null, dateTo: null });

  return (
    <DashboardLayout currentRoute="dashboard">
      <div className="flex-1 overflow-y-auto bg-white">
        <DashboardContent
          data={normalized}
          loading={loading}
          year={year}
          onYearChange={setYear}
          role="super_admin"
          dashboardFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          partnersList={groupedPartners}
          loadingPartners={loadingPartners}
          onPartnerSearch={fetchPartners}
          availableBranches={availableBranches}
        />
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboardContent;
