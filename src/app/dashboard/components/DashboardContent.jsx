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
} from "lucide-react";
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
  },
  {
    key: "stovesSold",
    label: "Total Stoves Sold to End Users",
    icon: ShoppingCart,
    gradient: "from-[#0F766E] to-[#14B8A6]",
  },
  {
    key: "availableStoves",
    label: "Available Stoves for Sale to End Users",
    icon: Boxes,
    gradient: "from-[#7C3AED] to-[#A78BFA]",
    sub: "Current inventory",
  },
  {
    key: "expectedReceivable",
    label: "Expected Receivable Amount",
    icon: CreditCard,
    gradient: "from-[#B45309] to-[#F59E0B]",
    currency: true,
  },
  {
    key: "amountReceived",
    label: "Amount Received",
    icon: Wallet,
    gradient: "from-[#047857] to-[#10B981]",
    currency: true,
  },
  {
    key: "outstandingBalance",
    label: "Outstanding Balance",
    icon: AlertCircle,
    gradient: "from-[#B91C1C] to-[#F87171]",
    currency: true,
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

const DashboardContent = ({ data, loading, year, onYearChange, role = "partner", partners = [] }) => {
  const isSuperAdmin = role === "super_admin";

  const byState = data?.byState ?? [];
  const salesModelData = data?.salesModelData ?? [];
  const topPartners = data?.topPartners ?? [];
  const topAgents = data?.topAgents ?? [];

  const statesWithSales = new Set(byState.map((s) => s.state));
  const statesWithNoSales = NIGERIAN_STATES.filter((s) => !statesWithSales.has(s));

  const [stateLimit, setStateLimit] = React.useState("10");
  const displayStates = stateLimit === "all" ? byState : byState.slice(0, Number(stateLimit));

  // Dynamic chart height: 22px per bar + margins, min 180px
  const chartHeight = Math.max(180, displayStates.length * 22 + 10);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        right={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Year:</span>
            <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
              <SelectTrigger className="w-[110px] h-8 text-sm">
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

      {/* Sales Report Section */}
      <div className={(role === "acsl_agent" || role === "partner_agent") ? "" : "rounded-lg border bg-gray-50 overflow-hidden"}>
        {(role !== "acsl_agent" && role !== "partner_agent") && (
          <div
            className="py-2 px-4 text-white font-semibold text-sm flex items-center justify-between"
            style={{ backgroundColor: DARK_NAVY }}
          >
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
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" style={{ color: DARK_NAVY }} />
                <p className="text-gray-500 text-xs">Loading dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              {/* Inventory Reconciliation — same card style as KPI cards */}
              {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#194977] to-[#2563EB]" />
                  <div className="flex items-start justify-between">
                    <div className="mt-0.5 min-w-0 flex-1 pr-2">
                      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">
                        {(data?.stovesReceived ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">Distributed to Partners</p>
                      <p className="text-xs text-gray-400">Synced from Atmosphere</p>
                    </div>
                    <div className="rounded-lg p-2 bg-gradient-to-br from-[#194977] to-[#2563EB] text-white shadow-sm shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0F766E] to-[#14B8A6]" />
                  <div className="flex items-start justify-between">
                    <div className="mt-0.5 min-w-0 flex-1 pr-2">
                      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">
                        {(data?.stovesSold ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">Sold to End Users</p>
                      <p className="text-xs text-gray-400">Partner sales reported</p>
                    </div>
                    <div className="rounded-lg p-2 bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-sm shrink-0">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
                  <div className="flex items-start justify-between">
                    <div className="mt-0.5 min-w-0 flex-1 pr-2">
                      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">
                        {(data?.availableStoves ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">In-Hand with Partners</p>
                      <p className="text-xs text-gray-400">Distributed − Sold</p>
                    </div>
                    <div className="rounded-lg p-2 bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white shadow-sm shrink-0">
                      <Boxes className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div> */}

              {/* KPI Cards — 3 per row, 2 rows */}
              {[KPI_CONFIG.slice(0, 3), KPI_CONFIG.slice(3)].map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {row.map((kpi) => {
                    const raw = data?.[kpi.key] ?? 0;
                    const display = kpi.currency ? formatCurrency(raw) : raw.toLocaleString();
                    const sub = kpi.sub ?? `FY ${year}`;
                    return (
                      <div
                        key={kpi.key}
                        className="relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
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

              {/* My Partners Section — ACSL Agent only (Hide for Partner Agents) */}
              {role === "acsl_agent" && partners && partners.length > 0 && (
                <Card className="mt-4 shadow-none">
                  <CardHeader className="rounded-t-lg text-white py-2 px-4" style={{ backgroundColor: DARK_NAVY }}>
                    <CardTitle className="text-sm font-semibold">My Assigned Partners</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: "#EFF6FF" }}>
                          <TableHead className="w-8 py-2 text-xs font-semibold text-gray-700">#</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-gray-700">Partner Name</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-gray-700">State</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-gray-700">Branch</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-gray-700">Contact Person</TableHead>
                          <TableHead className="py-2 text-xs font-semibold text-gray-700">Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partners.slice(0, 5).map((p, i) => (
                          <TableRow key={p.id} className={i % 2 === 1 ? "bg-blue-50/50" : ""}>
                            <TableCell className="py-2 text-xs font-medium">{i + 1}</TableCell>
                            <TableCell className="py-2 text-xs font-medium">{p.partner_name || "—"}</TableCell>
                            <TableCell className="py-2 text-xs text-gray-600">{p.state || "—"}</TableCell>
                            <TableCell className="py-2 text-xs text-gray-600">{p.branch || "—"}</TableCell>
                            <TableCell className="py-2 text-xs text-gray-600">{p.contact_person || "—"}</TableCell>
                            <TableCell className="py-2 text-xs text-gray-600">{p.contact_phone || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {partners.length > 5 && (
                      <div className="p-3 bg-gray-50/50 border-t flex justify-end">
                        <Link 
                          href="/partners"
                          className="text-xs font-bold text-[#07376a] hover:underline flex items-center gap-1"
                        >
                          View All Partners
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Charts row */}
              {(role !== "acsl_agent" && role !== "partner_agent") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sales Model Analysis */}
                  <Card>
                    <CardHeader
                      className="rounded-t-lg text-white py-2 px-4"
                      style={{ backgroundColor: DARK_NAVY }}
                    >
                      <CardTitle className="text-sm font-semibold">Sales Model Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 pb-3">
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
                                label={({ model, percentage }) =>
                                  `${model}: ${Number(percentage).toFixed(1)}%`
                                }
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
                          <div className="flex flex-wrap gap-2 justify-center">
                            {salesModelData.map((entry, i) => (
                              <span key={entry.model} className="flex items-center gap-1 text-xs text-gray-600">
                                <span
                                  className="inline-block w-2 h-2 rounded-full shrink-0"
                                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                                />
                                {entry.model} ({entry.count.toLocaleString()})
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sales by State — scrollable for all 36 states */}
                  <Card>
                    <CardHeader
                      className="rounded-t-lg text-white py-2 px-4 flex flex-row items-center justify-between"
                      style={{ backgroundColor: DARK_NAVY }}
                    >
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
                    <CardContent className="pt-3 pb-2 px-2">
                      {displayStates.length === 0 ? (
                        <div className="flex items-center justify-center h-[180px] text-gray-400 text-xs">
                          No state data for {year}
                        </div>
                      ) : (
                        <div
                          className="overflow-y-auto"
                          style={{ maxHeight: 300 }}
                        >
                          <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart
                              data={displayStates}
                              layout="vertical"
                              margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
                              barCategoryGap="20%"
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                              <YAxis
                                type="category"
                                dataKey="state"
                                tick={{ fontSize: 10 }}
                                width={90}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                formatter={(v) => [v.toLocaleString(), "Sales"]}
                                contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 11 }}
                              />
                              <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
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
              )}

              {/* Top Partners + Top Agents — super admin only */}
              {isSuperAdmin && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RankTable
                      title="Top Selling Partners"
                      rows={topPartners}
                      nameLabel="Partner"
                    />
                    <RankTable
                      title="Top Selling Agents"
                      rows={topAgents}
                      nameLabel="Agent"
                    />
                  </div>

                  {/* States with No Sales — full width, compact */}
                  {statesWithNoSales.length > 0 && (
                    <Card>
                      <CardHeader
                        className="rounded-t-lg text-white py-2 px-4"
                        style={{ backgroundColor: DARK_NAVY }}
                      >
                        <CardTitle className="text-sm font-semibold">
                          States with No Sales ({statesWithNoSales.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {statesWithNoSales.map((state) => (
                            <Badge
                              key={state}
                              variant="outline"
                              className="text-xs py-0.5 px-2 border-red-200 text-red-700 bg-red-50"
                            >
                              {state}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
