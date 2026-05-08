"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FileText,
  ClipboardList,
  Loader2,
} from "lucide-react";

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

const formatCurrency = (value) => {
  const n = value ?? 0;
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
};

const KPI_CONFIG = [
  {
    key: "stovesReceived",
    label: "Stoves Received By Partner(s)",
    partnerLabel: "Stoves Received",
    icon: Package,
    gradient: "from-[#194977] to-[#2563EB]",
  },
  {
    key: "stovesSold",
    label: "Stoves Sold to End Users",
    partnerLabel: "Stoves Sold",
    icon: ShoppingCart,
    gradient: "from-[#0F766E] to-[#14B8A6]",
  },
  {
    key: "availableStoves",
    label: "Available Stoves for sale",
    partnerLabel: "Available Stoves",
    icon: Boxes,
    gradient: "from-[#7C3AED] to-[#A78BFA]",
    sub: "Current inventory",
  },
  {
    key: "expectedReceivable",
    label: "Expected Receivable",
    partnerLabel: "Expected Receivable",
    icon: CreditCard,
    gradient: "from-[#B45309] to-[#F59E0B]",
    currency: true,
  },
  {
    key: "amountReceived",
    label: "Amount Received",
    partnerLabel: "Amount Received",
    icon: Wallet,
    gradient: "from-[#047857] to-[#10B981]",
    currency: true,
  },
  {
    key: "outstandingBalance",
    label: "Outstanding Balance",
    partnerLabel: "Outstanding Balance",
    icon: AlertCircle,
    gradient: "from-[#B91C1C] to-[#F87171]",
    currency: true,
  },
];

/**
 * Unified dashboard visual component shared across all roles.
 *
 * Props:
 *   data         – { stovesReceived, stovesSold, availableStoves, expectedReceivable,
 *                    amountReceived, outstandingBalance,
 *                    byState: [{state, count}],
 *                    salesModelData: [{model, count, percentage}],
 *                    topPartners: [{name, branch, count, percentage}] (super_admin only) }
 *   loading      – boolean
 *   year         – number
 *   onYearChange – (year: number) => void
 *   role         – "super_admin" | "partner" | "acsl_agent"
 */
