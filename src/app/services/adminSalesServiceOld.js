"use client";

// Admin Sales Service for managing sales CRUD operations
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://your-supabase-project.supabase.co";

class AdminSalesService {
  constructor() {
    this.supabase = createClientComponentClient();
    this.getSalesAdvancedURL = `${API_BASE_URL}/functions/v1/get-sales-advanced`;
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
    } catch {
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

  // Get sales data with advanced filtering (used by admin sales page)
  async getSalesAdvanced(filters = {}) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(this.getSalesAdvancedURL, {
        method: "POST",
        headers,
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || [],
        pagination: data.pagination || {},
        error: null,
      };
    } catch (error) {
      console.error("Error fetching sales data:", error);
      return {
        success: false,
        data: [],
        pagination: {},
        error: error.message || "Failed to fetch sales data",
      };
    }
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

  // Create a new sale
  async createSale(saleData) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(this.createSaleURL, {
        method: "POST",
        headers,
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        error: null,
      };
    } catch (error) {
      console.error("Error creating sale:", error);
      return {
        success: false,
        data: null,
        error: error.message || "Failed to create sale",
      };
    }
  }

  // Upload image for sale (stove images, agreement documents)
  async uploadImage(base64Data, filename, folder = "sales_images") {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(this.uploadImageURL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file: base64Data,
          filename: filename,
          folder: folder,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
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

  // Helper function to convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/[type];base64, prefix
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // Export sales data
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
}

// Export singleton instance
const adminSalesService = new AdminSalesService();
export default adminSalesService;
