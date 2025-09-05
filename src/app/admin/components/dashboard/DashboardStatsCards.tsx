import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, CheckCircle2, Banknote } from "lucide-react";
import type { DashboardStats } from "@/types/dashboard";

interface DashboardStatsCardsProps {
  data: DashboardStats;
  formatCurrency: (amount: number) => string;
}

const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
  data,
  formatCurrency,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Total Sales
        </CardTitle>
        <ShoppingCart className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {data.totalSales}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Total transactions recorded
        </p>
      </CardContent>
    </Card>
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Sales Agents
        </CardTitle>
        <Users className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {data.salesAgents}
        </div>
        <p className="text-xs text-gray-600 mt-1">Active team members</p>
      </CardContent>
    </Card>
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Completed Sales
        </CardTitle>
        <CheckCircle2 className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {data.completedSales}
        </div>
        <p className="text-xs text-gray-600 mt-1">Successfully processed</p>
      </CardContent>
    </Card>
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Total Revenue
        </CardTitle>
        <Banknote className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(data.totalSalesAmount)}
        </div>
        <p className="text-xs text-gray-600 mt-1">Revenue generated</p>
      </CardContent>
    </Card>
  </div>
);

export default DashboardStatsCards;
