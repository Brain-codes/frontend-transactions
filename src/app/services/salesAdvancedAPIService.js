// API configuration and service for advanced sales data
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://your-supabase-project.supabase.co";
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class SalesAdvancedService {
  constructor() {
    this.baseURL = `${API_FUNCTIONS_URL}/get-sales-advance-two`;
    this.supabase = createClientComponentClient();
  }

  // Get token from Supabase session with better error handling
  async getToken() {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error("Session error:", error);
        
        // Handle specific auth errors
        if (error.message?.includes("refresh_token_not_found") || 
            error.message?.includes("Invalid Refresh Token")) {
          throw new Error("Session expired. Please login again.");
        }
        
        throw new Error(`Authentication error: ${error.message}`);
      }
      
      return session?.access_token || null;
    } catch (err) {
      if (err.message.includes("Session expired") || 
          err.message.includes("Authentication error")) {
        throw err;
      }
      console.error("Token fetch error:", err);
      return null;
    }
  }

  // Helper method to build headers with better error handling
  async getHeaders() {
    try {
      const token = await this.getToken();
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        throw new Error("No authentication token available. Please login again.");
      }

      return headers;
    } catch (err) {
      console.error("Headers error:", err);
      throw err;
    }
  }

  // Main method to fetch sales data with filters
  async getSalesData(filters = {}, method = "POST") {
    try {
      let url = this.baseURL;
      let options = {
        method,
        headers: await this.getHeaders(),
      };

      if (method === "GET") {
        // For GET requests, append filters as query parameters
        const queryParams = new window.URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            if (Array.isArray(value)) {
              value.forEach((item) => queryParams.append(`${key}[]`, item));
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      } else {
        // For POST requests, send filters in body
        options.body = JSON.stringify(filters);
      }

      // Dev log: console.log("API Request:", { method, url, filters, headers: options.headers });

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Handle different response types based on export format
      if (filters.export) {
        switch (filters.export) {
          case "csv":
            return await response.text();
          case "xlsx":
            return await response.blob();
          default:
            return await response.json();
        }
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch sales data: ${error.message}`);
    }
  }

  // Simplified method for basic queries
  async getBasicSalesData(
    page = 1,
    limit = 100,
    sortBy = "created_at",
    sortOrder = "desc"
  ) {
    return this.getSalesData({
      page,
      limit,
      sortBy,
      sortOrder,
      includeAddress: true,
      includeCreator: true,
      includeImages: true,
    });
  }

  // Method for date-based queries
  async getSalesDataByDateRange(dateFrom, dateTo, additionalFilters = {}) {
    return this.getSalesData({
      dateFrom,
      dateTo,
      sortBy: "sales_date",
      sortOrder: "desc",
      includeAddress: true,
      includeCreator: true,
      ...additionalFilters,
    });
  }

  // Method for location-based queries
  async getSalesDataByLocation(
    states = [],
    cities = [],
    lgas = [],
    additionalFilters = {}
  ) {
    return this.getSalesData({
      ...(states.length && { states }),
      ...(cities.length && { cities }),
      ...(lgas.length && { lgas }),
      includeAddress: true,
      sortBy: "created_at",
      sortOrder: "desc",
      ...additionalFilters,
    });
  }

  // Method for amount-based queries
  async getSalesDataByAmount(amountMin, amountMax, additionalFilters = {}) {
    return this.getSalesData({
      amountMin,
      amountMax,
      sortBy: "amount",
      sortOrder: "desc",
      ...additionalFilters,
    });
  }

  // Method for search queries
  async searchSalesData(searchTerm, searchFields = [], additionalFilters = {}) {
    return this.getSalesData({
      search: searchTerm,
      ...(searchFields.length && { searchFields }),
      includeAddress: true,
      includeCreator: true,
      sortBy: "created_at",
      sortOrder: "desc",
      ...additionalFilters,
    });
  }

  // Method for exporting data
  async exportSalesData(filters = {}, format = "csv", exportFields = []) {
    const exportFilters = {
      ...filters,
      export: format,
      ...(exportFields.length && { exportFields }),
    };

    return this.getSalesData(exportFilters);
  }

  // Method to get quick stats
  async getSalesStats(filters = {}) {
    // This would typically be a separate endpoint, but we can calculate from the main data
    const data = await this.getSalesData({
      ...filters,
      limit: 1000, // Get enough data for stats calculation
      includeAddress: true,
    });

    if (data.success && data.data) {
      return this.calculateStats(data.data);
    }

    return {
      totalSales: 0,
      totalAmount: 0,
      totalCustomers: 0,
      avgSaleAmount: 0,
      topStates: [],
      topProducts: [],
    };
  }

  // Helper method to calculate statistics
  calculateStats(salesData) {
    const stats = {
      totalSales: salesData.length,
      totalAmount: salesData.reduce((sum, sale) => sum + (sale.amount || 0), 0),
      totalCustomers: new Set(salesData.map((sale) => sale.contact_person))
        .size,
      avgSaleAmount: 0,
      topStates: [],
      topProducts: [],
    };

    stats.avgSaleAmount =
      stats.totalSales > 0 ? stats.totalAmount / stats.totalSales : 0;

    // Calculate top states
    const stateGroups = salesData.reduce((acc, sale) => {
      const state = sale.state_backup || "Unknown";
      if (!acc[state]) {
        acc[state] = { name: state, count: 0, amount: 0 };
      }
      acc[state].count++;
      acc[state].amount += sale.amount || 0;
      return acc;
    }, {});

    stats.topStates = Object.values(stateGroups)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate top products (by stove serial number pattern)
    const productGroups = salesData.reduce((acc, sale) => {
      const product = sale.stove_serial_no?.substring(0, 3) || "Unknown";
      if (!acc[product]) {
        acc[product] = { name: product, count: 0, amount: 0 };
      }
      acc[product].count++;
      acc[product].amount += sale.amount || 0;
      return acc;
    }, {});

    stats.topProducts = Object.values(productGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  // Method to download exported file
  downloadFile(content, filename, contentType = "text/csv") {
    if (typeof window === "undefined") return;

    const blob =
      content instanceof window.Blob
        ? content
        : new window.Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Method to handle CSV export download
  async exportAndDownloadCSV(filters = {}, filename = null) {
    const csvContent = await this.exportSalesData(filters, "csv");
    const downloadFilename =
      filename || `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
    this.downloadFile(csvContent, downloadFilename, "text/csv");
    return true;
  }

  // Method to handle Excel export download
  async exportAndDownloadExcel(filters = {}, filename = null) {
    const excelBlob = await this.exportSalesData(filters, "xlsx");
    const downloadFilename =
      filename || `sales-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    this.downloadFile(
      excelBlob,
      downloadFilename,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return true;
  }
}

// Create and export a singleton instance
const salesAdvancedService = new SalesAdvancedService();

export default salesAdvancedService;
