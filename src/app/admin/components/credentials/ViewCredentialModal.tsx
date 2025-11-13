"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, Check } from "lucide-react";
import { Credential } from "@/app/services/adminCredentialsService";

interface ViewCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
}

const ViewCredentialModal: React.FC<ViewCredentialModalProps> = ({
  isOpen,
  onClose,
  credential,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const InfoRow = ({
    label,
    value,
    copyable = false,
    field = "",
  }: {
    label: string;
    value: string | React.ReactNode;
    copyable?: boolean;
    field?: string;
  }) => (
    <div className="flex flex-col space-y-1 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {copyable && typeof value === "string" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(value, field)}
            className="h-8 w-8 p-0"
          >
            {copiedField === field ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (!credential) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Credential Details</DialogTitle>
          <DialogDescription>
            View complete credential information for this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Credential Information */}
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Credential Information
            </h3>

            <InfoRow
              label="Partner ID"
              value={
                <span className="font-mono">{credential.partner_id}</span>
              }
              copyable={true}
              field="partner_id"
            />

            <InfoRow
              label="Partner Name"
              value={credential.partner_name}
              copyable={true}
              field="partner_name"
            />

            <InfoRow
              label="Email / Username"
              value={credential.email}
              copyable={true}
              field="email"
            />

            <div className="flex flex-col space-y-1 py-3 border-b border-gray-100">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Password
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono text-gray-900">
                  {showPassword
                    ? credential.password
                    : "•".repeat(credential.password.length)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(credential.password, "password")
                    }
                    className="h-8 w-8 p-0"
                  >
                    {copiedField === "password" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <InfoRow
              label="Credential Type"
              value={
                <Badge
                  variant={credential.is_dummy_email ? "secondary" : "default"}
                >
                  {credential.is_dummy_email
                    ? "Username-based"
                    : "Email-based"}
                </Badge>
              }
            />
          </div>

          {/* Organization Details */}
          {credential.organizations && (
            <div className="bg-white border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Organization Details
              </h3>

              <InfoRow
                label="Organization Name"
                value={
                  credential.organizations.partner_name ||
                  credential.partner_name
                }
              />

              {credential.organizations.contact_person && (
                <InfoRow
                  label="Contact Person"
                  value={credential.organizations.contact_person}
                />
              )}

              {credential.organizations.state && (
                <InfoRow
                  label="State"
                  value={credential.organizations.state}
                />
              )}

              {credential.organizations.branch && (
                <InfoRow
                  label="Branch"
                  value={credential.organizations.branch}
                />
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Metadata
            </h3>

            <InfoRow
              label="Created At"
              value={new Date(credential.created_at).toLocaleString()}
            />

            {credential.updated_at && (
              <InfoRow
                label="Last Updated"
                value={new Date(credential.updated_at).toLocaleString()}
              />
            )}
          </div>

          {/* Copy All Credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Quick Copy
            </h4>
            <p className="text-xs text-blue-700 mb-3">
              Copy all credentials in a formatted text for easy sharing
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `Partner ID: ${credential.partner_id}\nPartner Name: ${credential.partner_name}\nEmail: ${credential.email}\nPassword: ${credential.password}`;
                copyToClipboard(text, "all");
              }}
              className="w-full"
            >
              {copiedField === "all" ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All Credentials
                </>
              )}
            </Button>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewCredentialModal;