const DashboardContent = ({ data, loading, year, onYearChange, role = "partner" }) => {
  const router = useRouter();
  const isSuperAdmin = role === "super_admin";

  const byState = data?.byState ?? [];
  const salesModelData = data?.salesModelData ?? [];
  const topPartners = data?.topPartners ?? [];

  const statesWithSales = new Set(byState.map((s) => s.state));
  const statesWithNoSales = NIGERIAN_STATES.filter((s) => !statesWithSales.has(s));

  const [stateLimit, setStateLimit] = React.useState("5");
  const displayStates = stateLimit === "all" ? byState : byState.slice(0, Number(stateLimit));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sales Report Section */}
      <div className="rounded-lg border bg-gray-50 overflow-hidden">
        <div
          className="py-3 px-5 text-white font-semibold text-base flex items-center justify-between"
          style={{ backgroundColor: DARK_NAVY }}
        >
          <span>Sales Report</span>
          <div className="flex items-center gap-2">
            {/* <Link
              href="/sales/financial-reports"
              className="flex items-center gap-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Financial Report
            </Link> */}
            <Link
              href="/sales"
              className="flex items-center gap-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Manage Sales
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="animate-spin h-10 w-10 mx-auto mb-3" style={{ color: DARK_NAVY }} />
                <p className="text-gray-500 text-sm">Loading dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards — 3 per row, 2 rows */}
              {[KPI_CONFIG.slice(0, 3), KPI_CONFIG.slice(3)].map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {row.map((kpi) => {
                    const raw = data?.[kpi.key] ?? 0;
                    const display = kpi.currency ? formatCurrency(raw) : raw.toLocaleString();
                    const sub = kpi.sub ?? `FY ${year}`;
                    return (
                      <div
                        key={kpi.key}
                        className="relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.gradient}`} />
                        <div className="flex items-start justify-between">
                          <div className="mt-1">
                            <p className="text-3xl font-bold text-gray-900 tracking-tight">{display}</p>
                            <p className="text-sm font-semibold text-gray-500 mt-1">{kpi.label}</p>
                            <p className="text-xs text-gray-400">{sub}</p>
                          </div>
                          <div className={`rounded-lg p-2.5 bg-gradient-to-br ${kpi.gradient} text-white shadow-sm`}>
                            <kpi.icon className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales Model Analysis */}
                <Card>
                  <CardHeader
                    className="rounded-t-lg text-white py-3 px-4"
                    style={{ backgroundColor: DARK_NAVY }}
                  >
                    <CardTitle className="text-base font-semibold">Sales Model Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {salesModelData.length === 0 ? (
                      <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                        No sales data for {year}
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={salesModelData}
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
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
                              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                          {salesModelData.map((entry, i) => (
                            <span key={entry.model} className="flex items-center gap-1 text-xs text-gray-600">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
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

                {/* Sales by State */}
                <Card>
                  <CardHeader
                    className="rounded-t-lg text-white py-3 px-4 flex flex-row items-center justify-between"
                    style={{ backgroundColor: DARK_NAVY }}
                  >
                    <CardTitle className="text-base font-semibold">Sales by State</CardTitle>
                    <Select value={stateLimit} onValueChange={setStateLimit}>
                      <SelectTrigger className="w-[90px] h-7 text-xs bg-white/20 border-white/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="15">Top 15</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {displayStates.length === 0 ? (
                      <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                        No state data for {year}
                      </div>
                    ) : (
                      <div style={{ height: Math.max(220, displayStates.length * 38) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={displayStates}
                            layout="vertical"
                            margin={{ top: 0, right: 55, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="state" tick={{ fontSize: 12 }} width={100} />
                            <Tooltip formatter={(v) => [v.toLocaleString(), "Sales"]} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                              {displayStates.map((_, index) => {
                                const ratio = displayStates.length > 1 ? index / (displayStates.length - 1) : 0;
                                const r = Math.round(25 + ratio * 122);
                                const g = Math.round(73 + ratio * 124);
                                const b = Math.round(119 + ratio * 134);
                                return <Cell key={index} fill={`rgb(${r},${g},${b})`} />;
                              })}
                              <LabelList dataKey="count" position="right" fontSize={11} fill="#374151" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Partners table + States with No Sales — super admin only */}
              {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader
                      className="rounded-t-lg text-white py-3 px-4"
                      style={{ backgroundColor: DARK_NAVY }}
                    >
                      <CardTitle className="text-base font-semibold">Top 5 Partners</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-0">
                      <Table>
                        <TableHeader>
                          <TableRow style={{ backgroundColor: "#EFF6FF" }}>
                            <TableHead className="w-10 font-semibold">#</TableHead>
                            <TableHead className="font-semibold">Partner</TableHead>
                            <TableHead className="font-semibold">Branch</TableHead>
                            <TableHead className="text-right font-semibold">Sales</TableHead>
                            <TableHead className="text-right font-semibold">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topPartners.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                                No data available
                              </TableCell>
                            </TableRow>
                          ) : (
                            topPartners.map((p, i) => (
                              <TableRow key={`${p.name}-${i}`} className={i % 2 === 1 ? "bg-blue-50/50" : ""}>
                                <TableCell className="font-medium">{i + 1}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-gray-500">{p.branch || "—"}</TableCell>
                                <TableCell className="text-right">{p.count.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{p.percentage}%</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader
                      className="rounded-t-lg text-white py-3 px-4"
                      style={{ backgroundColor: DARK_NAVY }}
                    >
                      <CardTitle className="text-base font-semibold">States with No Sales</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {statesWithNoSales.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">All states have sales!</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {statesWithNoSales.map((state) => (
                            <Badge
                              key={state}
                              variant="outline"
                              className="text-sm py-1 px-3 border-red-200 text-red-700 bg-red-50"
                            >
                              {state}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// React must be in scope for useState inside the component above
import React from "react";

export default DashboardContent;
