"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  ShoppingCart,
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight,
  Package,
  FileText,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import superAdminAgentService from "../services/superAdminAgentService";
import salesAdvancedAPIService from "../services/salesAdvancedAPIService";
import ApproveSaleConfirmModal from "./sales/components/ApproveSaleConfirmModal";

interface DashboardStats {
  assignedPartnersCount: number;
  totalSales: number;
  pendingApprovals: number;
  approvedSales: number;
  salesCreatedByMe: number;
}

interface AssignedOrg {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
}

interface SaleRecord {
  id: string;
  contact_person: string | null;
  end_user_name: string | null;
  partner_name: string | null;
  stove_serial_no: string | null;
  created_at: string;
  sales_date: string | null;
  agent_approved: boolean;
  organization_id: string | null;
  amount: number | null;
}

interface PartnerStats extends AssignedOrg {
  total: number;
  approved: number;
  pending: number;
}

function buildChartData(salesInRange: SaleRecord[]) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split("T")[0];
    const daySales = salesInRange.filter((s) => {
      const key = (s.sales_date || s.created_at || "").substring(0, 10);
      return key === dateStr;
    });
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      approved: daySales.filter((s) => s.agent_approved).length,
      pending: daySales.filter((s) => !s.agent_approved).length,
    };
  });
}

function buildPartnerStats(
  partners: AssignedOrg[],
  salesInRange: SaleRecord[]
): PartnerStats[] {
  return partners
    .map((p) => {
      const ps = salesInRange.filter((s) => s.organization_id === p.id);
      return {
        ...p,
        total: ps.length,
        approved: ps.filter((s) => s.agent_approved).length,
        pending: ps.filter((s) => !s.agent_approved).length,
      };
    })
    .sort((a, b) => b.pending - a.pending);
}

const SuperAdminAgentDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesInRange, setSalesInRange] = useState<SaleRecord[]>([]);
  const [pendingQueue, setPendingQueue] = useState<SaleRecord[]>([]);
  const [partners, setPartners] = useState<AssignedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingSale, setApprovingSale] = useState<SaleRecord | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAll = async () => {
      setLoading(true);

      const dateTo = new Date().toISOString().split("T")[0];
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [statsRes, orgsRes, rangeRes, pendingRes] =
        await Promise.allSettled([
          superAdminAgentService.getDashboardStats(),
          superAdminAgentService.getAgentOrganizations(user.id),
          salesAdvancedAPIService.getSalesDataByDateRange(dateFrom, dateTo, {
            limit: 500,
            responseFormat: "format2",
          }),
          salesAdvancedAPIService.getSalesData({
            agentApproved: false,
            limit: 8,
            responseFormat: "format2",
          }),
        ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (orgsRes.status === "fulfilled")
        setPartners(orgsRes.value.data || []);
      if (rangeRes.status === "fulfilled") {
        const d = rangeRes.value as any;
        setSalesInRange(d.data || d.sales || []);
      }
      if (pendingRes.status === "fulfilled") {
        const d = pendingRes.value as any;
        setPendingQueue(d.data || d.sales || []);
      }

      setLoading(false);
    };

    fetchAll();
  }, [user?.id]);

  const handleApproveSuccess = (saleId: string) => {
    setPendingQueue((prev) => prev.filter((s) => s.id !== saleId));
    setStats((prev) =>
      prev
        ? {
            ...prev,
            pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
            approvedSales: prev.approvedSales + 1,
          }
        : prev
    );
    setApprovingSale(null);
  };

  const chartData = buildChartData(salesInRange);
  const partnerStats = buildPartnerStats(partners, salesInRange);

  const approvalRate =
    stats && stats.totalSales > 0
      ? Math.round((stats.approvedSales / stats.totalSales) * 100)
      : 0;

  const donutData = [
    { name: "Approved", value: approvalRate },
    { name: "Remaining", value: Math.max(0, 100 - approvalRate) },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <ProtectedRoute allowedRoles={["acsl_agent", "super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent" title="Dashboard">
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          ) : (
            <>
              {/* ── ZONE 1: Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Sales</p>
                      <p className="text-xl font-bold text-blue-900">
                        {(stats?.totalSales ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-500">all time</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Approved</p>
                      <p className="text-xl font-bold text-green-900">
                        {(stats?.approvedSales ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-500">approved sales</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Pending</p>
                      <p className="text-xl font-bold text-amber-900">
                        {(stats?.pendingApprovals ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-amber-500">need approval</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Approval Rate</p>
                      <p className="text-xl font-bold text-purple-900">
                        {approvalRate}%
                      </p>
                      <p className="text-xs text-purple-500">of total sales</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Partners</p>
                      <p className="text-xl font-bold text-blue-900">
                        {(stats?.assignedPartnersCount ?? partners.length).toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-500">assigned to you</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ZONE 2: Intelligence Row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white shadow-none border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Sales Activity — Last 14 Days
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                      <Area type="monotone" dataKey="approved" name="Approved" stackId="1" stroke="#22c55e" strokeWidth={2} fill="url(#gradApproved)" />
                      <Area type="monotone" dataKey="pending" name="Pending" stackId="1" stroke="#f97316" strokeWidth={2} fill="url(#gradPending)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-1 justify-center">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2 w-4 rounded bg-green-500 inline-block" />Approved</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2 w-4 rounded bg-orange-500 inline-block" />Pending</span>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white shadow-none border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Approval Rate</p>
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="relative w-40 h-40">
                      <PieChart width={160} height={160}>
                        <Pie data={donutData} cx={75} cy={75} innerRadius={50} outerRadius={72} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                          <Cell fill={approvalRate >= 80 ? "#22c55e" : "#f97316"} />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${approvalRate >= 80 ? "text-green-600" : "text-orange-600"}`}>{approvalRate}%</p>
                          <p className="text-xs text-gray-400">of total</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full space-y-2 mt-2 px-4">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600"><CheckCircle className="h-3 w-3 text-green-500" />Approved</span>
                        <span className="text-xs font-semibold text-gray-900">{(stats?.approvedSales ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600"><Clock className="h-3 w-3 text-orange-500" />Pending</span>
                        <span className="text-xs font-semibold text-gray-900">{(stats?.pendingApprovals ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ZONE 3: Partner Scoreboard */}
              {partnerStats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Partner Scoreboard</h2>
                    <span className="text-xs text-gray-400">Last 30 days</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {partnerStats.slice(0, 6).map((p) => (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:border-brand transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.partner_name}</p>
                            {p.branch && <p className="text-xs text-gray-400 mt-0.5">{p.branch}{p.state ? ` · ${p.state}` : ""}</p>}
                          </div>
                          {p.pending > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">{p.pending} pending</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="font-bold text-gray-900">{p.total}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-green-500">Approved</p>
                            <p className="font-bold text-green-700">{p.approved}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-amber-500">Pending</p>
                            <p className="font-bold text-amber-700">{p.pending}</p>
                          </div>
                        </div>
                        <Link href={`/super-admin-agent/sales?org=${p.id}`}>
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs text-brand border-brand/30 hover:bg-brand hover:text-white transition-colors mt-1">
                            View Sales <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {partnerStats.length > 6 && (
                    <Link href="/super-admin-agent/partners" className="text-sm text-brand font-medium flex items-center gap-1 mt-1 hover:underline">
                      View all {partnerStats.length} partners<ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* ── Quick Actions */}
              <div className="flex flex-wrap gap-3">
                {([
                  { label: "View All Sales", href: "/super-admin-agent/sales", Icon: FileText },
                  { label: "Stove IDs", href: "/super-admin-agent/stove-ids", Icon: Package },
                  { label: "My Partners", href: "/super-admin-agent/partners", Icon: Building2 },
                ] as const).map(({ label, href, Icon }) => (
                  <Link key={href} href={href}>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5">
                      <Icon className="h-4 w-4" />{label}<ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                ))}
              </div>

              {/* ── ZONE 4: Pending Approval Queue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Needs Your Approval</h2>
                  <div className="flex items-center gap-3">
                    {pendingQueue.length === 0 ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium"><CheckCircle className="h-4 w-4" />All caught up</span>
                    ) : (
                      <Link href="/super-admin-agent/sales?approval=pending" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                        View all {(stats?.pendingApprovals ?? 0) > 0 ? `${stats!.pendingApprovals} pending` : "pending"}<ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {pendingQueue.length > 0 && (
                  <div className="space-y-0">
                    <div className="bg-blue-50 rounded-t-lg px-4 py-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{pendingQueue.length}</span> pending sales
                      </p>
                      <p className="text-sm font-bold text-green-500">Total Pending: <span className="text-brand">{stats?.pendingApprovals ?? pendingQueue.length}</span></p>
                    </div>
                    <div className="bg-white border-x border-gray-200 overflow-x-auto relative">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-brand hover:bg-brand">
                            <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Customer</TableHead>
                            <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Partner</TableHead>
                            <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Serial No</TableHead>
                            <TableHead className="text-white font-semibold text-xs whitespace-nowrap">Date</TableHead>
                            <TableHead className="text-white font-semibold text-xs whitespace-nowrap text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingQueue.map((sale, index) => (
                            <TableRow key={sale.id} className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-gray-50 text-gray-700`}>
                              <TableCell className="font-medium text-gray-900 text-sm py-2.5">{sale.contact_person || sale.end_user_name || "—"}</TableCell>
                              <TableCell className="text-gray-600 text-sm py-2.5">{sale.partner_name || "—"}</TableCell>
                              <TableCell className="font-mono text-gray-600 text-sm py-2.5">{sale.stove_serial_no || "—"}</TableCell>
                              <TableCell className="text-gray-600 text-sm py-2.5">{formatDate(sale.created_at)}</TableCell>
                              <TableCell className="text-right py-2.5">
                                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs px-3" onClick={() => setApprovingSale(sale)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="border border-t-0 border-gray-200 rounded-b-lg px-4 py-2 bg-white">
                      <p className="text-sm text-gray-500">Showing {pendingQueue.length} most recent pending sales</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {approvingSale && (
          <ApproveSaleConfirmModal sale={approvingSale} onClose={() => setApprovingSale(null)} onSuccess={handleApproveSuccess} />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentDashboard;
