"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Search,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  Users,
  TrendingUp,
  Activity,
  RefreshCw,
  BarChart3,
  Globe,
  Eye,
  EyeOff,
  Calendar,
  Banknote,
  Target,
  Map as MapIcon,
  Layers,
  Settings,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";
import MapPage from "./MapPage";
import salesAdvancedService from "../services/salesAdvancedAPIService";

export default function HeatmapPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [selectedState, setSelectedState] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");
  const [selectedCustomerType, setSelectedCustomerType] = useState("all");
  const [showSidebar, setShowSidebar] = useState(true);
  const [mapType, setMapType] = useState("heatmap");
  const [heatmapIntensity, setHeatmapIntensity] = useState("medium");
  const [error, setError] = useState(null);
  const [apiStats, setApiStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    uniqueStates: 0,
    avgAmount: 0,
  });

  // Fetch real sales data from API
  const fetchSalesData = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching sales data with filters:", filters);

      // Prepare API filters
      const apiFilters = {
        limit: 5000, // Get more data for comprehensive map
        includeAddress: true,
        includeCreator: true,
        includeImages: false, // Don't need images for heatmap
        sortBy: "created_at",
        sortOrder: "desc",
        ...filters,
      };

      const response = await salesAdvancedService.getSalesData(apiFilters);

      if (response.success && response.data) {
        console.log("API Response:", response);

        // Process the real sales data for map visualization
        const processedData = response.data
          .filter((sale) => {
            // Only include sales with valid coordinates
            const hasCoords =
              (sale.addresses?.latitude && sale.addresses?.longitude) ||
              (sale.address?.latitude && sale.address?.longitude);
            const validCoords =
              hasCoords &&
              !isNaN(
                parseFloat(sale.addresses?.latitude || sale.address?.latitude)
              ) &&
              !isNaN(
                parseFloat(sale.addresses?.longitude || sale.address?.longitude)
              );

            if (!validCoords && hasCoords) {
              console.warn(
                "Invalid coordinates for sale:",
                sale.id,
                sale.addresses || sale.address
              );
            }

            return validCoords;
          })
          .map((sale) => ({
            id: sale.id || sale.transaction_id,
            lat: parseFloat(sale.addresses?.latitude || sale.address?.latitude),
            lng: parseFloat(
              sale.addresses?.longitude || sale.address?.longitude
            ),
            state:
              sale.state_backup ||
              sale.addresses?.state ||
              sale.address?.state ||
              "Unknown",
            city:
              sale.lga_backup ||
              sale.addresses?.city ||
              sale.address?.city ||
              "Unknown",
            sales: 1, // Each sale counts as 1
            amount: parseFloat(sale.amount || sale.price || 0),
            date: sale.sales_date || sale.created_at,
            customerName:
              sale.end_user_name || sale.contact_person || "Unknown",
            customerType: sale.customer_type || "Standard",
            region: sale.region || "Unknown",
            productCategory:
              sale.product_type || sale.stove_type || "Clean Cookstoves",
            salesRep:
              sale.created_by ||
              sale.creator?.name ||
              sale.profiles?.full_name ||
              "Unknown",
            serialNumber: sale.stove_serial_no,
            phone: sale.phone || sale.contact_phone,
            email: sale.email || sale.contact_email,
            partner:
              sale.partner_name ||
              sale.organizations?.partner_name ||
              sale.partner,
            fullAddress:
              sale.addresses?.full_address ||
              sale.address?.full_address ||
              `${
                sale.lga_backup ||
                sale.addresses?.city ||
                sale.address?.city ||
                ""
              } ${
                sale.state_backup ||
                sale.addresses?.state ||
                sale.address?.state ||
                ""
              }`.trim(),
          }));

        console.log(
          `Processed ${processedData.length} sales records with valid coordinates out of ${response.data.length} total records`
        );

        // Calculate statistics
        const stats = {
          totalSales: processedData.length,
          totalAmount: processedData.reduce(
            (sum, item) => sum + item.amount,
            0
          ),
          uniqueStates: [...new Set(processedData.map((item) => item.state))]
            .length,
          avgAmount: 0,
        };
        stats.avgAmount =
          stats.totalSales > 0 ? stats.totalAmount / stats.totalSales : 0;

        setOriginalData(processedData);
        setMapData(processedData);
        setApiStats(stats);

        if (processedData.length === 0) {
          setError(
            "No sales records with valid coordinates found. Please check if location data is being properly captured."
          );
        }
      } else {
        throw new Error(response.message || "Failed to fetch sales data");
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setError(`Failed to load sales data: ${error.message}`);
      setMapData([]);
      setOriginalData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Handle data refresh
  const handleRefresh = () => {
    fetchSalesData();
  };

  // Enhanced filtering logic based on real data
  const filteredData = useMemo(() => {
    return mapData.filter((item) => {
      const matchesSearch =
        item.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesState =
        selectedState === "all" || item.state === selectedState;
      const matchesCustomerType =
        selectedCustomerType === "all" ||
        item.customerType === selectedCustomerType;

      let matchesTimeRange = true;
      if (selectedTimeRange !== "all") {
        const itemDate = new Date(item.date);
        const now = new Date();
        const daysAgo = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

        switch (selectedTimeRange) {
          case "7d":
            matchesTimeRange = daysAgo <= 7;
            break;
          case "30d":
            matchesTimeRange = daysAgo <= 30;
            break;
          case "90d":
            matchesTimeRange = daysAgo <= 90;
            break;
          default:
            matchesTimeRange = true;
        }
      }

      return (
        matchesSearch && matchesState && matchesCustomerType && matchesTimeRange
      );
    });
  }, [
    mapData,
    searchTerm,
    selectedState,
    selectedCustomerType,
    selectedTimeRange,
  ]);
  // Enhanced statistics based on real data
  const stats = useMemo(() => {
    const data = filteredData;
    const states = [...new Set(data.map((item) => item.state))];
    const regions = [...new Set(data.map((item) => item.region))];

    return {
      totalLocations: data.length,
      totalSales: data.reduce((sum, item) => sum + item.sales, 0),
      totalAmount: data.reduce((sum, item) => sum + item.amount, 0),
      states: states.length,
      regions: regions.length,
      avgSaleValue:
        data.length > 0
          ? data.reduce((sum, item) => sum + item.amount, 0) / data.length
          : 0,
      topState:
        states.length > 0
          ? states.reduce((a, b) =>
              data.filter((item) => item.state === a).length >
              data.filter((item) => item.state === b).length
                ? a
                : b
            )
          : "N/A",
    };
  }, [filteredData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportData = () => {
    const csvContent = [
      [
        "ID",
        "State",
        "City",
        "Latitude",
        "Longitude",
        "Sales",
        "Amount",
        "Customer Name",
        "Customer Type",
        "Product Category",
        "Date",
        "Sales Rep",
      ].join(","),
      ...filteredData.map((item) =>
        [
          item.id,
          item.state,
          item.city,
          item.lat,
          item.lng,
          item.sales,
          item.amount,
          item.customerName,
          item.customerType,
          item.productCategory,
          item.date,
          item.salesRep,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-heatmap-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueStates = [...new Set(mapData.map((item) => item.state))].sort();
  const uniqueCustomerTypes = [
    ...new Set(mapData.map((item) => item.customerType)),
  ].sort();

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <DashboardLayout
        currentRoute="map"
        title="Sales Heatmap Analytics"
        description="Geographic visualization of sales distribution across Nigeria"
        rightButton={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={exportData}
              disabled={loading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="h-full flex flex-col bg-gray-50">
          {/* Statistics Cards */}
          <div className="p-3 lg:p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        Total Locations
                      </p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">
                        {stats.totalLocations.toLocaleString()}
                      </p>
                    </div>
                    <MapPin className="h-6 w-6 lg:h-8 lg:w-8 text-brand-700 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        Total Sales
                      </p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">
                        {stats.totalSales.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        Total Revenue
                      </p>
                      <p className="text-sm lg:text-xl font-bold text-gray-900">
                        {formatCurrency(stats.totalAmount)}
                      </p>
                    </div>
                    <Banknote className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        States Covered
                      </p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">
                        {stats.states}
                      </p>
                    </div>
                    <Globe className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        Avg Sale Value
                      </p>
                      <p className="text-sm lg:text-lg font-bold text-gray-900">
                        {formatCurrency(stats.avgSaleValue)}
                      </p>
                    </div>
                    <Target className="h-6 w-6 lg:h-8 lg:w-8 text-red-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
                        Top State
                      </p>
                      <p className="text-sm lg:text-lg font-bold text-gray-900 truncate">
                        {stats.topState}
                      </p>
                    </div>
                    <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-indigo-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-3 lg:mx-6 mt-4 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Error Loading Data
                  </h3>
                  <p className="text-sm text-red-700 mt-1 break-words">
                    {error}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mx-3 lg:mx-6 mt-4 p-4 lg:p-6 bg-brand-50 border border-brand-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-brand-700 mr-3 animate-spin flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-brand-900">
                    Loading Sales Data
                  </h3>
                  <p className="text-sm text-brand-700 mt-1">
                    Fetching real-time sales data from the server...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Summary */}
          {!loading && !error && mapData.length > 0 && (
            <div className="mx-3 lg:mx-6 mt-4 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <Activity className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    Real Sales Data Loaded
                  </h3>
                  <p className="text-xs lg:text-sm text-green-700 mt-1 break-words">
                    Showing {apiStats.totalSales} sales from{" "}
                    {apiStats.uniqueStates} states • Total Value:{" "}
                    {formatCurrency(apiStats.totalAmount)}• Average:{" "}
                    {formatCurrency(apiStats.avgAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Sidebar Toggle */}
          {!isFullscreen && (
            <div className="md:hidden p-3 bg-white border-b border-gray-200 flex justify-between items-center">
              <Button
                onClick={() => setShowSidebar(!showSidebar)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-gray-500"
              >
                <Filter className="h-4 w-4 " />
                {showSidebar ? "Hide Filters" : "Show Filters"}
              </Button>
              <div className="text-sm text-gray-600">
                {filteredData.length} locations
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div
            className={`flex-1 flex ${
              isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
            } ${showSidebar && !isFullscreen ? "flex-col md:flex-row" : ""}`}
          >
            {/* Enhanced Sidebar */}
            {!isFullscreen && showSidebar && (
              <div className="w-full md:w-80 lg:w-96 bg-white md:border-r border-gray-200 flex flex-col shadow-sm md:shadow-none border-b md:border-b-0">
                {/* Sidebar Header */}
                <div className="p-3 lg:p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center">
                      <Filter className="h-4 w-4 lg:h-5 lg:w-5 mr-2 text-brand-700" />
                      Filters & Controls
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSidebar(false)}
                      className="h-8 w-8 lg:h-10 lg:w-10"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search locations, IDs, products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="p-3 lg:p-4 border-b border-gray-200 space-y-3 lg:space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs lg:text-sm font-medium text-gray-700">
                        State
                      </Label>
                      <Select
                        value={selectedState}
                        onValueChange={setSelectedState}
                      >
                        <SelectTrigger className="w-full text-gray-600 h-9">
                          <SelectValue placeholder="All States" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {uniqueStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs lg:text-sm font-medium text-gray-700">
                        Time Range
                      </Label>
                      <Select
                        value={selectedTimeRange}
                        onValueChange={setSelectedTimeRange}
                      >
                        <SelectTrigger className="w-full text-gray-600 h-9">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs lg:text-sm font-medium text-gray-700">
                      Customer Type
                    </Label>
                    <Select
                      value={selectedCustomerType}
                      onValueChange={setSelectedCustomerType}
                    >
                      <SelectTrigger className="w-full text-gray-600 h-9">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {uniqueCustomerTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs lg:text-sm font-medium text-gray-700">
                      Map Visualization
                    </Label>
                    <Select value={mapType} onValueChange={setMapType}>
                      <SelectTrigger className="w-full text-gray-600 h-9">
                        <SelectValue placeholder="Heatmap" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heatmap">Heatmap</SelectItem>
                        <SelectItem value="markers">
                          Individual Markers
                        </SelectItem>
                        <SelectItem value="clusters">Clustered View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Sales Locations
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {filteredData.length} locations
                      </Badge>
                    </div>

                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-3">
                              <div className="h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredData.slice(0, 100).map((location) => (
                          <Card
                            key={location.id}
                            className="hover:shadow-sm transition-shadow cursor-pointer group"
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm text-gray-900 truncate">
                                    {location.city}, {location.state}
                                  </h5>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {location.id}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {location.customerName}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    location.customerType === "Enterprise"
                                      ? "default"
                                      : location.customerType === "Premium"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs ml-2"
                                >
                                  {location.customerType}
                                </Badge>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Amount:</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(location.amount)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">
                                    Product:
                                  </span>
                                  <span
                                    className="font-medium truncate max-w-24"
                                    title={location.productCategory}
                                  >
                                    {location.productCategory}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">
                                    Sales Rep:
                                  </span>
                                  <span
                                    className="font-medium truncate max-w-24"
                                    title={location.salesRep}
                                  >
                                    {location.salesRep}
                                  </span>
                                </div>
                                {location.serialNumber && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">
                                      Serial:
                                    </span>
                                    <span
                                      className="font-mono text-xs truncate max-w-20"
                                      title={location.serialNumber}
                                    >
                                      {location.serialNumber}
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                                  {location.lat.toFixed(4)},{" "}
                                  {location.lng.toFixed(4)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {filteredData.length > 100 && (
                          <div className="text-center p-4">
                            <p className="text-sm text-gray-500">
                              Showing first 100 of {filteredData.length}{" "}
                              locations
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Sidebar Button */}
            {!isFullscreen && !showSidebar && (
              <div className="absolute left-2 lg:left-4 top-2 lg:top-4 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                  className="bg-white shadow-lg text-xs lg:text-sm"
                >
                  <Eye className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Show Filters</span>
                  <span className="sm:hidden">Filters</span>
                </Button>
              </div>
            )}

            {/* Map Container */}
            <div className="flex-1 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-700 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">
                      Loading heatmap data...
                    </p>
                    <p className="text-sm text-gray-500">
                      Analyzing {mapData.length || "..."} sales locations
                    </p>
                  </div>
                </div>
              )}

              <MapPage
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                locations={filteredData}
                isFullscreen={isFullscreen}
                mapType={mapType}
                intensity={heatmapIntensity}
              />

              {/* Fullscreen Exit Button */}
              {isFullscreen && (
                <div className="absolute top-2 lg:top-4 right-2 lg:right-4 z-20 flex gap-1 lg:gap-2">
                  <Button
                    onClick={() => setShowSidebar(!showSidebar)}
                    variant="outline"
                    size="sm"
                    className="bg-white shadow-lg text-gray-400 text-xs lg:text-sm"
                  >
                    <Settings className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Controls</span>
                  </Button>
                  <Button
                    onClick={() => setIsFullscreen(false)}
                    variant="outline"
                    size="sm"
                    className="bg-white shadow-lg text-gray-400 text-xs lg:text-sm"
                  >
                    <Minimize2 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                    <span className="sm:hidden">Exit</span>
                  </Button>
                </div>
              )}

              {/* Map Info Overlay */}
              <div className="absolute bottom-2 lg:bottom-4 left-2 lg:left-4 z-10">
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-0">
                  <CardContent className="p-2 lg:p-3">
                    <div className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                      <Info className="h-3 w-3 lg:h-4 lg:w-4 text-brand-700 flex-shrink-0" />
                      <span className="text-gray-700 truncate">
                        {filteredData.length} locations
                      </span>
                      {filteredData.length !== mapData.length && (
                        <Badge variant="secondary" className="text-xs">
                          Filtered
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
