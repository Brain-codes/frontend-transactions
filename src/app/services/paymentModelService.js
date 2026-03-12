// Payment Model Service
// Handles API calls for payment models, org assignments, and installment payments
import tokenManager from "../../utils/tokenManager";

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_FUNCTIONS_URL = `${API_BASE_URL}/functions/v1`;

class PaymentModelService {
  async getToken() {
    try {
      return await tokenManager.getValidToken();
    } catch (error) {
      console.error("[PaymentModelService] Token error:", error);
      return null;
    }
  }

  async getHeaders() {
    const token = await this.getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

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

  // ─── Payment Models CRUD ─────────────────────────────────────────────────

  async getPaymentModels(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") qs.append(k, v);
    });
    const url = `${API_FUNCTIONS_URL}/payment-models${qs.toString() ? "?" + qs.toString() : ""}`;
    return await this.request(url, { method: "GET" });
  }

  async getPaymentModel(id) {
    return await this.request(`${API_FUNCTIONS_URL}/payment-models/${id}`, {
      method: "GET",
    });
  }

  async createPaymentModel(data) {
    return await this.request(`${API_FUNCTIONS_URL}/payment-models`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePaymentModel(id, data) {
    return await this.request(`${API_FUNCTIONS_URL}/payment-models/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deletePaymentModel(id) {
    return await this.request(`${API_FUNCTIONS_URL}/payment-models/${id}`, {
      method: "DELETE",
    });
  }

  // ─── Organization Payment Model Assignments ──────────────────────────────

  async getOrgPaymentModels(orgId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/organization-payment-models/${orgId}`,
      { method: "GET" }
    );
  }

  async setOrgPaymentModels(orgId, paymentModelIds) {
    return await this.request(
      `${API_FUNCTIONS_URL}/organization-payment-models/${orgId}`,
      {
        method: "POST",
        body: JSON.stringify({ payment_model_ids: paymentModelIds }),
      }
    );
  }

  async removeOrgPaymentModel(orgId, modelId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/organization-payment-models/${orgId}/${modelId}`,
      { method: "DELETE" }
    );
  }

  // ─── Installment Payments ────────────────────────────────────────────────

  async getInstallmentPayments(saleId) {
    return await this.request(
      `${API_FUNCTIONS_URL}/installment-payments/${saleId}`,
      { method: "GET" }
    );
  }

  async recordInstallmentPayment(saleId, data) {
    return await this.request(
      `${API_FUNCTIONS_URL}/installment-payments/${saleId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }
}

const paymentModelService = new PaymentModelService();
export default paymentModelService;
