
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "@/compat/Link";
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  CreditCard,
  Wallet,
  AlertCircle,
  ClipboardList,
  Loader2,
  Plus,
  ChevronRight,
  Search,
  X,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import PageHeader from "../../components/PageHeader";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i);
const DARK_NAVY = "#4a5d0f";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

// Full comma-formatted amount — no K/M abbreviation
const formatCurrency = (value) => `₦${Math.round(value ?? 0).toLocaleString()}`;

const KPI_CONFIG = [
  {
    key: "stovesReceived",
    label: "Total Stoves Received By Partner(s)",
    icon: Package,
    gradient: "from-[#194977] to-[#2563EB]",
    destPath: "/partners",
    destParam: "search",
  },
  {
    key: "stovesSold",
    label: "Total Stoves Sold to End Users",
    icon: ShoppingCart,
    gradient: "from-[#0F766E] to-[#14B8A6]",
    destPath: "/sales",
    destParam: "partner",
  },
  {
    key: "availableStoves",
    label: "Available Stoves for Sale to End Users",
    icon: Boxes,
    gradient: "from-[#7C3AED] to-[#A78BFA]",
    sub: "Current inventory",
    destPath: "/sales",
    destParam: "partner",
  },
  {
    key: "expectedReceivable",
    label: "Expected Receivable Amount",
    icon: CreditCard,
    gradient: "from-[#B45309] to-[#F59E0B]",
    currency: true,
    destPath: "/sales",
    destParam: "partner",
  },
  {
    key: "amountReceived",
    label: "Amount Received",
    icon: Wallet,
    gradient: "from-[#047857] to-[#10B981]",
    currency: true,
    destPath: "/sales",
    destParam: "partner",
  },
  {
    key: "outstandingBalance",
    label: "Outstanding Balance",
    icon: AlertCircle,
    gradient: "from-[#B91C1C] to-[#F87171]",
    currency: true,
    destPath: "/sales",
    destParam: "partner",
  },
];

