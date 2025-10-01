"use client";

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
import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  FileText,
  MapPin,
  Upload,
} from "lucide-react";

const OrganizationTable = ({
  data,
  loading,
  onView,
  onViewStoveIds,
  onEdit,
  onDelete,
  onImportCSV,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 relative">
      {/* Table Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading data...</p>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Location</TableHead>
            {/* <TableHead>Status</TableHead> */}
            <TableHead>Created</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={loading ? "opacity-40" : ""}>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Building2 className="h-12 w-12 text-gray-300" />
                  <div>
                    <p className="text-gray-900 font-medium">
                      No organizations found
                    </p>
                    <p className="text-sm">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((organization, index) => (
              <TableRow
                key={organization.id || index}
                className="hover:bg-gray-50 text-gray-700"
              >
                {/* Organization Name */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {organization.organization_name ||
                          organization.name ||
                          "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {organization.partner_name || "N/A"}
                      </p>
                      {organization.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
                          {organization.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Branch */}
                <TableCell>
                  <div className="max-w-[150px]">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {organization.branch || "N/A"}
                    </p>
                  </div>
                </TableCell>

                {/* Contact Info */}
                <TableCell>
                  <div className="space-y-0.5 max-w-[200px]">
                    <p className="text-sm truncate">
                      {organization.partner_email || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {organization.contact_phone || "N/A"}
                    </p>
                    {organization.contact_person && (
                      <p className="text-xs text-gray-400 truncate">
                        {organization.contact_person}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Location */}
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-900">
                      {organization.state || "N/A"}
                    </p>
                    {organization.city && (
                      <p className="text-xs text-gray-500">
                        {organization.city}
                      </p>
                    )}
                    {organization.address && (
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">
                        {organization.address}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                {/* <TableCell>
                  <Badge className={getStatusColor(organization.status)}>
                    {formatStatus(organization.status)}
                  </Badge>
                </TableCell> */}

                {/* Created Date */}
                <TableCell>{formatDate(organization.created_at)}</TableCell>

                {/* Actions */}
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onView(organization)}
                        className="py-2 px-3  rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <Eye className="mr-5 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <hr className=" border-gray-200" />
                      <DropdownMenuItem
                        onClick={() => onViewStoveIds(organization)}
                        className="py-2 px-3  rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <FileText className="mr-5 h-4 w-4" strokeWidth={1.5} />
                        View Stove ID&#39;s
                      </DropdownMenuItem>
                      <hr className=" border-gray-200" />
                      {onImportCSV && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onImportCSV(organization)}
                            className="py-2 px-3  rounded-md hover:!bg-primary hover:!text-white"
                          >
                            <Upload
                              className="mr-5 h-4 w-4"
                              strokeWidth={1.5}
                            />
                            Import CSV
                          </DropdownMenuItem>
                          <hr className=" border-gray-200" />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => onEdit(organization)}
                        className="py-2 px-3  rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <Edit className="mr-5 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <hr className=" border-gray-200" />
                      <DropdownMenuItem
                        onClick={() => onDelete(organization)}
                        className="text-red-600 py-2 px-3  rounded-md hover:!bg-red-600 hover:!text-white"
                      >
                        <Trash2 className="mr-5 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrganizationTable;
