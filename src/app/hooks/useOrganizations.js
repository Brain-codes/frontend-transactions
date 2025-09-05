"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import organizationsAPIService from "../services/organizationsAPIService";

export const useOrganizations = (initialFilters = {}) => {
  const {isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const defaultFilters = useMemo(
    () => ({
      limit: 10,
      offset: 0,
      sortBy: "created_at",
      sortOrder: "desc",
      ...initialFilters,
    }),
    [initialFilters]
  );

  const [filters, setFilters] = useState(defaultFilters);
  const filtersRef = useRef(filters);
  const defaultFiltersRef = useRef(defaultFilters);
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    defaultFiltersRef.current = defaultFilters;
  }, [defaultFilters]);

  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
    }
  }, [filters]);

  // Main fetch function
  const fetchOrganizationsStable = useCallback(
    async (newFilters = {}, isInitial = false) => {
      if (!isAuthenticated) {
        setError("Please login to access organizations data.");
        setLoading(false);
        setTableLoading(false);
        return;
      }
      if (isLoadingRef.current) {
        // Optionally: toast.info("API call already in progress, skipping...");
        return;
      }
      isLoadingRef.current = true;
      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      setError(null);
      try {
        const currentFilters = filtersRef.current;
        const mergedFilters = { ...currentFilters, ...newFilters };
        const apiFilters = {
          ...mergedFilters,
          offset: ((mergedFilters.page || 1) - 1) * (mergedFilters.limit || 10),
        };
        delete apiFilters.page;
        const response = await organizationsAPIService.getAllOrganizations(
          apiFilters
        );
        if (response.success) {
          setData(response.data || []);
          const apiPagination = response.pagination || {};
          setPagination({
            page:
              Math.floor(
                (apiPagination.offset || 0) / (apiPagination.limit || 10)
              ) + 1,
            limit: apiPagination.limit || 10,
            total: apiPagination.total || 0,
            totalPages: Math.ceil(
              (apiPagination.total || 0) / (apiPagination.limit || 10)
            ),
          });
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
              `${response.data.length} organizations loaded successfully`
            );
          }
        } else {
          throw new Error(
            response.error || "Failed to fetch organizations data"
          );
        }
      } catch (err) {
        toast.error("Error", err.message || "Error fetching organizations");
        if (
          err.message.includes("401") ||
          err.message.includes("Unauthorized") ||
          err.message.includes("Missing authorization header")
        ) {
          setError(
            "Authentication required. Please login to access organizations data."
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
            "Organizations data endpoint not found. Please check your configuration."
          );
        } else if (err.message.includes("500")) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Failed to load organizations data: ${err.message}`);
        }
        setData([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
        setTableLoading(false);
        isLoadingRef.current = false;
      }
    },
    [isAuthenticated, toast]
  );

  const fetchOrganizations = fetchOrganizationsStable;

  const createOrganization = useCallback(
    async (organizationData) => {
      setLoading(true);
      setError(null);
      try {
        const response = await organizationsAPIService.createOrganization(
          organizationData
        );
        if (response.success) {
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to create organization");
        }
      } catch (err) {
        toast.error(
          "Create Error",
          err.message || "Failed to create organization"
        );
        setError(`Failed to create organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable, toast]
  );

  const updateOrganization = useCallback(
    async (id, organizationData) => {
      setLoading(true);
      setError(null);
      try {
        const response = await organizationsAPIService.updateOrganization(
          id,
          organizationData
        );
        if (response.success) {
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to update organization");
        }
      } catch (err) {
        toast.error(
          "Update Error",
          err.message || "Failed to update organization"
        );
        setError(`Failed to update organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable, toast]
  );

  const deleteOrganization = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const response = await organizationsAPIService.deleteOrganization(id);
        if (response.success) {
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to delete organization");
        }
      } catch (err) {
        toast.error(
          "Delete Error",
          err.message || "Failed to delete organization"
        );
        setError(`Failed to delete organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable, toast]
  );

  const exportOrganizations = useCallback(
    async (exportFilters = {}, format = "csv") => {
      setLoading(true);
      try {
        const currentFilters = filtersRef.current;
        const response = await organizationsAPIService.exportOrganizations(
          { ...currentFilters, ...exportFilters },
          format
        );
        if (response.success) {
          toast.success("Exported", `Data exported as ${format.toUpperCase()}`);
        } else {
          throw new Error(response.error || "Export failed");
        }
      } catch (err) {
        toast.error(
          "Export Error",
          err.message || "Error exporting organizations"
        );
        setError(`Export failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const applyFilters = useCallback(
    (newFilters) => {
      fetchOrganizationsStable({ ...newFilters, page: 1 }, false);
    },
    [fetchOrganizationsStable]
  );

  const resetFilters = useCallback(() => {
    const currentDefaultFilters = defaultFiltersRef.current;
    setFilters(currentDefaultFilters);
    filtersRef.current = currentDefaultFilters;
    fetchOrganizationsStable(currentDefaultFilters, false);
  }, [fetchOrganizationsStable]);

  const searchOrganizations = useCallback(
    async (searchTerm) => {
      const searchFilters = {
        search: searchTerm,
        page: 1,
      };
      await fetchOrganizationsStable(searchFilters, false);
    },
    [fetchOrganizationsStable]
  );

  useEffect(() => {
    if (!isAuthenticated || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentDefaultFilters = defaultFiltersRef.current;
        const response = await organizationsAPIService.getAllOrganizations(
          currentDefaultFilters
        );
        if (response.success) {
          setData(response.data || []);
          const apiPagination = response.pagination || {};
          setPagination({
            page:
              Math.floor(
                (apiPagination.offset || 0) / (apiPagination.limit || 10)
              ) + 1,
            limit: apiPagination.limit || 10,
            total: apiPagination.total || 0,
            totalPages: Math.ceil(
              (apiPagination.total || 0) / (apiPagination.limit || 10)
            ),
          });
          setFilters(currentDefaultFilters);
          filtersRef.current = currentDefaultFilters;
        } else {
          throw new Error(
            response.error || "Failed to fetch initial organizations data"
          );
        }
      } catch (err) {
        toast.error(
          "Load Error",
          err.message || "Error loading initial organizations data"
        );
        setError(`Failed to load initial data: ${err.message}`);
        setData([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
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
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    exportOrganizations,
    applyFilters,
    resetFilters,

    searchOrganizations,
    service: organizationsAPIService,
  };
};

export default useOrganizations;
