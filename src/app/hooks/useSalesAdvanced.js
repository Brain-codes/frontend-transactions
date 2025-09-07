"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import salesAdvancedService from "../services/salesAdvancedAPIService";
import { safeFetchManager } from "../../utils/safeFetch";

export const useSalesAdvanced = (initialFilters = {}) => {
  const { user, isAuthenticated } = useAuth();
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

  // Component lifecycle management
  const isMountedRef = useRef(true);
  const componentName = "SalesAdvanced";
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastNavigationRef = useRef(Date.now());

  // Reset initialization when auth changes or component remounts
  useEffect(() => {
    isMountedRef.current = true;
    lastNavigationRef.current = Date.now();

    return () => {
      isMountedRef.current = false;
      safeFetchManager.abortComponentRequests(componentName);
    };
  }, [user?.id, isAuthenticated]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = typeof window !== "undefined" ? !document.hidden : true;
      if (isVisible && isMountedRef.current) {
        // If we were loading when tab was hidden, reset state
        if (isLoadingRef.current) {
          isLoadingRef.current = false;
          setLoading(false);
          setTableLoading(false);
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () =>
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
    }
  }, []);

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

  useEffect(() => {
    defaultFiltersRef.current = defaultFilters;
  }, [defaultFilters]);

  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
    }
  }, [filters]);

  // Safe state update helper
  const safeSetState = useCallback((updater) => {
    if (isMountedRef.current) {
      if (typeof updater === "function") {
        return updater();
      } else {
        return updater;
      }
    }
    console.log(
      `🔍 [${componentName}] Skipped state update - component unmounted`
    );
  }, []);

  // Main fetch function with enhanced error handling and lifecycle management
  const fetchSalesStable = useCallback(
    async (newFilters = {}, isInitial = false) => {
      if (!isAuthenticated) {
        safeSetState(() => {
          setError("Please login to access sales data.");
          setLoading(false);
          setTableLoading(false);
        });
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        console.log(`🔍 [${componentName}] Starting fetch...`);

        // Clear any stuck token refresh before making request
        safeFetchManager.clearTokenRefresh();

        safeSetState(() => {
          if (isInitial) {
            setLoading(true);
          } else {
            setTableLoading(true);
          }
          setError(null);
        });

        const currentFilters = filtersRef.current;
        const mergedFilters = { ...currentFilters, ...newFilters };

        const response = await salesAdvancedService.getSalesData(
          mergedFilters,
          "POST",
          componentName
        );

        if (!isMountedRef.current) {
          return;
        }

        console.log(`🔍 [${componentName}] API response received:`, {
          success: response?.success,
          dataLength: response?.data?.length || 0,
        });

        if (response.success) {
          safeSetState(() => {
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
            filtersRef.current = mergedFilters;
            setFilters((prevFilters) => {
              if (
                JSON.stringify(prevFilters) !== JSON.stringify(mergedFilters)
              ) {
                return mergedFilters;
              }
              return prevFilters;
            });
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
        console.error(`🔍 [${componentName}] Fetch error:`, err.message);

        if (!isMountedRef.current) {
          console.log(
            `🔍 [${componentName}] Component unmounted during error handling - ignoring`
          );
          return;
        }

        toast.error("Error", err.message || "Error fetching sales");

        safeSetState(() => {
          if (
            err.message.includes("401") ||
            err.message.includes("Unauthorized") ||
            err.message.includes("Missing authorization header") ||
            err.message.includes("Authentication required")
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
          } else if (
            err.message.includes("cancelled") ||
            err.message.includes("aborted")
          ) {
            console.log(
              `🔍 [${componentName}] Request was cancelled - not setting error`
            );
            // Don't set error for cancelled requests
            return;
          } else {
            setError(`Failed to load sales data: ${err.message}`);
          }
          setData([]);
          setPagination({ page: 1, limit: 100, total: 0, totalPages: 0 });
        });
      } finally {
        console.log(
          `🔍 [${componentName}] Fetch completed - resetting loading states`
        );

        isLoadingRef.current = false;

        if (isMountedRef.current) {
          safeSetState(() => {
            setLoading(false);
            setTableLoading(false);
          });
        }
      }
    },
    [isAuthenticated, user, toast, safeSetState]
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

        // If we have specific IDs to export (for selected items)
        if (
          exportFilters.ids &&
          Array.isArray(exportFilters.ids) &&
          exportFilters.ids.length > 0
        ) {
          // For selected items, we need to get the current data and filter by IDs
          const selectedData = data.filter(
            (sale) =>
              exportFilters.ids.includes(sale.id.toString()) ||
              exportFilters.ids.includes(sale.id)
          );

          if (selectedData.length === 0) {
            throw new Error("No selected items found to export");
          }

          // Use our custom CSV formatter directly
          const { formatSalesDataToCSV, downloadCSV } = await import(
            "../../utils/csvExportUtils"
          );
          const csvContent = formatSalesDataToCSV(selectedData);
          const filename = `sales-export-selected-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          downloadCSV(csvContent, filename);

          toast.success(
            "Exported",
            `${selectedData.length} selected items exported as CSV`
          );
          return;
        }

        // For normal export (all data with filters)
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
    [toast, data]
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
      fetchSalesStable(newFilters, false);
    },
    [fetchSalesStable]
  );

  const resetFilters = useCallback(() => {
    const currentDefaultFilters = defaultFiltersRef.current;
    setFilters(currentDefaultFilters);
    filtersRef.current = currentDefaultFilters;
    fetchSalesStable(currentDefaultFilters, false);
  }, [fetchSalesStable]);

  // Emergency reset method (callable from console)
  const emergencyReset = useCallback(() => {
    console.log(`🔍 [${componentName}] EMERGENCY RESET TRIGGERED`);

    // Clear all stuck states
    safeFetchManager.clearTokenRefresh();
    safeFetchManager.abortComponentRequests(componentName);
    isLoadingRef.current = false;
    hasInitializedRef.current = false;

    // Reset component state
    setLoading(false);
    setTableLoading(false);
    setError(null);

    // Trigger fresh initialization
    const currentDefaultFilters = defaultFiltersRef.current;
    fetchSalesStable(currentDefaultFilters, true);
  }, [fetchSalesStable]);

  // Expose emergency reset globally for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.emergencyResetSales = emergencyReset;
      return () => {
        delete window.emergencyResetSales;
      };
    }
  }, [emergencyReset]);

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

  // Enhanced initialization effect with proper cleanup and navigation handling
  useEffect(() => {
    console.log(`🔍 [${componentName}] Init effect triggered:`, {
      isAuthenticated,
      hasInitialized: hasInitializedRef.current,
      isMounted: isMountedRef.current,
      lastNavigation: lastNavigationRef.current,
    });

    // Reset initialization flag if auth changes or we navigate back
    if (!isAuthenticated) {
      hasInitializedRef.current = false;
      console.log(
        `🔍 [${componentName}] Auth lost - reset initialization flag`
      );
      return;
    }

    // Check if we should reinitialize (navigation back to component)
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationRef.current;

    // Be more aggressive about reinitializing - if less than 5 seconds, likely a navigation
    const shouldReinitialize =
      timeSinceLastNav < 5000 || !hasInitializedRef.current;

    if (shouldReinitialize) {
      hasInitializedRef.current = true;
      lastNavigationRef.current = now;

      console.log(`🔍 [${componentName}] Starting initialization...`, {
        shouldReinitialize,
        timeSinceLastNav,
        reason:
          timeSinceLastNav < 5000 ? "recent_navigation" : "not_initialized",
      });

      const loadInitialData = async () => {
        try {
          if (!isMountedRef.current) {
            console.log(
              `🔍 [${componentName}] Component unmounted during init - aborting`
            );
            return;
          }

          console.log(`🔍 [${componentName}] Loading initial data...`);
          setLoading(true);
          setError(null);

          // Clear any stuck token refresh before starting
          safeFetchManager.clearTokenRefresh();

          const currentDefaultFilters = defaultFiltersRef.current;

          const salesResponse = await salesAdvancedService.getSalesData(
            currentDefaultFilters,
            "POST",
            componentName
          );

          if (!isMountedRef.current) {
            console.log(
              `🔍 [${componentName}] Component unmounted during initial load - ignoring response`
            );
            return;
          }

          if (salesResponse.success) {
            console.log(
              `🔍 [${componentName}] Initial data loaded successfully`
            );

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

          // Load stats if component is still mounted
          if (isMountedRef.current) {
            try {
              const statsData = await salesAdvancedService.getSalesStats(
                currentDefaultFilters
              );
              if (isMountedRef.current) {
                setStats(statsData);
              }
            } catch (statsErr) {
              console.warn(
                `🔍 [${componentName}] Stats load failed:`,
                statsErr.message
              );
              if (isMountedRef.current) {
                toast.error(
                  "Stats Error",
                  statsErr.message || "Error fetching initial stats"
                );
              }
            }
          }
        } catch (err) {
          console.error(
            `🔍 [${componentName}] Initial load failed:`,
            err.message
          );

          if (!isMountedRef.current) {
            console.log(
              `🔍 [${componentName}] Component unmounted during error handling - ignoring`
            );
            return;
          }

          if (
            !err.message.includes("cancelled") &&
            !err.message.includes("aborted")
          ) {
            toast.error(
              "Load Error",
              err.message || "Error loading initial data"
            );
            setError(`Failed to load initial data: ${err.message}`);
          }

          setData([]);
          setPagination({ page: 1, limit: 100, total: 0, totalPages: 0 });
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };

      loadInitialData();
    }
  }, [isAuthenticated, toast]);

  // Reset initialization when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitializedRef.current = false;
      console.log(
        `🔍 [${componentName}] Auth state changed - reset initialization`
      );
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
