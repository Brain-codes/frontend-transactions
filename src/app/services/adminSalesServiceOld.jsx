// Admin Sales Service for sales management operations
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class AdminSalesService {
  constructor() {
    this.supabase = createClientComponentClient();
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

  // Get available stove IDs for sale creation
  async getAvailableStoveIds(organizationId = null) {
    try {
      const payload = organizationId ? { organization_id: organizationId } : {};

      const response = await fetch(`${API_FUNCTIONS_URL}/get-stove-ids`, {
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
        throw new Error(result.message || "Failed to fetch stove IDs");
      }

      return {
        success: true,
        data: result.data,
        totals: result.totals,
      };
    } catch (error) {
      console.error("Error fetching stove IDs:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        totals: null,
      };
    }
  }

  // Upload image for sales (stove or agreement)
  async uploadImage(imageBase64, filename, folder = "stove_images") {
    try {
      const payload = {
        image: imageBase64,
        filename,
        folder,
      };

      const response = await fetch(`${API_FUNCTIONS_URL}/upload-image`, {
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
        throw new Error(result.message || "Failed to upload image");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      return {
        success: false,
        error: error.message,
        data: null,
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
        saleId,
        ...updateData,
      };

      const response = await fetch(`${API_FUNCTIONS_URL}/update-sale`, {
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

  // Convert image file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:image/jpeg;base64, prefix
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
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
