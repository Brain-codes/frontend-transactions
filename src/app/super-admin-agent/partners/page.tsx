"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import superAdminAgentService from "../../services/superAdminAgentService";
import { useAuth } from "../../contexts/AuthContext";

interface AssignedOrg {
  id: string;
  partner_name: string;
  branch: string | null;
  state: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  email?: string | null;
  assignment_id: string;
  assigned_at: string;
}

const SuperAdminAgentPartnersPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<AssignedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <ProtectedRoute allowedRoles={["super_admin_agent"]}>
      <DashboardLayout currentRoute="super-admin-agent-partners">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Partners</h1>
            <p className="text-sm text-gray-500 mt-1">
              Partner organizations assigned to you for monitoring and sales
              management.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <Loader2 className="animate-spin h-8 w-8 mb-2 text-brand" />
                <p className="text-sm text-gray-600">Loading partners...</p>
              </div>
            )}

            <Table>
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand">
                  <TableHead className="text-white py-4 first:rounded-tl-lg">
                    Partner Name
                  </TableHead>
                  <TableHead className="text-white py-4">Branch</TableHead>
                  <TableHead className="text-white py-4">State</TableHead>
                  <TableHead className="text-white py-4">
                    Contact Person
                  </TableHead>
                  <TableHead className="text-white py-4">Phone</TableHead>
                  <TableHead className="text-white py-4">Assigned At</TableHead>
                  <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && orgs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-gray-300" />
                        <p>No partner organizations assigned yet.</p>
                        <p className="text-xs">
                          Contact your super admin to get assigned to partners.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orgs.map((org, index) => (
                    <TableRow
                      key={org.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-brand-light"
                      } hover:bg-gray-50`}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {org.partner_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {org.branch || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {org.state || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {org.contact_person || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {org.contact_phone || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDate(org.assigned_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          className="bg-brand hover:bg-brand/90 text-white text-xs"
                          onClick={() =>
                            router.push(
                              `/super-admin-agent/sales?org=${org.id}`
                            )
                          }
                        >
                          View Sales
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SuperAdminAgentPartnersPage;
