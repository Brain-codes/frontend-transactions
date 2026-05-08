"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  ShoppingCart,
  Users,
  Loader2,
  CreditCard,
  Wallet,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import superAdminDashboardService from "../../services/superAdminDashboardService";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);
const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatNumber = (num) => new Intl.NumberFormat("en-US").format(num ?? 0);

const KpiCard = ({ title, value, icon: Icon, iconBg, iconColor, subtitle }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${iconBg} p-3 rounded-full`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SuperAdminDashboardContent = () => {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchData = async (year) => {
    setLoading(true);
    try {
      const response = await superAdminDashboardService.getDashboardStats({ year });
      if (response.success) setDashboardData(response.data);
      else console.error("Failed to fetch dashboard stats:", response.error);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(selectedYear); }, [selectedYear]);

  const kpis = dashboardData?.kpis ?? {};
  const salesByState = dashboardData?.salesByState ?? [];
  const salesModelData = dashboardData?.salesModelData ?? [];

  return (
    <DashboardLayout currentRoute="dashboard">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 space-y-6">
          {/* Year selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
            <div className="w-36">
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="animate-spin h-10 w-10 mx-auto mb-3 text-brand" />
                <p className="text-gray-500 text-sm">Loading dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Row 1: Stoves */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="Stoves Received by Partners"
                  value={formatNumber(kpis.stovesReceivedByPartners)}
                  subtitle={`Total stoves distributed in ${selectedYear}`}
                  icon={Package}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                />
                <KpiCard
                  title="Stoves Sold to End Users"
                  value={formatNumber(kpis.stovesSoldToEndUsers)}
                  subtitle={`Stoves with sold status in ${selectedYear}`}
                  icon={ShoppingCart}
                  iconBg="bg-green-100"
                  iconColor="text-green-600"
                />
                <KpiCard
                  title="Available Stoves for Sale"
                  value={formatNumber(kpis.availableStoves)}
                  subtitle="Current available inventory"
                  icon={BarChart3}
                  iconBg="bg-purple-100"
                  iconColor="text-purple-600"
                />
              </div>

              {/* KPI Row 2: Financials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="Expected Receivable"
                  value={formatCurrency(kpis.expectedReceivable)}
                  subtitle={`Total value of stoves sold in ${selectedYear}`}
                  icon={CreditCard}
                  iconBg="bg-orange-100"
                  iconColor="text-orange-600"
                />
                <KpiCard
                  title="Amount Received"
                  value={formatCurrency(kpis.amountReceived)}
                  subtitle="Payments collected so far"
                  icon={Wallet}
                  iconBg="bg-emerald-100"
                  iconColor="text-emerald-600"
                />
                <KpiCard
                  title="Outstanding Balance"
                  value={formatCurrency(kpis.outstandingBalance)}
                  subtitle="Remaining to be collected"
                  icon={AlertCircle}
                  iconBg="bg-red-100"
                  iconColor="text-red-600"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Model Analysis */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5 text-brand" />
                      Sales Model Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesModelData.length === 0 ? (
                      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                        No sales data for {selectedYear}
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={salesModelData}
                              cx="50%"
                              cy="50%"
                              outerRadius={95}
                              dataKey="count"
                              nameKey="model"
                              labelLine={false}
                              label={({ model, percentage }) =>
                                `${model}: ${percentage.toFixed(1)}%`
                              }
                            >
                              {salesModelData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [formatNumber(value), "Sales"]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 mt-2 justify-center">
                          {salesModelData.map((entry, index) => (
                            <div key={entry.model} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              {entry.model} ({formatNumber(entry.count)})
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Sales by State */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-brand" />
                      Sales by State
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesByState.length === 0 ? (
                      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                        No state data for {selectedYear}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={salesByState}
                          margin={{ top: 5, right: 20, left: 0, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="state"
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            stroke="#e5e7eb"
                          />
                          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#e5e7eb" />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            formatter={(value) => [formatNumber(value), "Sales"]}
                          />
                          <Bar dataKey="sales" fill="#07376a" name="Sales" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboardContent;
