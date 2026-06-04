"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import PageHeader from "../../components/PageHeader";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i);
const DARK_NAVY = "#194977";
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
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
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
  data, loading, year, onYearChange, role = "partner", partners = [],
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
  const partnerDropdownRef = React.useRef(null);
  const stateDropdownRef = React.useRef(null);
  const branchDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target)) setPartnerDropdownOpen(false);
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target)) setStateDropdownOpen(false);
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) setBranchDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePartnerSearch = (val) => {
    setPartnerSearch(val);
    onPartnerSearch?.(val);
  };

  const selectedPartner = dashboardFilters.selectedGroup || null;
  const hasActiveFilters = dashboardFilters.selectedGroup || dashboardFilters.state || dashboardFilters.branch || dashboardFilters.dateFrom || dashboardFilters.dateTo;
  const showBranchFilter = !!dashboardFilters.selectedGroup && !!dashboardFilters.state;


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
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm hover:border-[#07376a] hover:shadow-md transition-all"
              >
                <span className="text-xs font-medium text-gray-500">My Assigned Partners</span>
                <span className="text-sm font-bold text-[#07376a]">{partners.length}</span>
              </Link>
            )}

            {/* Super Admin Filters — inline in header */}
            {isSuperAdmin && (
              <>
                {/* Partner Search Dropdown */}
                <div className="relative" ref={partnerDropdownRef}>
                  <button
                    onClick={() => setPartnerDropdownOpen((o) => !o)}
                    className="h-8 px-3 flex items-center gap-1.5 bg-white border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring w-[350px]"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`truncate flex-1 text-left ${!selectedPartner ? "text-muted-foreground" : ""}`}>
                      {selectedPartner ? selectedPartner.base_name : "Filter by partner…"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                  {partnerDropdownOpen && (
                    <div className="absolute z-50 top-full right-0 mt-1 w-[350px] bg-white border border-gray-200 rounded-md shadow-lg">
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
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${!dashboardFilters.selectedGroup ? "font-semibold text-[#07376a]" : ""}`}
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
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${dashboardFilters.selectedGroup?.base_name === group.base_name ? "font-semibold text-[#07376a]" : ""}`}
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

                {/* Date Range Filter */}
                <div className="flex items-center gap-1.5">
                  <DatePicker
                    value={dashboardFilters.dateFrom || ""}
                    onChange={(v) => onFilterChange?.("dateFrom", v || null)}
                    placeholder="From date"
                    className="w-[150px] [&_input]:h-8 [&_input]:text-xs [&_input]:pl-8 [&_svg]:h-3.5 [&_svg]:w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <DatePicker
                    value={dashboardFilters.dateTo || ""}
                    onChange={(v) => onFilterChange?.("dateTo", v || null)}
                    placeholder="To date"
                    className="w-[150px] [&_input]:h-8 [&_input]:text-xs [&_input]:pl-8 [&_svg]:h-3.5 [&_svg]:w-3.5"
                    min={dashboardFilters.dateFrom || undefined}
                  />
                </div>

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
                      <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md shadow-lg">
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
                      <div className="absolute z-50 top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded-md shadow-lg">
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

            {/* Date range filter for partner / acsl_agent */}
            {(role === "partner" || role === "acsl_agent") && onDateFromChange && onDateToChange && (
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

            <span className="text-sm font-medium text-gray-700">Year:</span>
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
          {/* Section A — KPI Stat Cards */}
          <div className="space-y-4">
            {[KPI_CONFIG.slice(0, 3), KPI_CONFIG.slice(3)].map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {row.map((kpi) => {
                  const raw = data?.[kpi.key] ?? 0;
                  const display = kpi.currency ? formatCurrency(raw) : raw.toLocaleString();
                  const sub = kpi.sub ?? `FY ${year}`;
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
                      className="relative overflow-hidden rounded-lg border bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer block group"
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">{display}</p>
                          <p className="text-xs font-semibold text-gray-500 mt-1">{kpi.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                        </div>
                        <div className={`rounded-lg p-2 bg-gradient-to-br ${kpi.gradient} text-white shadow-sm shrink-0`}>
                          <kpi.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Section B — Sales Analysis Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
            {/* Sales Model Analysis */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="rounded-t-lg text-white py-2 px-4" style={{ backgroundColor: DARK_NAVY }}>
                <CardTitle className="text-sm font-semibold">Sales Model Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4">
                {salesModelData.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-xs">
                    No sales data for {year}
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={salesModelData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          nameKey="model"
                          labelLine={false}
                          label={({ model, percentage }) => `${model}: ${Number(percentage).toFixed(1)}%`}
                        >
                          {salesModelData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [v.toLocaleString(), "Sales"]}
                          contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {salesModelData.map((entry, i) => (
                        <span key={entry.model} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {entry.model} ({entry.count.toLocaleString()})
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sales by State */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="rounded-t-lg text-white py-2 px-4 flex flex-row items-center justify-between" style={{ backgroundColor: DARK_NAVY }}>
                <CardTitle className="text-sm font-semibold">Sales by State</CardTitle>
                <Select value={stateLimit} onValueChange={setStateLimit}>
                  <SelectTrigger className="w-[80px] h-6 text-xs bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="15">Top 15</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-3">
                {displayStates.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-gray-400 text-xs">
                    No state data for {year}
                  </div>
                ) : (
                  <div style={{ height: displayStates.length * 64 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayStates} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="state" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip
                          formatter={(v) => [v.toLocaleString(), "Sales"]}
                          contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 11 }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                          {displayStates.map((_, index) => {
                            const ratio = displayStates.length > 1 ? index / (displayStates.length - 1) : 0;
                            const r = Math.round(25 + ratio * 122);
                            const g = Math.round(73 + ratio * 124);
                            const b = Math.round(119 + ratio * 134);
                            return <Cell key={index} fill={`rgb(${r},${g},${b})`} />;
                          })}
                          <LabelList dataKey="count" position="right" fontSize={10} fill="#374151" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section C — Rankings (branded background) */}
          <div className="rounded-lg border bg-gray-50 overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankTable title="Top Selling Partners" rows={topPartners} nameLabel="Partner" />
                <RankTable title="Top Selling Agents" rows={topAgents} nameLabel="Agent" />
              </div>
              {statesWithNoSales.length > 0 && (
                <Card>
                  <CardHeader className="rounded-t-lg text-white py-2 px-4" style={{ backgroundColor: DARK_NAVY }}>
                    <CardTitle className="text-sm font-semibold">
                      States with No Sales ({statesWithNoSales.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {statesWithNoSales.map((state) => (
                        <Badge key={state} variant="outline" className="text-xs py-0.5 px-2 border-red-200 text-red-700 bg-red-50">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Non-super-admin view */
        <div className={(role === "acsl_agent" || role === "partner_agent") ? "" : "rounded-lg border bg-gray-50 overflow-hidden"}>
          {(role !== "acsl_agent" && role !== "partner_agent") && (
            <div className="py-2 px-4 text-white font-semibold text-sm flex items-center justify-between" style={{ backgroundColor: DARK_NAVY }}>
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
                className="flex items-center justify-center gap-2 bg-[#07376a] text-white px-6 py-2.5 rounded-lg hover:bg-[#052a51] transition-colors text-sm font-semibold w-full sm:w-auto shadow-sm"
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
                  const sub = kpi.sub ?? `FY ${year}`;
                  const isActive = activeCard === kpi.key;
                  const isClickable = (role === "partner" || role === "acsl_agent") && !!onCardClick && raw > 0;
                  return isActive ? (
                    <div
                      key={kpi.key}
                      onClick={() => onCardClick(kpi.key)}
                      className={`relative overflow-hidden rounded-lg border-transparent px-4 py-3 shadow-md cursor-pointer transition-all bg-gradient-to-br ${kpi.gradient} ring-2 ring-white/40`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-white tracking-tight leading-tight break-all">{display}</p>
                          <p className="text-xs font-semibold text-white/80 mt-0.5">{kpi.label}</p>
                          <p className="text-xs text-white/60">{sub}</p>
                        </div>
                        <div className="rounded-lg p-2 bg-white/20 text-white shadow-sm shrink-0">
                          <kpi.icon className="h-4 w-4" />
                        </div>
                      </div>
                      <ChevronDown className="absolute bottom-2 right-2 h-3.5 w-3.5 text-white/70" />
                    </div>
                  ) : (
                    <div
                      key={kpi.key}
                      onClick={isClickable ? () => onCardClick(kpi.key) : undefined}
                      className={`relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-all group ${isClickable ? "cursor-pointer hover:shadow-md" : ""}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">{display}</p>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{kpi.label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                        <div className={`rounded-lg p-2 bg-gradient-to-br ${kpi.gradient} text-white shadow-sm shrink-0`}>
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
