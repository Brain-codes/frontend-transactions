"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Key, Shield, Database } from "lucide-react";
import adminCredentialsService, {
  Credential,
} from "@/app/services/adminCredentialsService";
import CredentialsTable from "../components/credentials/CredentialsTable";
import ViewCredentialModal from "../components/credentials/ViewCredentialModal";
import ResetPasswordModal from "../components/credentials/ResetPasswordModal";

const CredentialsPage = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [filteredCredentials, setFilteredCredentials] = useState<Credential[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] =
    useState<Credential | null>(null);

  // Fetch credentials on mount
  useEffect(() => {
    fetchCredentials();
  }, []);

  // Filter credentials when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCredentials(credentials);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = credentials.filter(
        (cred) =>
          cred.partner_id.toLowerCase().includes(term) ||
          cred.partner_name.toLowerCase().includes(term) ||
          cred.email.toLowerCase().includes(term)
      );
      setFilteredCredentials(filtered);
    }
  }, [searchTerm, credentials]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminCredentialsService.getAllCredentials();

      if (response.success && response.data) {
        setCredentials(response.data);
        setFilteredCredentials(response.data);
      } else {
        setError(
          response.error || "Failed to fetch credentials. Please try again."
        );
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
      setError("An unexpected error occurred while fetching credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (credential: Credential) => {
    setSelectedCredential(credential);
    setViewModalOpen(true);
  };

  const handleResetPassword = (credential: Credential) => {
    setSelectedCredential(credential);
    setResetModalOpen(true);
  };

  const handleResetSuccess = () => {
    setSuccessMessage("Password reset successfully!");
    setTimeout(() => setSuccessMessage(""), 5000);
    fetchCredentials(); // Refresh the list
  };

  const handleRefresh = () => {
    fetchCredentials();
  };

  // Calculate stats
  const stats = {
    total: credentials.length,
    usernameOnly: credentials.filter((c) => c.is_dummy_email).length,
    emailBased: credentials.filter((c) => !c.is_dummy_email).length,
  };

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="admin-credentials"
        title="Credentials Management"
        description="View and manage organization credentials"
      >
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">✓ {successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Credentials
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Organization credentials
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Username-based
                </CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.usernameOnly}</div>
                <p className="text-xs text-muted-foreground">
                  Internal username accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Email-based
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.emailBased}</div>
                <p className="text-xs text-muted-foreground">
                  Standard email accounts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Card with Table */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Partner ID, Name, or Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>

              {/* Results count */}
              {searchTerm && (
                <div className="text-sm text-gray-600">
                  Found {filteredCredentials.length} of {credentials.length}{" "}
                  credentials
                </div>
              )}

              {/* Table */}
              <CredentialsTable
                credentials={filteredCredentials}
                loading={loading}
                onViewDetails={handleViewDetails}
                onResetPassword={handleResetPassword}
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-blue-900">
                    Super Admin Access Only
                  </h4>
                  <p className="text-xs text-blue-700">
                    This page displays sensitive credential information. Only
                    Super Admins can view and manage organization credentials.
                    When resetting passwords, you will be required to verify
                    your identity with your admin password.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <ViewCredentialModal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          credential={selectedCredential}
        />

        <ResetPasswordModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          credential={selectedCredential}
          onSuccess={handleResetSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CredentialsPage;
