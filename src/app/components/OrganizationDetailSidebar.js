"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  FileText,
  Edit,
  Trash2,
  X,
} from "lucide-react";

const OrganizationDetailSidebar = ({
  organization,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!organization) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-md overflow-y-auto"
        onClose={onClose}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details
          </SheetTitle>
          <SheetDescription>
            View and manage organization information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header Section */}
          <div className="text-center space-y-3 pb-4 border-b">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {organization.name}
                </h2>
                <Badge
                  className={`${getStatusColor(organization.status)} mt-1`}
                >
                  {formatStatus(organization.status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </h3>

            <div className="space-y-3 pl-6">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900 break-all">
                    {organization.partner_email || "N/A"}
                  </p>
                </div>
              </div>

              {organization.contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">
                      {organization.contact_phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Information */}
          {(organization.address ||
            organization.city ||
            organization.state ||
            organization.country) && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>

                <div className="space-y-3 pl-6">
                  {organization.address && (
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm text-gray-900">
                        {organization.address}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {organization.city && (
                      <div>
                        <p className="text-xs text-gray-500">City</p>
                        <p className="text-sm text-gray-900">
                          {organization.city}
                        </p>
                      </div>
                    )}

                    {organization.state && (
                      <div>
                        <p className="text-xs text-gray-500">State</p>
                        <p className="text-sm text-gray-900">
                          {organization.state}
                        </p>
                      </div>
                    )}
                  </div>

                  {organization.country && (
                    <div>
                      <p className="text-xs text-gray-500">Country</p>
                      <p className="text-sm text-gray-900">
                        {organization.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Description */}
          {organization.description && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>

                <div className="pl-6">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {organization.description}
                  </p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              System Information
            </h3>

            <div className="space-y-3 pl-6">
              <div>
                <p className="text-xs text-gray-500">Organization ID</p>
                <p className="text-xs text-gray-900 font-mono">
                  {organization.id}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(organization.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(organization.updated_at)}
                  </p>
                </div>
              </div>

              {organization.created_by && (
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p className="text-xs text-gray-900 font-mono">
                    {organization.created_by}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => onEdit(organization)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(organization)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Close Button */}
          <Button variant="ghost" onClick={onClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrganizationDetailSidebar;
