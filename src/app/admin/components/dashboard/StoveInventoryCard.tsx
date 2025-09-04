import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import type { DashboardStats } from "@/types/dashboard";

interface StoveInventoryCardProps {
  data: DashboardStats;
  getStoveProgressPercentage: () => number;
}

const StoveInventoryCard: React.FC<StoveInventoryCardProps> = ({
  data,
  getStoveProgressPercentage,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Package className="h-5 w-5 text-blue-600" />
        Stove Inventory Status
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between text-sm text-gray-600">
        <span>
          Progress: {data.totalStovesSold} of {data.totalStovesReceived} stoves
          sold
        </span>
        <span>{getStoveProgressPercentage()}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${getStoveProgressPercentage()}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900">
            {data.totalStovesReceived}
          </div>
          <div className="text-gray-600">Received</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-blue-600">
            {data.totalStovesSold}
          </div>
          <div className="text-gray-600">Sold</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-green-600">
            {data.totalStovesAvailable}
          </div>
          <div className="text-gray-600">Available</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default StoveInventoryCard;
