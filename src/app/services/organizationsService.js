// Service for fetching organizations data from Supabase
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

class OrganizationsService {
  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Fetch all organizations
  async getAllOrganizations() {
    try {
      const { data, error } = await this.supabase
        .from("organizations")
        .select("id, name, partner_email, created_at")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching organizations:", error);
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      // Normalize the data to ensure we have a consistent name field
      const normalizedData = (data || []).map((org) => ({
        ...org,
        displayName:
          org.name && org.name.trim() ? org.name : `Organization ${org.id}`,
      }));

      return {
        success: true,
        data: normalizedData,
        count: normalizedData.length,
      };
    } catch (error) {
      console.error("Service error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Fetch active organizations only (if you add a status field later)
  async getActiveOrganizations() {
    try {
      // Since there's no status field, just return all organizations
      // You can modify this later if you add a status field to your table
      return await this.getAllOrganizations();
    } catch (error) {
      console.error("Service error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get organization by ID
  async getOrganizationById(id) {
    try {
      const { data, error } = await this.supabase
        .from("organizations")
        .select("id, name, partner_email, created_at")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching organization:", error);
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return {
        success: true,
        data: {
          ...data,
          displayName:
            data.name && data.name.trim()
              ? data.name
              : `Organization ${data.id}`,
        },
      };
    } catch (error) {
      console.error("Service error:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  // Search organizations by name
  async searchOrganizations(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from("organizations")
        .select("id, name, partner_email, created_at")
        .ilike("name", `%${searchTerm}%`)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error searching organizations:", error);
        throw new Error(`Failed to search organizations: ${error.message}`);
      }

      // Normalize the data
      const normalizedData = (data || []).map((org) => ({
        ...org,
        displayName:
          org.name && org.name.trim() ? org.name : `Organization ${org.id}`,
      }));

      return {
        success: true,
        data: normalizedData,
        count: normalizedData.length,
      };
    } catch (error) {
      console.error("Service error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}

// Create and export a singleton instance
const organizationsService = new OrganizationsService();

export default organizationsService;
