"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useToastNotification } from "../contexts/ToastContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Building2,
  Shield,
  Key,
  Edit,
  Save,
  X,
  Loader2,
  AlertCircle,
  Phone,
  MapPin,
} from "lucide-react";
import manageProfileService from "../services/manageProfileService";
import ChangePasswordModal from "./components/ChangePasswordModal";

interface ProfileData {
  profile: {
    id: string;
    full_name: string;
    email: string;
    username: string;
    role: string;
    organization_id: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    partner_id: string;
    partner_name: string;
    email?: string;
    contact_person?: string;
    contact_phone?: string;
    alternative_phone?: string;
    address?: string;
    state?: string;
    branch?: string;
    created_at?: string;
    stove_ids?: Array<{
      id: string;
      stove_id: string;
      status: string;
      organization_id: string;
    }>;
  } | null;
  credential_info?: {
    partner_id: string;
    partner_name: string;
    role: string;
    is_dummy_email: boolean;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();
  const { toast } = useToastNotification();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple pagination for stoves
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Show 10 stoves per page

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await manageProfileService.getProfile();

      if (response.success && response.data) {
        setProfileData(response.data);
        // Initialize form data
        setFormData({
          username: response.data.profile.username || "",
          email: response.data.profile.email || "",
          currentPassword: "",
        });
      } else {
        setError(response.error || "Failed to load profile");
        toast.error("Error", response.error || "Failed to load profile");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
      toast.error("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - reset form
      if (profileData) {
        setFormData({
          username: profileData.profile.username || "",
          email: profileData.profile.email || "",
          currentPassword: "",
        });
      }
      setFormErrors({});
    }
    setEditMode(!editMode);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    // Check if anything changed
    const hasChanges =
      formData.username !== profileData?.profile.username ||
      formData.email !== profileData?.profile.email;

    if (!hasChanges) {
      errors.general = "No changes detected";
    }

    if (hasChanges && !formData.currentPassword.trim()) {
      errors.currentPassword =
        "Current password is required to update your profile";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogoutAfterUpdate = async () => {
    // Wait 2 seconds to show success message
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.info("Logging out", "Please log in again with your new credentials");

    // Wait 1 more second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Sign out and redirect to login
    await signOut();
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    setUpdateLoading(true);
    setError(null);

    try {
      const updates: {
        currentPassword: string;
        newUsername?: string;
        newEmail?: string;
      } = {
        currentPassword: formData.currentPassword,
      };

      if (formData.username !== profileData?.profile.username) {
        updates.newUsername = formData.username;
      }
      if (formData.email !== profileData?.profile.email) {
        updates.newEmail = formData.email;
      }

      const response = await manageProfileService.updateProfile(updates);

      if (response.success) {
        const updatedFields = response.data?.join(", ") || "profile";

        toast.success(
          "Profile Updated",
          `Successfully updated: ${updatedFields}`,
        );

        setEditMode(false);
        setFormData((prev) => ({ ...prev, currentPassword: "" }));

        // Auto-logout after updating sensitive data
        await handleLogoutAfterUpdate();
      } else {
        setFormErrors({
          general: response.error || "Failed to update profile",
        });
        toast.error(
          "Update Failed",
          response.error || "Failed to update profile",
        );
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setFormErrors({ general: errorMsg });
      toast.error("Error", errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePasswordChangeSuccess = async () => {
    toast.success(
      "Password Updated",
      "Your password has been changed successfully",
    );

    // Auto-logout after password change
    await handleLogoutAfterUpdate();
  };

  // Simple pagination for stove IDs
  const getPaginatedStoves = () => {
    if (!profileData?.organization?.stove_ids) return [];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return profileData.organization.stove_ids.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(
    (profileData?.organization?.stove_ids?.length || 0) / itemsPerPage,
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout currentRoute="profile">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#07376a]" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error && !profileData) {
    return (
      <ProtectedRoute>
        <DashboardLayout currentRoute="profile">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-600 font-medium">
                  Failed to load profile
                </p>
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  onClick={fetchProfile}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const profile = profileData?.profile;
  const organization = profileData?.organization;

  return (
    <ProtectedRoute>
      <DashboardLayout
        currentRoute="profile"
        title="My Profile"
        description="View and manage your profile information"
      >
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your personal account details</CardDescription>
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      disabled={updateLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={updateLoading}
                      className="bg-[#07376a] hover:bg-[#07376a]/90"
                    >
                      {updateLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* General Error */}
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  {editMode ? (
                    <>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          handleChange("username", e.target.value)
                        }
                        className={formErrors.username ? "border-red-500" : ""}
                        disabled={updateLoading}
                      />
                      {formErrors.username && (
                        <p className="text-sm text-red-600">
                          {formErrors.username}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 font-medium py-2">
                      {profile?.username}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  {editMode ? (
                    <>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={formErrors.email ? "border-red-500" : ""}
                        disabled={updateLoading}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-600">
                          {formErrors.email}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 font-medium py-2">
                      {profile?.email}
                    </p>
                  )}
                </div>

                {/* Full Name (Read-only) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <p className="text-gray-900 font-medium py-2">
                    {profile?.full_name || "N/A"}
                  </p>
                </div>

                {/* Role (Read-only) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </Label>
                  <div className="py-2">
                    <Badge
                      variant={
                        profile?.role === "super_admin"
                          ? "default"
                          : profile?.role === "admin"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-sm"
                    >
                      {profile?.role === "super_admin"
                        ? "Super Admin"
                        : profile?.role === "admin"
                          ? "Admin"
                          : profile?.role === "agent"
                            ? "Agent"
                            : profile?.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Current Password (shown in edit mode) */}
              {editMode && (
                <div className="space-y-2 pt-4 border-t">
                  <Label
                    htmlFor="currentPassword"
                    className="flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Current Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) =>
                      handleChange("currentPassword", e.target.value)
                    }
                    placeholder="Enter your current password to confirm changes"
                    className={
                      formErrors.currentPassword ? "border-red-500" : ""
                    }
                    disabled={updateLoading}
                  />
                  {formErrors.currentPassword && (
                    <p className="text-sm text-red-600">
                      {formErrors.currentPassword}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Required to verify your identity before updating
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Information Card */}
          {organization && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Information
                </CardTitle>
                <CardDescription>
                  Your organization details (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Partner Name */}
                  <div className="space-y-2">
                    <Label>Partner Name</Label>
                    <p className="text-gray-900 font-medium">
                      {organization.partner_name}
                    </p>
                  </div>

                  {/* Partner ID */}
                  <div className="space-y-2">
                    <Label>Partner ID</Label>
                    <p className="text-gray-900 font-medium">
                      {organization.partner_id}
                    </p>
                  </div>

                  {/* Branch */}
                  {organization.branch && (
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <p className="text-gray-900 font-medium">
                        {organization.branch}
                      </p>
                    </div>
                  )}

                  {/* Show additional details for admins */}
                  {(isAdmin || isSuperAdmin) && (
                    <>
                      {organization.email && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Organization Email
                          </Label>
                          <p className="text-gray-900 font-medium">
                            {organization.email}
                          </p>
                        </div>
                      )}

                      {organization.contact_person && (
                        <div className="space-y-2">
                          <Label>Contact Person</Label>
                          <p className="text-gray-900 font-medium">
                            {organization.contact_person}
                          </p>
                        </div>
                      )}

                      {organization.contact_phone && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Contact Phone
                          </Label>
                          <p className="text-gray-900 font-medium">
                            {organization.contact_phone}
                          </p>
                        </div>
                      )}

                      {organization.alternative_phone && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Alternative Phone
                          </Label>
                          <p className="text-gray-900 font-medium">
                            {organization.alternative_phone}
                          </p>
                        </div>
                      )}

                      {organization.state && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            State
                          </Label>
                          <p className="text-gray-900 font-medium">
                            {organization.state}
                          </p>
                        </div>
                      )}

                      {organization.address && (
                        <div className="space-y-2 md:col-span-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Address
                          </Label>
                          <p className="text-gray-900 font-medium">
                            {organization.address}
                          </p>
                        </div>
                      )}

                      {/* Assigned Stoves */}
                      {organization.stove_ids &&
                        organization.stove_ids.length > 0 && (
                          <div className="space-y-2 md:col-span-2">
                            <Label>
                              Assigned Stoves ({organization.stove_ids.length})
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {getPaginatedStoves().map((stove) => (
                                <Badge
                                  key={stove.id}
                                  variant="outline"
                                  className="text-sm"
                                >
                                  {stove.stove_id} ({stove.status})
                                </Badge>
                              ))}
                            </div>

                            {/* Simple Pagination */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between pt-3 border-t">
                                <div className="text-sm text-gray-600">
                                  Showing {(currentPage - 1) * itemsPerPage + 1}{" "}
                                  to{" "}
                                  {Math.min(
                                    currentPage * itemsPerPage,
                                    organization.stove_ids.length,
                                  )}{" "}
                                  of {organization.stove_ids.length}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() =>
                                      setCurrentPage((prev) =>
                                        Math.max(1, prev - 1),
                                      )
                                    }
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Previous
                                  </Button>
                                  <span className="flex items-center px-3 text-sm">
                                    Page {currentPage} of {totalPages}
                                  </span>
                                  <Button
                                    onClick={() =>
                                      setCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1),
                                      )
                                    }
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">
                      Change your account password
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
