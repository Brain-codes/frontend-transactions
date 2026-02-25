"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, Loader2, ArrowRight } from "lucide-react";
import superAdminAgentService from "../../../services/superAdminAgentService";
import { useAuth } from "../../../contexts/AuthContext";

interface AssignedOrg {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
}

interface AgentCreateSaleModalProps {
  onClose: () => void;
}

const AgentCreateSaleModal: React.FC<AgentCreateSaleModalProps> = ({
  onClose,
}) => {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<AssignedOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const result = await superAdminAgentService.getAgentOrganizations(
          user.id
        );
        setOrgs(result.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load assigned partners");
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, [user?.id]);

  const handleContinueClick = () => {
    // Store the selected org ID so CreateSalesForm can read it
    if (selectedOrgId) {
      sessionStorage.setItem("saa_selected_org_id", selectedOrgId);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Sale
          </DialogTitle>
          <DialogDescription>
            Select the partner organization you want to create a sale for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
              <span className="ml-2 text-sm text-gray-600">
                Loading partners...
              </span>
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No partner organizations assigned yet.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="saleOrgSelect">Partner Organization *</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger id="saleOrgSelect">
                  <SelectValue placeholder="Select a partner organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.partner_name}
                      {org.branch ? ` — ${org.branch}` : ""}
                      {org.state ? ` (${org.state})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button asChild disabled={!selectedOrgId || loading} className="bg-brand hover:bg-brand/90 text-white">
              <Link
                href="/super-admin-agent/sales/create"
                onClick={handleContinueClick}
              >
                Continue to Form
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentCreateSaleModal;
