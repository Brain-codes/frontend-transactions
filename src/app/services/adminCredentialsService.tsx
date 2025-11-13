"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import tokenManager from "@/utils/tokenManager";

interface Credential {
  partner_id: string;
  partner_name: string;
  email: string;
  password: string;
  is_dummy_email: boolean;
  username: string;
  created_at: string;
  updated_at?: string;
  organizations?: {
    partner_name: string;
    contact_person?: string;
    state?: string;
    branch?: string;
  };
}

interface ServiceResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  count?: number;
}

class AdminCredentialsService {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Get JWT token using tokenManager (with automatic refresh)
   */
  private async getToken(): Promise<string | null> {
    try {
      return await tokenManager.getValidToken();
    } catch (error) {
      console.error("🔑 [AdminCredentials] Token error:", error);
      return null;
    }
  }

  /**
   * Get authorization headers with JWT token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get base API URL
   */
  private getApiUrl(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    }
    return `${supabaseUrl}/functions/v1/manage-credentials`;
  }

  /**
   * Fetch all credentials
   */
  async getAllCredentials(): Promise<ServiceResponse<Credential[]>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(this.getApiUrl(), {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || "Failed to fetch credentials",
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || [],
        error: null,
        count: result.count || 0,
      };
    } catch (error) {
      console.error("Error fetching credentials:", error);
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  }

  /**
   * Get credential by partner ID
   */
  async getCredentialByPartnerId(
    partnerId: string
  ): Promise<ServiceResponse<Credential>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.getApiUrl()}?partner_id=${encodeURIComponent(partnerId)}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || "Failed to fetch credential",
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || null,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching credential:", error);
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  }

  /**
   * Reset password for an organization
   * Requires Super Admin password verification
   */
  async resetPassword(
    partnerId: string,
    newPassword: string,
    superAdminEmail: string,
    superAdminPassword: string
  ): Promise<ServiceResponse<{ message: string }>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.getApiUrl()}/update-password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          partner_id: partnerId,
          new_password: newPassword,
          super_admin_email: superAdminEmail,
          super_admin_password: superAdminPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: result.error || "Failed to reset password",
        };
      }

      return {
        success: true,
        data: { message: result.message || "Password reset successfully" },
        error: null,
      };
    } catch (error) {
      console.error("Error resetting password:", error);
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  }

  /**
   * Generate a secure random password
   */
  async generatePassword(length: number = 16): Promise<ServiceResponse<string>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.getApiUrl()}/generate-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ length }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || "Failed to generate password",
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result.password || null,
        error: null,
      };
    } catch (error) {
      console.error("Error generating password:", error);
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  }

  /**
   * Get current user's email from session
   */
  async getCurrentUserEmail(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      return session?.user?.email || null;
    } catch (error) {
      console.error("Error getting current user email:", error);
      return null;
    }
  }
}

// Export singleton instance
const adminCredentialsService = new AdminCredentialsService();
export default adminCredentialsService;
export type { Credential, ServiceResponse };
