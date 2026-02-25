"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  Key,
  Shield,
  Database,
  Copy,
  Check,
  Users,
  Building2,
  Loader2,
} from "lucide-react";
import adminCredentialsService, {
  Credential,
} from "@/app/services/adminCredentialsService";
import CredentialsTable from "../components/credentials/CredentialsTable";
import ViewCredentialModal from "../components/credentials/ViewCredentialModal";
import ResetPasswordModal from "../components/credentials/ResetPasswordModal";
import { useAuth } from "../../contexts/AuthContext";

interface UserCredential {
  id: string;
  user_id: string;
  partner_name: string | null;
  email: string;
  username: string | null;
  password: string | null;
  role: string;
  created_at: string;
}

const CredentialsPage = () => {
  const { supabase } = useAuth();

  const [activeTab, setActiveTab] = useState<"partners" | "saa" | "super-admins">("partners");

  // ── Partners tab state ──────────────────────────────────────────────────
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [filteredCredentials, setFilteredCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  // ── SAA / Super Admin tab state ─────────────────────────────────────────
  const [saaUsers, setSaaUsers] = useState<UserCredential[]>([]);
  const [superAdminUsers, setSuperAdminUsers] = useState<UserCredential[]>([]);
  const [loadingSaa, setLoadingSaa] = useState(false);
  const [loadingSuperAdmins, setLoadingSuperAdmins] = useState(false);
  const [saaSearch, setSaaSearch] = useState("");
  const [superAdminSearch, setSuperAdminSearch] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── Partner tab effects ─────────────────────────────────────────────────
  useEffect(() => {
    fetchCredentials();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCredentials(credentials);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredCredentials(
        credentials.filter(
          (cred) =>
            cred.partner_id.toLowerCase().includes(term) ||
            cred.partner_name.toLowerCase().includes(term) ||
            (cred.email && cred.email.toLowerCase().includes(term)) ||
            (cred.username && cred.username.toLowerCase().includes(term))
        )
      );
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
        setError(response.error || "Failed to fetch credentials. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
      setError("An unexpected error occurred while fetching credentials");
    } finally {
      setLoading(false);
    }
  };

  // ── User credential fetch helper (calls manage-credentials?role=...) ───
  const fetchUsersByRole = async (
    role: string,
    setUsers: (u: UserCredential[]) => void,
    setLoadingState: (b: boolean) => void
  ) => {
    setLoadingState(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth token");

      const params = new URLSearchParams({ role });
      const response = await fetch(
        `${baseUrl}/functions/v1/manage-credentials?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch credentials");
      setUsers(result.data || []);
    } catch (err) {
      console.error(`Error fetching ${role} credentials:`, err);
    } finally {
      setLoadingState(false);
    }
  };

  const handleTabChange = (tab: "partners" | "saa" | "super-admins") => {
    setActiveTab(tab);
    if (tab === "saa" && saaUsers.length === 0) {
      fetchUsersByRole("super_admin_agent", setSaaUsers, setLoadingSaa);
    }
    if (tab === "super-admins" && superAdminUsers.length === 0) {
      fetchUsersByRole("super_admin", setSuperAdminUsers, setLoadingSuperAdmins);
    }
  };

  // ── Copy to clipboard helper ────────────────────────────────────────────
  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
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
    fetchCredentials();
  };

  const partnerStats = {
    total: credentials.length,
    usernameOnly: credentials.filter((c) => c.is_dummy_email).length,
    emailBased: credentials.filter((c) => !c.is_dummy_email).length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // ── User credentials table (shared for SAA and Super Admin tabs) ────────
  const UserCredentialsTable = ({
    users,
    loadingState,
    search,
  }: {
    users: UserCredential[];
    loadingState: boolean;
    search: string;
  }) => {
    const filtered = search.trim()
      ? users.filter(
          (u) =>
            (u.partner_name || "").toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        )
      : users;

    return (
      <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
        {loadingState && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="animate-spin h-6 w-6 text-brand" />
          </div>
        )}
        <Table>
          <TableHeader className="bg-brand">
            <TableRow className="hover:bg-brand">
              <TableHead className="text-white py-4 first:rounded-tl-lg">Name</TableHead>
              <TableHead className="text-white py-4">Email / Username</TableHead>
              <TableHead className="text-white py-4">Password</TableHead>
              <TableHead className="text-white py-4 last:rounded-tr-lg">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loadingState && filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                  {users.length === 0
                    ? "No credentials found. Create users in User Management to populate this list."
                    : "No users match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u, index) => (
                <TableRow
                  key={u.id}
                  className={`${index % 2 === 0 ? "bg-white" : "bg-brand-light"} hover:bg-gray-50`}
                >
                  <TableCell className="font-medium text-gray-900">
                    {u.partner_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 text-sm">{u.email}</span>
                      <button
                        onClick={() => copyToClipboard(u.email, `email-${u.id}`)}
                        className="text-gray-400 hover:text-brand transition-colors"
                        title="Copy email"
                      >
                        {copiedField === `email-${u.id}` ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.password ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {u.password}
                        </span>
                        <button
                          onClick={() => copyToClipboard(u.password!, `pwd-${u.id}`)}
                          className="text-gray-400 hover:text-brand transition-colors"
                          title="Copy password"
                        >
                          {copiedField === `pwd-${u.id}` ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {formatDate(u.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="admin-credentials"
        title="Credentials Management"
        description="View and manage organization credentials"
      >
        <div className="p-6 space-y-6">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">✓ {successMessage}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-brand-light p-1 gap-1">
            {(
              [
                { key: "partners", label: "Partners", icon: Building2 },
                { key: "saa", label: "Super Admin Agents", icon: Users },
                { key: "super-admins", label: "Super Admins", icon: Shield },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === key
                    ? "bg-brand text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

            {/* ── Partners Tab ─────────────────────────────────────────── */}
            {activeTab === "partners" && (
              <div className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{partnerStats.total}</div>
                      <p className="text-xs text-muted-foreground">Organization credentials</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Username-based</CardTitle>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{partnerStats.usernameOnly}</div>
                      <p className="text-xs text-muted-foreground">Internal username accounts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Email-based</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{partnerStats.emailBased}</div>
                      <p className="text-xs text-muted-foreground">Standard email accounts</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      <Button variant="outline" onClick={fetchCredentials} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    {searchTerm && (
                      <div className="text-sm text-gray-600">
                        Found {filteredCredentials.length} of {credentials.length} credentials
                      </div>
                    )}
                    <CredentialsTable
                      credentials={filteredCredentials}
                      loading={loading}
                      onViewDetails={handleViewDetails}
                      onResetPassword={handleResetPassword}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-blue-900">Super Admin Access Only</h4>
                        <p className="text-xs text-blue-700">
                          This page displays sensitive credential information. Only Super Admins can
                          view and manage organization credentials. When resetting passwords, you will
                          be required to verify your identity with your admin password.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Super Admin Agents Tab ───────────────────────────────── */}
            {activeTab === "saa" && (
              <div className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total SAA Credentials</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{saaUsers.length}</div>
                      <p className="text-xs text-muted-foreground">Super admin agent accounts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">With Password</CardTitle>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {saaUsers.filter((u) => u.password).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Credentials saved</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Super Admin Agent Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or email..."
                          value={saaSearch}
                          onChange={(e) => setSaaSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fetchUsersByRole("super_admin_agent", setSaaUsers, setLoadingSaa)}
                        disabled={loadingSaa}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingSaa ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    <UserCredentialsTable users={saaUsers} loadingState={loadingSaa} search={saaSearch} />
                    <p className="text-xs text-gray-500 mt-2">
                      To reset a user&apos;s password or manage their account, use{" "}
                      <a href="/user-management" className="text-brand underline">User Management</a>.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Super Admins Tab ─────────────────────────────────────── */}
            {activeTab === "super-admins" && (
              <div className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Super Admin Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or email..."
                          value={superAdminSearch}
                          onChange={(e) => setSuperAdminSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fetchUsersByRole("super_admin", setSuperAdminUsers, setLoadingSuperAdmins)}
                        disabled={loadingSuperAdmins}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingSuperAdmins ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    <UserCredentialsTable
                      users={superAdminUsers}
                      loadingState={loadingSuperAdmins}
                      search={superAdminSearch}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
        </div>

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
