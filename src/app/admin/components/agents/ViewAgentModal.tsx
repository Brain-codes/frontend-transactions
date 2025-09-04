"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building,
  Loader2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { SalesAgent } from "@/types/salesAgent";
import adminAgentService from "../../../services/adminAgentService.jsx";

interface ViewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: SalesAgent | null;
  onEdit?: (agent: SalesAgent) => void;
  onViewPerformance?: (agent: SalesAgent) => void;
}

interface AgentStats {
  totalSales: number;
  totalAmount: number;
  avgSaleAmount: number;
  statusBreakdown: Record<string, number>;
}

const ViewAgentModal: React.FC<ViewAgentModalProps> = ({
  isOpen,
  onClose,
  agent,
  onEdit,
  onViewPerformance,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [statsError, setStatsError] = useState<string>("");

  useEffect(() => {
    if (agent && isOpen) {
      fetchAgentStats();
    }
  }, [agent, isOpen]);

  const fetchAgentStats = async () => {
    if (!agent) return;

    try {
      setLoading(true);
      setStatsError("");

      const response = await adminAgentService.getAgentStats(agent.id);

      if (response.success) {
        setStats(response.data);
      } else {
        setStatsError(response.error || "Failed to load agent statistics");
      }
    } catch (err) {
      console.error("Error fetching agent stats:", err);
      setStatsError("Unable to load agent statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      admin: "bg-blue-100 text-blue-800 border-blue-200",
      agent: "bg-green-100 text-green-800 border-green-200",
      super_admin: "bg-purple-100 text-purple-800 border-purple-200",
    };

    return (
      <Badge
        className={
          roleStyles[role] || "bg-gray-100 text-gray-800 border-gray-200"
        }
      >
        {role?.replace("_", " ").toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  const getPasswordStatusBadge = (hasChanged: boolean | undefined) => {
    return hasChanged ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <Shield className="h-3 w-3 mr-1" />
        Password Changed
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Shield className="h-3 w-3 mr-1" />
        Default Password
      </Badge>
    );
  };

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Agent Details
          </DialogTitle>
          <DialogDescription>
            View comprehensive information about this sales agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xl">
                {agent.full_name?.charAt(0)?.toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {agent.full_name || "N/A"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge(agent.role)}
                {getPasswordStatusBadge(agent.has_changed_password)}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b pb-2">
                Contact Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">
                      {agent.email || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">
                      {agent.phone || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Joined</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(agent.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b pb-2">
                System Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Agent ID
                    </p>
                    <p className="text-sm text-gray-600 font-mono">
                      {agent.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Organization ID
                    </p>
                    <p className="text-sm text-gray-600 font-mono">
                      {agent.organization_id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Statistics */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">
              Performance Overview
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading statistics...</p>
                </div>
              </div>
            ) : statsError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700 text-sm">{statsError}</span>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Total Sales
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.totalSales}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">
                    Avg Sale Amount
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(stats.avgSaleAmount)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {onViewPerformance && (
                <Button
                  variant="outline"
                  onClick={() => onViewPerformance(agent)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Performance
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(agent)}
                  className="bg-gray-50 hover:bg-gray-100"
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Agent
                </Button>
              )}
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAgentModal;
