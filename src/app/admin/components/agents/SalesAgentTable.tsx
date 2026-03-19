"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  Trash2,
  User,
  Loader2,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SalesAgent } from "@/types/salesAgent";

interface SalesAgentTableProps {
  data: SalesAgent[];
  loading: boolean;
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
  onView: (agent: SalesAgent) => void;
  onEdit: (agent: SalesAgent) => void;
  onDelete: (agent: SalesAgent) => void;
  onViewPerformance: (agent: SalesAgent) => void;
}

const SalesAgentTable: React.FC<SalesAgentTableProps> = ({
  data,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
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

  const getPasswordStatusBadge = (hasChanged: boolean | undefined) => {
    return hasChanged ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <Shield className="h-3 w-3 mr-1" />
        Changed
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Shield className="h-3 w-3 mr-1" />
        Default
      </Badge>
    );
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 relative overflow-hidden">
      {/* Table Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading agents...</p>
          </div>
        </div>
      )}

      <Table>
        <TableHeader className="bg-brand">
          <TableRow className="hover:bg-brand">
            <TableHead className="text-white py-4 first:rounded-tl-lg">Agent</TableHead>
            <TableHead className="text-white py-4">Phone</TableHead>
            <TableHead className="text-white py-4">Email</TableHead>
            <TableHead className="text-white py-4">Stoves Sold</TableHead>
            <TableHead className="text-white py-4">Last Login</TableHead>
            <TableHead
              className="text-white py-4 cursor-pointer select-none"
              onClick={() => onSort("created_at")}
            >
              <div className="flex items-center">
                Date Joined
                <SortIcon column="created_at" />
              </div>
            </TableHead>
            <TableHead className="text-center text-white py-4 last:rounded-tr-lg">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={loading ? "opacity-40" : ""}>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <User className="h-12 w-12 text-gray-300" />
                  <div>
                    <p className="text-gray-900 font-medium">No sales agents found</p>
                    <p className="text-sm">Try adjusting your search or add your first agent</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((agent, index) => (
              <TableRow
                key={agent.id || index}
                className={`${index % 2 === 0 ? "bg-white" : "bg-brand-light"} hover:bg-gray-50 text-gray-700`}
              >
                {/* Agent Name */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-brand-800 to-brand-900 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {agent.full_name?.charAt(0)?.toUpperCase() || "A"}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {agent.full_name || "N/A"}
                    </p>
                  </div>
                </TableCell>

                {/* Phone */}
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {agent.phone || "—"}
                  </span>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <p className="text-sm truncate max-w-[180px]">
                    {agent.email || "N/A"}
                  </p>
                </TableCell>

                {/* Total Sales */}
                <TableCell>
                  <span className="text-sm font-medium text-gray-900">
                    {(agent.total_sold ?? 0).toLocaleString()}
                  </span>
                </TableCell>

                {/* Last Login */}
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {agent.last_login ? formatDate(agent.last_login) : "Never"}
                  </span>
                </TableCell>

                {/* Date Joined */}
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {formatDate(agent.created_at)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => onView(agent)}
                      className="bg-brand hover:bg-brand/90 text-white"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(agent)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(agent)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
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
