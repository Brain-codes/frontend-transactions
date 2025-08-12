"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import organizationsAPIService from "../services/organizationsAPIService";

export const useOrganizations = (initialFilters = {}) => {
  const { user, isAuthenticated } = useAuth();
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

  // Use ref to store current filters to avoid infinite loops
  const filtersRef = useRef(filters);
  const defaultFiltersRef = useRef(defaultFilters);
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    defaultFiltersRef.current = defaultFilters;
  }, [defaultFilters]);

  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
    }
  }, [filters]);

  // Create a stable fetch function
  const fetchOrganizationsStable = useCallback(
    async (newFilters = {}, isInitial = false) => {
      // Check authentication first
      if (!isAuthenticated) {
        setError("Please login to access organizations data.");
        setLoading(false);
        setTableLoading(false);
        return;
      }

      // Prevent concurrent calls
      if (isLoadingRef.current) {
        console.log("API call already in progress, skipping...");
        return;
      }

      isLoadingRef.current = true;

      // Use different loading states based on whether this is initial load or filter/pagination
      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }

      setError(null);

      try {
        // Use the ref to get current filters
        const currentFilters = filtersRef.current;
        const mergedFilters = { ...currentFilters, ...newFilters };

        // Convert page to offset for API
        const apiFilters = {
          ...mergedFilters,
          offset: ((mergedFilters.page || 1) - 1) * (mergedFilters.limit || 10),
        };
        delete apiFilters.page; // Remove page as API uses offset

        console.log("Fetching organizations with filters:", apiFilters);
        console.log("User authenticated:", isAuthenticated, "User:", user);

        const response = await organizationsAPIService.getAllOrganizations(
          apiFilters
        );
        console.log("API Response:", response);

        if (response.success) {
          setData(response.data || []);

          // Convert API pagination to our format
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
            console.log(`Loaded ${response.data.length} organizations`);
          }
        } else {
          throw new Error(
            response.error || "Failed to fetch organizations data"
          );
        }
      } catch (err) {
        console.error("Error fetching organizations:", err);

        // Show user-friendly error message based on error type
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
    [isAuthenticated, user]
  );

  // Keep the original fetchOrganizations for backward compatibility
  const fetchOrganizations = fetchOrganizationsStable;

  // Create organization
  const createOrganization = useCallback(
    async (organizationData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await organizationsAPIService.createOrganization(
          organizationData
        );

        if (response.success) {
          // Refresh the data after creation
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to create organization");
        }
      } catch (err) {
        console.error("Error creating organization:", err);
        setError(`Failed to create organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable]
  );

  // Update organization
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
          // Refresh the data after update
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to update organization");
        }
      } catch (err) {
        console.error("Error updating organization:", err);
        setError(`Failed to update organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable]
  );

  // Delete organization
  const deleteOrganization = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        const response = await organizationsAPIService.deleteOrganization(id);

        if (response.success) {
          // Refresh the data after deletion
          await fetchOrganizationsStable({}, false);
          return response;
        } else {
          throw new Error(response.error || "Failed to delete organization");
        }
      } catch (err) {
        console.error("Error deleting organization:", err);
        setError(`Failed to delete organization: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchOrganizationsStable]
  );

  // Export organizations
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
          console.log(`Successfully exported data as ${format.toUpperCase()}`);
        } else {
          throw new Error(response.error || "Export failed");
        }
      } catch (err) {
        console.error("Error exporting organizations:", err);
        setError(`Export failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Apply filters
  const applyFilters = useCallback(
    (newFilters) => {
      fetchOrganizationsStable({ ...newFilters, page: 1 }, false);
    },
    [fetchOrganizationsStable]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    const currentDefaultFilters = defaultFiltersRef.current;
    setFilters(currentDefaultFilters);
    filtersRef.current = currentDefaultFilters;
    fetchOrganizationsStable(currentDefaultFilters, false);
  }, [fetchOrganizationsStable]);

  // Search functionality
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

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated || hasInitializedRef.current) return;

    hasInitializedRef.current = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentDefaultFilters = defaultFiltersRef.current;
        console.log(
          "Loading initial organizations data with filters:",
          currentDefaultFilters
        );

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
        console.error("Error loading initial organizations data:", err);
        setError(`Failed to load initial data: ${err.message}`);
        setData([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated]);

  // Reset the initialization flag when authentication changes
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

    // Core functions
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    exportOrganizations,

    // Event handlers
    applyFilters,
    resetFilters,

    // Search functions
    searchOrganizations,

    // Direct access to service for advanced use cases
    service: organizationsAPIService,
  };
};

export default useOrganizations;
