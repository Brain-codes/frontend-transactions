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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Save,
  Loader2,
  Search,
  X,
  Building2,
  Check,
} from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import organizationsService from "../../services/organizationsService";

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

interface Organization {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
}

interface AssignOrganizationsModalProps {
  agent: Agent;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignOrganizationsModal: React.FC<AssignOrganizationsModalProps> = ({
  agent,
  onClose,
  onSuccess,
}) => {
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch all organizations and current assignments in parallel
        const [orgsResult, assignedResult] = await Promise.all([
          organizationsService.getAllOrganizations(),
          superAdminAgentService.getAgentOrganizations(agent.id),
        ]);

        setAllOrgs(orgsResult.data || []);
        const currentIds = new Set<string>(
          (assignedResult.data || []).map((o: any) => o.id as string)
        );
        setSelectedIds(currentIds);
      } catch (err: any) {
        setError(err.message || "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agent.id]);

  const filtered = allOrgs.filter((org) => {
    const q = searchTerm.toLowerCase();
    return (
      org.partner_name.toLowerCase().includes(q) ||
      (org.branch || "").toLowerCase().includes(q) ||
      (org.state || "").toLowerCase().includes(q)
    );
  });

  const toggleOrg = (orgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      await superAdminAgentService.setAgentOrganizations(
        agent.id,
        Array.from(selectedIds)
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assign Partner Organizations
          </DialogTitle>
          <DialogDescription>
            Select the organizations that{" "}
            <span className="font-medium">{agent.full_name}</span> can monitor
            and manage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Selected count */}
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-brand">
                {selectedIds.size}
              </span>{" "}
              organization{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-500 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Organization list */}
          <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading organizations...
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {searchTerm
                  ? "No organizations match your search."
                  : "No organizations found."}
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((org) => {
                  const isSelected = selectedIds.has(org.id);
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => toggleOrg(org.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-brand border-brand"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {org.partner_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {[org.branch, org.state].filter(Boolean).join(" · ") ||
                            "No branch/state info"}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs flex-shrink-0">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2 flex-shrink-0 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-brand hover:bg-brand-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignOrganizationsModal;
