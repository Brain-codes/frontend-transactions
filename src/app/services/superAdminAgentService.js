// Super Admin Agent Service
// Handles all API calls for super_admin_agent user management and their portal operations
import tokenManager from "../../utils/tokenManager";

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class SuperAdminAgentService {
  // Get a valid auth token
  async getToken() {
    try {
      return await tokenManager.getValidToken();
    } catch (error) {
      console.error("🤝 [SuperAdminAgentService] Token error:", error);
      return null;
    }
  }

  // Build request headers
  async getHeaders() {
    const token = await this.getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // Helper: make a fetch call and parse response
  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: await this.getHeaders(),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (!result.success) {
      throw new Error(result.message || "Request failed");
    }

    return result;
  }

  // ─── Super Admin: Manage SAA Users ────────────────────────────────────────

  // List all super admin agents
  async getSuperAdminAgents(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") qs.append(k, v);
    });
    const url = `${API_FUNCTIONS_URL}/super-admin-agents${qs.toString() ? "?" + qs.toString() : ""}`;
    return await this.request(url, { method: "GET" });
  }

  // Get a single super admin agent by ID
  async getSuperAdminAgent(agentId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}`,
      { method: "GET" }
    );
  }

  // Create a new super admin agent
  async createSuperAdminAgent(data) {
    return await this.request(`${API_FUNCTIONS_URL}/super-admin-agents`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Update a super admin agent
  async updateSuperAdminAgent(agentId, data) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  // Delete a super admin agent
  async deleteSuperAdminAgent(agentId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}`,
      { method: "DELETE" }
    );
  }

  // ─── Organization Assignments ──────────────────────────────────────────────

  // Get assigned organizations for an agent
  async getAgentOrganizations(agentId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}/organizations`,
      { method: "GET" }
    );
  }

  // Replace all org assignments for an agent (full replace)
  async setAgentOrganizations(agentId, organizationIds) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}/organizations`,
      { method: "POST", body: JSON.stringify({ organization_ids: organizationIds }) }
    );
  }

  // Remove a single org assignment
  async removeAgentOrganization(agentId, orgId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agents/${agentId}/organizations/${orgId}`,
      { method: "DELETE" }
    );
  }

  // ─── SAA Portal: Dashboard ────────────────────────────────────────────────

  // Get dashboard stats for the logged-in SAA
  async getDashboardStats() {
    return await this.request(
      `${API_FUNCTIONS_URL}/super-admin-agent-dashboard`,
      { method: "GET" }
    );
  }

  // ─── SAA Portal: Sales ────────────────────────────────────────────────────

  // Approve a sale (SAA marks it as verified)
  async approveSale(saleId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/approve-sale/${saleId}`,
      { method: "PATCH" }
    );
  }
}

// Export singleton instance
const superAdminAgentService = new SuperAdminAgentService();
export default superAdminAgentService;
