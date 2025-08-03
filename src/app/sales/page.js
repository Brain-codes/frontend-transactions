/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import DashboardLayout from "../components/DashboardLayout";
import SalesAdvancedFilterShadcn from "../components/SalesAdvancedFilterShadcn";
import SalesDetailSidebar from "../components/SalesDetailSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import useSalesAdvanced from "../hooks/useSalesAdvanced";
import {
  Grid3X3,
  List,
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Phone,
  Filter,
  Download,
  Search,
  ChevronRight,
  X,
} from "lucide-react";

const SalesPage = () => {
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);

  const {
    data: salesData,
    loading,
    error,
    pagination,
    applyFilters,
    exportSales,
    fetchSales,
  } = useSalesAdvanced();

  // The hook handles initial data loading automatically
  // No need for additional useEffect here

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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handler functions for sale detail sidebar
  const handleViewSaleDetail = (sale) => {
    setSelectedSale(sale);
    setShowSaleDetail(true);
  };

  const handleCloseSaleDetail = () => {
    setShowSaleDetail(false);
    setSelectedSale(null);
  };

  const ListItem = ({ item, index }) => (
    <Card
      key={item.id}
      className="mb-2 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleViewSaleDetail(item)}
    >
      <CardContent className="p-3 sm:p-6">
        {/* Mobile Layout - Straight Line */}
        <div className="flex items-center justify-between md:hidden">
          {/* Left: Product + Customer */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Compact Image */}
            <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden relative flex-shrink-0">
              {item.stove_image?.url ? (
                <Image
                  src={item.stove_image.url}
                  alt={item.stove_serial_no || "Product"}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-medium">
                    {(item.stove_serial_no || item.end_user_name || "S").charAt(
                      0
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {item.stove_serial_no || "Atmosfair Product"}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {item.end_user_name || item.contact_person || "N/A"}
              </p>
            </div>
          </div>

          {/* Right: Price + Status + Action */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(item.amount || item.price || 0)}
              </p>
              <Badge
                className={`text-xs ${getStatusColor(item.status || "active")}`}
              >
                {item.status || "active"}
              </Badge>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Desktop Layout - Full Details */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 text-blue-600 rounded-lg p-3 mb-2">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>
              <Badge className={getStatusColor(item.status || "active")}>
                {item.status || "active"}
              </Badge>
            </div>

            {/* Product Image */}
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
              {item.stove_image?.url ? (
                <Image
                  src={item.stove_image.url}
                  alt={item.stove_serial_no || "Atmosfair Product"}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-medium">
                    {(item.stove_serial_no || item.end_user_name || "S").charAt(
                      0
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                {item.stove_serial_no || "Atmosfair Product"}
              </h3>
              <p className="text-sm text-gray-600 mb-2 truncate">
                Customer: {item.end_user_name || item.contact_person || "N/A"}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(item.sales_date || item.created_at)}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">
                    {item.address?.state || item.state_backup || "N/A"}
                    {item.address?.country && `, ${item.address.country}`}
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {item.phone || item.contact_phone || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(item.amount || item.price || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Amount</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleViewSaleDetail(item);
              }}
              className="hover:bg-blue-50 hover:text-blue-600 flex-shrink-0"
            >
              <Eye className="h-4 w-4" />
            </Button>

            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const GridItem = ({ item }) => (
    <Card
      key={item.id}
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => handleViewSaleDetail(item)}
    >
      <div className="relative h-32 sm:h-48">
        {item.stove_image?.url ? (
          <Image
            src={item.stove_image.url}
            alt={item.stove_serial_no || "Atmosfair Product"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-32 sm:h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <span className="text-lg sm:text-2xl text-blue-600 font-bold">
              {(item.stove_serial_no || item.end_user_name || "S").charAt(0)}
            </span>
          </div>
        )}
        <Badge
          className={`absolute top-2 right-2 text-xs ${getStatusColor(
            item.status || "active"
          )}`}
        >
          {item.status || "active"}
        </Badge>
      </div>

      <CardContent className="p-3 sm:p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base truncate">
            {item.stove_serial_no || "Atmosfair Product"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 truncate">
            {item.end_user_name || item.contact_person || "N/A"}
          </p>
        </div>

        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex items-center text-xs sm:text-sm text-gray-500">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">{formatCurrency(item.amount || 0)}</span>
          </div>
          <div className="flex items-center text-xs sm:text-sm text-gray-500">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">
              {formatDate(item.sales_date || item.created_at)}
            </span>
          </div>
          <div className="flex items-center text-xs sm:text-sm text-gray-500">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">
              {item.address?.state || item.state_backup || "N/A"}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full hover:bg-blue-50 hover:text-blue-600 text-xs sm:text-sm"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewSaleDetail(item);
          }}
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout currentRoute="sales">
      <div className="h-full flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col space-y-4 mb-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  Atmosfair Sales Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Manage and track all your Atmosfair sales transactions
                </p>
              </div>

              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 lg:space-x-3">
                {/* Export */}
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  className="w-full sm:w-auto text-sm text-gray-800"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`w-full sm:w-auto text-sm ${
                    showFilters ? "bg-blue-50 text-blue-600" : " text-gray-800"
                  }`}
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>

                {/* View Toggle */}
                <div className="flex border rounded-lg w-full sm:w-auto">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`rounded-r-none flex-1 sm:flex-none ${
                      viewMode === "list" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-l-none flex-1 sm:flex-none ${
                      viewMode === "grid" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by customer, product, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border text-gray-800 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">
                  Loading sales data...
                </span>
              </div>
            ) : error ? (
              <div className="max-w-md mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Unable to Load Sales Data
                  </h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Refresh Page
                    </Button>
                    <Button
                      onClick={fetchSales}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : salesData.length === 0 ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Sales Data Found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? `No sales match your search for "${searchTerm}"`
                      : "No sales transactions have been recorded yet."}
                  </p>
                  {searchTerm && (
                    <Button onClick={() => setSearchTerm("")} variant="outline">
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Results Info */}
                <div className="flex flex-col space-y-2 mb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:mb-6">
                  <p className="text-sm sm:text-base text-gray-600">
                    Showing {filteredData.length} of{" "}
                    {pagination?.total || salesData.length} results
                  </p>
                  {searchTerm && (
                    <Badge variant="outline" className="w-fit">
                      Filtered by: "{searchTerm}"
                    </Badge>
                  )}
                </div>

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-1 sm:space-y-4">
                    {filteredData.map((item, index) => (
                      <ListItem key={item.id} item={item} index={index} />
                    ))}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                    {filteredData.map((item) => (
                      <GridItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter Sidebar/Modal */}
        {showFilters && (
          <>
            {/* Overlay for mobile */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setShowFilters(false)}
            />

            {/* Filter Sidebar */}
            <div
              className={`fixed top-0 right-0 h-full bg-white shadow-2xl transform transition-all duration-300 ease-in-out z-50 ${
                showFilters ? "translate-x-0" : "translate-x-full"
              } w-full sm:w-[85vw] md:w-[500px] lg:w-[550px] xl:w-[600px]`}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                      Filters & Export
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Filter and export your sales data
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFilters(false)}
                    className="hover:bg-white/50 flex-shrink-0 ml-2 sm:ml-4"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
                  <SalesAdvancedFilterShadcn
                    onFilter={handleFilter}
                    onExport={handleExport}
                    loading={loading}
                    className=""
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sales Detail Sidebar */}
      <SalesDetailSidebar
        sale={selectedSale}
        isOpen={showSaleDetail}
        onClose={handleCloseSaleDetail}
      />
    </DashboardLayout>
  );
};

export default SalesPage;
