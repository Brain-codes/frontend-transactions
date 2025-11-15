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
import { Eye, EyeOff, RefreshCw, Copy, Check, Key, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [passwordMode, setPasswordMode] = useState("");

  // Custom password mode
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showCustomPassword, setShowCustomPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setAdminPassword("");
      setError("");
      setSuccess(false);
      setNewPassword("");
      setCopied(false);
      setPasswordMode("");
      setUseCustomPassword(false);
      setCustomPassword("");
    }
  }, [isOpen]);

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

    if (useCustomPassword) {
      if (!customPassword) {
        setError("Please enter a custom password");
        return;
      }
      if (customPassword.length < 8) {
        setError("Custom password must be at least 8 characters long");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await adminCredentialsService.resetPassword(
        credential.partner_id,
        adminPassword,
        useCustomPassword ? customPassword : undefined
      );

      if (response.success && response.data) {
        setSuccess(true);
        setNewPassword(response.data.newPassword);
        setPasswordMode(response.data.passwordMode || "auto-generated");
        onSuccess();
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
    setError("");
    setSuccess(false);
    setNewPassword("");
    setShowAdminPassword(false);
    setCopied(false);
    setPasswordMode("");
    setUseCustomPassword(false);
    setCustomPassword("");
    setShowCustomPassword(false);
    onClose();
  };

  if (!credential) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset the password for {credential.partner_name} (
            {credential.partner_id})
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          // Step 1: Request Admin Password Verification
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
                    : credential.email || credential.organizations?.email}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Password:</span>
                <span className="font-mono text-xs">{credential.password}</span>
              </div>
            </div>

            {/* Password Mode Toggle */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {useCustomPassword ? (
                    <Key className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Wand2 className="h-5 w-5 text-blue-600" />
                  )}
                  <Label className="font-semibold text-blue-900 cursor-pointer">
                    {useCustomPassword
                      ? "Custom Password"
                      : "Auto-Generate Password"}
                  </Label>
                </div>
                <Switch
                  checked={useCustomPassword}
                  onCheckedChange={setUseCustomPassword}
                />
              </div>
              <p className="text-xs text-blue-700">
                {useCustomPassword
                  ? "You will provide a custom password for the organization"
                  : "System will automatically generate a secure 16-character password"}
              </p>
            </div>

            {/* Custom Password Field (shown only if toggle is ON) */}
            {useCustomPassword && (
              <div className="space-y-2">
                <Label htmlFor="customPassword">
                  Custom Password for Organization *
                </Label>
                <div className="relative">
                  <Input
                    id="customPassword"
                    type={showCustomPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter custom password (min 8 chars)"
                    required={useCustomPassword}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCustomPassword(!showCustomPassword)}
                  >
                    {showCustomPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>
            )}

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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ This will immediately change the organization's login
                password. Make sure to securely communicate the new password to
                them.
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
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          // Step 2: Show Success with New Password
          <div className="space-y-4 mt-4">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="bg-green-500 rounded-full p-2">
                  <Check className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                Password Reset Successfully!
              </h3>
              <p className="text-sm text-green-700">
                A new{" "}
                {passwordMode === "auto-generated"
                  ? "auto-generated secure"
                  : "custom"}{" "}
                password has been set for {credential.partner_name}
              </p>
            </div>

            {/* Password Mode Badge */}
            <div className="flex justify-center">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  passwordMode === "auto-generated"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {passwordMode === "auto-generated" ? (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Auto-Generated
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Custom Password
                  </>
                )}
              </div>
            </div>

            {/* New Password Display */}
            <div className="bg-white border-2 border-brand rounded-lg p-4">
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                New Password
              </Label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-semibold text-brand break-all">
                    {newPassword}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Make sure to copy and securely communicate this password to the
                organization
              </p>
            </div>

            {/* Organization Info Reminder */}
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Organization Details
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Partner ID:</span>
                <span className="font-medium">{credential.partner_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Partner Name:</span>
                <span className="font-medium">{credential.partner_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Username/Email:</span>
                <span className="font-medium">
                  {credential.is_dummy_email
                    ? credential.username
                    : credential.email || credential.organizations?.email}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordModal;
