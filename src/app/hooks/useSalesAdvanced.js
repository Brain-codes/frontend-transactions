"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import salesAdvancedService from "../services/salesAdvancedAPIService";

export const useSalesAdvanced = (initialFilters = {}) => {
  const { user, isAuthenticated, authError, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const defaultFilters = useMemo(
    () => ({
      page: 1,
      limit: 10,
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
  const filtersRef = useRef(filters);
  const defaultFiltersRef = useRef(defaultFilters);
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    defaultFiltersRef.current = defaultFilters;
  }, [defaultFilters]);

  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
    }
  }, [filters]);

  // Reset when auth state changes to unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setData([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      setError("Please login to access sales data.");
      hasInitializedRef.current = false;
      
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isAuthenticated, authLoading]);

  // Handle auth errors
  useEffect(() => {
    if (authError && !authLoading) {
      setError(`Authentication error: ${authError}`);
      setData([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
    }
  }, [authError, authLoading]);

  // Main fetch function with better error handling
  const fetchSalesStable = useCallback(
    async (newFilters = {}, isInitial = false) => {
      // Don't make requests if not authenticated or auth is loading
      if (!isAuthenticated || authLoading) {
        if (!authLoading) {
          setError("Please login to access sales data.");
        }
        setLoading(false);
        setTableLoading(false);
        return;
      }

      // Check for auth errors
      if (authError) {
        setError(`Authentication error: ${authError}`);
        setLoading(false);
        setTableLoading(false);
        return;
      }

      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request (if available)
      if (typeof window !== 'undefined' && window.AbortController) {
        abortControllerRef.current = new window.AbortController();
      }

      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      setError(null);

      try {
        const currentFilters = filtersRef.current;
        const mergedFilters = { ...currentFilters, ...newFilters };
        
        const response = await salesAdvancedService.getSalesData(mergedFilters);
        
        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        if (response.success) {
          setData(response.data || []);
          setPagination(
            response.pagination || {
              page: mergedFilters.page || 1,
              limit: mergedFilters.limit || 10,
              total: response.data?.length || 0,
              totalPages: Math.ceil(
                (response.data?.length || 0) / (mergedFilters.limit || 10)
              ),
            }
          );
          filtersRef.current = mergedFilters;
          setFilters((prevFilters) => {
            if (JSON.stringify(prevFilters) !== JSON.stringify(mergedFilters)) {
              return mergedFilters;
            }
            return prevFilters;
          });
          
          if (response.data?.length > 0) {
            toast.success(
              "Loaded",
              `${response.data.length} transactions loaded successfully`
            );
          }
        } else {
          throw new Error(response.message || "Failed to fetch sales data");
        }
      } catch (err) {
        // Don't show errors for aborted requests
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return;
        }

        console.error("Sales fetch error:", err);
        
        // Handle specific error types
        if (err.message.includes("Invalid Refresh Token") || 
            err.message.includes("refresh_token_not_found")) {
          setError("Session expired. Please refresh the page and login again.");
          toast.error("Session Error", "Your session has expired. Please login again.");
        } else if (
          err.message.includes("401") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Missing authorization header")
        ) {
          setError("Authentication required. Please login to access sales data.");
          toast.error("Auth Error", "Please login to access sales data.");
        } else if (
          err.message.includes("403") ||
          err.message.includes("Access denied") ||
          err.message.includes("super admin")
        ) {
          setError("Access denied. You need super admin privileges to view this data.");
          toast.error("Access Error", "Super admin privileges required.");
        } else if (err.message.includes("404")) {
          setError("Sales data endpoint not found. Please check your configuration.");
          toast.error("Config Error", "API endpoint not found.");
        } else if (err.message.includes("500")) {
          setError("Server error. Please try again later.");
          toast.error("Server Error", "Please try again later.");
        } else {
          setError(`Failed to load sales data: ${err.message}`);
          toast.error("Error", err.message || "Error fetching sales");
        }
        
        setData([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
        setTableLoading(false);
        isLoadingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [isAuthenticated, authLoading, authError, user, toast]
  );

  const fetchSales = fetchSalesStable;

  const fetchStats = useCallback(
    async (statsFilters = {}) => {
      try {
        const statsData = await salesAdvancedService.getSalesStats(
          statsFilters
        );
        setStats(statsData);
        return statsData;
      } catch (err) {
        toast.error("Stats Error", err.message || "Error fetching stats");
        return {};
      }
    },
    [toast]
  );

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
        toast.success("Exported", `Data exported as ${format.toUpperCase()}`);
      } catch (err) {
        toast.error("Export Error", err.message || "Error exporting sales");
        setError(`Export failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [toast]
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
      fetchSalesStable(newFilters, false);
    },
    [fetchSalesStable]
  );

  const applyFilters = useCallback(
    (newFilters) => {
      fetchSalesStable({ ...newFilters, page: 1 }, false);
    },
    [fetchSalesStable]
  );

  const resetFilters = useCallback(() => {
    const currentDefaultFilters = defaultFiltersRef.current;
    setFilters(currentDefaultFilters);
    filtersRef.current = currentDefaultFilters;
    fetchSalesStable(currentDefaultFilters, false);
  }, [fetchSalesStable]);

  const searchSales = useCallback(
    async (searchTerm, searchFields = []) => {
      const searchFilters = {
        search: searchTerm,
        ...(searchFields.length && { searchFields }),
        page: 1,
      };
      await fetchSalesStable(searchFilters, false);
    },
    [fetchSalesStable]
  );

  const searchByLocation = useCallback(
    async (states = [], cities = [], lgas = []) => {
      const locationFilters = {
        ...(states.length && { states }),
        ...(cities.length && { cities }),
        ...(lgas.length && { lgas }),
        page: 1,
      };
      await fetchSalesStable(locationFilters, false);
    },
    [fetchSalesStable]
  );

  const searchByAmount = useCallback(
    async (amountMin, amountMax) => {
      const amountFilters = {
        amountMin,
        amountMax,
        page: 1,
      };
      await fetchSalesStable(amountFilters, false);
    },
    [fetchSalesStable]
  );

  const searchByDateRange = useCallback(
    async (dateFrom, dateTo) => {
      const dateFilters = {
        dateFrom,
        dateTo,
        page: 1,
      };
      await fetchSalesStable(dateFilters, false);
    },
    [fetchSalesStable]
  );

  useEffect(() => {
    if (!isAuthenticated || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentDefaultFilters = defaultFiltersRef.current;
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
        } else {
          throw new Error(
            salesResponse.message || "Failed to fetch initial sales data"
          );
        }
        try {
          const statsData = await salesAdvancedService.getSalesStats(
            currentDefaultFilters
          );
          setStats(statsData);
        } catch (statsErr) {
          toast.error(
            "Stats Error",
            statsErr.message || "Error fetching initial stats"
          );
        }
      } catch (err) {
        toast.error("Load Error", err.message || "Error loading initial data");
        setError(`Failed to load initial data: ${err.message}`);
        setData([]);
        setPagination({ page: 1, limit: 100, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [isAuthenticated, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated]);

  return {
    data,
    loading,
    tableLoading,
    error,
    pagination,
    filters,
    stats,
    fetchSales,
    fetchStats,
    exportSales,
    handleTableChange,
    applyFilters,
    resetFilters,
    searchSales,
    searchByLocation,
    searchByAmount,
    searchByDateRange,
    service: salesAdvancedService,
  };
};

export default useSalesAdvanced;
