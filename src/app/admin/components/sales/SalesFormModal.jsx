"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CreateSalesForm from "./CreateSalesForm";
import {
  CheckCircle2,
  Search,
  AlertCircle,
  Loader2,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import superAdminAgentService from "../../../services/superAdminAgentService";
import { lgaAndStates } from "../../../constants";

const PartnerSelectStep = ({ userRole, userId, onSelect, onCancel }) => {
  const { supabase } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [stateSearch, setStateSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const stateRef = useRef(null);
  const branchRef = useRef(null);

  const nigerianStates = Object.keys(lgaAndStates).sort();

  const fetchOrgs = useCallback(async (searchTerm, stateTerm, branchTerm) => {
    setLoading(true);
    setError("");
    try {
      if (userRole === "super_admin") {
        const { data: { session } } = await supabase.auth.getSession();
        const params = new URLSearchParams({ limit: "200", offset: "0" });
        if (searchTerm) params.set("search", searchTerm);
        if (stateTerm && stateTerm !== "all") params.set("state", stateTerm);
        if (branchTerm && branchTerm !== "all") params.set("branch", branchTerm);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-organizations?${params}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to load partners");
        const data = result.data || [];
        setOrgs(data);
        const branches = [...new Set(data.map((o) => o.branch).filter(Boolean))].sort();
        setAvailableBranches(branches);
      } else {
        // acsl_agent / super_admin_agent: fetch flat list from agent service
        const result = await superAdminAgentService.getAgentOrganizations(userId);
        const flat = result.data || [];
        const filtered = flat.filter((o) => {
          const nameMatch = !searchTerm || (o.partner_name || o.displayName || "").toLowerCase().includes(searchTerm.toLowerCase());
          const stateMatch = !stateTerm || stateTerm === "all" || o.state === stateTerm;
          const branchMatch = !branchTerm || branchTerm === "all" || o.branch === branchTerm;
          return nameMatch && stateMatch && branchMatch;
        });
        setOrgs(filtered);
        const branches = [...new Set(flat.map((o) => o.branch).filter(Boolean))].sort();
        setAvailableBranches(branches);
      }
    } catch (err) {
      setError(err.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, supabase]);

  // Debounced fetch on filter changes
  useEffect(() => {
    const t = setTimeout(() => fetchOrgs(search, stateFilter, branchFilter), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, stateFilter, branchFilter, fetchOrgs]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (stateRef.current && !stateRef.current.contains(e.target)) setStateDropdownOpen(false);
      if (branchRef.current && !branchRef.current.contains(e.target)) setBranchDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derive available states from all Nigerian states (static list)
  const availableStates = nigerianStates;

  const hasActiveFilters = search || stateFilter !== "all" || branchFilter !== "all";

  const handleClearFilters = () => {
    setSearch("");
    setStateFilter("all");
    setBranchFilter("all");
    setStateSearch("");
    setBranchSearch("");
  };

  const showBranchFilter = stateFilter !== "all" || search.trim().length > 0;

  return (
    <div className="px-5 py-4 space-y-3">
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* Filter bar — mirrors partners page */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-0.5 mb-2">
          Search &amp; Filter
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by partner name..."
              className="h-7 text-xs pl-8"
            />
          </div>

          {/* State dropdown */}
          <div className="relative w-[140px]" ref={stateRef}>
            <button
              onClick={() => setStateDropdownOpen((o) => !o)}
              className="w-full h-7 px-2.5 flex items-center justify-between bg-background border border-input rounded-md text-xs text-left focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <span className={stateFilter === "all" ? "text-muted-foreground" : ""}>
                {stateFilter === "all" ? "All States" : stateFilter}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
            {stateDropdownOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                <div className="p-1.5 border-b border-gray-100">
                  <Input
                    autoFocus
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="h-6 text-xs"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto">
                  <button
                    onClick={() => { setStateFilter("all"); setBranchFilter("all"); setStateSearch(""); setStateDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${stateFilter === "all" ? "font-semibold text-brand" : ""}`}
                  >All States</button>
                  {(stateSearch
                    ? nigerianStates.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()))
                    : nigerianStates
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStateFilter(s); setBranchFilter("all"); setStateSearch(""); setStateDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${stateFilter === s ? "font-semibold text-brand" : ""}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Branch dropdown — dynamic, only when state selected or search active */}
          {showBranchFilter && (
            <div className="relative w-[140px]" ref={branchRef}>
              <button
                onClick={() => setBranchDropdownOpen((o) => !o)}
                className="w-full h-7 px-2.5 flex items-center justify-between bg-background border border-input rounded-md text-xs text-left focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <span className={branchFilter === "all" ? "text-muted-foreground" : ""}>
                  {branchFilter === "all" ? "All Branches" : branchFilter}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
              {branchDropdownOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                  <div className="p-1.5 border-b border-gray-100">
                    <Input
                      autoFocus
                      placeholder="Search branch..."
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <button
                      onClick={() => { setBranchFilter("all"); setBranchSearch(""); setBranchDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${branchFilter === "all" ? "font-semibold text-brand" : ""}`}
                    >All Branches</button>
                    {(branchSearch
                      ? availableBranches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase()))
                      : availableBranches
                    ).map((b) => (
                      <button
                        key={b}
                        onClick={() => { setBranchFilter(b); setBranchSearch(""); setBranchDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${branchFilter === b ? "font-semibold text-brand" : ""}`}
                      >{b}</button>
                    ))}
                    {availableBranches.filter((b) => b.toLowerCase().includes(branchSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-2">No branches found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="h-8 px-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md bg-background hover:bg-muted/50 transition-colors"
            >
              <X className="h-3 w-3" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Partners table */}
      <div className="border border-gray-200 overflow-hidden rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
            <span className="ml-2 text-sm text-muted-foreground">Loading partners...</span>
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No partners match your filters.</div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-brand hover:bg-brand">
                  <th className="text-left px-4 py-2.5 text-white font-semibold text-xs whitespace-nowrap">Partner Name</th>
                  <th className="text-left px-4 py-2.5 text-white font-semibold text-xs whitespace-nowrap">Branch</th>
                  <th className="text-left px-4 py-2.5 text-white font-semibold text-xs whitespace-nowrap">State</th>
                  <th className="text-center px-4 py-2.5 text-white font-semibold text-xs whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => (
                  <tr
                    key={org.id}
                    className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-blue-50/50 hover:bg-blue-50"}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{org.partner_name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{org.branch || "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{org.state || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-brand hover:bg-brand/90 text-white"
                        onClick={() => {
                          sessionStorage.setItem("saa_selected_org_id", org.id);
                          sessionStorage.setItem("saa_selected_org_name", org.partner_name || "");
                          onSelect(org);
                        }}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SalesFormModal = ({
  open,
  onOpenChange,
  onSuccess,
  mode = "create",
  saleData = null,
}) => {
  const { user, userRole } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [processedSale, setProcessedSale] = useState(null);
  const [step, setStep] = useState("init");

  const isEditMode = mode === "edit";
  const needsPartnerSelect =
    !isEditMode &&
    (userRole === "super_admin" ||
      userRole === "acsl_agent" ||
      userRole === "super_admin_agent");

  useEffect(() => {
    if (open) {
      setShowSuccess(false);
      setProcessedSale(null);
      if (needsPartnerSelect) {
        sessionStorage.removeItem("saa_selected_org_id");
        sessionStorage.removeItem("saa_selected_org_name");
        setStep("partner-select");
      } else {
        setStep("form");
      }
    }
  }, [open, needsPartnerSelect]);

  const handleSuccess = (resultData) => {
    setProcessedSale(resultData);
    setShowSuccess(true);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setProcessedSale(null);
    onOpenChange(false);
    if (onSuccess && processedSale) {
      onSuccess(processedSale);
    }
  };

  const modalTitle = isEditMode ? "Edit Sale" : "Create New Sale";
  const modalSubtitle =
    step === "partner-select"
      ? "Select the partner organization for this sale"
      : isEditMode
      ? `Transaction: ${saleData?.transaction_id || ""}`
      : "Record a new stove sale transaction";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header — matches AdminSalesDetailModal exactly */}
        <DialogHeader className="px-5 py-3 bg-gradient-to-r from-blue-50/80 to-sky-50/80 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {showSuccess
                  ? isEditMode ? "Sale Updated" : "Sale Created"
                  : modalTitle}
              </DialogTitle>
              {!showSuccess && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modalSubtitle}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {isEditMode ? "Sale updated successfully!" : "Sale created successfully!"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isEditMode
                    ? "The sale has been updated and changes are saved."
                    : "The sale has been recorded and will be processed."}
                </p>
              </div>
              <Button onClick={handleClose} className="h-8 text-xs px-5 bg-brand hover:bg-brand/90 text-white">
                Close
              </Button>
            </div>
          ) : step === "partner-select" ? (
            <PartnerSelectStep
              userRole={userRole}
              userId={user?.id}
              onSelect={() => setStep("form")}
              onCancel={() => onOpenChange(false)}
            />
          ) : step === "form" ? (
            <CreateSalesForm
              isModal={true}
              showSuccessState={false}
              mode={mode}
              initialData={saleData}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesFormModal;
