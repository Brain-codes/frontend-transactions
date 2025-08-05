"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
      includeOrganization: true,
      ...initialFilters,
    }),
    [initialFilters]
  );

  const [filters, setFilters] = useState(defaultFilters);

  // Use ref to store current filters to avoid infinite loops
  const filtersRef = useRef(filters);
  const defaultFiltersRef = useRef(defaultFilters);
  const isLoadingRef = useRef(false); // Prevent concurrent API calls
  const hasInitializedRef = useRef(false); // Prevent initial data from loading multiple times

  // Keep refs in sync with state but prevent unnecessary updates
  useEffect(() => {
    defaultFiltersRef.current = defaultFilters;
  }, [defaultFilters]);

  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
    }
  }, [filters]);

  // Create a stable fetch function that doesn't depend on state
  const fetchSalesStable = useCallback(
    async (newFilters = {}) => {
      // Check authentication first
      if (!isAuthenticated) {
        setError("Please login to access sales data.");
        setLoading(false);
        return;
      }

      // Prevent concurrent calls
      if (isLoadingRef.current) {
        console.log("API call already in progress, skipping...");
        return;
      }

      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // Use the ref to get current filters
        const currentFilters = filtersRef.current;
        const mergedFilters = { ...currentFilters, ...newFilters };

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

          // Update the ref with merged filters
          filtersRef.current = mergedFilters;

          // Update state with merged filters (only if different)
          setFilters((prevFilters) => {
            if (JSON.stringify(prevFilters) !== JSON.stringify(mergedFilters)) {
              return mergedFilters;
            }
            return prevFilters;
          });

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
        isLoadingRef.current = false;
      }
    },
    [isAuthenticated, user] // Only depend on auth state
  );

  // Keep the original fetchSales for backward compatibility but make it stable
  const fetchSales = fetchSalesStable;

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
        const currentFilters = filtersRef.current;
        if (format === "csv") {
          await salesAdvancedService.exportAndDownloadCSV({
            ...currentFilters,
            ...exportFilters,
          });
        } else if (format === "xlsx") {
          await salesAdvancedService.exportAndDownloadExcel({
            ...currentFilters,
            ...exportFilters,
          });
        } else {
          // For JSON export
          const result = await salesAdvancedService.exportSalesData(
            { ...currentFilters, ...exportFilters },
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
    [] // No dependencies needed since we use ref
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

      fetchSalesStable(newFilters);
    },
    [fetchSalesStable]
  );

  const applyFilters = useCallback(
    (newFilters) => {
      fetchSalesStable({ ...newFilters, page: 1 }); // Reset to first page when applying new filters
    },
    [fetchSalesStable]
  );

  const resetFilters = useCallback(() => {
    const currentDefaultFilters = defaultFiltersRef.current;
    setFilters(currentDefaultFilters);
    filtersRef.current = currentDefaultFilters;
    fetchSalesStable(currentDefaultFilters);
  }, [fetchSalesStable]);

  // Search functionality
  const searchSales = useCallback(
    async (searchTerm, searchFields = []) => {
      const searchFilters = {
        search: searchTerm,
        ...(searchFields.length && { searchFields }),
        page: 1,
      };
      await fetchSalesStable(searchFilters);
    },
    [fetchSalesStable]
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
      await fetchSalesStable(locationFilters);
    },
    [fetchSalesStable]
  );

  // Amount-based search
  const searchByAmount = useCallback(
    async (amountMin, amountMax) => {
      const amountFilters = {
        amountMin,
        amountMax,
        page: 1,
      };
      await fetchSalesStable(amountFilters);
    },
    [fetchSalesStable]
  );

  // Date range search
  const searchByDateRange = useCallback(
    async (dateFrom, dateTo) => {
      const dateFilters = {
        dateFrom,
        dateTo,
        page: 1,
      };
      await fetchSalesStable(dateFilters);
    },
    [fetchSalesStable]
  );

  // Load initial data - use a separate effect that doesn't depend on the main functions
  useEffect(() => {
    if (!isAuthenticated || hasInitializedRef.current) return;

    hasInitializedRef.current = true;

    // Initial load function that doesn't cause dependency issues
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentDefaultFilters = defaultFiltersRef.current;
        console.log(
          "Loading initial data with filters:",
          currentDefaultFilters
        );

        // Load sales data
        const salesResponse = await salesAdvancedService.getSalesData(
          currentDefaultFilters
        );
        if (salesResponse.success) {
          setData(salesResponse.data || []);
          setPagination(
            salesResponse.pagination || {
              page: currentDefaultFilters.page || 1,
              limit: currentDefaultFilters.limit || 100,
              total: salesResponse.data?.length || 0,
              totalPages: Math.ceil(
                (salesResponse.data?.length || 0) /
                  (currentDefaultFilters.limit || 100)
              ),
            }
          );
          setFilters(currentDefaultFilters);
          filtersRef.current = currentDefaultFilters;
        }

        // Load stats data
        try {
          const statsData = await salesAdvancedService.getSalesStats(
            currentDefaultFilters
          );
          setStats(statsData);
        } catch (statsErr) {
          console.error("Error fetching initial stats:", statsErr);
          // Stats errors are non-critical
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError(`Failed to load initial data: ${err.message}`);
        setData([]);
        setPagination({ page: 1, limit: 100, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated]); // Only depend on authentication status

  // Reset the initialization flag when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated]);

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
