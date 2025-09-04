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
  User,
  Mail,
  Calendar,
  BarChart3,
  Shield,
} from "lucide-react";
import { SalesAgent } from "@/types/salesAgent";

interface SalesAgentTableProps {
  data: SalesAgent[];
  loading: boolean;
  onView: (agent: SalesAgent) => void;
  onEdit: (agent: SalesAgent) => void;
  onDelete: (agent: SalesAgent) => void;
  onViewPerformance: (agent: SalesAgent) => void;
}

const SalesAgentTable: React.FC<SalesAgentTableProps> = ({
  data,
  loading,
  onView,
  onEdit,
  onDelete,
  onViewPerformance,
}) => {
  const formatDate = (dateString: string) => {
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

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      admin: "bg-blue-100 text-blue-800 border-blue-200",
      agent: "bg-green-100 text-green-800 border-green-200",
      super_admin: "bg-purple-100 text-purple-800 border-purple-200",
    };

    return (
      <Badge
        className={
          roleStyles[role] || "bg-gray-100 text-gray-800 border-gray-200"
        }
      >
        {role?.replace("_", " ").toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  const getPasswordStatusBadge = (hasChanged: boolean | undefined) => {
    return hasChanged ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <Shield className="h-3 w-3 mr-1" />
        Password Changed
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Shield className="h-3 w-3 mr-1" />
        Default Password
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 relative">
      {/* Table Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading agents...</p>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Password Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={loading ? "opacity-40" : ""}>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <User className="h-12 w-12 text-gray-300" />
                  <div>
                    <p className="text-gray-900 font-medium">
                      No sales agents found
                    </p>
                    <p className="text-sm">
                      Try adjusting your search or add your first agent
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((agent, index) => (
              <TableRow
                key={agent.id || index}
                className="hover:bg-gray-50 text-gray-700"
              >
                {/* Agent Info */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {agent.full_name?.charAt(0)?.toUpperCase() || "A"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {agent.full_name || "N/A"}
                      </p>
                      {agent.phone && (
                        <p className="text-xs text-gray-500 truncate">
                          {agent.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <div className="max-w-[200px]">
                    <p className="text-sm truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      {agent.email || "N/A"}
                    </p>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>{getRoleBadge(agent.role)}</TableCell>

                {/* Password Status */}
                <TableCell>
                  {getPasswordStatusBadge(agent.has_changed_password)}
                </TableCell>

                {/* Joined Date */}
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    {formatDate(agent.created_at)}
                  </div>
                </TableCell>

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
                        onClick={() => onView(agent)}
                        className="py-2 px-3 rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <Eye className="mr-3 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <hr className="border-gray-200" />
                      <DropdownMenuItem
                        onClick={() => onViewPerformance(agent)}
                        className="py-2 px-3 rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <BarChart3 className="mr-3 h-4 w-4" />
                        Performance
                      </DropdownMenuItem>
                      <hr className="border-gray-200" />
                      <DropdownMenuItem
                        onClick={() => onEdit(agent)}
                        className="py-2 px-3 rounded-md hover:!bg-primary hover:!text-white"
                      >
                        <Edit className="mr-3 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <hr className="border-gray-200" />
                      <DropdownMenuItem
                        onClick={() => onDelete(agent)}
                        className="text-red-600 py-2 px-3 rounded-md hover:!bg-red-600 hover:!text-white"
                      >
                        <Trash2 className="mr-3 h-4 w-4" />
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

export default SalesAgentTable;
