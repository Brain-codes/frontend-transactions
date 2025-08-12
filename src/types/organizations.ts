export interface Organization {
  id: string;
  name: string;
  partner_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface OrganizationFilters {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
}

export interface OrganizationStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  recentlyCreated: number;
}

export interface CreateOrganizationData {
  name: string;
  partner_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  status?: "active" | "inactive" | "suspended";
}

export interface UpdateOrganizationData {
  name?: string;
  partner_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  status?: "active" | "inactive" | "suspended";
}
