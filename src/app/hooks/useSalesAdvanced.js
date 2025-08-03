"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import salesAdvancedService from "../services/salesAdvancedAPIService";

export const useSalesAdvanced = (initialFilters = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const defaultFilters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      sortBy: "created_at",
      sortOrder: "desc",
      includeAddress: true,
      includeCreator: true,
      includeImages: true,
      ...initialFilters,
    }),
    [initialFilters]
  );

  const [filters, setFilters] = useState(defaultFilters);

  const fetchSales = useCallback(
    async (newFilters = {}) => {
      // Check authentication first
      if (!isAuthenticated) {
        setError("Please login to access sales data.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const mergedFilters = { ...filters, ...newFilters };
        console.log("Fetching sales with filters:", mergedFilters);
        console.log("User authenticated:", isAuthenticated, "User:", user);

        const response = await salesAdvancedService.getSalesData(mergedFilters);
        console.log("API Response:", response);

        if (response.success) {
          setData(response.data || []);
          setPagination(
            response.pagination || {
              page: mergedFilters.page || 1,
              limit: mergedFilters.limit || 100,
              total: response.data?.length || 0,
              totalPages: Math.ceil(
                (response.data?.length || 0) / (mergedFilters.limit || 100)
              ),
            }
          );
          setFilters(mergedFilters);

          // Show success message if we have data
          if (response.data?.length > 0) {
            console.log(`Loaded ${response.data.length} transactions`);
          }
        } else {
          throw new Error(response.message || "Failed to fetch sales data");
        }
      } catch (err) {
        console.error("Error fetching sales:", err);

        // Show user-friendly error message based on error type
        if (
          err.message.includes("401") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Missing authorization header")
        ) {
          setError(
            "Authentication required. Please login to access sales data."
          );
        } else if (
          err.message.includes("403") ||
          err.message.includes("Access denied") ||
          err.message.includes("super admin")
        ) {
          setError(
            "Access denied. You need super admin privileges to view this data."
          );
        } else if (err.message.includes("404")) {
          setError(
            "Sales data endpoint not found. Please check your configuration."
          );
        } else if (err.message.includes("500")) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Failed to load sales data: ${err.message}`);
        }

        setData([]);
        setPagination({ page: 1, limit: 100, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, user] // Removed 'filters' from dependencies to prevent infinite loop
  );

  // Fetch statistics
  const fetchStats = useCallback(async (statsFilters = {}) => {
    try {
      const statsData = await salesAdvancedService.getSalesStats(statsFilters);
      setStats(statsData);
      return statsData;
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Don't show error for stats as it's secondary data
      return {};
    }
  }, []);

  const exportSales = useCallback(
    async (exportFilters = {}, format = "csv") => {
      setLoading(true);

      try {
        if (format === "csv") {
          await salesAdvancedService.exportAndDownloadCSV({
            ...filters,
            ...exportFilters,
          });
        } else if (format === "xlsx") {
          await salesAdvancedService.exportAndDownloadExcel({
            ...filters,
            ...exportFilters,
          });
        } else {
          // For JSON export
          const result = await salesAdvancedService.exportSalesData(
            { ...filters, ...exportFilters },
            "json"
          );
          const filename = `sales-export-${
            new Date().toISOString().split("T")[0]
          }.json`;
          salesAdvancedService.downloadFile(
            JSON.stringify(result, null, 2),
            filename,
            "application/json"
          );
        }

        console.log(`Successfully exported data as ${format.toUpperCase()}`);
      } catch (err) {
        console.error("Error exporting sales:", err);
        setError(`Export failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const handleTableChange = useCallback(
    (pagination, filters, sorter) => {
      const newFilters = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (sorter.field) {
        newFilters.sortBy = sorter.field;
        newFilters.sortOrder = sorter.order === "ascend" ? "asc" : "desc";
      }

      fetchSales(newFilters);
    },
    [fetchSales]
  );

  const applyFilters = useCallback(
    (newFilters) => {
      fetchSales({ ...newFilters, page: 1 }); // Reset to first page when applying new filters
    },
    [fetchSales]
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    fetchSales(defaultFilters);
  }, [fetchSales, defaultFilters]);

  // Search functionality
  const searchSales = useCallback(
    async (searchTerm, searchFields = []) => {
      const searchFilters = {
        search: searchTerm,
        ...(searchFields.length && { searchFields }),
        page: 1,
      };
      await fetchSales(searchFilters);
    },
    [fetchSales]
  );

  // Location-based search
  const searchByLocation = useCallback(
    async (states = [], cities = [], lgas = []) => {
      const locationFilters = {
        ...(states.length && { states }),
        ...(cities.length && { cities }),
        ...(lgas.length && { lgas }),
        page: 1,
      };
      await fetchSales(locationFilters);
    },
    [fetchSales]
  );

  // Amount-based search
  const searchByAmount = useCallback(
    async (amountMin, amountMax) => {
      const amountFilters = {
        amountMin,
        amountMax,
        page: 1,
      };
      await fetchSales(amountFilters);
    },
    [fetchSales]
  );

  // Date range search
  const searchByDateRange = useCallback(
    async (dateFrom, dateTo) => {
      const dateFilters = {
        dateFrom,
        dateTo,
        page: 1,
      };
      await fetchSales(dateFilters);
    },
    [fetchSales]
  );

  // Load initial data
  useEffect(() => {
    const initialLoad = async () => {
      await fetchSales(defaultFilters);
      await fetchStats(defaultFilters);
    };

    if (isAuthenticated) {
      initialLoad();
    }
  }, [isAuthenticated]); // Only depend on authentication status, not the functions

  return {
    data,
    loading,
    error,
    pagination,
    filters,
    stats,

    // Core functions
    fetchSales,
    fetchStats,
    exportSales,

    // Event handlers
    handleTableChange,
    applyFilters,
    resetFilters,

    // Search functions
    searchSales,
    searchByLocation,
    searchByAmount,
    searchByDateRange,

    // Direct access to service for advanced use cases
    service: salesAdvancedService,
  };
};

export default useSalesAdvanced;
