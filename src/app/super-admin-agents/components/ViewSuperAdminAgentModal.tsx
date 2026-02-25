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
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  assigned_organizations_count: number;
}

interface AssignedOrg {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
  assigned_at: string;
}

interface ViewSuperAdminAgentModalProps {
  agent: Agent;
  onClose: () => void;
}

const ViewSuperAdminAgentModal: React.FC<ViewSuperAdminAgentModalProps> = ({
  agent,
  onClose,
}) => {
  const [orgs, setOrgs] = useState<AssignedOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState("");

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setOrgsLoading(true);
        setOrgsError("");
        const result = await superAdminAgentService.getAgentOrganizations(
          agent.id
        );
        setOrgs(result.data || []);
      } catch (err: any) {
        setOrgsError(err.message || "Failed to load organizations");
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrgs();
  }, [agent.id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Agent Details
          </DialogTitle>
          <DialogDescription>
            View super admin agent profile and assigned organizations.
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
                {agent.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  Super Admin Agent
                </Badge>
                <Badge
                  className={
                    agent.status === "active"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }
                >
                  {agent.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact & Info */}
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
                    <p className="text-sm text-gray-600">{agent.email}</p>
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
                    <p className="text-sm font-medium text-gray-900">
                      Created
                    </p>
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
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Agent ID</p>
                    <p className="text-sm text-gray-600 font-mono break-all">
                      {agent.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Assigned Partners
                    </p>
                    <p className="text-sm text-gray-600">
                      {agent.assigned_organizations_count ?? 0} organization
                      {(agent.assigned_organizations_count ?? 0) !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Organizations */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 border-b pb-2">
              Assigned Organizations
            </h4>
            {orgsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading organizations...
                </span>
              </div>
            ) : orgsError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700 text-sm">{orgsError}</span>
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No organizations assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {orgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 bg-brand-light rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {org.partner_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[org.branch, org.state].filter(Boolean).join(" · ") ||
                          "No branch/state info"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Assigned {formatDate(org.assigned_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSuperAdminAgentModal;
