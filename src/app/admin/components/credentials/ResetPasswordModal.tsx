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
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import adminCredentialsService, {
  Credential,
} from "@/app/services/adminCredentialsService";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
  onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  credential,
  onSuccess,
}) => {
  const [adminPassword, setAdminPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get current admin email when modal opens
    const fetchAdminEmail = async () => {
      const email = await adminCredentialsService.getCurrentUserEmail();
      if (email) {
        setAdminEmail(email);
      }
    };

    if (isOpen) {
      fetchAdminEmail();
      // Reset form when modal opens
      setAdminPassword("");
      setNewPassword("");
      setError("");
      setGeneratedPassword(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleGeneratePassword = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminCredentialsService.generatePassword(16);
      if (response.success && response.data) {
        setNewPassword(response.data);
        setGeneratedPassword(true);
        setShowNewPassword(true);
      } else {
        setError(response.error || "Failed to generate password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy password");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credential) return;

    if (!adminPassword) {
      setError("Please enter your admin password");
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await adminCredentialsService.resetPassword(
        credential.partner_id,
        newPassword,
        adminEmail,
        adminPassword
      );

      if (response.success) {
        onSuccess();
        handleClose();
      } else {
        setError(response.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdminPassword("");
    setNewPassword("");
    setError("");
    setShowAdminPassword(false);
    setShowNewPassword(false);
    setGeneratedPassword(false);
    setCopied(false);
    onClose();
  };

  if (!credential) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset the password for {credential.partner_name} (
            {credential.partner_id})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Organization Info */}
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Partner ID:</span>
              <span className="font-medium">{credential.partner_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Email/Username:</span>
              <span className="font-medium">
                {credential.is_dummy_email
                  ? credential.username
                  : credential.email}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Password:</span>
              <span className="font-mono text-xs">{credential.password}</span>
            </div>
          </div>

          {/* Admin Password Verification */}
          <div className="space-y-2">
            <Label htmlFor="adminPassword" className="text-red-600">
              Your Admin Password (Required) *
            </Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showAdminPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password to verify"
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
              >
                {showAdminPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              For security, you must verify your identity
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password for Organization *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setGeneratedPassword(false);
                }}
                placeholder="Enter new password"
                required
                className="pr-20"
              />
              <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2">
                {newPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleCopyPassword}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Generate Secure Password
              </Button>
              {generatedPassword && (
                <span className="text-xs text-green-600">
                  ✓ Password generated
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ This will immediately change the organization's login password.
              Make sure to securely communicate the new password to them.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordModal;
