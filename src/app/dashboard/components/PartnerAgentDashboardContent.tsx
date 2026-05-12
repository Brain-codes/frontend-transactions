"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../contexts/AuthContext";
import adminSalesService from "../../services/adminSalesService";
import {
  ShoppingCart,
  CreditCard,
  Wallet,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DARK_NAVY = "#194977";

const formatCurrency = (value: number) =>
  `₦${Math.round(value ?? 0).toLocaleString()}`;

interface KPI {
  label: string;
  value: string;
  sub: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PartnerAgentDashboardContent = () => {
  const { user } = useAuth() as any;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const result = await (adminSalesService as any).getFinancialReportSales({
          limit: 5000,
          createdBy: user.id,
        });
        const sales: any[] = result.data || [];

        const stovesSold = sales.length;
        const totalAmount = sales.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        const amountCollected = sales.reduce((s: number, r: any) => s + (Number(r.total_paid) || 0), 0);
        const outstanding = totalAmount - amountCollected;

        setKpis([
          {
            label: "Total Stoves Sold",
            value: stovesSold.toLocaleString(),
            sub: "All time",
            gradient: "from-[#0F766E] to-[#14B8A6]",
            icon: ShoppingCart,
          },
          {
            label: "Total Amount",
            value: formatCurrency(totalAmount),
            sub: "Expected receivable",
            gradient: "from-[#194977] to-[#2563EB]",
            icon: CreditCard,
          },
          {
            label: "Amount Collected",
            value: formatCurrency(amountCollected),
            sub: "Total received",
            gradient: "from-[#047857] to-[#10B981]",
            icon: Wallet,
          },
          {
            label: "Outstanding Balance",
            value: formatCurrency(outstanding),
            sub: "Pending collection",
            gradient: "from-[#B91C1C] to-[#F87171]",
            icon: AlertCircle,
          },
        ]);
      } catch (err) {
        console.error("Partner agent dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  return (
    <DashboardLayout currentRoute="dashboard">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1.5"
              onClick={() => router.push("/admin/sales/create")}
            >
              <Plus className="h-4 w-4" />
              Sell Stove
            </Button>
          </div>

          {/* KPI section */}
          <div className="rounded-lg border bg-gray-50 overflow-hidden">
            <div
              className="py-2 px-4 text-white font-semibold text-sm flex items-center justify-between"
              style={{ backgroundColor: DARK_NAVY }}
            >
              <span>My Sales Summary</span>
              <Link
                href="/sales"
                className="flex items-center gap-1 bg-white/10 border border-white/30 text-white hover:bg-white/20 text-xs px-2.5 py-1 rounded-md transition-colors"
              >
                <ShoppingCart className="h-3 w-3" />
                View Sales
              </Link>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Loader2
                      className="animate-spin h-8 w-8 mx-auto mb-2"
                      style={{ color: DARK_NAVY }}
                    />
                    <p className="text-gray-500 text-xs">Loading…</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="relative overflow-hidden rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.gradient}`}
                      />
                      <div className="flex items-start justify-between">
                        <div className="mt-0.5 min-w-0 flex-1 pr-2">
                          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight break-all">
                            {kpi.value}
                          </p>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">
                            {kpi.label}
                          </p>
                          <p className="text-xs text-gray-400">{kpi.sub}</p>
                        </div>
                        <div
                          className={`rounded-lg p-2 bg-gradient-to-br ${kpi.gradient} text-white shadow-sm shrink-0`}
                        >
                          <kpi.icon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PartnerAgentDashboardContent;
