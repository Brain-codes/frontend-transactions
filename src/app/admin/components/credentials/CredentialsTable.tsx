"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Eye, EyeOff, Copy, RefreshCw, Info } from "lucide-react";
import { Credential } from "@/app/services/adminCredentialsService";

interface CredentialsTableProps {
  credentials: Credential[];
  loading: boolean;
  onViewDetails: (credential: Credential) => void;
  onResetPassword: (credential: Credential) => void;
}

const CredentialsTable: React.FC<CredentialsTableProps> = ({
  credentials,
  loading,
  onViewDetails,
  onResetPassword,
}) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const togglePasswordVisibility = (partnerId: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(partnerId)) {
        newSet.delete(partnerId);
      } else {
        newSet.add(partnerId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const maskPassword = (password: string): string => {
    return "•".repeat(password.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-3 text-gray-600">Loading credentials...</span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No credentials found</p>
        <p className="text-gray-400 text-sm mt-2">
          Credentials will appear here once organizations are created
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partner ID</TableHead>
            <TableHead>Partner Name</TableHead>
            <TableHead>Email/Username</TableHead>
            <TableHead>Password</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((credential) => {
            const isPasswordVisible = visiblePasswords.has(
              credential.partner_id
            );
            const emailCopyId = `email-${credential.partner_id}`;
            const passwordCopyId = `password-${credential.partner_id}`;

            return (
              <TableRow key={credential.partner_id}>
                <TableCell className="font-mono text-sm">
                  {credential.partner_id}
                </TableCell>
                <TableCell className="font-medium">
                  {credential.partner_name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate max-w-[200px]">
                      {credential.is_dummy_email
                        ? credential.username
                        : credential.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(credential.email, emailCopyId)
                      }
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === emailCopyId ? (
                        <span className="text-xs text-green-600">✓</span>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {isPasswordVisible
                        ? credential.password
                        : maskPassword(credential.password)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        togglePasswordVisibility(credential.partner_id)
                      }
                      className="h-6 w-6 p-0"
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(credential.password, passwordCopyId)
                      }
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === passwordCopyId ? (
                        <span className="text-xs text-green-600">✓</span>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      credential.is_dummy_email ? "secondary" : "default"
                    }
                  >
                    {credential.is_dummy_email ? "Username" : "Email"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(credential.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onViewDetails(credential)}
                      >
                        <Info className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onResetPassword(credential)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CredentialsTable;
