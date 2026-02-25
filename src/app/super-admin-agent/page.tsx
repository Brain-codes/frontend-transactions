"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const SuperAdminAgentDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesInRange, setSalesInRange] = useState<SaleRecord[]>([]);
  const [pendingQueue, setPendingQueue] = useState<SaleRecord[]>([]);
  const [partners, setPartners] = useState<AssignedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingSale, setApprovingSale] = useState<SaleRecord | null>(null);

  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.app_metadata?.full_name ||
    user?.email ||
    "";

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
    <ProtectedRoute allowedRoles={["super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here&apos;s an overview of your activity
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          ) : (
            <>
              {/* ── ZONE 1: Stats Cards ────────────────────────────────── */}
              <div className="flex flex-wrap gap-4">
                {/* Total Sales */}
                <Card className="w-fit">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">Total Sales</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(stats?.totalSales ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Approved */}
                <Card className="w-fit">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">Approved</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(stats?.approvedSales ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending */}
                <Card className="w-fit">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-100 p-3 rounded-full flex-shrink-0">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">Pending</p>
                        <div className="flex items-center gap-1.5">
                          {(stats?.pendingApprovals ?? 0) > 0 && (
                            <span className="relative flex h-2 w-2 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
                            </span>
                          )}
                          <p className="text-2xl font-bold text-orange-600">
                            {(stats?.pendingApprovals ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Approval Rate */}
                <Card className="w-fit">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">Approval Rate</p>
                        <p className={`text-2xl font-bold ${approvalRate >= 80 ? "text-green-600" : "text-orange-600"}`}>
                          {approvalRate}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Partners */}
                <Card className="w-fit">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-brand-light p-3 rounded-full flex-shrink-0">
                        <Building2 className="h-6 w-6 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 mb-1 whitespace-nowrap">Partners</p>
                        <p className="text-2xl font-bold text-brand">
                          {(stats?.assignedPartnersCount ?? partners.length).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── ZONE 2: Intelligence Row ───────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Area Chart — 60% width */}
                <Card className="lg:col-span-3 shadow-none border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Sales Activity — Last 14 Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradApproved"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22c55e"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradPending"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f97316"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f97316"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="approved"
                          name="Approved"
                          stackId="1"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#gradApproved)"
                        />
                        <Area
                          type="monotone"
                          dataKey="pending"
                          name="Pending"
                          stackId="1"
                          stroke="#f97316"
                          strokeWidth={2}
                          fill="url(#gradPending)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-1 justify-center">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="h-2 w-4 rounded bg-green-500 inline-block" />
                        Approved
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="h-2 w-4 rounded bg-orange-500 inline-block" />
                        Pending
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Donut — 40% width */}
                <Card className="lg:col-span-2 shadow-none border border-gray-200">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Approval Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center pt-2">
                    <div className="relative w-40 h-40">
                      <PieChart width={160} height={160}>
                        <Pie
                          data={donutData}
                          cx={75}
                          cy={75}
                          innerRadius={50}
                          outerRadius={72}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          <Cell
                            fill={
                              approvalRate >= 80 ? "#22c55e" : "#f97316"
                            }
                          />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p
                            className={`text-2xl font-bold ${
                              approvalRate >= 80
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {approvalRate}%
                          </p>
                          <p className="text-xs text-gray-400">of total</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full space-y-2 mt-2 px-4">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Approved
                        </span>
                        <span className="text-xs font-semibold text-gray-900">
                          {(stats?.approvedSales ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Clock className="h-3 w-3 text-orange-500" />
                          Pending
                        </span>
                        <span className="text-xs font-semibold text-gray-900">
                          {(stats?.pendingApprovals ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── ZONE 3: Partner Scoreboard ─────────────────────────── */}
              {partnerStats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                      Partner Scoreboard
                    </h2>
                    <span className="text-xs text-gray-400">Last 30 days</span>
                  </div>
                  <div className="space-y-2">
                    {partnerStats.slice(0, 5).map((p) => {
                      const pct =
                        p.total > 0
                          ? Math.round((p.approved / p.total) * 100)
                          : 0;
                      return (
                        <div
                          key={p.id}
                          className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3"
                        >
                          <div className="bg-brand-light p-2 rounded-lg flex-shrink-0">
                            <Building2 className="h-4 w-4 text-brand" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <p className="font-medium text-gray-900 text-sm">
                                {p.partner_name}
                              </p>
                              {p.branch && (
                                <span className="text-xs text-gray-400">
                                  · {p.branch}
                                </span>
                              )}
                              {p.pending > 0 && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                                  {p.pending} pending
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {p.total} sales
                              </span>
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-brand hover:text-brand/80 flex-shrink-0 h-7 text-xs px-2"
                          >
                            <Link
                              href={`/super-admin-agent/sales?org=${p.id}`}
                            >
                              View
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {partnerStats.length > 5 && (
                    <Link
                      href="/super-admin-agent/partners"
                      className="text-sm text-brand font-medium flex items-center gap-1 mt-1 hover:underline"
                    >
                      View all {partnerStats.length} partners
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* ── Quick Actions ──────────────────────────────────────── */}
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    { label: "View All Sales", href: "/super-admin-agent/sales", Icon: FileText },
                    { label: "Stove IDs", href: "/super-admin-agent/stove-ids", Icon: Package },
                    { label: "My Partners", href: "/super-admin-agent/partners", Icon: Building2 },
                  ] as const
                ).map(({ label, href, Icon }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-brand hover:text-brand transition-colors cursor-pointer">
                      <Icon className="h-4 w-4" />
                      {label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* ── ZONE 4: Pending Approval Queue ────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">
                    Needs Your Approval
                  </h2>
                  <div className="flex items-center gap-3">
                    {pendingQueue.length === 0 ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        All caught up
                      </span>
                    ) : (
                      <Link
                        href="/super-admin-agent/sales?approval=pending"
                        className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        View all{" "}
                        {(stats?.pendingApprovals ?? 0) > 0
                          ? `${stats!.pendingApprovals} pending`
                          : "pending"}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {pendingQueue.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-brand">
                        <TableRow className="hover:bg-brand">
                          <TableHead className="text-white py-3 text-xs">
                            Customer
                          </TableHead>
                          <TableHead className="text-white py-3 text-xs">
                            Partner
                          </TableHead>
                          <TableHead className="text-white py-3 text-xs">
                            Serial No
                          </TableHead>
                          <TableHead className="text-white py-3 text-xs">
                            Date
                          </TableHead>
                          <TableHead className="text-white py-3 text-xs text-right">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingQueue.map((sale, index) => (
                          <TableRow
                            key={sale.id}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-brand-light"
                            }
                          >
                            <TableCell className="font-medium text-gray-900 text-sm py-2.5">
                              {sale.contact_person ||
                                sale.end_user_name ||
                                "—"}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm py-2.5">
                              {sale.partner_name || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-gray-600 text-sm py-2.5">
                              {sale.stove_serial_no || "—"}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm py-2.5">
                              {formatDate(sale.created_at)}
                            </TableCell>
                            <TableCell className="text-right py-2.5">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
                                onClick={() => setApprovingSale(sale)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Approve Modal */}
        {approvingSale && (
          <ApproveSaleConfirmModal
            sale={approvingSale}
            onClose={() => setApprovingSale(null)}
            onSuccess={handleApproveSuccess}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentDashboard;
