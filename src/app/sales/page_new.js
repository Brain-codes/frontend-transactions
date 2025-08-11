/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import SalesAdvancedFilterShadcn from "../components/SalesAdvancedFilterShadcn";
import SalesDetailSidebar from "../components/SalesDetailSidebar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useSalesAdvanced from "../hooks/useSalesAdvanced";
import {
  Eye,
  Filter,
  Download,
  Search,
  X,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";

const SalesPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: salesData,
    loading,
    error,
    pagination,
    applyFilters,
    exportSales,
    fetchSales,
  } = useSalesAdvanced();

  // Filter data based on search term
  const filteredData = salesData.filter(
    (item) =>
      item.end_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.stove_serial_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address?.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.state_backup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lga_backup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilter = (filters) => {
    console.log("Applying filters:", filters);
    applyFilters(filters);
  };

  const handleExport = (format) => {
    console.log("Exporting as:", format);
    exportSales({}, format);
  };

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

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
  };

  const handleEdit = (sale) => {
    console.log("Edit sale:", sale);
    // Add edit functionality here
  };

  const handleDelete = (sale) => {
    console.log("Delete sale:", sale);
    // Add delete functionality here
  };

  if (loading) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="sales">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <DashboardLayout currentRoute="sales">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                Error loading sales data: {error}
              </p>
              <Button onClick={() => fetchSales()}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout currentRoute="sales">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
            <div className="flex flex-col space-y-4 mb-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  Atmosfair Sales Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage and track all your Atmosfair sales transactions
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(true)}
                  className="text-xs sm:text-sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  className="text-xs sm:text-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, serial number, partner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredData.length} of {salesData.length} sales
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Stove ID</TableHead>
                    <TableHead>Sales Date</TableHead>
                    <TableHead>Sales Partner</TableHead>
                    <TableHead>Sales State</TableHead>
                    <TableHead>Sales LGA</TableHead>
                    <TableHead>End User Name</TableHead>
                    <TableHead>End User Phone</TableHead>
                    <TableHead>End User Address</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-gray-500">
                          {searchTerm
                            ? "No sales found matching your search."
                            : "No sales data available."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((sale, index) => (
                      <TableRow
                        key={sale.id || index}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">
                          {sale.transaction_id || sale.id || `TXN-${index + 1}`}
                        </TableCell>
                        <TableCell>{sale.stove_serial_no || "N/A"}</TableCell>
                        <TableCell>
                          {formatDate(sale.sales_date || sale.created_at)}
                        </TableCell>
                        <TableCell>
                          {sale.partner_name || sale.organization_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.address?.state || sale.state_backup || "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.address?.city || sale.lga_backup || "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.end_user_name || sale.contact_person || "N/A"}
                        </TableCell>
                        <TableCell>
                          {sale.phone || sale.contact_phone || "N/A"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {sale.address?.street ||
                            sale.end_user_address ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(sale)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(sale)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(sale)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
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
          </div>
        </div>

        {/* Advanced Filters Sidebar */}
        <SalesAdvancedFilterShadcn
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApplyFilters={handleFilter}
          salesData={salesData}
        />

        {/* Sale Detail Sidebar */}
        {selectedSale && (
          <SalesDetailSidebar
            sale={selectedSale}
            isOpen={!!selectedSale}
            onClose={() => setSelectedSale(null)}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SalesPage;