const RankTable = ({ title, rows, nameLabel = "Name" }) => (
  <Card>
    <CardHeader className="rounded-t-lg text-white py-2 px-4" style={{ backgroundColor: DARK_NAVY }}>
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0 px-0 pb-0">
      <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: "#EFF6FF" }}>
            <TableHead className="w-8 py-2 text-xs font-semibold">#</TableHead>
            <TableHead className="py-2 text-xs font-semibold">{nameLabel}</TableHead>
            <TableHead className="text-right py-2 text-xs font-semibold">Sales</TableHead>
            <TableHead className="text-right py-2 text-xs font-semibold">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-400 py-6 text-xs">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={`${r.name}-${i}`} className={i % 2 === 1 ? "bg-blue-50/50" : ""}>
                <TableCell className="py-2 text-xs font-medium">{i + 1}</TableCell>
                <TableCell className="py-2 text-xs font-medium truncate max-w-[160px]">{r.name}</TableCell>
                <TableCell className="py-2 text-xs text-right">{r.count.toLocaleString()}</TableCell>
                <TableCell className="py-2 text-xs text-right">{r.percentage}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const DashboardContent = ({
  data, loading, year, onYearChange,
  years = null, onYearsChange = null,
  role = "partner", partners = [],
  dashboardFilters = {}, onFilterChange = () => {}, onClearFilters = () => {},
  partnersList = [], loadingPartners = false, onPartnerSearch = () => {},
  availableBranches = [],
  // Partner-specific date range and card interaction
  dateFrom = null, dateTo = null, onDateFromChange = null, onDateToChange = null,
  activeCard = null, onCardClick = null,
}) => {
  const isSuperAdmin = role === "super_admin";

  const byState = data?.byState ?? [];
  const salesModelData = data?.salesModelData ?? [];
  const topPartners = data?.topPartners ?? [];
  const topAgents = data?.topAgents ?? [];

  const statesWithSales = new Set(byState.map((s) => s.state));
  const statesWithNoSales = NIGERIAN_STATES.filter((s) => !statesWithSales.has(s));

  const [stateLimit, setStateLimit] = React.useState("10");
  const displayStates = stateLimit === "all" ? byState : byState.slice(0, Number(stateLimit));

  // Filter dropdown state (for super admin filter bar)
  const [partnerSearch, setPartnerSearch] = React.useState("");
  const [partnerDropdownOpen, setPartnerDropdownOpen] = React.useState(false);
  const [stateSearch, setStateSearch] = React.useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = React.useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = React.useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = React.useState(false);
  const [monthsDropdownOpen, setMonthsDropdownOpen] = React.useState(false);
  const [headerStateDropdownOpen, setHeaderStateDropdownOpen] = React.useState(false);
  const [headerStateSearch, setHeaderStateSearch] = React.useState("");
  const partnerDropdownRef = React.useRef(null);
  const stateDropdownRef = React.useRef(null);
  const branchDropdownRef = React.useRef(null);
  const yearDropdownRef = React.useRef(null);
  const monthsDropdownRef = React.useRef(null);
  const headerStateDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target)) setPartnerDropdownOpen(false);
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target)) setStateDropdownOpen(false);
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) setBranchDropdownOpen(false);
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) setYearDropdownOpen(false);
      if (monthsDropdownRef.current && !monthsDropdownRef.current.contains(e.target)) setMonthsDropdownOpen(false);
      if (headerStateDropdownRef.current && !headerStateDropdownRef.current.contains(e.target)) setHeaderStateDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePartnerSearch = (val) => {
    setPartnerSearch(val);
    onPartnerSearch?.(val);
  };

  // Multi-year selection (empty array = all years). Falls back to single `year` prop.
  const multiYear = Array.isArray(years) && typeof onYearsChange === "function";
  const sortedYears = multiYear ? [...years].sort((a, b) => a - b) : [];
  const allYearsSelected = multiYear && (years.length === 0 || years.length === YEARS.length);
  const yearLabel = multiYear
    ? (allYearsSelected ? "All Years" : sortedYears.join(", "))
    : String(year);

  const toggleYear = (y) => {
    // Starting from "all" (empty) collapses to just the clicked year
    const base = allYearsSelected ? [] : years;
    const set = new Set(base);
    set.has(y) ? set.delete(y) : set.add(y);
    onYearsChange(Array.from(set).sort((a, b) => a - b));
  };

  const selectedPartner = dashboardFilters.selectedGroup || null;
  const hasActiveFilters = dashboardFilters.selectedGroup || dashboardFilters.state || dashboardFilters.branch || dashboardFilters.dateFrom || dashboardFilters.dateTo;
  const showBranchFilter = !!dashboardFilters.selectedGroup && !!dashboardFilters.state;
  const hasDateRange = !!(dashboardFilters.dateFrom || dashboardFilters.dateTo);
  const periodLabel = hasDateRange
    ? `${dashboardFilters.dateFrom || ""} – ${dashboardFilters.dateTo || ""}`.trim().replace(/^–\s*|\s*–$/, "")
    : yearLabel;

  // Months multi-select (1..12). Stored on dashboardFilters.months.
  const selectedMonths = Array.isArray(dashboardFilters.months) ? dashboardFilters.months : [];
  const allMonthsSelected = selectedMonths.length === 0 || selectedMonths.length === 12;
  const monthsLabel = allMonthsSelected
    ? "All Months"
    : [...selectedMonths].sort((a, b) => a - b).map((m) => MONTHS[m - 1]).join(", ");
  const toggleMonth = (m) => {
    const base = allMonthsSelected ? [] : selectedMonths;
    const set = new Set(base);
    set.has(m) ? set.delete(m) : set.add(m);
    onFilterChange?.("months", Array.from(set).sort((a, b) => a - b));
  };


  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        right={
          <div className="flex items-center gap-2 flex-wrap pr-4">
            {role === "acsl_agent" && (
              <Link
                href="/partners"
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-[#07376a] transition-all"
              >
                <span className="text-xs font-medium text-gray-500">My Assigned Partners</span>
                <span className="text-sm font-bold text-[#07376a]">{partners.length}</span>
              </Link>
            )}

            {/* Super Admin Filters — inline in header */}
            {isSuperAdmin && (
              <>


                {/* State Filter — shows when partner selected */}
                {dashboardFilters.selectedGroup && (
                  <div className="relative" ref={stateDropdownRef}>
                    <button
                      onClick={() => setStateDropdownOpen((o) => !o)}
                      className="h-8 px-3 flex items-center gap-1.5 bg-white border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[130px]"
                    >
                      <span className={`truncate flex-1 text-left ${!dashboardFilters.state ? "text-muted-foreground" : ""}`}>
                        {dashboardFilters.state
                          ? NIGERIAN_STATES.find((s) => s.toLowerCase() === dashboardFilters.state.toLowerCase()) || dashboardFilters.state
                          : "All States"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                    {stateDropdownOpen && (
                      <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md">
                        <div className="p-1.5 border-b border-gray-100">
                          <Input
                            autoFocus
                            placeholder="Search state…"
                            value={stateSearch}
                            onChange={(e) => setStateSearch(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            onClick={() => { onFilterChange?.("state", null); onFilterChange?.("branch", null); setStateSearch(""); setStateDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${!dashboardFilters.state ? "font-semibold text-[#07376a]" : ""}`}
                          >All States</button>
                          {NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase())).map((s) => (
                            <button
                              key={s}
                              onClick={() => { onFilterChange?.("state", s.toLowerCase()); onFilterChange?.("branch", null); setStateSearch(""); setStateDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${dashboardFilters.state === s.toLowerCase() ? "font-semibold text-[#07376a]" : ""}`}
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Branch Filter — shows when partner + state selected */}
                {showBranchFilter && (
                  <div className="relative" ref={branchDropdownRef}>
                    <button
                      onClick={() => setBranchDropdownOpen((o) => !o)}
                      className="h-8 px-3 flex items-center gap-1.5 bg-white border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[130px]"
                    >
                      <span className={`truncate flex-1 text-left ${!dashboardFilters.branch ? "text-muted-foreground" : ""}`}>
                        {dashboardFilters.branch || "All Branches"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                    {branchDropdownOpen && (
                      <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md">
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            onClick={() => { onFilterChange?.("branch", null); setBranchDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${!dashboardFilters.branch ? "font-semibold text-[#07376a]" : ""}`}
                          >All Branches</button>
                          {availableBranches.length === 0 ? (
                            <p className="text-xs text-muted-foreground px-3 py-2">No branches found</p>
                          ) : (
                            availableBranches.map((b) => (
                              <button
                                key={b}
                                onClick={() => { onFilterChange?.("branch", b); setBranchDropdownOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${dashboardFilters.branch === b ? "font-semibold text-[#07376a]" : ""}`}
                              >{b}</button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {hasActiveFilters && (
                  <Button onClick={onClearFilters} size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}

            {/* Date range filter for partner / acsl_agent / acsl_agent_manager */}
            {(role === "partner" || role === "acsl_agent" || role === "acsl_agent_manager") && onDateFromChange && onDateToChange && (
              <div className="flex items-center gap-1.5">
                <DatePicker
                  value={dateFrom || ""}
                  onChange={(v) => onDateFromChange(v || null)}
                  placeholder="From date"
                  className="w-[140px] [&_input]:h-8 [&_input]:text-xs [&_input]:pl-8 [&_svg]:h-3.5 [&_svg]:w-3.5"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <DatePicker
                  value={dateTo || ""}
                  onChange={(v) => onDateToChange(v || null)}
                  placeholder="To date"
                  className="w-[140px] [&_input]:h-8 [&_input]:text-xs [&_input]:pl-8 [&_svg]:h-3.5 [&_svg]:w-3.5"
                  min={dateFrom || undefined}
                />
                {(dateFrom || dateTo) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { onDateFromChange(null); onDateToChange(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {!isSuperAdmin && (
              <>
                <span className="text-sm font-medium text-gray-700">Year:</span>
                {multiYear ? (
                  <div ref={yearDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setYearDropdownOpen((o) => !o)}
                      className="flex items-center justify-between gap-2 h-8 px-3 bg-white border border-input rounded-md text-sm min-w-[120px] max-w-[200px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <span className="truncate text-left">{yearLabel}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${yearDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {yearDropdownOpen && (
                      <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md py-1">
                        <button
                          type="button"
                          onClick={() => onYearsChange([])}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                        >
                          <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${allYearsSelected ? "bg-[#07376a] border-[#07376a]" : "border-gray-300"}`}>
                            {allYearsSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          All Years
                        </button>
                        {YEARS.map((y) => {
                          const checked = !allYearsSelected && years.includes(y);
                          return (
                            <button
                              key={y}
                              type="button"
                              onClick={() => toggleYear(y)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                            >
                              <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-[#07376a] border-[#07376a]" : "border-gray-300"}`}>
                                {checked && <Check className="h-2.5 w-2.5 text-white" />}
                              </span>
                              {y}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" style={{ color: DARK_NAVY }} />
            <p className="text-gray-500 text-xs">Loading dashboard…</p>
          </div>
        </div>
      ) : isSuperAdmin ? (
        <div className="space-y-8 px-4 pt-2">
          {/* Section A — Stove Inventory Doughnut + Financial KPIs */}
          <div className="space-y-4">
            {(() => {
              const received = data?.stovesReceived ?? 0;
              const sold = data?.stovesSold ?? 0;
              const available = data?.availableStoves ?? 0;
              const totalForPct = sold + available || 1;
              const soldPct = ((sold / totalForPct) * 100).toFixed(1);
              const availPct = ((available / totalForPct) * 100).toFixed(1);
              const doughnutData = [
                { name: "Sold", value: sold, color: "#4a5d0f" },
                { name: "Available", value: available, color: "#a8c34a" },
              ];
              const items = [
                { label: "Total Stoves Received", value: received, color: "#1f2937", pct: null },
                { label: "Total Sold to End Users", value: sold, color: "#4a5d0f", pct: soldPct },
                { label: "Available for Sale", value: available, color: "#a8c34a", pct: availPct },
              ];
              return (
                <Card className="bg-white shadow-none">
                  <CardHeader className="rounded-t-lg text-white py-2 px-4 flex flex-row items-center justify-between gap-3 flex-wrap" style={{ backgroundColor: DARK_NAVY }}>
                    <CardTitle className="text-base font-semibold">Stove Inventory & Financial Overview</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Partner Search Dropdown */}
                      <div className="relative" ref={partnerDropdownRef}>
                        <button
                          onClick={() => setPartnerDropdownOpen((o) => !o)}
                          className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs text-white border w-[260px] focus:outline-none focus:ring-2 focus:ring-white/30 hover:brightness-110"
                          style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                        >
                          <Search className="h-3.5 w-3.5 text-white/80 shrink-0" />
                          <span className={`truncate flex-1 text-left ${!selectedPartner ? "text-white/70" : "text-white"}`}>
                            {selectedPartner ? selectedPartner.base_name : "Filter by partner…"}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-white/80 shrink-0" />
                        </button>
                        {partnerDropdownOpen && (
                          <div className="absolute z-50 top-full right-0 mt-1 w-[300px] bg-white border border-gray-200 rounded-md text-gray-700">
                            <div className="p-1.5 border-b border-gray-100">
                              <Input
                                autoFocus
                                placeholder="Type partner name…"
                                value={partnerSearch}
                                onChange={(e) => handlePartnerSearch(e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                              <button
                                onClick={() => { onFilterChange?.("selectedGroup", null); setPartnerSearch(""); setPartnerDropdownOpen(false); onPartnerSearch?.(""); }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${!dashboardFilters.selectedGroup ? "font-semibold text-[#4a5d0f]" : ""}`}
                              >All Partners</button>
                              {loadingPartners ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
                              ) : partnersList.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground">No partners found</div>
                              ) : (
                                partnersList.map((group) => (
                                  <button
                                    key={group.base_name}
                                    onClick={() => { onFilterChange?.("selectedGroup", group); setPartnerSearch(""); setPartnerDropdownOpen(false); onPartnerSearch?.(""); }}
                                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${dashboardFilters.selectedGroup?.base_name === group.base_name ? "font-semibold text-[#4a5d0f]" : ""}`}
                                  >
                                    <span className="truncate block">{group.base_name}</span>
                                    {group.branch_count > 1 && <span className="text-xs text-muted-foreground">{group.branch_count} branches</span>}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* State Filter */}
                      <div ref={headerStateDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setHeaderStateDropdownOpen((o) => !o)}
                          className="flex items-center justify-between gap-2 h-8 px-3 rounded-md text-xs text-white border min-w-[140px] max-w-[220px] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30"
                          style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                        >
                          <span className="truncate text-left">
                            {dashboardFilters.state
                              ? (NIGERIAN_STATES.find((s) => s.toLowerCase() === dashboardFilters.state.toLowerCase()) || dashboardFilters.state)
                              : "All States"}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-white/80 shrink-0 transition-transform ${headerStateDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {headerStateDropdownOpen && (
                          <div className="absolute z-50 top-full right-0 mt-1 w-[200px] bg-white border border-gray-200 rounded-md text-gray-700">
                            <div className="p-1.5 border-b border-gray-100">
                              <Input
                                autoFocus
                                placeholder="Search state…"
                                value={headerStateSearch}
                                onChange={(e) => setHeaderStateSearch(e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="max-h-56 overflow-y-auto py-1">
                              <button
                                type="button"
                                onClick={() => { onFilterChange?.("state", null); onFilterChange?.("branch", null); setHeaderStateSearch(""); setHeaderStateDropdownOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${!dashboardFilters.state ? "font-semibold text-[#4a5d0f]" : ""}`}
                              >
                                All States
                              </button>
                              {NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(headerStateSearch.toLowerCase())).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => { onFilterChange?.("state", s.toLowerCase()); onFilterChange?.("branch", null); setHeaderStateSearch(""); setHeaderStateDropdownOpen(false); }}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${dashboardFilters.state === s.toLowerCase() ? "font-semibold text-[#4a5d0f]" : ""}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date Range Filter */}
                      {(() => {
                        const fromDate = dashboardFilters.dateFrom ? parseISO(dashboardFilters.dateFrom) : undefined;
                        const toDate = dashboardFilters.dateTo ? parseISO(dashboardFilters.dateTo) : undefined;
                        const label = fromDate && toDate
                          ? `${format(fromDate, "MMM d, yyyy")} – ${format(toDate, "MMM d, yyyy")}`
                          : fromDate
                            ? `${format(fromDate, "MMM d, yyyy")} – …`
                            : "Filter by date range";
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="h-8 px-3 flex items-center gap-1.5 rounded-md text-xs text-white border hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30"
                                style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                              >
                                <CalendarIcon className="h-3.5 w-3.5 text-white/90" />
                                <span className={!fromDate ? "text-white/80" : "text-white"}>{label}</span>
                                {fromDate && (
                                  <X
                                    className="h-3.5 w-3.5 text-white/80 hover:text-white ml-1"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onFilterChange?.("dateFrom", null);
                                      onFilterChange?.("dateTo", null);
                                    }}
                                  />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="range"
                                selected={{ from: fromDate, to: toDate }}
                                onSelect={(range) => {
                                  onFilterChange?.("dateFrom", range?.from ? format(range.from, "yyyy-MM-dd") : null);
                                  onFilterChange?.("dateTo", range?.to ? format(range.to, "yyyy-MM-dd") : null);
                                }}
                                numberOfMonths={2}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      })()}

                      {/* Months Filter */}
                      <div ref={monthsDropdownRef} className="relative">
                        <button
                          type="button"
                          disabled={hasDateRange}
                          onClick={() => setMonthsDropdownOpen((o) => !o)}
                          className="flex items-center justify-between gap-2 h-8 px-3 rounded-md text-xs text-white border min-w-[130px] max-w-[260px] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
                          style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                        >
                          <span className="truncate text-left">{monthsLabel}</span>
                          <ChevronDown className={`h-4 w-4 text-white/80 shrink-0 transition-transform ${monthsDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {monthsDropdownOpen && !hasDateRange && (
                          <div className="absolute z-50 top-full right-0 mt-1 w-[170px] bg-white border border-gray-200 rounded-md py-1 text-gray-700 max-h-72 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => onFilterChange?.("months", [])}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                            >
                              <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${allMonthsSelected ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                                {allMonthsSelected && <Check className="h-2.5 w-2.5 text-white" />}
                              </span>
                              All Months
                            </button>
                            {MONTHS.map((label, idx) => {
                              const m = idx + 1;
                              const checked = !allMonthsSelected && selectedMonths.includes(m);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => toggleMonth(m)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                                >
                                  <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                                    {checked && <Check className="h-2.5 w-2.5 text-white" />}
                                  </span>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Year Filter */}
                      {multiYear ? (
                        <div ref={yearDropdownRef} className="relative">
                          <button
                            type="button"
                            disabled={hasDateRange}
                            onClick={() => setYearDropdownOpen((o) => !o)}
                            className="flex items-center justify-between gap-2 h-8 px-3 rounded-md text-xs text-white border min-w-[110px] max-w-[200px] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
                            style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                          >
                            <span className="truncate text-left">{yearLabel}</span>
                            <ChevronDown className={`h-4 w-4 text-white/80 shrink-0 transition-transform ${yearDropdownOpen ? "rotate-180" : ""}`} />
                          </button>
                          {yearDropdownOpen && !hasDateRange && (
                            <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md py-1 text-gray-700">
                              <button
                                type="button"
                                onClick={() => onYearsChange([])}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                              >
                                <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${allYearsSelected ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                                  {allYearsSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </span>
                                All Years
                              </button>
                              {YEARS.map((y) => {
                                const checked = !allYearsSelected && years.includes(y);
                                return (
                                  <button
                                    key={y}
                                    type="button"
                                    onClick={() => toggleYear(y)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-blue-50 text-left"
                                  >
                                    <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-[#4a5d0f] border-[#4a5d0f]" : "border-gray-300"}`}>
                                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                                    </span>
                                    {y}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))} disabled={hasDateRange}>
                          <SelectTrigger
                            className="w-[100px] h-8 text-xs text-white border hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "#6b8519", borderColor: "rgba(255,255,255,0.25)" }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-5 pb-5 px-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={doughnutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              stroke="none"
                            >
                              {doughnutData.map((d, i) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v, n) => [Number(v).toLocaleString(), n]}
                              contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold text-gray-900 tracking-tight">
                            {received.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-semibold tracking-wider text-gray-500 mt-0.5">
                            STOVES RECEIVED
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {items.map((it) => (
                          <div key={it.label} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color }} />
                              <span className="text-xs font-medium text-gray-600 truncate">{it.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2 shrink-0">
                              <span className="text-sm font-bold text-gray-900">{it.value.toLocaleString()}</span>
                              {it.pct !== null && (
                                <span className="text-[11px] text-gray-400">{it.pct}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <span className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase">
                        Financial Snapshot
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </div>

                    {/* Integrated Financial KPI tiles */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {KPI_CONFIG.slice(3).map((kpi) => {
                        const raw = data?.[kpi.key] ?? 0;
                        const display = kpi.currency ? formatCurrency(raw) : raw.toLocaleString();
                        const hasDateRange = !!(dashboardFilters.dateFrom || dashboardFilters.dateTo);
                        const sub = kpi.sub ?? (
                          hasDateRange
                            ? `${dashboardFilters.dateFrom || ""} – ${dashboardFilters.dateTo || ""}`.trim().replace(/^–\s*|\s*–$/, "")
                            : `FY ${yearLabel}`
                        );
                        const partnerName = selectedPartner?.base_name;
                        const href = kpi.destPath
                          ? partnerName
                            ? `${kpi.destPath}?${kpi.destParam}=${encodeURIComponent(partnerName)}`
                            : kpi.destPath
                          : undefined;
                        return (
                          <Link
                            key={kpi.key}
                            href={href ?? "#"}
                            className={`relative overflow-hidden rounded-xl p-4 cursor-pointer block group bg-gradient-to-br ${kpi.gradient} text-white transition-transform hover:-translate-y-0.5`}
                          >
                            <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                              <kpi.icon className="h-24 w-24" />
                            </div>
                            <div className="relative flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                                  {kpi.label}
                                </p>
                                <p className="text-2xl font-bold tracking-tight leading-tight mt-2 break-all">
                                  {display}
                                </p>
                                <p className="text-[11px] text-white/70 mt-1">{sub}</p>
                              </div>
                              <div className="rounded-lg p-2 bg-white/20 backdrop-blur-sm shrink-0">
                                <kpi.icon className="h-4 w-4" />
                              </div>
                            </div>
                            <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                          </Link>
                        );
                      })}
                    </div>

                    {/* Divider — Monthly Sales */}
                    <div className="mt-6 mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <span className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase">
                        Monthly Sales
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </div>

                    {(() => {
                      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const raw = data?.monthlySales ?? [];
                      const map = new Map();
                      raw.forEach((r) => {
                        const k = (r.month ?? r.name ?? "").toString().slice(0, 3);
                        map.set(k, Number(r.value ?? r.count ?? r.total ?? 0));
                      });
                      const monthly = MONTHS.map((m) => ({ month: m, value: map.get(m) ?? 0 }));
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={monthly} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                            <defs>
                              <linearGradient id="monthlyBarFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#1e3a5f" />
                                <stop offset="100%" stopColor="#bcd4f0" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <Tooltip
                              formatter={(v) => [Number(v).toLocaleString(), "Sales"]}
                              contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
                            />
                            <Bar dataKey="value" fill="url(#monthlyBarFill)" barSize={42} radius={[3, 3, 0, 0]} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#f59e0b"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: "#f59e0b", stroke: "#f59e0b" }}
                              activeDot={{ r: 5 }}
                            >
                              <LabelList dataKey="value" position="top" fontSize={11} fill="#374151" />
                            </Line>
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

        </div>
      ) : (
        /* Non-super-admin view */
        <div className={(role === "acsl_agent" || role === "partner_agent") ? "" : "rounded-lg border bg-gray-50 overflow-hidden"}>
          {(role !== "acsl_agent" && role !== "partner_agent") && (
            <div className="py-2 px-4 text-white font-semibold text-base flex items-center justify-between" style={{ backgroundColor: DARK_NAVY }}>
              <span>Sales Report</span>
              <Link
                href="/sales"
                className="flex items-center gap-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 text-xs px-2.5 py-1 rounded-md transition-colors"
              >
                <ClipboardList className="h-3 w-3" />
                Manage Sales
              </Link>
            </div>
          )}
          {(role === "acsl_agent" || role === "partner_agent") && (
            <div className="flex justify-end mb-4">
              <Link
                href="/sales?create=true"
                className="flex items-center justify-center gap-2 bg-[#07376a] text-white px-6 py-2.5 rounded-lg hover:bg-[#052a51] transition-colors text-sm font-semibold w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Create Sales
              </Link>
            </div>
          )}
          <div className={(role === "acsl_agent" || role === "partner_agent") ? "space-y-4" : "p-4 space-y-4"}>
            {[KPI_CONFIG.slice(0, 3), KPI_CONFIG.slice(3)].map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {row.map((kpi) => {
                  const raw = data?.[kpi.key] ?? 0;
                  const display = kpi.currency ? formatCurrency(raw) : raw.toLocaleString();
                  const sub = kpi.sub ?? `FY ${year ?? yearLabel}`;
                  const isActive = activeCard === kpi.key;
                  const isClickable = (role === "partner" || role === "acsl_agent" || role === "acsl_agent_manager") && !!onCardClick && raw > 0;
                  return isActive ? (
                    <div
                      key={kpi.key}
                      onClick={() => onCardClick(kpi.key)}
                      className={`relative overflow-hidden rounded-lg border-transparent px-4 py-3 cursor-pointer transition-all bg-gradient-to-br ${kpi.gradient} ring-2 ring-white/40`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-white tracking-tight leading-tight break-all">{display}</p>
                          <p className="text-xs font-semibold text-white/80 mt-0.5">{kpi.label}</p>
                          <p className="text-xs text-white/60">{sub}</p>
                        </div>
                        <div className="rounded-lg p-2 bg-white/20 text-white shrink-0">
                          <kpi.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <ChevronDown className="absolute bottom-2 right-2 h-3.5 w-3.5 text-white/70" />
                    </div>
                  ) : (
                    <div
                      key={kpi.key}
                      onClick={isClickable ? () => onCardClick(kpi.key) : undefined}
                      className={`relative overflow-hidden rounded-lg border bg-white px-4 py-3 transition-all group ${isClickable ? "cursor-pointer" : ""}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">{display}</p>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{kpi.label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                        <div className={`rounded-lg p-2 bg-gradient-to-br ${kpi.gradient} text-white shrink-0`}>
                          <kpi.icon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
