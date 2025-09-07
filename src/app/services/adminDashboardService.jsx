// Admin Dashboard Service for fetching dashboard statistics
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import tokenManager from "../../utils/tokenManager";

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class AdminDashboardService {
  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Get token using tokenManager
  async getToken() {
    try {
      return await tokenManager.getValidToken();
    } catch (error) {
      console.error("🏢 [AdminDashboard] Token error:", error);
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

  // Get dashboard statistics for admin
  async getDashboardStats() {
    try {
      const response = await fetch(`${API_FUNCTIONS_URL}/get-dashboard-stats`, {
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
        throw new Error(
          result.message || "Failed to fetch dashboard statistics"
        );
      }
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Get user profile with organization details
  async getUserProfile(userId = null) {
    try {
      const payload = userId ? { userId } : {};

      const response = await fetch(`${API_FUNCTIONS_URL}/get-user-profile`, {
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
        throw new Error(result.message || "Failed to fetch user profile");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
}

// Create and export a singleton instance
const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;
