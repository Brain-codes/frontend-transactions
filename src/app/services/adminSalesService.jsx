// Admin Sales Service for sales management operations
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class AdminSalesService {
  constructor() {
    this.supabase = createClientComponentClient();
    this.createSaleURL = `${API_BASE_URL}/functions/v1/create-sale`;
    this.uploadImageURL = `${API_BASE_URL}/functions/v1/upload-image`;
    this.getStovesURL = `${API_BASE_URL}/functions/v1/get-stove-ids`; // Updated to match Flutter
  }

  // Get token from Supabase session
  async getToken() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      return null;
    }
  }

  // Helper method to build headers
  async getHeaders() {
    const token = await this.getToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Get available stove IDs for creating new sales
  async getAvailableStoveIds(organizationId = null, status = "available") {
    try {
      const headers = await this.getHeaders();

      // Prepare request body similar to Flutter code
      const requestBody = {};
      if (organizationId) {
        requestBody.organization_id = organizationId;
      }
      if (status) {
        requestBody.status = status;
      }

      const response = await fetch(this.getStovesURL, {
        method: "POST", // Changed to POST to send body with organization_id
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats like in Flutter code
      let stoveIDList;
      if (data.data && Array.isArray(data.data)) {
        stoveIDList = data.data;
      } else if (Array.isArray(data)) {
        stoveIDList = data;
      } else {
        console.error("Unexpected response format:", typeof data);
        return {
          success: false,
          data: [],
          error: "Unexpected response format from server",
        };
      }

      return {
        success: true,
        data: stoveIDList,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching available stoves:", error);
      return {
        success: false,
        data: [],
        error: error.message || "Failed to fetch available stoves",
      };
    }
  }

  // Upload image for sales (stove images, agreement documents) - Updated to match Flutter
  async uploadImage(file, type) {
    try {
      const token = await this.getToken();

      // Create FormData to match Flutter implementation
      // FormData is a standard Web API available in browsers
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData, let browser set it with boundary

      const response = await fetch(`${API_FUNCTIONS_URL}/upload-image`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
        error: null,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      return {
        success: false,
        data: null,
        error: error.message || "Failed to upload image",
      };
    }
  }

  // Create a new sale
  async createSale(saleData) {
    try {
      const response = await fetch(`${API_FUNCTIONS_URL}/create-sale`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to create sale");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error creating sale:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Update an existing sale
  async updateSale(saleId, updateData) {
    try {
      const payload = {
        ...updateData,
      };

      const response = await fetch(
        `${API_FUNCTIONS_URL}/update-sale?id=${saleId}`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to update sale");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error updating sale:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Get individual sale details
  async getSale(saleId) {
    try {
      const payload = { saleId };

      const response = await fetch(`${API_FUNCTIONS_URL}/get-sale`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch sale details");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error fetching sale:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  async exportSales(filters = {}, format = "csv") {
    try {
      const exportFilters = { ...filters, export: format };
      const headers = await this.getHeaders();
      const response = await fetch(this.getSalesAdvancedURL, {
        method: "POST",
        headers,
        body: JSON.stringify(exportFilters),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // For CSV/XLSX, return blob for download
      if (format === "csv" || format === "xlsx") {
        const blob = await response.blob();
        return {
          success: true,
          data: blob,
          error: null,
        };
      }

      // For JSON, return parsed data
      const data = await response.json();
      return {
        success: true,
        data: data,
        error: null,
      };
    } catch (error) {
      console.error("Error exporting sales data:", error);
      return {
        success: false,
        data: null,
        error: error.message || "Failed to export sales data",
      };
    }
  }

  // Get sales (simple, direct call to edge function)
  async getSalesAdvanced({
    page = 1,
    limit = 50,
    query,
    from,
    to,
    state,
    lga,
  } = {}) {
    try {
      const queryParams = {
        page: page.toString(),
        limit: limit.toString(),
        ...(query ? { query } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(state ? { state } : {}),
        ...(lga ? { lga } : {}),
      };

      const url = new URL(`${API_FUNCTIONS_URL}/get-sales`);
      Object.entries(queryParams).forEach(([key, value]) =>
        url.searchParams.append(key, value)
      );

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch sales");
      }

      return {
        success: true,
        data: result.sales,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error fetching sales:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  // Log sales activity
  async logSalesActivity(saleId, activityType, description, metadata = null) {
    try {
      const payload = {
        saleId,
        activityType,
        description,
        metadata,
      };

      const response = await fetch(`${API_FUNCTIONS_URL}/log-sales-activity`, {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to log activity");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error logging sales activity:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Get sales activities for a sale
  async getSalesActivities(saleId = null, userId = null, page = 1, limit = 50) {
    try {
      const payload = {
        ...(saleId && { saleId }),
        ...(userId && { userId }),
        page,
        limit,
      };

      const response = await fetch(
        `${API_FUNCTIONS_URL}/get-sales-activities`,
        {
          method: "POST",
          headers: await this.getHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch activities");
      }

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Error fetching sales activities:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: null,
      };
    }
  }

  // Validate sale data before submission
  validateSaleData(saleData) {
    const errors = [];

    // Required fields validation
    if (!saleData.endUserName?.trim()) {
      errors.push("End user name is required");
    }
    if (!saleData.phone?.trim()) {
      errors.push("Phone number is required");
    }
    if (!saleData.partnerName?.trim()) {
      errors.push("Partner name is required");
    }
    if (!saleData.amount || saleData.amount <= 0) {
      errors.push("Valid sale amount is required");
    }
    if (!saleData.stoveSerialNo?.trim()) {
      errors.push("Stove serial number is required");
    }
    if (!saleData.stateBackup?.trim()) {
      errors.push("State is required");
    }
    if (!saleData.lgaBackup?.trim()) {
      errors.push("LGA is required");
    }

    // Address data validation
    if (!saleData.addressData) {
      errors.push("Address information is required");
    } else {
      if (!saleData.addressData.street?.trim()) {
        errors.push("Street address is required");
      }
      if (!saleData.addressData.city?.trim()) {
        errors.push("City is required");
      }
      if (typeof saleData.addressData.latitude !== "number") {
        errors.push("Valid latitude coordinate is required");
      }
      if (typeof saleData.addressData.longitude !== "number") {
        errors.push("Valid longitude coordinate is required");
      }
    }

    // Signature validation
    if (!saleData.signature?.trim()) {
      errors.push("Digital signature is required");
    }

    // Image validation
    if (!saleData.stoveImageId?.trim()) {
      errors.push("Stove image is required");
    }
    if (!saleData.agreementImageId?.trim()) {
      errors.push("Agreement document image is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create and export a singleton instance
const adminSalesService = new AdminSalesService();
export default adminSalesService;
